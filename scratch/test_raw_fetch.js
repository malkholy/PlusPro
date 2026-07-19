async function run() {
  try {
    // 1. Set the filter
    await fetch('https://sila.silasystem.com:7103/General/GeneralAPI/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'SP_Name': 'APIPlusOperation' },
      body: JSON.stringify({
        Operation: 'SaveUserQueryPermission',
        LineData: JSON.stringify({
          Username: 'mhd',
          QueryID: 17,
          SQLFilter: "JournalNumber = ''TJ2600030''",
          CondMode: 'sql',
          CondBuilder: '[]'
        }),
        User: 'sysadmin',
        AppVersionWeb: '225', PlatForm: 'web'
      })
    });

    // 2. Fetch raw response
    const fetchRes = await fetch('https://sila.silasystem.com:7103/General/GeneralAPI/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'SP_Name': 'APIPlusOperation' },
      body: JSON.stringify({
        Operation: 'Journal Entry',
        LineData: JSON.stringify({ fromDate: '2025-01-01', toDate: '2027-01-01' }),
        User: 'mhd',
        AppVersionWeb: '225', PlatForm: 'web'
      })
    });
    const text = await fetchRes.text();
    console.log('Raw response text:', text);

    // 3. Cleanup
    await fetch('https://sila.silasystem.com:7103/General/GeneralAPI/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'SP_Name': 'APIPlusOperation' },
      body: JSON.stringify({
        Operation: 'ExecuteScript',
        SqlStatement: "DELETE FROM PLS.UserQueryPermissions WHERE Username = ''mhd'' AND QueryID = 17;",
        AppVersionWeb: '225', PlatForm: 'web'
      })
    });
  } catch (err) {
    console.error('Error:', err);
  }
}
run();
