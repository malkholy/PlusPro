async function run() {
  try {
    // 1. Save filter for 'm.sadek' on 'Journal Entry' query
    await fetch('https://sila.silasystem.com:7103/General/GeneralAPI/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'SP_Name': 'APIPlusOperation' },
      body: JSON.stringify({
        Operation: 'SaveUserQueryPermission',
        LineData: JSON.stringify({
          Username: 'm.sadek',
          QueryID: 17,
          SQLFilter: "JournalNumber = 'TJ2600030'",
          CondMode: 'sql',
          CondBuilder: '[]'
        }),
        User: 'sysadmin',
        AppVersionWeb: '225', PlatForm: 'web'
      })
    });

    // 2. Fetch as admin 'sysadmin'
    let res = await fetch('https://sila.silasystem.com:7103/General/GeneralAPI/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'SP_Name': 'APIPlusOperation' },
      body: JSON.stringify({
        Operation: 'Journal Entry',
        LineData: JSON.stringify({ fromDate: '2025-01-01', toDate: '2027-01-01' }),
        User: 'sysadmin', // Admin user
        AppVersionWeb: '225', PlatForm: 'web'
      })
    });
    let data = await res.json();
    console.log('Admin user (sysadmin) total entries returned:', data.List0?.length || 0);

    // 3. Fetch as user 'm.sadek' (who has IsAdmin = 0)
    res = await fetch('https://sila.silasystem.com:7103/General/GeneralAPI/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'SP_Name': 'APIPlusOperation' },
      body: JSON.stringify({
        Operation: 'Journal Entry',
        LineData: JSON.stringify({ fromDate: '2025-01-01', toDate: '2027-01-01' }),
        User: 'm.sadek', // Non-admin user
        AppVersionWeb: '225', PlatForm: 'web'
      })
    });
    data = await res.json();
    console.log('Non-admin user (m.sadek) total entries returned (should be 1):', data.List0?.length || 0);
    if (data.List0 && data.List0.length > 0) {
      console.log('Returned entries for m.sadek:', data.List0.map(j => ({ JournalNumber: j.JournalNumber, TotalDebitsBook: j.TotalDebitsBook })));
    }

    // 4. Cleanup
    await fetch('https://sila.silasystem.com:7103/General/GeneralAPI/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'SP_Name': 'APIPlusOperation' },
      body: JSON.stringify({
        Operation: 'ExecuteScript',
        SqlStatement: "DELETE FROM PLS.UserQueryPermissions WHERE Username = ''m.sadek'' AND QueryID = 17;",
        AppVersionWeb: '225', PlatForm: 'web'
      })
    });

  } catch (err) {
    console.error('Error:', err);
  }
}
run();
