// Fetches live stock for my1pick product 512, logs any change to Redis, and returns the current state.
// Called every 15s by the open pages and by the GitHub Actions poller.
const { config, redis } = require('../lib/redis');
const { PRODUCT_ID, OPTIONS, MAX_ENTRIES, historyKey, sourceUrl, tsNow } = require('../lib/product');

async function saveIfChanged(cfg, key, ts, sold) {
  const redisKey = 'log:' + key;
  const last = await redis(cfg, ['LINDEX', redisKey, 0]);
  const lastSold = last.result ? JSON.parse(last.result).sold : null;
  if (lastSold === sold) return false;
  const delta = lastSold !== null ? sold - lastSold : null;
  await redis(cfg, ['LPUSH', redisKey, JSON.stringify({ ts, sold, delta })]);
  await redis(cfg, ['LTRIM', redisKey, 0, MAX_ENTRIES - 1]);
  return true;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const ts = tsNow();

  let data, options;
  try {
    data = await fetch(sourceUrl(), { headers: { Accept: 'application/json' } }).then(r => r.json());
    if (!data.id) throw new Error('product not found');
    options = OPTIONS.map(opt => {
      const apiOpt = (data.options || []).find(o => o.id === opt.id);
      if (!apiOpt || typeof apiOpt.stock !== 'number') throw new Error('option ' + opt.id + ' (' + opt.name + ') missing');
      return { slug: opt.slug, name: opt.name, group: opt.group, label: opt.label, optionId: opt.id,
               base: opt.base, stock: apiOpt.stock, sold: opt.base - apiOpt.stock };
    });
  } catch (e) {
    res.status(502).json({ error: 'my1pick: ' + e.message, ts });
    return;
  }


  // Logging is best-effort: live numbers are still returned if Redis is down.
  const changes = [];
  let redisError = null;
  const cfg = config();
  if (!cfg) redisError = 'Redis not configured';
  else {
    try {
      for (const [i, opt] of OPTIONS.entries()) {
        if (await saveIfChanged(cfg, historyKey(opt), ts, options[i].sold)) changes.push(opt.name + '=' + options[i].sold);
      }
    } catch (e) { redisError = e.message; }
  }

  res.status(200).json({
    ok: true, ts, changes, redisError, redisSource: cfg ? cfg.source : null, trackerVars: cfg && cfg.trackerVars,
    product: { id: data.id, name: data.name.trim(), price: data.discountPrice, status: data.status,
               saleStartAt: data.saleStartAt, saleEndAt: data.saleEndAt },
    options,
  });
};
