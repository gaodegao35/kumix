const https = require('https');

module.exports = (req, res) => {
  const username  = (req.query && req.query.username)  || 'xingjunwenhua';
  const proId     = (req.query && req.query.proId)     || '59143385';
  const channelId = (req.query && req.query.channelId) || '27864757';
  const body = `username=${encodeURIComponent(username)}&pro_id=${encodeURIComponent(proId)}&channel_id=${encodeURIComponent(channelId)}&regionCode=`;

  const request = https.request({
    hostname: 'www.imini.tv',
    path: '/mallorder/api/specinfo.php',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest',
      'Referer': `https://www.imini.tv/${username}/wap_pro/${proId}.html`,
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0 Safari/537.36',
      'Content-Length': Buffer.byteLength(body)
    }
  }, (apiRes) => {
    let data = '';
    apiRes.on('data', chunk => data += chunk);
    apiRes.on('end', () => {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.end(data);
    });
  });
  request.on('error', err => {
    res.status(500).json({ error: err.message });
  });
  request.write(body);
  request.end();
};
