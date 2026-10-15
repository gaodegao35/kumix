// Fetches live stock for the Weidian items, logs any change to Redis, and returns the current state.
// Called every 15s by the open pages and by the GitHub Actions poller.
const { config, redis } = require('../lib/redis');
const { ITEMS, TOTAL, MAX_ENTRIES, historyKey, sourceUrl, tsNow } = require('../lib/product');

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

  // Items have no SKUs: each item's single itemStock is one tracked count.
  async function fetchItem(opt) {
    const data = await fetch(sourceUrl(opt.itemId), {
      headers: {
        Accept: 'application/json',
        Referer: 'https://weidian.com/item.html?itemID=' + opt.itemId,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0 Safari/537.36',
      },
    }).then(r => r.json());
    const item = data.result;
    if (!data.status || data.status.code !== 0 || !item || typeof item.itemStock !== 'number') {
      throw new Error(opt.name + ': ' + ((data.status && data.status.message) || 'item not found'));
    }
    return item;
  }

  let items;
  try {
    items = await Promise.all(ITEMS.map(fetchItem));
  } catch (e) {
    // All-or-nothing, so the combined total is never logged from a partial read
    res.status(502).json({ error: 'weidian: ' + e.message, ts });
    return;
  }

  const perItem = ITEMS.map((opt, i) => ({
    slug: opt.slug, name: opt.name, label: opt.label, itemId: opt.itemId, base: opt.base,
    stock: items[i].itemStock, sold: opt.base - items[i].itemStock,
  }));
  const sum = key => perItem.reduce((n, o) => n + o[key], 0);
  const total = { slug: TOTAL.slug, name: TOTAL.name, label: TOTAL.label, base: sum('base'), stock: sum('stock'), sold: sum('sold') };
  const options = [total, ...perItem];
  const tracked = [TOTAL, ...ITEMS];

  // Logging is best-effort: live numbers are still returned if Redis is down.
  const changes = [];
  let redisError = null;
  const cfg = config();
  if (!cfg) redisError = 'Redis not configured';
  else {
    try {
      for (const [i, opt] of tracked.entries()) {
        const sold = options[i].sold;
        if (await saveIfChanged(cfg, historyKey(opt), ts, sold)) changes.push(opt.name + '=' + sold);
      }
    } catch (e) { redisError = e.message; }
  }

  res.status(200).json({
    ok: true, ts, changes, redisError, redisSource: cfg ? cfg.source : null, trackerVars: cfg && cfg.trackerVars,
    product: { name: items[0].itemTitle.replace(/\s+/g, ' ').replace(/（[^）]*）\s*$/, '').trim(), price: items[0].itemDiscountLowPrice / 100 },
    options,
  });
};
