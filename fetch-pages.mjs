// Targeted fetch: grab specific pages + any assets they reference that don't exist yet.
import fs from 'fs';
import path from 'path';

const ORIGIN = 'https://helinorth.co.nz';
const OUT = path.resolve('site');

const PAGES = process.argv.slice(2).length ? process.argv.slice(2) : ['/agriculture/aerial-spraying/', '/commercial/hydraulic-grapple/'];
const newRefs = new Set();

function outPathFor(p) {
  if (p === '' || p.endsWith('/')) return path.join(OUT, p, 'index.html');
  if (!/\.\w{2,5}$/.test(p)) return path.join(OUT, p, 'index.html');
  return path.join(OUT, p);
}

async function fetchBuf(url) {
  const res = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 (site mirror)' } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

function addRef(rel, u) {
  if (!u) return;
  if (/^(https?:|\/\/|mailto:|tel:|javascript:|data:|#)/i.test(u)) return;
  let r;
  if (u.startsWith('/')) r = u;
  else r = path.posix.normalize(path.posix.join(path.posix.dirname(rel), u));
  newRefs.add(r.replace(/\\/g, '/'));
}

for (const page of PAGES) {
  const buf = await fetchBuf(ORIGIN + page);
  const html = buf.toString('utf8').replaceAll('https://helinorth.co.nz', '').replaceAll('//helinorth.co.nz', '');
  const file = outPathFor(page);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
  const rel = path.relative(OUT, file).replace(/\\/g, '/').replace(/index\.html$/, '');
  for (const m of html.matchAll(/(?:href|src)\s*=\s*["']([^"']+)["']/g)) addRef(rel, m[1]);
  for (const m of html.matchAll(/srcset\s*=\s*["']([^"']+)["']/g)) {
    for (const part of m[1].split(',')) addRef(rel, part.trim().split(/\s+/)[0]);
  }
  for (const m of html.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) addRef(rel, m[1]);
  console.log('page saved:', page, '->', path.relative(OUT, file));
}

// fetch missing assets (queue)
const queue = [...newRefs].filter((r) => !/^\/(wp-json|feed|xmlrpc)/.test(r));
let fetched = 0, skipped = 0, failed = [];
while (queue.length) {
  const p = queue.shift().split('#')[0].split('?')[0];
  if (p === '' || p.endsWith('/') || !/\.\w{2,5}$/.test(p)) continue; // page-refs handled by caller
  const f = path.join(OUT, p);
  if (fs.existsSync(f)) { skipped++; continue; }
  try {
    const buf = await fetchBuf(ORIGIN + p);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, buf);
    fetched++;
    if (/\.css$/i.test(p)) {
      const css = buf.toString('utf8').replaceAll('https://helinorth.co.nz', '').replaceAll('//helinorth.co.nz', '');
      fs.writeFileSync(f, css);
      for (const m of css.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) addRef(p, m[1]);
      for (const m of css.matchAll(/@import\s+["']([^"']+)["']/g)) addRef(p, m[1]);
    }
  } catch (e) {
    failed.push(String(e.message || e).slice(0, 120));
  }
}
console.log(`assets fetched: ${fetched}, already present: ${skipped}, failed: ${failed.length}`);
for (const f of failed.slice(0, 20)) console.log('  FAIL', f);
