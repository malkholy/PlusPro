async function run() {
  try {
    const res = await fetch('https://sila.silasystem.com:7103/General/GeneralAPI/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'SP_Name': 'APIPlusOperation'
      },
      body: JSON.stringify({
        Operation: 'Login',
        LineData: JSON.stringify({ Username: 'mhd', Password: 'G123456' }),
        AppVersionWeb: '225',
        PlatForm: 'web'
      })
    });
    const data = await res.json();
    console.log('Login Response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error:', err);
  }
}
run();
