// Change log for one maonft ticket tier: /api/mao-history?ticketId=3636
const { config, redis } = require('../lib/redis');
const { LOG_PREFIX, MAX_ENTRIES } = require('../lib/mao');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const id = String(req.query.ticketId || '');
  if (!/^\d+$/.test(id)) { res.status(400).json({ error: 'ticketId required' }); return; }
  const cfg = config();
  if (!cfg) { res.status(500).json({ error: 'Redis not configured' }); return; }
  try {
    const result = await redis(cfg, ['LRANGE', LOG_PREFIX + id, 0, MAX_ENTRIES - 1]);
    res.status(200).json((result.result || []).map(e => JSON.parse(e)));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
