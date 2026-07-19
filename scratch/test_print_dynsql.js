async function run() {
  const sql = `
    DECLARE @jeFrom date = '2025-01-01';
    DECLARE @jeTo date = '2027-01-01';
    DECLARE @User nvarchar(100) = 'mhd';
    DECLARE @SQLFilter nvarchar(max) = 'JournalNumber = ''TJ2600030''';
    
    DECLARE @DynSQL nvarchar(max) = N'
        select 
            [EventNumber], [JournalYear], [JournalDate], [JournalState], [JournalNumber], [JournalDescription],
            isnull([TotalDebitsBook], 0) as TotalDebitsBook, isnull([TotalCreditsBook], 0) as TotalCreditsBook,
            isnull([TotalDebitsTransaction], 0) as TotalDebitsTransaction, isnull([TotalCreditsTransaction], 0) as TotalCreditsTransaction,
            isnull([TotalLines], 0) as TotalLines, [JournalCreatedBy], [JournalCreatedDate], [JournalLastMaintBy],
            [JournalLastMaintDate], [OrginalDoucmentPrefix], [OrginalDoucmentNumber], [JournalSource], [JournalModelID],
            [JournalInUse], [JournalInUseBy], [AttachmentID], [PostDate], [PostBy]
        from [PLS].[QJournalHeader]
        where (@jeFrom is null or [JournalDate] >= @jeFrom)
          and (@jeTo is null or [JournalDate] <= @jeTo)
          and (' + @SQLFilter + N')
        order by [JournalDate] desc, [JournalNumber] desc
    ';
    SELECT @DynSQL AS GeneratedSQL;
  `;

  try {
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
    console.log(data.List0?.[0]?.GeneratedSQL);
  } catch (err) {
    console.error('Error:', err);
  }
}
run();
