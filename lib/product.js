// Weidian item 7872096927 — [(1026)团体视频签售] YUHZ 1ST EP [B]
// sold = base − current itemStock. The base is the starting stock given for tracking.
const ITEM_ID = '7872096927';
const SOURCE_URL = 'https://thor.weidian.com/detail/getItemSkuInfo/1.0?param=' +
  encodeURIComponent(JSON.stringify({ itemId: ITEM_ID }));
const OPTIONS = [
  { slug: 'weidian', name: 'WEIDIAN', label: '团体视频签售 · Group Video Fansign (10/26)', base: 999999999 },
];
const MAX_ENTRIES = 2000;
const KEY_PREFIX = 'weidian' + ITEM_ID + ':';

const historyKey = opt => KEY_PREFIX + opt.name;

// "YYYY-MM-DD HH:MM:SS" in KST, independent of the server's timezone
function tsNow() {
  return new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Seoul', hour12: false });
}

module.exports = { ITEM_ID, SOURCE_URL, OPTIONS, MAX_ENTRIES, KEY_PREFIX, historyKey, tsNow };
