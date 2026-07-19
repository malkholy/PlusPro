async function run() {
  const tables = [
    'inv.ItemMaster',
    'cst.ItemCostSummary',
    'pro.BillOfMaterialHeaderL1',
    'pro.BillOfMaterialLineL1',
    'PRD.BillOfMaterialLine',
    'acr.PriceHistory',
    'acr.PriceTypeMaster',
    'inv.ItemUnit',
    'acr.CustomerInvoiceHeader',
    'acr.CustomerInvoiceLine',
    'acc.AccountsMaster',
    'acc.BankAccountsMaster',
    'acc.TaxAccountMaster',
    'acc.JournalYearMasterLines',
    'acc.JournalHeader',
    'acc.JournalDetails',
    'acc.JournalModelHeader',
    'acc.JournalModelDetails'
  ];

  for (const table of tables) {
    const parts = table.split('.');
    const schema = parts[0].toLowerCase();
    const name = parts[1].toLowerCase();
    
    const schemaChars = schema.split('').map(c => `CHAR(${c.charCodeAt(0)})`).join('+');
    const nameChars = name.split('').map(c => `CHAR(${c.charCodeAt(0)})`).join('+');
    
    // Replace '.' with CHAR(46) to avoid single quote syntax error
    const checkSql = `
      SELECT s.name + CHAR(46) + t.name AS TableName
      FROM sys.tables t
      INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
      WHERE LOWER(s.name) = ${schemaChars} AND LOWER(t.name) = ${nameChars};
    `;

    try {
      const res = await fetch('https://quick.glcpaints.com:7003/General/GeneralAPI/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'SP_Name': 'APIPlusQueryOperation'
        },
        body: JSON.stringify({
          Operation: 'ExecuteScript',
          SqlStatement: checkSql,
          AppVersionWeb: '225',
          PlatForm: 'web'
        })
      });
      const data = await res.json();
      if (!data.List0 || data.List0.length === 0) {
        console.log(`❌ Table DOES NOT exist: ${table}`);
      } else {
        console.log(`✅ Table exists: ${table}`);
      }
    } catch (err) {
      console.error(`Error checking ${table}:`, err);
    }
  }
}
run();
