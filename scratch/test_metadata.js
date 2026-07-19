const url = 'https://sila.silasystem.com:7103/General/GeneralAPI/';
const spName = 'APIPlusOperation';

// Ignore self-signed certificate warnings
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function test() {
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
        Operation: 'BOM L1 Header',
        LineData: '',
        User: 'sysadmin'
      })
    });
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error(e);
  }
}

test();
