async function run() {
  const tsql = "SELECT * FROM PLS.QJournalHeader WHERE (@jeFrom is null or [JournalDate] >= @jeFrom) and (@jeTo is null or [JournalDate] <= @jeTo);";
  const params = "@FromDate datetime, @ToDate datetime, @PONumber varchar(100), @ItemCode varchar(100), @ItemID int, @SaftyStock decimal(18,5), @LeadTime int, @PermUser varchar(100), @PermPageGroupID varchar(100), @PermCanView bit, @View_ModelID int, @Get_FunctionPrefix varchar(100), @SelectedTable varchar(100), @Get_MacroID int, @Get_EventID int, @Get_CashID int, @jNo varchar(100), @eNo int, @jeFrom datetime, @jeTo datetime, @sjeFrom datetime, @sjeTo datetime";
  
  const sql = `
    SELECT name, error_number, error_message
    FROM sys.dm_exec_describe_first_result_set(
        ''${tsql.replace(/'/g, "''''")}'',
        ''${params.replace(/'/g, "''''")}'',
        0
    );
  `;

  try {
    const res = await fetch('https://sila.silasystem.com:7103/General/GeneralAPI/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'SP_Name': 'APIPlusQueryOperation' },
      body: JSON.stringify({
        Operation: 'ExecuteScript',
        SqlStatement: sql,
        AppVersionWeb: '225', PlatForm: 'web'
      })
    });
    const data = await res.json();
    console.log('Describe results count:', data.List0?.length || 0);
    if (data.List0 && data.List0.length > 0) {
      console.log('Sample column names:', data.List0.slice(0, 5).map(c => c.name));
    }
  } catch (err) {
    console.error('Error:', err);
  }
}
run();
