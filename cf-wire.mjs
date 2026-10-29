// Read wrangler OAuth token from default.toml, probe Cloudflare API capabilities.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const cfgPath = path.join(os.homedir(), 'AppData', 'Roaming', 'xdg.config', '.wrangler', 'config', 'default.toml');
const toml = fs.readFileSync(cfgPath, 'utf8');
const token = (toml.match(/oauth_token = "([^"]+)"/) || [])[1];
if (!token) { console.error('NO_OAUTH_TOKEN'); process.exit(1); }

const API = 'https://api.cloudflare.com/client/v4';
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

async function call(method, url, body) {
  const r = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let j = null; try { j = await r.json(); } catch {}
  return { status: r.status, j };
}

// 1. whoami / accounts
const me = await call('GET', `${API}/user`);
console.log('USER', me.status, JSON.stringify(me.j?.success), me.j?.errors?.[0]?.message || '');
const accs = await call('GET', `${API}/accounts`);
console.log('ACCOUNTS', accs.status, JSON.stringify((accs.j?.result || []).map(a => ({ id: a.id, name: a.name }))));

const acct = accs.j?.result?.[0]?.id;
if (!acct) process.exit(0);

// 2. Pages project state
const proj = await call('GET', `${API}/accounts/${acct}/pages/projects/helinorth-website`);
console.log('PROJECT', proj.status, JSON.stringify({
  name: proj.j?.result?.name,
  production_branch: proj.j?.result?.production_branch,
  has_source: !!proj.j?.result?.source,
  domains: proj.j?.result?.domains,
}, null, 0));

// 3. Can we mint a scoped API token for Pages deploys?
const tok = await call('POST', `${API}/user/tokens`, {
  name: 'helinorth-website-pages-deploy',
  policies: [{
    effect: 'allow',
    resources: { [`com.cloudflare.edge.account.${acct}`]: '*' },
    resources: { 'com.cloudflare.edge.account': acct },
    permission_groups: [],
  }],
  name: 'helinorth-website-pages-deploy',
  policies: [{
    effect: 'allow',
    resources: { [`com.cloudflare.edge.account.${acct}`]: '*' },
    permission_groups: ['pages_edit'],
  }],
  expires: new Date(Date.now() + 365 * 864e5).toISOString(),
});
console.log('TOKEN_CREATE', tok.status, JSON.stringify(tok.j?.errors || tok.j?.success || tok.j?.result?.id));
