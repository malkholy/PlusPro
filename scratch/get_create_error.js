import fs from 'fs';
import path from 'path';

function stringToCharConcatenation(str) {
  if (str.length === 0) {
    return "''";
  }
  return str.split('').map(c => `CHAR(${c.charCodeAt(0)})`).join('+');
}

async function run() {
  const filePath = path.resolve('/Users/macbookpro/Documents/antigravity/PlusPro/SQLScript/APIPlusJournalOperation.sql');
  let content = fs.readFileSync(filePath, 'utf8');

  // Ensure signature is CREATE PROCEDURE [dbo].[APIPlusJournalOperation]
  content = content.replace(/(?:CREATE|ALTER)\s+PROCEDURE\s+\[?dbo\]?\.\[?APIPlusJournalOperation\]?/i, 'CREATE PROCEDURE [dbo].[APIPlusJournalOperation]');

  const batches = content.split(/^\s*GO\s*$/im).map(b => b.trim()).filter(b => b.length > 0);
  const batch4 = batches[batches.length - 1]; // Use the last batch (which is the SP body)

  const escapedBatch4 = batch4.replace(/'/g, "''");

  const sql = `
    SELECT 1 AS Dummy;
    BEGIN TRY
        IF OBJECT_ID('dbo.APIPlusJournalOperation') IS NOT NULL 
            DROP PROCEDURE dbo.APIPlusJournalOperation;
            
        SET QUOTED_IDENTIFIER ON;
        EXEC('${escapedBatch4}');
        SELECT 0 AS ErrState, 'Success' AS ErrMessage;
    END TRY
    BEGIN CATCH
        SELECT ERROR_NUMBER() AS ErrState, ERROR_MESSAGE() AS ErrMessage;
    END CATCH
  `;

  // We convert single-quoted literals in finalSql to CHAR concatenation
  const finalSql = sql.replace(/'([^']*)'/g, (match, p1) => {
    return stringToCharConcatenation(p1);
  });

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
