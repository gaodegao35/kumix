// Redis log maintenance:
//   ?purge=old          → delete every log:* key that isn't an HK ticket log (e.g. old tracker history)
//   ?delete=<ticketId>  → wipe one tier's history; it restarts from the next poll
const { config, redis } = require('../lib/redis');
const { LOG_PREFIX, LAST_KEY, FIRST_KEY } = require('../lib/mao');

module.exports = async (req, res) => {
  const cfg = config();
  if (!cfg) { res.status(500).json({ error: 'Redis not configured' }); return; }
  try {
    if (req.query.delete) {
      const id = String(req.query.delete);
      if (!/^\d+$/.test(id)) { res.status(400).json({ error: 'delete takes a ticketId' }); return; }
      await redis(cfg, ['DEL', LOG_PREFIX + id]);
      await redis(cfg, ['HDEL', LAST_KEY, id]);
      await redis(cfg, ['HDEL', FIRST_KEY, id]);
      res.status(200).json({ ok: true, deleted: LOG_PREFIX + id });
      return;
    }
    if (req.query.purge !== 'old') { res.status(400).json({ error: 'use ?purge=old or ?delete=<ticketId>' }); return; }
    const result = await redis(cfg, ['KEYS', 'log:*']);
    const keys = (result.result || []).filter(k => !k.startsWith(LOG_PREFIX));
    for (const k of keys) await redis(cfg, ['DEL', k]);
    res.status(200).json({ ok: true, deleted: keys });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
