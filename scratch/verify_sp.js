async function run() {
  try {
    const res = await fetch('https://sila.silasystem.com:7103/General/GeneralAPI/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'SP_Name': 'APIPlusQueryOperation'
      },
      body: JSON.stringify({
        Operation: 'ExecuteScript',
        SqlStatement: "SELECT definition FROM sys.sql_modules WHERE object_id = OBJECT_ID(''PLS.QJournalHeader'');",
        AppVersionWeb: '225',
        PlatForm: 'web'
      })
    });
    const data = await res.json();
    console.log(data.List0?.[0]?.definition);
  } catch (err) {
    console.error('Error:', err);
  }
}
run();
