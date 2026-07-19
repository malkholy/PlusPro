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

  const batches = content.split(/^\s*GO\s*$/im).map(b => b.trim()).filter(b => b.length > 0);
  console.log(`Total batches found in file: ${batches.length}`);

  // Use batches[batches.length - 1] to ensure we get the procedure body
  const batch4 = batches[batches.length - 1]; 
  console.log('SP Body starts with:', batch4.substring(0, 150));

  const escapedBatch4 = batch4.replace(/'/g, "''");

  const sql = `
    SET QUOTED_IDENTIFIER ON;
    EXEC('${escapedBatch4}');
  `;

  // Escape single quotes for C# SQL statement parameter
  const finalSql = sql.replace(/'/g, "''");

  console.log('Compiling APIPlusJournalOperation...');
  let res = await fetch('https://sila.silasystem.com:7103/General/GeneralAPI/', {
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
  let data = await res.json();
  console.log('Compile result:', data);

  // Verify modify date
  const verifyRes = await fetch('https://sila.silasystem.com:7103/General/GeneralAPI/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'SP_Name': 'APIPlusQueryOperation'
    },
    body: JSON.stringify({
      Operation: 'ExecuteScript',
      SqlStatement: "SELECT modify_date FROM sys.procedures WHERE name = CHAR(65)+CHAR(80)+CHAR(73)+CHAR(80)+CHAR(108)+CHAR(117)+CHAR(115)+CHAR(74)+CHAR(111)+CHAR(117)+CHAR(114)+CHAR(110)+CHAR(97)+CHAR(108)+CHAR(79)+CHAR(112)+CHAR(101)+CHAR(114)+CHAR(97)+CHAR(116)+CHAR(105)+CHAR(111)+CHAR(110);",
      AppVersionWeb: '225',
      PlatForm: 'web'
    })
  });
  const verifyData = await verifyRes.json();
  console.log('SP Modify Date:', verifyData.List0?.[0]);
}

run();
