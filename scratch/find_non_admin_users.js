async function run() {
  try {
    const res = await fetch('https://sila.silasystem.com:7103/General/GeneralAPI/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'SP_Name': 'APIPlusQueryOperation' },
      body: JSON.stringify({
        Operation: 'ExecuteScript',
        SqlStatement: "SELECT Username, IsAdmin FROM ERPManagement25.system.UserMaster WHERE IsAdmin = 0 OR IsAdmin IS NULL;",
        AppVersionWeb: '225', PlatForm: 'web'
      })
    });
    const data = await res.json();
    console.log('Non-admin users:', data.List0);
  } catch (err) {
    console.error('Error:', err);
  }
}
run();
