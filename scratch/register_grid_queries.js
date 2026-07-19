const queriesToRegister = [
  {
    PageGroupID: 'journal_entry',
    QueryOperation: 'Journal Entry',
    QueryName: 'Journal Entry',
    SPName: '[dbo].[APIPlusOperation]',
    Description: 'Get journal entries list',
    QuerySQL: 'SELECT * FROM PLS.QJournalHeader WHERE (@jeFrom is null or [JournalDate] >= @jeFrom) and (@jeTo is null or [JournalDate] <= @jeTo);',
    DatabaseName: 'ERPMega25',
    SchemaName: 'PLS',
    TableOrViewName: 'QJournalHeader',
    QueryType: 'Grid'
  },
  {
    PageGroupID: 'smart_journal',
    QueryOperation: 'Smart Journal Entry',
    QueryName: 'Smart Journal Entry',
    SPName: '[dbo].[APIPlusOperation]',
    Description: 'Get smart journal entries list',
    QuerySQL: 'SELECT * FROM PLS.QJournalHeader WHERE (@sjeFrom is null or [JournalDate] >= @sjeFrom) and (@sjeTo is null or [JournalDate] <= @sjeTo) and isnull([JournalModelID], 0) <> 0;',
    DatabaseName: 'ERPMega25',
    SchemaName: 'PLS',
    TableOrViewName: 'QJournalHeader',
    QueryType: 'Grid'
  }
];

async function run() {
  console.log(`Registering ${queriesToRegister.length} grid queries in Query Master...`);

  for (let i = 0; i < queriesToRegister.length; i++) {
    const q = queriesToRegister[i];
    console.log(`[${i+1}/${queriesToRegister.length}] Registering operation "${q.QueryOperation}" for page "${q.PageGroupID}"...`);

    const payload = {
      PageGroupID: q.PageGroupID,
      QueryName: q.QueryName,
      SPName: q.SPName,
      QueryOperation: q.QueryOperation,
      Description: q.Description,
      QuerySQL: q.QuerySQL,
      DatabaseName: q.DatabaseName,
      SchemaName: q.SchemaName,
      TableOrViewName: q.TableOrViewName,
      QueryType: q.QueryType,
      ApiUrl: ''
    };

    const start = Date.now();
    try {
      const res = await fetch('https://sila.silasystem.com:7103/General/GeneralAPI/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'SP_Name': 'APIPlusQueryOperation'
        },
        body: JSON.stringify({
          Operation: 'CreateQueryView',
          LineData: JSON.stringify(payload),
          User: 'sysadmin',
          SqlStatement: null,
          AppVersionWeb: '225',
          PlatForm: 'web'
        })
      });
      const data = await res.json();
      console.log(`Result: State=${data.State}, Message=${data.Message} (${Date.now() - start} ms)`);
    } catch (err) {
      console.error('Error:', err);
    }
  }
}

run();
