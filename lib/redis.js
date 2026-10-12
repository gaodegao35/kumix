// Minimal Upstash Redis REST client shared by the API routes.
function config() {
  // TRACKER_* is the store connected for #496; KV_* / UPSTASH_* are older fallbacks
  const env = process.env;
  const url   = env.TRACKER_REST_API_URL   || env.KV_REST_API_URL   || env.UPSTASH_REDIS_REST_URL;
  const token = env.TRACKER_REST_API_TOKEN || env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
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
