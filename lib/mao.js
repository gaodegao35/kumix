// maonft (offgrid) — YUHZ in Hong Kong. Listed on the page in this order:
// PART2 fan benefits (#359), PART2 4-cut photo (#358), PART3 video call (#357), LIVE & MEET (#353), PART1 cafe (#360), 1:1 fan benefits (#352).
// The API exposes remaining stock per tier (seat.value) but no starting stock,
// so we log remaining counts and count sales from when tracking began.
const NFT_IDS = [359, 358, 357, 353, 360, 352];
const LOG_PREFIX = 'log:mao:';      // log:mao:<ticketId> → list of { ts, left, sold }
const LAST_KEY = 'mao:last';        // hash ticketId → last seen remaining stock
const FIRST_KEY = 'mao:first';      // hash ticketId → remaining stock when tracking began
const MAX_ENTRIES = 2000;

// "YYYY-MM-DD HH:MM:SS" in KST, independent of the server's timezone
function tsNow() {
  return new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Seoul', hour12: false });
}

const detailUrl = nftId => 'https://pro-server-admin.maonft.com.cn/order/nfts/getTicketDetail?nftId=' + nftId;

async function getJson(url, retries = 1) {
  try {
    return await fetch(url, {
      // The API rejects requests without a language ("语言类型为空")
      headers: { Accept: 'application/json', 'Accept-Language': 'zh-CN', 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(8000),
    }).then(r => r.json());
  } catch (e) {
    // The server drops connections now and then; one retry rides out a short blip
    if (retries > 0) { await new Promise(r => setTimeout(r, 1000)); return getJson(url, retries - 1); }
    throw e;
  }
}

async function fetchProduct(nftId) {
  const json = await getJson(detailUrl(nftId));
  if (json.code !== 200 || !json.data || !Array.isArray(json.data.seat)) {
    throw new Error('nft ' + nftId + ': ' + (json.message || 'bad response'));
  }
  const { ticket, schedule, seat } = json.data;
  const times = schedule.flatMap(s => s.times).map(t => ({ scheduleId: t.scheduleId, label: t.showDate + ' ' + t.showTime.slice(0, 5) }));
  const timeLabel = Object.fromEntries(times.map(t => [t.scheduleId, t.label]));
  return {
    nftId, name: ticket.name, venue: ticket.theaterName, limit: ticket.limitedNum, times,
    tiers: seat.map(s => ({
      ticketId: s.ticketId, name: s.name, scheduleId: s.scheduleId, show: timeLabel[s.scheduleId] || null,
      price: s.price, left: s.value, soldOut: s.status === 1,
    })),
  };
}

module.exports = { NFT_IDS, LOG_PREFIX, LAST_KEY, FIRST_KEY, MAX_ENTRIES, fetchProduct, tsNow };
