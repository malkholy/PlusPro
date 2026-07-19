process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const url = 'https://sila.silasystem.com:7103/General/GeneralAPI/';
const spName = 'APIPlusOperation';

async function test(operation, lineData = null) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'SP_Name': spName
      },
      body: JSON.stringify({
        AppVersionWeb: '225',
        AppVersionAndroid: '225',
        AppVersionIos: '225',
        AppVersionDesktop: '225',
        FireBaseToken: '',
        PlatForm: 'web',
        deviceID: '',
        IP: '192.168.1.3',
        Operation: operation,
        LineData: lineData ? JSON.stringify(lineData) : null,
        User: 'sysadmin'
      })
    });
    const text = await res.text();
    const data = JSON.parse(text);
    console.log(`--- ${operation} ---`);
    console.log(`State: ${data.State}, Message: ${data.Message}`);
    if (data.List0) {
      console.log(`List0 length: ${data.List0.length}`);
      if (data.List0.length > 0) {
        console.log(`First row:`, data.List0[0]);
      }
    }
  } catch (e) {
    console.error(e);
  }
}

async function run() {
  await test('Accounts Master All');
  await test('Account Statement Lines', { param1: '111001', param2: '', param3: '2026-07-04' });
}

run();
