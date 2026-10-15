// YUHZ 1ST EP [B] 团体视频签售 (10/26) — two Weidian items, one per shipping region.
// sold = base − current itemStock. Bases are the starting stock given for tracking.
const ITEMS = [
  { slug: 'kr', name: 'KR', itemId: '7872096927', label: '配送韩国地址 · Ships to Korea',          base: 999999999 },
  { slug: 'cn', name: 'CN', itemId: '7872077027', label: '配送大陆地址 · Ships to Mainland China', base: 999999999 },
];
// Combined sold count across ITEMS, logged as its own history
const TOTAL = { slug: 'total', name: 'TOTAL', label: 'KR + CN combined' };
const TRACKED = [TOTAL, ...ITEMS];
const MAX_ENTRIES = 2000;
const KEY_PREFIX = 'weidian1026:';

const historyKey = opt => KEY_PREFIX + opt.name;
const sourceUrl = itemId =>
  'https://thor.weidian.com/detail/getItemSkuInfo/1.0?param=' + encodeURIComponent(JSON.stringify({ itemId }));

// "YYYY-MM-DD HH:MM:SS" in KST, independent of the server's timezone
function tsNow() {
  return new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Seoul', hour12: false });
}

module.exports = { ITEMS, TOTAL, TRACKED, MAX_ENTRIES, KEY_PREFIX, historyKey, sourceUrl, tsNow };
