const PRODUCT_ID = '429';
const MAX_STOCK = 9999;
const OPTION_NAMES = {
  757: 'SPECIAL CAFE',
  758: 'GROUP CALL',
  759: 'BOHYEON',
  760: 'HYO',
  761: 'HARUTO',
  762: 'JUNSEONG',
  763: 'JAEIL',
  764: 'KAI',
  765: 'YEONTAE',
  766: 'SECHAN'
};

async function redis(token, url, command) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  });
  return res.json();
}

function tsNow() {
  const d = new Date(), pad = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
}

async function saveIfChanged(redisUrl, redisToken, key, sales) {
  const redisKey = 'log:' + key;
  const last = await redis(redisToken, redisUrl, ['LINDEX', redisKey, 0]);
  const lastSold = last.result ? JSON.parse(last.result).sold : null;
  if (lastSold === sales) return false;
  const delta = lastSold !== null ? sales - lastSold : null;
  const entry = JSON.stringify({ ts: tsNow(), sold: sales, delta });
  await redis(redisToken, redisUrl, ['LPUSH', redisKey, entry]);
  await redis(redisToken, redisUrl, ['LTRIM', redisKey, 0, 1999]);
  return true;
}

module.exports = async (req, res) => {
  const redisUrl   = process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    res.status(500).json({ error: 'Redis not configured' });
    return;
  }

  const changes = [];
  try {
    const apiUrl = `https://shop.my1pick.com/api/v1/common/products/${PRODUCT_ID}?displayChannel=WEB`;
    const data = await fetch(apiUrl, { headers: { Accept: 'application/json' } }).then(r => r.json());
    if (!data.id) throw new Error('product not found');

    for (const opt of data.options || []) {
      const name = OPTION_NAMES[opt.id];
      if (!name) continue;
      const sales = MAX_STOCK - opt.stock;
      const key = 'pick' + PRODUCT_ID + ':' + name;
      const changed = await saveIfChanged(redisUrl, redisToken, key, sales);
      if (changed) changes.push(name + '=' + sales);
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
    return;
  }

  res.status(200).json({ ok: true, changes, ts: tsNow() });
};
