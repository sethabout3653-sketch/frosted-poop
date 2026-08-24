const http = require('http');
const https = require('https');
function testWS(url) {
  return new Promise((resolve) => {
    const req = https.request(url, { headers: { 'Connection': 'Upgrade', 'Upgrade': 'websocket' } });
    req.on('upgrade', (res, socket, head) => {
      console.log(url, 'UPGRADE SUCCESS', res.statusCode);
      socket.end();
      resolve(true);
    });
    req.on('error', (e) => {
      console.log(url, 'ERROR', e.message);
      resolve(false);
    });
    req.on('response', (res) => {
      console.log(url, 'NO UPGRADE', res.statusCode);
      resolve(false);
    });
    req.end();
  });
}
async function run() {
  await testWS('https://wisp.mercurywork.shop/');
  await testWS('https://wisp.terbiumon.top/wisp/');
}
run();
