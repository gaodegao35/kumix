// my1pick #496 — YUHZ 1st EP [B] MEET & CALL EVENT
// sold = base − current stock. Bases are the stock values given for tracking.
const PRODUCT_ID = '496';
const OPTIONS = [
  { id: 911, slug: 'offline', name: 'OFFLINE', label: '대면 팬사인회 · Offline Fansign', base: 9974 },
  { id: 912, slug: 'online',  name: 'ONLINE',  label: '영상통화 · Video Call (Online)',   base: 9999 },
];
const MAX_ENTRIES = 2000;

const historyKey = opt => 'pick' + PRODUCT_ID + ':' + opt.name;

// "YYYY-MM-DD HH:MM:SS" in KST, independent of the server's timezone
function tsNow() {
  return new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Seoul', hour12: false });
}

module.exports = { PRODUCT_ID, OPTIONS, MAX_ENTRIES, historyKey, tsNow };
