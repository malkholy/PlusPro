async function run() {
  try {
    console.log('1. Creating test procedure...');
    let res = await fetch('https://sila.silasystem.com:7103/General/GeneralAPI/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'SP_Name': 'APIPlusQueryOperation'
      },
      body: JSON.stringify({
        Operation: 'ExecuteScript',
        SqlStatement: "CREATE PROCEDURE dbo.TempTestSP AS BEGIN SELECT 99 AS Val; END;",
        AppVersionWeb: '225',
        PlatForm: 'web'
      })
    });
    let data = await res.json();
    console.log('Create result:', data);

    console.log('\n2. Verifying test procedure exists...');
    res = await fetch('https://sila.silasystem.com:7103/General/GeneralAPI/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'SP_Name': 'APIPlusQueryOperation'
      },
      body: JSON.stringify({
        Operation: 'ExecuteScript',
        SqlStatement: "SELECT name, modify_date FROM sys.procedures WHERE name = CHAR(84)+CHAR(101)+CHAR(109)+CHAR(112)+CHAR(84)+CHAR(101)+CHAR(115)+CHAR(116)+CHAR(83)+CHAR(80);",
        AppVersionWeb: '225',
        PlatForm: 'web'
      })
    });
    data = await res.json();
    console.log('Verify result:', data);

    console.log('\n3. Dropping test procedure...');
    res = await fetch('https://sila.silasystem.com:7103/General/GeneralAPI/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'SP_Name': 'APIPlusQueryOperation'
      },
      body: JSON.stringify({
        Operation: 'ExecuteScript',
        SqlStatement: "DROP PROCEDURE dbo.TempTestSP;",
        AppVersionWeb: '225',
        PlatForm: 'web'
      })
    });
    data = await res.json();
    console.log('Drop result:', data);

  } catch (err) {
    console.error('Error:', err);
  }
}
run();
