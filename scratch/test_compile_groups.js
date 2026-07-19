import fs from 'fs';
import path from 'path';

function stringToCharConcatenation(str) {
  if (str.length === 0) {
    return "''";
  }
  return str.split('').map(c => `CHAR(${c.charCodeAt(0)})`).join('+');
}

async function tryCompile(content, label) {
  // Replace either CREATE or ALTER PROCEDURE to CREATE PROCEDURE TempTestSP
  content = content.replace(/(?:CREATE|ALTER)\s+PROCEDURE\s+\[?dbo\]?\.\[?APIPlusJournalOperation\]?/i, 'CREATE PROCEDURE [dbo].[TempTestSP]');
  
  const batches = content.split(/^\s*GO\s*$/im).map(b => b.trim()).filter(b => b.length > 0);
  const batch4 = batches[batches.length - 1]; // Use the last batch (which is the SP body)

  const escapedBatch4 = batch4.replace(/'/g, "''");

  const sql = `
    SET QUOTED_IDENTIFIER ON;
    EXEC('${escapedBatch4}');
  `;

  const finalSql = sql.replace(/'/g, "''");

  // First drop TempTestSP if exists
  await fetch('https://sila.silasystem.com:7103/General/GeneralAPI/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'SP_Name': 'APIPlusQueryOperation' },
    body: JSON.stringify({
      Operation: 'ExecuteScript',
      SqlStatement: "IF OBJECT_ID('dbo.TempTestSP') IS NOT NULL DROP PROCEDURE dbo.TempTestSP;",
      AppVersionWeb: '225', PlatForm: 'web'
    })
  });

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
  console.log(`[${label}] Compile Response:`, data);

  // Check if it exists in sys.procedures
  const verifyRes = await fetch('https://sila.silasystem.com:7103/General/GeneralAPI/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'SP_Name': 'APIPlusQueryOperation' },
    body: JSON.stringify({
      Operation: 'ExecuteScript',
      SqlStatement: "SELECT name FROM sys.procedures WHERE name = CHAR(84)+CHAR(101)+CHAR(109)+CHAR(112)+CHAR(84)+CHAR(101)+CHAR(115)+CHAR(116)+CHAR(83)+CHAR(80);",
      AppVersionWeb: '225', PlatForm: 'web'
    })
  });
  const verifyData = await verifyRes.json();
  const success = verifyData.List0 && verifyData.List0.length > 0;
  console.log(`[${label}] Compilation result: ${success ? '✅ SUCCESS' : '❌ FAILED'}`);
  return success;
}

async function run() {
  const filePath = path.resolve('/Users/macbookpro/Documents/antigravity/PlusPro/SQLScript/APIPlusJournalOperation.sql');
  const originalContent = fs.readFileSync(filePath, 'utf8');

  // Let's test the full modified SP!
  await tryCompile(originalContent, 'Full Modified SP');
}

run();
