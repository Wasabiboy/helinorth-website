// Manual Cloudflare OAuth flow with a long-lived localhost listener (10 min).
// Exchanges the authorization code for tokens and writes wrangler's default.toml.
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { exec as openBrowser } from 'node:child_process';

const CLIENT_ID = '54d11594-84e4-41aa-b438-e81b8fa78ee7';
const REDIRECT_URI = 'http://localhost:8976/oauth/callback';
const SCOPES = ['user:read','offline_access','k2.read','k2.write','account:read','workers:write','workers_kv:write','workers_routes:write','workers_scripts:write','workers_tail:read','d1:write','pages:write','zone:read','ssl_certs:write','ai:write','ai-search:write','ai-search:run','agent-memory:write','queues:write','pipelines:write','secrets_store:write','artifacts:write','flagship:write','containers:write','cloudchamber:write','connectivity:admin','email_routing:write','email_sending:write','browser:write','challenge-widgets.write'];
const CONFIG = path.join(process.env.APPDATA || '', 'xdg.config', '.wrangler', 'config', 'default.toml');

const b64url = (buf) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const verifier = b64url(crypto.randomBytes(32));
const challenge = b64url(crypto.createHash('sha256').update(verifier).digest());
const state = b64url(crypto.randomBytes(24));

const authUrl = 'https://dash.cloudflare.com/oauth2/auth?' + new URLSearchParams({
  response_type: 'code',
  client_id: CLIENT_ID,
  redirect_uri: REDIRECT_URI,
  scope: SCOPES.join(' '),
  state,
  code_challenge: challenge,
  code_challenge_method: 'S256',
}).toString().replace(/%20/g, '+');

console.log('AUTH_URL:');
console.log(authUrl);
// Auto-open the correct auth page in the default browser so no copy/paste is needed
openBrowser(`start "" "${authUrl.replace(/&/g, '^&')}"`, { shell: 'cmd.exe' }, (e) => {
  if (e) console.log('AUTO_OPEN_FAILED — use the AUTH_URL above manually');
  else console.log('BROWSER_OPENED automatically');
});

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost:8976');
  if (u.pathname !== '/oauth/callback') { res.writeHead(404); res.end('not found'); return; }
  const code = u.searchParams.get('code');
  const err = u.searchParams.get('error');
  if (err || !code) {
    console.log('OAUTH_ERROR:', err || 'no code');
    res.writeHead(400); res.end('OAuth failed: ' + (err || 'no code'));
    server.close(); process.exit(1);
  }
  if (u.searchParams.get('state') !== state) {
    console.log('STATE_MISMATCH');
    res.writeHead(400); res.end('state mismatch');
    server.close(); process.exit(1);
  }
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end('<h2>✅ Cloudflare authorized — you can close this window. Mr Davies is finishing the deploy.</h2>');
  console.log('CODE_RECEIVED — exchanging...');
  try {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      code_verifier: verifier,
    });
    const r = await fetch('https://dash.cloudflare.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    const j = await r.json();
    console.log('EXCHANGE_STATUS:', r.status);
    if (!j.access_token) { console.log('EXCHANGE_FAIL:', JSON.stringify(j).slice(0, 500)); process.exit(1); }
    const exp = new Date(Date.now() + (j.expires_in || 172799) * 1000).toISOString();
    const scopes = Array.isArray(j.scope) ? j.scope : String(j.scope || SCOPES.join(' ')).split(' ');
    const toml = [
      `oauth_token = ${JSON.stringify(j.access_token)}`,
      `expiration_time = ${JSON.stringify(exp)}`,
      `refresh_token = ${JSON.stringify(j.refresh_token)}`,
      `scopes = [ ${scopes.map((s) => JSON.stringify(s)).join(', ')} ]`,
      '',
    ].join('\n');
    fs.writeFileSync(CONFIG, toml);
    console.log('TOML_WRITTEN:', CONFIG);
    // quick verification
    const v = await fetch('https://api.cloudflare.com/client/v4/user/tokens/verify', {
      headers: { Authorization: 'Bearer ' + j.access_token },
    });
    const vj = await v.json();
    console.log('VERIFY_STATUS:', v.status, vj.success ? (vj.result?.status || 'ok') : JSON.stringify(vj.errors).slice(0, 200));
    console.log('LOGIN_COMPLETE');
    server.close();
    process.exit(0);
  } catch (e) {
    console.log('EXCHANGE_ERROR:', e.message);
    process.exit(1);
  }
});

const TIMEOUT_MS = 30 * 60 * 1000;
server.listen(8976, '127.0.0.1', () => console.log('LISTENING on localhost:8976 — waiting up to 30 minutes for your Allow click...'));
setTimeout(() => { console.log('TIMEOUT_30MIN'); server.close(); process.exit(1); }, TIMEOUT_MS);
