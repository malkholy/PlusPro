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
  const content = fs.readFileSync(filePath, 'utf8');

  const batches = content.split(/^\s*GO\s*$/im)
                         .map(b => b.trim())
                         .filter(b => b.length > 0);

  const batch4 = batches[3];

  const successStr = stringToCharConcatenation('Success');

  // Prepend SELECT 1 AS Dummy; to force ExecuteReader
  const sql = `
    SELECT 1 AS Dummy;
    BEGIN TRY
        EXEC(${stringToCharConcatenation(batch4)});
        SELECT 0 AS ErrState, ${successStr} AS ErrMessage;
    END TRY
    BEGIN CATCH
        SELECT ERROR_NUMBER() AS ErrState, ERROR_MESSAGE() AS ErrMessage;
    END CATCH
  `;

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
    console.log('Result:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

run();
