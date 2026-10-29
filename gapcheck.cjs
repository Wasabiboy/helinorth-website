// Gap-check: verify every locally referenced file in the mirror exists.
const fs = require('fs');
const path = require('path');
const site = path.resolve('site');
const missing = new Set();
const refs = new Set();

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
  if (u.startsWith('/')) r = u.slice(1);
  else r = path.posix.normalize(path.posix.join(path.posix.dirname(rel), u));
  refs.add(r.replace(/\\/g, '/'));
}

walk(site, (fp) => {
  const rel = path.relative(site, fp).replace(/\\/g, '/');
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

for (const r of refs) {
  const rr = r.split('#')[0].split('?')[0];
  if (rr === '' || rr.endsWith('/')) {
    if (!fs.existsSync(path.join(site, rr, 'index.html'))) missing.add(r);
  } else if (!fs.existsSync(path.join(site, rr)) && !fs.existsSync(path.join(site, rr, 'index.html'))) {
    missing.add(r);
  }
}

console.log('refs checked:', refs.size);
console.log('missing:', missing.size);
for (const m of [...missing].slice(0, 60)) console.log('  MISS', m);
