// Fetches live stock for the Weidian item, logs any change to Redis, and returns the current state.
// Called every 15s by the open pages and by the GitHub Actions poller.
const { config, redis } = require('../lib/redis');
const { ITEM_ID, SOURCE_URL, OPTIONS, MAX_ENTRIES, historyKey, tsNow } = require('../lib/product');

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

  let item;
  try {
    const data = await fetch(SOURCE_URL, {
      headers: {
        Accept: 'application/json',
        Referer: 'https://weidian.com/item.html?itemID=' + ITEM_ID,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0 Safari/537.36',
      },
    }).then(r => r.json());
    item = data.result;
    if (!data.status || data.status.code !== 0 || !item || typeof item.itemStock !== 'number') {
      throw new Error((data.status && data.status.message) || 'item not found');
    }
  } catch (e) {
    res.status(502).json({ error: 'weidian: ' + e.message, ts });
    return;
  }

  // The item has no SKUs: its single itemStock feeds the one tracked option.
  const options = OPTIONS.map(opt => ({
    slug: opt.slug, name: opt.name, label: opt.label, base: opt.base,
    stock: item.itemStock, sold: opt.base - item.itemStock,
  }));

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
    ok: true, ts, changes, redisError, redisSource: cfg ? cfg.source : null, trackerVars: cfg && cfg.trackerVars,
    product: { id: item.itemId, name: item.itemTitle.replace(/\s+/g, ' ').trim(), price: item.itemDiscountLowPrice / 100 },
    options,
  });
};
