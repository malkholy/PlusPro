const https = require('https');

const data = JSON.stringify({
  Operation: 'Get Active Segment Definitions',
  LineData: null,
  User: 'mhd',
  FireBaseToken: '',
  AppVersionWeb: '225',
  AppVersionAndroid: '225',
  AppVersionIos: '225',
  AppVersionDesktop: '225',
  PlatForm: 'web',
  deviceID: '',
  IP: '192.168.1.3'
});

const options = {
  hostname: 'sila.silasystem.com',
  port: 7103,
  path: '/General/GeneralAPI/',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data),
    'SP_Name': 'APIPlusJournalOperation'
  },
  rejectUnauthorized: false
};

const req = https.request(options, (res) => {
  let responseData = '';
  res.on('data', (chunk) => { responseData += chunk; });
  res.on('end', () => {
    console.log(responseData);
  });
});
req.on('error', (e) => { console.error(e); });
req.write(data);
req.end();
