async function run() {
  try {
    // 1. Get the QueryID for 'Journal Entry'
    let res = await fetch('https://sila.silasystem.com:7103/General/GeneralAPI/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'SP_Name': 'APIPlusQueryOperation' },
      body: JSON.stringify({
        Operation: 'ExecuteScript',
        SqlStatement: "SELECT QueryID FROM PLS.QueryMaster WHERE Operation = ''Journal Entry'';",
        AppVersionWeb: '225', PlatForm: 'web'
      })
    });
    let data = await res.json();
    const queryId = data.List0?.[0]?.QueryID;
    console.log('QueryID for "Journal Entry":', queryId);

    if (!queryId) {
      console.error('Journal Entry query not found in QueryMaster!');
      return;
    }

    // 2. Call GetQueryFields API
    res = await fetch('https://sila.silasystem.com:7103/General/GeneralAPI/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'SP_Name': 'APIPlusOperation'
      },
      body: JSON.stringify({
        Operation: 'GetQueryFields',
        LineData: JSON.stringify({ QueryID: queryId }),
        AppVersionWeb: '225',
        PlatForm: 'web'
      })
    });
    data = await res.json();
    console.log('GetQueryFields State:', data.State);
    console.log('GetQueryFields Message:', data.Message);
    console.log('Fields returned count:', data.List0?.length || 0);
    if (data.List0 && data.List0.length > 0) {
      console.log('Sample fields:', data.List0.slice(0, 5).map(f => f.FieldName));
    }
  } catch (err) {
    console.error('Error:', err);
  }
}
run();
