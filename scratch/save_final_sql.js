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

  content = content.replace(/(?:CREATE|ALTER)\s+PROCEDURE\s+\[?dbo\]?\.\[?APIPlusJournalOperation\]?/i, 'CREATE PROCEDURE [dbo].[APIPlusJournalOperation]');

  const batches = content.split(/^\s*GO\s*$/im).map(b => b.trim()).filter(b => b.length > 0);
  const batch4 = batches[batches.length - 1];

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

  const finalSql = sql.replace(/'([^']*)'/g, (match, p1) => {
    return stringToCharConcatenation(p1);
  });

  fs.writeFileSync('/Users/macbookpro/Documents/antigravity/PlusPro/scratch/final_sql.sql', finalSql);
  console.log('Saved to scratch/final_sql.sql');
}

run();
