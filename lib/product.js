// my1pick #512 — YUHZ 1st EP [B] 발매기념 SPECIAL EVENT (sale 2026-11-08 14:00 ~ 11-09 23:59 KST)
// sold = base − current stock. Every option started at 9,999.
const PRODUCT_ID = '512';
const BASE = 9999;
const opt = (id, slug, name, group, label) => ({ id, slug, name, group, label, base: BASE });
const OPTIONS = [
  opt(976, 'cafe',     'CAFE',     'event', '카페 이벤트 · Cafe Event'),
  opt(977, 'call',     'CALL',     'event', '단체 영상통화 · Group Video Call'),
  opt(978, 'junseong', 'JUNSEONG', 'diy',   '1:1 DIY · 준성 JUNSEONG'),
  opt(979, 'bohyeon',  'BOHYEON',  'diy',   '1:1 DIY · 보현 BOHYEON'),
  opt(980, 'sechan',   'SECHAN',   'diy',   '1:1 DIY · 세찬 SECHAN'),
  opt(981, 'yeontae',  'YEONTAE',  'diy',   '1:1 DIY · 연태 YEONTAE'),
  opt(982, 'kai',      'KAI',      'diy',   '1:1 DIY · 카이 KAI'),
  opt(983, 'hyo',      'HYO',      'diy',   '1:1 DIY · 효 HYO'),
  opt(984, 'jaeil',    'JAEIL',    'diy',   '1:1 DIY · 재일 JAEIL'),
];
const TRACKED = OPTIONS;
const MAX_ENTRIES = 2000;
const KEY_PREFIX = 'pick' + PRODUCT_ID + ':';

const historyKey = o => KEY_PREFIX + o.name;
const sourceUrl = () => `https://shop.my1pick.com/api/v1/common/products/${PRODUCT_ID}?displayChannel=WEB`;

// "YYYY-MM-DD HH:MM:SS" in KST, independent of the server's timezone
function tsNow() {
  return new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Seoul', hour12: false });
}

module.exports = { PRODUCT_ID, OPTIONS, TRACKED, MAX_ENTRIES, KEY_PREFIX, historyKey, sourceUrl, tsNow };
