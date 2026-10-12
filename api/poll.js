// Fetches live stock for product 496, logs any change to Redis, and returns the current state.
// Called every 15s by the open pages and by the GitHub Actions poller.
const { config, redis } = require('../lib/redis');
const { PRODUCT_ID, OPTIONS, MAX_ENTRIES, historyKey, tsNow } = require('../lib/product');

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

  let data;
  try {
    const apiUrl = `https://shop.my1pick.com/api/v1/common/products/${PRODUCT_ID}?displayChannel=WEB`;
    data = await fetch(apiUrl, { headers: { Accept: 'application/json' } }).then(r => r.json());
    if (!data.id) throw new Error('product not found');
  } catch (e) {
    res.status(502).json({ error: 'my1pick: ' + e.message, ts });
    return;
  }

  const options = OPTIONS.map(opt => {
    const apiOpt = (data.options || []).find(o => o.id === opt.id);
    const stock = apiOpt ? apiOpt.stock : null;
    return { slug: opt.slug, name: opt.name, label: opt.label, base: opt.base, stock,
             sold: stock === null ? null : opt.base - stock };
  });

  // Logging is best-effort: live numbers are still returned if Redis is down.
  const changes = [];
  let redisError = null;
  const cfg = config();
  if (!cfg) redisError = 'Redis not configured';
  else {
    try {
      for (const [i, opt] of OPTIONS.entries()) {
        const sold = options[i].sold;
        if (sold !== null && await saveIfChanged(cfg, historyKey(opt), ts, sold)) changes.push(opt.name + '=' + sold);
      }
    } catch (e) { redisError = e.message; }
  }

  res.status(200).json({
    ok: true, ts, changes, redisError, redisSource: cfg ? cfg.source : null,
    product: { id: data.id, name: data.name.trim(), status: data.status, saleStartAt: data.saleStartAt, saleEndAt: data.saleEndAt },
    options,
  });
};
