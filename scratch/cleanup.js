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
        SqlStatement: "IF OBJECT_ID(''dbo.TempTestSP'') IS NOT NULL DROP PROCEDURE dbo.TempTestSP;",
        AppVersionWeb: '225',
        PlatForm: 'web'
      })
    });
    const data = await res.json();
    console.log('Cleanup result:', data);
  } catch (err) {
    console.error('Error:', err);
  }
}
run();
