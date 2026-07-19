import fs from 'fs';
import path from 'path';

function stringToCharConcatenation(str) {
  if (str.length === 0) {
    return "''";
  }
  return str.split('').map(c => `CHAR(${c.charCodeAt(0)})`).join('+');
}

async function run() {
  // 1. Get active sessions with open transactions
  let res = await fetch('https://sila.silasystem.com:7103/General/GeneralAPI/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'SP_Name': 'APIPlusQueryOperation' },
    body: JSON.stringify({
      Operation: 'ExecuteScript',
      SqlStatement: "SELECT session_id FROM sys.dm_exec_sessions WHERE open_transaction_count > 0;",
      AppVersionWeb: '225', PlatForm: 'web'
    })
  });
  let data = await res.json();
  const sessions = (data.List0 || []).map(s => s.session_id).filter(id => id !== 106); // Exclude our own session if any
  console.log('Sessions to kill:', sessions);

  // Construct the KILL statements
  let killSql = '';
  for (const sid of sessions) {
    killSql += `KILL ${sid}; `;
  }

  // 2. Read the procedure file and prepare CREATE statement
  const filePath = path.resolve('/Users/macbookpro/Documents/antigravity/PlusPro/SQLScript/APIPlusJournalOperation.sql');
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/(?:CREATE|ALTER)\s+PROCEDURE\s+\[?dbo\]?\.\[?APIPlusJournalOperation\]?/i, 'CREATE PROCEDURE [dbo].[APIPlusJournalOperation]');

  const batches = content.split(/^\s*GO\s*$/im).map(b => b.trim()).filter(b => b.length > 0);
  const batch4 = batches[batches.length - 1]; // Use the last batch (which is the SP body)

  const escapedBatch4 = batch4.replace(/'/g, "''");

  const sql = `
    ${killSql}
    IF OBJECT_ID('dbo.APIPlusJournalOperation') IS NOT NULL 
        DROP PROCEDURE dbo.APIPlusJournalOperation;
        
    SET QUOTED_IDENTIFIER ON;
    EXEC('${escapedBatch4}');
  `;

  // Escape single quotes for C# SQL statement parameter
  const finalSql = sql.replace(/'/g, "''");

  console.log('Executing force drop-create...');
  res = await fetch('https://sila.silasystem.com:7103/General/GeneralAPI/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'SP_Name': 'APIPlusQueryOperation' },
    body: JSON.stringify({
      Operation: 'ExecuteScript',
      SqlStatement: finalSql,
      AppVersionWeb: '225', PlatForm: 'web'
    })
  });
  data = await res.json();
  console.log('Force execute result:', data);

  // Verify modify date
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
