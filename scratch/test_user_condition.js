async function run() {
  try {
    // 1. Save filter with standard single quotes
    const saveRes = await fetch('https://sila.silasystem.com:7103/General/GeneralAPI/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'SP_Name': 'APIPlusOperation' },
      body: JSON.stringify({
        Operation: 'SaveUserQueryPermission',
        LineData: JSON.stringify({
          Username: 'mhd',
          QueryID: 17, // Journal Entry Grid query ID
          SQLFilter: "JournalNumber = 'TJ2600030'",
          CondMode: 'sql',
          CondBuilder: '[]'
        }),
        User: 'sysadmin',
        AppVersionWeb: '225', PlatForm: 'web'
      })
    });
    const saveData = await saveRes.json();
    console.log('Save User Permission filter result:', saveData);

    // 2. Fetch journal entry grid data as user 'mhd'
    const fetchRes = await fetch('https://sila.silasystem.com:7103/General/GeneralAPI/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'SP_Name': 'APIPlusOperation' },
      body: JSON.stringify({
        Operation: 'Journal Entry',
        LineData: JSON.stringify({ fromDate: '2025-01-01', toDate: '2027-01-01' }),
        User: 'mhd', // Active user
        AppVersionWeb: '225', PlatForm: 'web'
      })
    });
    const fetchData = await fetchRes.json();
    console.log('Fetch Status State:', fetchData.State);
    console.log('Fetch Status Message:', fetchData.Message);
    console.log('Number of journal entries returned (should be 1):', fetchData.List0?.length || 0);
    if (fetchData.List0 && fetchData.List0.length > 0) {
      console.log('Returned journal entries:', fetchData.List0.map(j => ({ JournalNumber: j.JournalNumber, TotalDebitsBook: j.TotalDebitsBook })));
    }

    // 3. Clear/Delete the permission filter
    const clearRes = await fetch('https://sila.silasystem.com:7103/General/GeneralAPI/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'SP_Name': 'APIPlusOperation' },
      body: JSON.stringify({
        Operation: 'ExecuteScript',
        SqlStatement: "DELETE FROM PLS.UserQueryPermissions WHERE Username = ''mhd'' AND QueryID = 17;",
        AppVersionWeb: '225', PlatForm: 'web'
      })
    });
    const clearData = await clearRes.json();
    console.log('Cleanup permission filter result:', clearData);

  } catch (err) {
    console.error('Error:', err);
  }
}
run();
