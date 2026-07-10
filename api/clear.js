// Redis log maintenance:
//   ?delete=<key>     → wipe log:<key>
//   ?purge=weidian    → delete every log:* key that is NOT a my1pick key (log:pick*)
async function redis(token, url, command) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  });
  return res.json();
}

module.exports = async (req, res) => {
  const url   = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) { res.status(500).json({ error: 'Redis not configured' }); return; }

  if (req.query.delete) {
    const redisKey = 'log:' + req.query.delete;
    await redis(token, url, ['DEL', redisKey]);
    res.status(200).json({ ok: true, deleted: req.query.delete });
    return;
  }

  if (req.query.purge === 'weidian') {
    const result = await redis(token, url, ['KEYS', 'log:*']);
    const keys = (result.result || []).filter(k => !k.startsWith('log:pick'));
    for (const k of keys) await redis(token, url, ['DEL', k]);
    res.status(200).json({ ok: true, deleted: keys });
    return;
  }

  res.status(400).json({ error: 'use ?delete=<key> or ?purge=weidian' });
};
