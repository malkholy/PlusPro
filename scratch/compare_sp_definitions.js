import fs from 'fs';
import path from 'path';

function stringToCharConcatenation(str) {
  if (str.length === 0) {
    return "''";
  }
  return str.split('').map(c => `CHAR(${c.charCodeAt(0)})`).join('+');
}

async function run() {
  const sql = `
    SELECT definition 
    FROM sys.sql_modules 
    WHERE object_id = OBJECT_ID(
      CHAR(100)+CHAR(98)+CHAR(111)+CHAR(46)+
      CHAR(65)+CHAR(80)+CHAR(73)+CHAR(80)+CHAR(108)+CHAR(117)+CHAR(115)+
      CHAR(74)+CHAR(111)+CHAR(117)+CHAR(114)+CHAR(110)+CHAR(97)+CHAR(108)+
      CHAR(79)+CHAR(112)+CHAR(101)+CHAR(114)+CHAR(97)+CHAR(116)+CHAR(105)+CHAR(111)+CHAR(110)
    );
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
    const dbDef = data.List0?.[0]?.definition || '';
    
    const filePath = path.resolve('/Users/macbookpro/Documents/antigravity/PlusPro/SQLScript/APIPlusJournalOperation.sql');
    let localDef = fs.readFileSync(filePath, 'utf8');
    // Remove the USE and GO statements from localDef to match SP definition
    localDef = localDef.replace(/^\s*USE\s+\[?\w+\]?\s*;?\s*(?:GO)?/i, '')
                       .replace(/^\s*SET\s+\w+\s+\w+\s*;?\s*(?:GO)?/g, '')
                       .trim();

    console.log('DB Definition length:', dbDef.length);
    console.log('Local Definition length:', localDef.length);

    // Let's write both to files and do a simple line-by-line comparison
    fs.writeFileSync('/Users/macbookpro/Documents/antigravity/PlusPro/scratch/db_def.sql', dbDef);
    fs.writeFileSync('/Users/macbookpro/Documents/antigravity/PlusPro/scratch/local_def.sql', localDef);

    console.log('Wrote definitions to scratch/db_def.sql and scratch/local_def.sql.');
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
