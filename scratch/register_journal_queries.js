const queriesToRegister = [
  {
    PageGroupID: 'journal_model',
    QueryOperation: 'Get Active Segment Definitions',
    QueryName: 'Get Active Segment Definitions',
    SPName: '[PLS].[APIPlusJournalOperation]',
    Description: 'Get active general ledger segments definitions list',
    QuerySQL: 'SELECT * FROM PLS.QGetActiveSegmentDefinitions;',
    DatabaseName: 'ERPMega25',
    SchemaName: 'PLS',
    TableOrViewName: 'QGetActiveSegmentDefinitions',
    QueryType: 'Grid'
  },
  {
    PageGroupID: 'journal_model',
    QueryOperation: 'Get Journal Model List',
    QueryName: 'Get Journal Model List',
    SPName: '[PLS].[APIPlusJournalOperation]',
    Description: 'Get journal templates/models list',
    QuerySQL: 'SELECT * FROM PLS.QGetJournalModelList;',
    DatabaseName: 'ERPMega25',
    SchemaName: 'PLS',
    TableOrViewName: 'QGetJournalModelList',
    QueryType: 'Grid'
  },
  {
    PageGroupID: 'journal_model',
    QueryOperation: 'Get Journal Model For View',
    QueryName: 'Get Journal Model Header',
    SPName: '[PLS].[APIPlusJournalOperation]',
    Description: 'Get journal template details and segments',
    QuerySQL: 'SELECT * FROM PLS.QModelHeader WHERE ModelID = @View_ModelID;',
    DatabaseName: 'ERPMega25',
    SchemaName: 'PLS',
    TableOrViewName: 'QModelHeader',
    QueryType: 'Form'
  },
  {
    PageGroupID: 'accounting_events',
    QueryOperation: 'Get Events List',
    QueryName: 'Get Events List',
    SPName: '[PLS].[APIPlusJournalOperation]',
    Description: 'Get events list',
    QuerySQL: 'SELECT * FROM PLS.QGetEventsList;',
    DatabaseName: 'ERPMega25',
    SchemaName: 'PLS',
    TableOrViewName: 'QGetEventsList',
    QueryType: 'Grid'
  },
  {
    PageGroupID: 'accounting_functions',
    QueryOperation: 'Get Accounting Functions List',
    QueryName: 'Get Accounting Functions List',
    SPName: '[PLS].[APIPlusJournalOperation]',
    Description: 'Get accounting functions list',
    QuerySQL: 'SELECT * FROM PLS.QGetAccountingFunctionsList;',
    DatabaseName: 'ERPMega25',
    SchemaName: 'PLS',
    TableOrViewName: 'QGetAccountingFunctionsList',
    QueryType: 'Grid'
  },
  {
    PageGroupID: 'accounting_functions',
    QueryOperation: 'Get Accounting Function For Edit',
    QueryName: 'Get Accounting Function Header',
    SPName: '[PLS].[APIPlusJournalOperation]',
    Description: 'Get accounting function rules and sequences',
    QuerySQL: 'SELECT * FROM PLS.QAccountingFunctionsHeader WHERE FunctionPrefix = @Get_FunctionPrefix;',
    DatabaseName: 'ERPMega25',
    SchemaName: 'PLS',
    TableOrViewName: 'QAccountingFunctionsHeader',
    QueryType: 'Form'
  },
  {
    PageGroupID: 'accounting_macros',
    QueryOperation: 'Get Database Tables',
    QueryName: 'Get Database Tables',
    SPName: '[PLS].[APIPlusJournalOperation]',
    Description: 'Get database tables list for macro editor',
    QuerySQL: 'SELECT * FROM PLS.QGetDatabaseTables;',
    DatabaseName: 'ERPMega25',
    SchemaName: 'PLS',
    TableOrViewName: 'QGetDatabaseTables',
    QueryType: 'Grid'
  },
  {
    PageGroupID: 'accounting_macros',
    QueryOperation: 'Get Table Columns',
    QueryName: 'Get Table Columns',
    SPName: '[PLS].[APIPlusJournalOperation]',
    Description: 'Get table columns list for macro editor',
    QuerySQL: 'SELECT * FROM PLS.QGetTableColumns WHERE TableName = @SelectedTable;',
    DatabaseName: 'ERPMega25',
    SchemaName: 'PLS',
    TableOrViewName: 'QGetTableColumns',
    QueryType: 'Grid'
  },
  {
    PageGroupID: 'accounting_macros',
    QueryOperation: 'Get Macros List',
    QueryName: 'Get Macros List',
    SPName: '[PLS].[APIPlusJournalOperation]',
    Description: 'Get macros list',
    QuerySQL: 'SELECT * FROM PLS.QGetMacrosList;',
    DatabaseName: 'ERPMega25',
    SchemaName: 'PLS',
    TableOrViewName: 'QGetMacrosList',
    QueryType: 'Grid'
  },
  {
    PageGroupID: 'accounting_macros',
    QueryOperation: 'Get Macro For Edit',
    QueryName: 'Get Macro Header',
    SPName: '[PLS].[APIPlusJournalOperation]',
    Description: 'Get macro details and substitution lines',
    QuerySQL: 'SELECT * FROM PLS.QMacroHeader WHERE MacroID = @Get_MacroID;',
    DatabaseName: 'ERPMega25',
    SchemaName: 'PLS',
    TableOrViewName: 'QMacroHeader',
    QueryType: 'Form'
  },
  {
    PageGroupID: 'accounting_events',
    QueryOperation: 'Get Full Events List',
    QueryName: 'Get Full Events List',
    SPName: '[PLS].[APIPlusJournalOperation]',
    Description: 'Get all event headers and settings',
    QuerySQL: 'SELECT * FROM PLS.QGetFullEventsList;',
    DatabaseName: 'ERPMega25',
    SchemaName: 'PLS',
    TableOrViewName: 'QGetFullEventsList',
    QueryType: 'Grid'
  },
  {
    PageGroupID: 'accounting_events',
    QueryOperation: 'Get Event For Edit',
    QueryName: 'Get Event Header',
    SPName: '[PLS].[APIPlusJournalOperation]',
    Description: 'Get event rules and line definitions',
    QuerySQL: 'SELECT * FROM PLS.QEventHeader WHERE EventID = @Get_EventID;',
    DatabaseName: 'ERPMega25',
    SchemaName: 'PLS',
    TableOrViewName: 'QEventHeader',
    QueryType: 'Form'
  },
  {
    PageGroupID: 'cash_receive',
    QueryOperation: 'Get Cash Receives List',
    QueryName: 'Get Cash Receives List',
    SPName: '[PLS].[APIPlusJournalOperation]',
    Description: 'Get cash receivable receipts list',
    QuerySQL: 'SELECT * FROM PLS.QGetCashReceivesList;',
    DatabaseName: 'ERPMega25',
    SchemaName: 'PLS',
    TableOrViewName: 'QGetCashReceivesList',
    QueryType: 'Grid'
  },
  {
    PageGroupID: 'cash_receive',
    QueryOperation: 'Get Cash Receive For Edit',
    QueryName: 'Get Cash Receive Header',
    SPName: '[PLS].[APIPlusJournalOperation]',
    Description: 'Get cash receivable details and lines',
    QuerySQL: 'SELECT * FROM PLS.QCashReceivableHeader WHERE InternalID = @Get_CashID;',
    DatabaseName: 'ERPMega25',
    SchemaName: 'PLS',
    TableOrViewName: 'QCashReceivableHeader',
    QueryType: 'Form'
  },
  {
    PageGroupID: 'journal_entry',
    QueryOperation: 'Get Journal For Edit',
    QueryName: 'Get Journal For Edit',
    SPName: '[PLS].[APIPlusJournalOperation]',
    Description: 'Get journal details for edit',
    QuerySQL: 'SELECT * FROM PLS.QJournalHeader WHERE JournalNumber = @jNo AND EventNumber = @eNo;',
    DatabaseName: 'ERPMega25',
    SchemaName: 'PLS',
    TableOrViewName: 'QJournalHeader',
    QueryType: 'Form'
  },
  {
    PageGroupID: 'journal_entry',
    QueryOperation: 'Get Journal For View',
    QueryName: 'Get Journal For View',
    SPName: '[PLS].[APIPlusJournalOperation]',
    Description: 'Get journal details for view',
    QuerySQL: 'SELECT * FROM PLS.QJournalHeader WHERE JournalNumber = @jNo AND EventNumber = @eNo;',
    DatabaseName: 'ERPMega25',
    SchemaName: 'PLS',
    TableOrViewName: 'QJournalHeader',
    QueryType: 'Form'
  }
];

async function run() {
  console.log(`Starting registration of ${queriesToRegister.length} queries.`);

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
      if (data.State !== 0) {
        console.error('Registration failed for', q.QueryOperation);
        process.exit(1);
      }
    } catch (err) {
      console.error('Network or connection error:', err);
      process.exit(1);
    }
  }

  console.log('\nAll query master registrations and page links completed successfully!');
}

run();
