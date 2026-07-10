const https = require('https');

module.exports = (req, res) => {
  const productId = req.query && req.query.productId;
  if (!productId || !/^\d+$/.test(productId)) {
    res.status(400).json({ error: 'productId required' });
    return;
  }
  const apiUrl = `https://shop.my1pick.com/api/v1/common/products/${productId}?displayChannel=WEB`;

  https.get(apiUrl, { headers: { 'Accept': 'application/json' } }, (apiRes) => {
    let data = '';
    apiRes.on('data', chunk => data += chunk);
    apiRes.on('end', () => {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.end(data);
    });
  }).on('error', err => {
    res.status(500).json({ error: err.message });
  });
};
