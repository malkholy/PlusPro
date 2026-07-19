const url = 'http://sila.silasystem.com:7103/General/GeneralAPI/';
const spName = 'APIPlusOperation';

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
        Operation: 'Login',
        LineData: JSON.stringify({ Username: 'sysadmin', Password: '1' }),
        User: ''
      })
    });
    const text = await res.text();
    console.log(text);
  } catch (e) {
    console.error(e);
  }
}

test();
