process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const url = 'https://sila.silasystem.com:7103/General/GeneralAPI/';
const spName = 'APIPlusOperation';

async function queryJournalStats() {
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
        Operation: 'Get Journal Lines Sample', // we will implement this temporary operation in SQL to debug!
        LineData: null,
        User: 'sysadmin'
      })
    });
    const text = await res.text();
    console.log(text);
  } catch (e) {
    console.error(e);
  }
}

queryJournalStats();
