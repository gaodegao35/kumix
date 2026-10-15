const { config, redis } = require('../lib/redis');
const { TRACKED, MAX_ENTRIES, historyKey } = require('../lib/product');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const opt = TRACKED.find(o => o.slug === req.query.option);
  if (!opt) { res.status(400).json({ error: 'Unknown option' }); return; }
  const cfg = config();
  if (!cfg) { res.status(500).json({ error: 'Redis not configured' }); return; }

  try {
    const result = await redis(cfg, ['LRANGE', 'log:' + historyKey(opt), 0, MAX_ENTRIES - 1]);
    res.status(200).json((result.result || []).map(e => JSON.parse(e)));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
