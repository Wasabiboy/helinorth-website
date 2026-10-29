// Fill all missing assets referenced by mirrored HTML/CSS files. Iterates to fixpoint.
import fs from 'fs';
import path from 'path';

const ORIGIN = 'https://helinorth.co.nz';
const OUT = path.resolve('site');
const SKIP_DYNAMIC = [/^\/wp-json\//, /^\/feed\/?$/, /^\/xmlrpc\.php/, /^\/wp-cron/, /^\/wp-login/];
const refs = new Set();
const missing = new Set();

function walk(d, cb) {
  for (const f of fs.readdirSync(d)) {
    const fp = path.join(d, f);
    fs.statSync(fp).isDirectory() ? walk(fp, cb) : cb(fp);
  }
}

function addRef(rel, u) {
  if (!u) return;
  if (/^(https?:|\/\/|mailto:|tel:|javascript:|data:|#)/i.test(u)) return;
  let r;
  if (u.startsWith('/')) r = u;
  else r = path.posix.normalize(path.posix.join(path.posix.dirname(rel), u));
  refs.add(r.replace(/\\/g, '/'));
}

function collect() {
  refs.clear();
  walk(OUT, (fp) => {
    const rel = path.relative(OUT, fp).replace(/\\/g, '/');
    const t = fs.readFileSync(fp, 'utf8');
    if (/\.html?$/i.test(fp)) {
      for (const m of t.matchAll(/(?:href|src)\s*=\s*["']([^"']+)["']/g)) addRef(rel, m[1]);
      for (const m of t.matchAll(/srcset\s*=\s*["']([^"']+)["']/g)) {
        for (const part of m[1].split(',')) addRef(rel, part.trim().split(/\s+/)[0]);
      }
    } else if (/\.css$/i.test(fp)) {
      for (const m of t.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) addRef(rel, m[1]);
      for (const m of t.matchAll(/@import\s+["']([^"']+)["']/g)) addRef(rel, m[1]);
    }
  });
  missing.clear();
  for (const r of refs) {
    const rr = r.split('#')[0].split('?')[0];
    if (rr === '' || rr.endsWith('/')) continue; // page refs — already all present
    if (SKIP_DYNAMIC.some((x) => x.test(rr))) continue;
    if (/^\/(agriculture\/aerial-spraying|commercial\/hydraulic-grapple)/.test(rr)) continue; // 404 on live site
    if (!fs.existsSync(path.join(OUT, rr)) && !fs.existsSync(path.join(OUT, rr, 'index.html'))) missing.add(rr);
  }
  return missing.size;
}

async function fetchMissing() {
  let ok = 0, fail = 0;
  const failures = [];
  for (const r of missing) {
    try {
      const res = await fetch(ORIGIN + r, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 (site mirror)' } });
      if (!res.ok) throw new Error(String(res.status));
      const buf = Buffer.from(await res.arrayBuffer());
      const f = path.join(OUT, r);
      fs.mkdirSync(path.dirname(f), { recursive: true });
      if (/\.css$/i.test(r)) {
        fs.writeFileSync(f, buf.toString('utf8').replaceAll('https://helinorth.co.nz', '').replaceAll('//helinorth.co.nz', ''));
      } else {
        fs.writeFileSync(f, buf);
      }
      ok++;
    } catch (e) {
      fail++;
      if (failures.length < 30) failures.push(`${e.message || e} ${r}`);
    }
  }
  return { ok, fail, failures };
}

let round = 0;
while (round < 4) {
  const n = collect();
  console.log(`round ${round}: refs=${refs.size} missing=${n}`);
  if (n === 0) break;
  const { ok, fail, failures } = await fetchMissing();
  console.log(`  fetched ${ok}, failed ${fail}`);
  for (const f of failures) console.log('   FAIL', f);
  if (ok === 0) break;
  round++;
}
console.log('DONE');
