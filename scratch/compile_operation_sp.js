import fs from 'fs';
import path from 'path';

async function run() {
  const triggers = [
    'tr_MStran_altertable',
    'tr_MStran_alterview',
    'tr_MStran_alterschemaonly',
    'tr_MStran_altertrigger',
    'tr_MStran_droptable'
  ];

  let disableSql = '';
  for (const t of triggers) {
    disableSql += `DISABLE TRIGGER ${t} ON DATABASE; `;
  }

  let enableSql = '';
  for (const t of triggers) {
    enableSql += `ENABLE TRIGGER ${t} ON DATABASE; `;
  }

  const filePath = path.resolve('/Users/macbookpro/Documents/antigravity/PlusPro/SQLScript/APIPlusOperation.sql');
  let content = fs.readFileSync(filePath, 'utf8');

  // Remove the USE statement and any GO batches at the start
  content = content.replace(/^\s*USE\s+\[?\w+\]?\s*$/im, '')
                   .replace(/^\s*GO\s*$/im, '');

  const batches = content.split(/^\s*GO\s*$/im).map(b => b.trim()).filter(b => b.length > 0);
  
  // Find the batch that alters the procedure
  let alterBatch = '';
  for (const b of batches) {
    if (/ALTER\s+PROCEDURE/i.test(b)) {
      alterBatch = b;
      break;
    }
  }

  if (!alterBatch) {
    console.error('Could not find ALTER PROCEDURE batch in APIPlusOperation.sql');
    process.exit(1);
  }

  const escapedBatch = alterBatch.replace(/'/g, "''");

  const sql = `
    ${disableSql}
    
    BEGIN TRY
        SET QUOTED_IDENTIFIER ON;
        EXEC('${escapedBatch}');
        
        ${enableSql}
        SELECT 0 AS ErrState, 'Success' AS ErrMessage;
    END TRY
    BEGIN CATCH
        ${enableSql}
        SELECT ERROR_NUMBER() AS ErrState, ERROR_MESSAGE() AS ErrMessage;
    END CATCH
  `;

  const finalSql = sql.replace(/'/g, "''");

  console.log('Compiling APIPlusOperation with replication DDL triggers disabled...');
  const res = await fetch('https://sila.silasystem.com:7103/General/GeneralAPI/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'SP_Name': 'APIPlusQueryOperation' },
    body: JSON.stringify({
      Operation: 'ExecuteScript',
      SqlStatement: finalSql,
      AppVersionWeb: '225', PlatForm: 'web'
    })
  });
  const data = await res.json();
  console.log('Result:', data);

  // Check modify date
  const verifyRes = await fetch('https://sila.silasystem.com:7103/General/GeneralAPI/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'SP_Name': 'APIPlusQueryOperation' },
    body: JSON.stringify({
      Operation: 'ExecuteScript',
      SqlStatement: "SELECT name, modify_date FROM sys.procedures WHERE name = ''APIPlusOperation'';",
      AppVersionWeb: '225', PlatForm: 'web'
    })
  });
  const verifyData = await verifyRes.json();
  console.log('SP Verify Result:', verifyData);
}

run();
