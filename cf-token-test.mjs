// Test existing CLOUDFLARE_API_TOKEN: verify + list zones to extract account IDs
const token = process.env.CLOUDFLARE_API_TOKEN;
if (!token) { console.log('NO_TOKEN'); process.exit(1); }

const h = { Authorization: `Bearer ${token}` };

const v = await fetch('https://api.cloudflare.com/client/v4/user/tokens/verify', { headers: h });
const vj = await v.json();
console.log('VERIFY:', JSON.stringify({ ok: vj.success, status: vj.result?.status, errors: vj.errors }));

const z = await fetch('https://api.cloudflare.com/client/v4/zones?per_page=5', { headers: h });
const zj = await z.json();
if (zj.success) {
  const accts = new Map();
  for (const zone of zj.result) accts.set(zone.account.id, zone.account.name);
  console.log('ZONES_OK count:', zj.result.length, 'zones');
  for (const [id, name] of accts) console.log('ACCOUNT:', id, '|', name);
  console.log('ZONE_NAMES:', zj.result.map(x => x.name).join(', '));
} else {
  console.log('ZONES_FAIL:', JSON.stringify(zj.errors));
}
