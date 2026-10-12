// Redis log maintenance:
//   ?purge=old   → delete every log:* key that does not belong to the current product
const { config, redis } = require('../lib/redis');
const { PRODUCT_ID } = require('../lib/product');

module.exports = async (req, res) => {
  const cfg = config();
  if (!cfg) { res.status(500).json({ error: 'Redis not configured' }); return; }
  if (req.query.purge !== 'old') { res.status(400).json({ error: 'use ?purge=old' }); return; }

  try {
    const current = 'log:pick' + PRODUCT_ID + ':';
    const result = await redis(cfg, ['KEYS', 'log:*']);
    const keys = (result.result || []).filter(k => !k.startsWith(current));
    for (const k of keys) await redis(cfg, ['DEL', k]);
    res.status(200).json({ ok: true, deleted: keys });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
