async function run() {
  const sql = `
    DECLARE @State int;
    DECLARE @Message nvarchar(500);
    
    BEGIN TRY
      EXEC dbo.APIPlusOperation 
          @Operation = 'Journal Entry', 
          @LineData = '{"fromDate":"2025-01-01","toDate":"2027-01-01"}', 
          @User = 'mhd', 
          @State = @State OUTPUT, 
          @Message = @Message OUTPUT;
          
      SELECT @State AS State, @Message AS Message;
    END TRY
    BEGIN CATCH
      SELECT ERROR_NUMBER() AS State, ERROR_MESSAGE() AS Message;
    END CATCH
  `;

  try {
    // Let's set the filter first
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

    const res = await fetch('https://sila.silasystem.com:7103/General/GeneralAPI/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'SP_Name': 'APIPlusQueryOperation' },
      body: JSON.stringify({
        Operation: 'ExecuteScript',
        SqlStatement: sql.replace(/'/g, "''"),
        AppVersionWeb: '225', PlatForm: 'web'
      })
    });
    const data = await res.json();
    console.log('SP execution results:', data);

    // Cleanup
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
