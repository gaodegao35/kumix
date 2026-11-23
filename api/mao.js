// Fetches live stock for the maonft HK tickets, logs any change to Redis, and returns the current state.
// Called every minute by the GitHub Actions poller and whenever the page loads or refreshes.
const { config, redis, pipeline } = require('../lib/redis');
const { NFT_IDS, LOG_PREFIX, LAST_KEY, FIRST_KEY, MAX_ENTRIES, fetchProduct, tsNow } = require('../lib/mao');

const toMap = flat => {
  const m = {};
  for (let i = 0; i < (flat || []).length; i += 2) m[flat[i]] = Number(flat[i + 1]);
  return m;
};

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const ts = tsNow();

  let products;
  try {
    products = await Promise.all(NFT_IDS.map(fetchProduct));
  } catch (e) {
    // Node's fetch hides the network reason (timeout, reset, DNS…) in e.cause
    const cause = e.cause ? ' (' + [e.cause.code, e.cause.message].filter(Boolean).join(': ') + ')' : '';
    res.status(502).json({ error: 'maonft: ' + e.message + cause, ts });
    return;
  }
  const tiers = products.flatMap(p => p.tiers);

  // Logging is best-effort: live numbers are still returned if Redis is down.
  const changes = [];
  let redisError = null, first = {};
  const cfg = config();
  if (!cfg) redisError = 'Redis not configured';
  else {
    try {
      const [lastFlat, firstFlat] = await pipeline(cfg, [['HGETALL', LAST_KEY], ['HGETALL', FIRST_KEY]]);
      const last = toMap(lastFlat);
      first = toMap(firstFlat);
      const cmds = [], newFirst = [], newLast = [];
      for (const t of tiers) {
        const prev = last[t.ticketId];
        if (prev === t.left) continue;
        const sold = prev === undefined ? null : prev - t.left;
        cmds.push(['LPUSH', LOG_PREFIX + t.ticketId, JSON.stringify({ ts, left: t.left, sold })]);
        cmds.push(['LTRIM', LOG_PREFIX + t.ticketId, 0, MAX_ENTRIES - 1]);
        newLast.push(t.ticketId, t.left);
        if (first[t.ticketId] === undefined) { newFirst.push(t.ticketId, t.left); first[t.ticketId] = t.left; }
        changes.push(t.ticketId + '=' + t.left);
      }
      if (newLast.length) cmds.push(['HSET', LAST_KEY, ...newLast]);
      if (newFirst.length) cmds.push(['HSET', FIRST_KEY, ...newFirst]);
      await pipeline(cfg, cmds);
    } catch (e) { redisError = e.message; }
  }

  for (const t of tiers) {
    t.firstLeft = first[t.ticketId] ?? null;
    t.soldSinceStart = t.firstLeft === null ? null : t.firstLeft - t.left;
  }
  res.status(200).json({ ok: true, ts, changes, redisError, products });
};
