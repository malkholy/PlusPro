const views = [
  'QGetActiveSegmentDefinitions',
  'QGetJournalModelList',
  'QModelHeader',
  'QModelLine',
  'QModelLineDetails',
  'QGetEventsList',
  'QGetAccountingFunctionsList',
  'QAccountingFunctionsHeader',
  'QAccountingFunctionDocumentHeader',
  'QAccountingFunctionDocumentDetails',
  'QAccountingFunctionDocumentSequence',
  'QGetDatabaseTables',
  'QGetTableColumns',
  'QGetMacrosList',
  'QMacroHeader',
  'QMacroLine',
  'QGetFullEventsList',
  'QEventHeader',
  'QEventLine',
  'QGetCashReceivesList',
  'QCashReceivableHeader',
  'QCashReceivableLine',
  'QJournalHeader',
  'QJournalLine',
  'QJournalLineWF',
  'QJournalLineError'
];

async function run() {
  console.log(`Testing ${views.length} views...`);

  for (const view of views) {
    const sql = `SELECT TOP 1 * FROM PLS.${view};`;
    const start = Date.now();
    try {
      const res = await fetch('https://sila.silasystem.com:7103/General/GeneralAPI/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'SP_Name': 'APIPlusQueryOperation'
        },
        body: JSON.stringify({
          Operation: 'ExecuteScript',
          SqlStatement: sql,
          AppVersionWeb: '225',
          PlatForm: 'web'
        })
      });
      const data = await res.json();
      if (data.State !== 0) {
        console.error(`❌ View PLS.${view} failed: ${data.Message} (${Date.now() - start} ms)`);
      } else {
        console.log(`✅ View PLS.${view} succeeded (${Date.now() - start} ms)`);
      }
    } catch (err) {
      console.error(`❌ Network error on PLS.${view}:`, err);
    }
  }
}
run();
