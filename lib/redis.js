// Minimal Upstash Redis REST client shared by the API routes.
// Prefers the store connected with the TRACKER prefix (for #496), whatever exact
// names Vercel gave its vars; KV_* / UPSTASH_* are older fallbacks.
function config() {
  const env = process.env;
  const names = Object.keys(env);
  const urlName = names.find(n => n.startsWith('TRACKER') && /REST_(API_)?URL$/.test(n));
  const tokenName = urlName && names.find(n => n.startsWith('TRACKER') && /REST_(API_)?TOKEN$/.test(n) && !/READ_ONLY/.test(n));
  if (urlName && tokenName) return { url: env[urlName], token: env[tokenName], source: urlName };

  const url   = env.KV_REST_API_URL   || env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN;
  const source = env.KV_REST_API_URL ? 'KV_REST_API_URL' : 'UPSTASH_REDIS_REST_URL';
  return url && token ? { url, token, source, trackerVars: names.filter(n => n.startsWith('TRACKER')) } : null;
}

async function redis(cfg, command) {
  const res = await fetch(cfg.url, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + cfg.token, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json;
}

module.exports = { config, redis };
