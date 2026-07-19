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
        SqlStatement: "SELECT session_id, open_transaction_count, status FROM sys.dm_exec_sessions WHERE open_transaction_count > 0;",
        AppVersionWeb: '225',
        PlatForm: 'web'
      })
    });
    const data = await res.json();
    console.log(data.List0 || []);
  } catch (err) {
    console.error('Error:', err);
  }
}
run();
