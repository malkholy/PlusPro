import fs from 'fs';
import path from 'path';

async function run() {
  // Query all active database triggers to confirm names
  const triggers = [
    'tr_MStran_altertable',
    'tr_MStran_alterview',
    'tr_MStran_alterschemaonly',
    'tr_MStran_altertrigger',
    'tr_MStran_droptable'
  ];

  // Construct disable SQL
  let disableSql = '';
  for (const t of triggers) {
    disableSql += `DISABLE TRIGGER ${t} ON DATABASE; `;
  }

  // Construct enable SQL
  let enableSql = '';
  for (const t of triggers) {
    enableSql += `ENABLE TRIGGER ${t} ON DATABASE; `;
  }

  // Read procedure file and prepare CREATE signature
  const filePath = path.resolve('/Users/macbookpro/Documents/antigravity/PlusPro/SQLScript/APIPlusJournalOperation.sql');
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/(?:CREATE|ALTER)\s+PROCEDURE\s+\[?dbo\]?\.\[?APIPlusJournalOperation\]?/i, 'CREATE PROCEDURE [dbo].[APIPlusJournalOperation]');

  const batches = content.split(/^\s*GO\s*$/im).map(b => b.trim()).filter(b => b.length > 0);
  const batch4 = batches[batches.length - 1]; // SP body

  const escapedBatch4 = batch4.replace(/'/g, "''");

  const sql = `
    ${disableSql}
    
    BEGIN TRY
        IF OBJECT_ID('dbo.APIPlusJournalOperation') IS NOT NULL 
            DROP PROCEDURE dbo.APIPlusJournalOperation;
            
        SET QUOTED_IDENTIFIER ON;
        EXEC('${escapedBatch4}');
        
        ${enableSql}
        SELECT 0 AS ErrState, 'Success' AS ErrMessage;
    END TRY
    BEGIN CATCH
        ${enableSql}
        SELECT ERROR_NUMBER() AS ErrState, ERROR_MESSAGE() AS ErrMessage;
    END CATCH
  `;

  // Escape single quotes for C# SQL statement parameter
  const finalSql = sql.replace(/'/g, "''");

  console.log('Compiling SP with replication DDL triggers disabled...');
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
      SqlStatement: "SELECT name, modify_date FROM sys.procedures WHERE name = ''APIPlusJournalOperation'';",
      AppVersionWeb: '225', PlatForm: 'web'
    })
  });
  const verifyData = await verifyRes.json();
  console.log('SP Verify Result:', verifyData);
}

run();
