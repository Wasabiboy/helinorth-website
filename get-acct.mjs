// Get Cloudflare account ID(s) for the working API token (token from env, never printed).
const token = process.env.CLOUDFLARE_API_TOKEN;
if (!token) { console.error('NO_TOKEN'); process.exit(1); }
const r = await fetch('https://api.cloudflare.com/client/v4/accounts', {
  headers: { Authorization: `Bearer ${token}` },
});
const j = await r.json();
if (!j.success) { console.error(JSON.stringify(j.errors)); process.exit(1); }
for (const a of j.result || []) console.log(a.id, a.name);
