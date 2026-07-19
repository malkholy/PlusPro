import fs from 'fs';
import path from 'path';

async function run() {
  const filePath = path.resolve('/Users/macbookpro/Documents/antigravity/PlusPro/SQLScript/APIPlusJournalOperation.sql');
  let content = fs.readFileSync(filePath, 'utf8');

  // Change ALTER to CREATE and name to APIPlusJournalOperationTest
  content = content.replace(/ALTER\s+PROCEDURE\s+\[?dbo\]?\.\[?APIPlusJournalOperation\]?/i, 'CREATE PROCEDURE [dbo].[APIPlusJournalOperationTest]');

  const batches = content.split(/^\s*GO\s*$/im)
                         .map(b => b.trim())
                         .filter(b => b.length > 0);

  const batch4 = batches[3];

  // For the inner dynamic SQL string:
  // Every single quote in batch4 must be quadrupled (''''):
  // 1. Double single quotes for outer T-SQL EXEC('') literal: ' -> ''
  // 2. Double again for the C# concatenator: '' -> ''''
  const escapedBatch4 = batch4.replace(/'/g, "''''");

  const sql = `
    SELECT 1 AS Dummy;
    BEGIN TRY
        BEGIN TRANSACTION;
        EXEC(''${escapedBatch4}'');
        ROLLBACK TRANSACTION;
        SELECT 0 AS ErrState, ''Success'' AS ErrMessage;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        SELECT ERROR_NUMBER() AS ErrState, ERROR_MESSAGE() AS ErrMessage;
    END CATCH
  `;

  // For C# concatenator:
  // We double all single quotes in the outer sql string
  const finalSql = sql.replace(/'/g, "''");

  try {
    const res = await fetch('https://sila.silasystem.com:7103/General/GeneralAPI/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'SP_Name': 'APIPlusQueryOperation'
      },
      body: JSON.stringify({
        Operation: 'ExecuteScript',
        SqlStatement: finalSql,
        AppVersionWeb: '225',
        PlatForm: 'web'
      })
    });
    const data = await res.json();
    console.log('Result:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

run();
