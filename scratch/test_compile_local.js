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

  // Change ALTER to CREATE and name to APIPlusJournalOperationTest
  content = content.replace(/ALTER\s+PROCEDURE\s+\[?dbo\]?\.\[?APIPlusJournalOperation\]?/i, 'CREATE PROCEDURE [dbo].[APIPlusJournalOperationTest]');

  const batches = content.split(/^\s*GO\s*$/im)
                         .map(b => b.trim())
                         .filter(b => b.length > 0);

  const batch4 = batches[3];

  // We escape single quotes in batch4 by doubling them
  const escapedBatch4 = batch4.replace(/'/g, "''");

  const successStr = stringToCharConcatenation('Success');

  // Force ExecuteReader by prepending SELECT 1 AS Dummy;
  const sql = `
    SELECT 1 AS Dummy;
    BEGIN TRY
        BEGIN TRANSACTION;
        EXEC('${escapedBatch4}');
        ROLLBACK TRANSACTION;
        SELECT 0 AS ErrState, ${successStr} AS ErrMessage;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        SELECT ERROR_NUMBER() AS ErrState, ERROR_MESSAGE() AS ErrMessage;
    END CATCH
  `;

  // We char-concatenate the ENTIRE sql query so that there are no single quotes in the payload at all!
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
