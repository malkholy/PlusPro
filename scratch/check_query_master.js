async function run() {
  try {
    const res = await fetch('https://sila.silasystem.com:7103/General/GeneralAPI/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'SP_Name': 'APIPlusQueryOperation' },
      body: JSON.stringify({
        Operation: 'ExecuteScript',
        SqlStatement: "SELECT COUNT(*) AS Total FROM PLS.PageQueries;",
        AppVersionWeb: '225', PlatForm: 'web'
      })
    });
    const data = await res.json();
    console.log('PageQueries row count:', data.List0?.[0]?.Total);
  } catch (err) {
    console.error('Error:', err);
  }
}
run();
