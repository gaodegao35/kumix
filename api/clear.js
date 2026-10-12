// Redis log maintenance:
//   ?purge=old       → delete every log:* key that does not belong to the current product
//   ?delete=<slug>   → wipe one option's history (e.g. after correcting its base stock)
const { config, redis } = require('../lib/redis');
const { PRODUCT_ID, OPTIONS, historyKey } = require('../lib/product');

module.exports = async (req, res) => {
  const cfg = config();
  if (!cfg) { res.status(500).json({ error: 'Redis not configured' }); return; }
  if (req.query.delete) {
    const opt = OPTIONS.find(o => o.slug === req.query.delete);
    if (!opt) { res.status(400).json({ error: 'Unknown option' }); return; }
    try {
      await redis(cfg, ['DEL', 'log:' + historyKey(opt)]);
      res.status(200).json({ ok: true, deleted: historyKey(opt) });
    } catch (e) { res.status(500).json({ error: e.message }); }
    return;
  }
  if (req.query.purge !== 'old') { res.status(400).json({ error: 'use ?purge=old or ?delete=<option>' }); return; }

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
