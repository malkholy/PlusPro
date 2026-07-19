import fs from 'fs';
import path from 'path';

function stringToCharConcatenation(str) {
  if (str.length === 0) {
    return "''";
  }
  return str.split('').map(c => `CHAR(${c.charCodeAt(0)})`).join('+');
}

async function run() {
  const filePath = path.resolve('/Users/macbookpro/Documents/antigravity/PlusPro/SQLScript/APIPlusOperation.sql');
  const content = fs.readFileSync(filePath, 'utf8');

  const batches = content.split(/^\s*GO\s*$/im)
                         .map(b => b.trim())
                         .filter(b => b.length > 0);

  // 1. Get modify_date before
  console.log('Checking modify_date before compile...');
  await checkModifyDate();

  for (let i = 0; i < batches.length; i++) {
    let batch = batches[i];
    batch = batch.replace(/'([^']*)'/g, (match, p1) => {
      return stringToCharConcatenation(p1);
    });

    console.log(`\n--- Executing Batch ${i + 1}/${batches.length} ---`);
    const start = Date.now();
    try {
      const res = await fetch('https://quick.glcpaints.com:7003/General/GeneralAPI/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'SP_Name': 'APIPlusQueryOperation'
        },
        body: JSON.stringify({
          Operation: 'ExecuteScript',
          SqlStatement: batch,
          AppVersionWeb: '225',
          PlatForm: 'web'
        })
      });
      const data = await res.json();
      console.log(`Result: State=${data.State}, Message=${data.Message} (${Date.now() - start} ms)`);
    } catch (err) {
      console.error('Network or connection error:', err);
    }
  }

  // 2. Get modify_date after
  console.log('\nChecking modify_date after compile...');
  await checkModifyDate();
}

async function checkModifyDate() {
  const sql = `SELECT name, modify_date FROM sys.procedures WHERE name = CHAR(65)+CHAR(80)+CHAR(73)+CHAR(80)+CHAR(108)+CHAR(117)+CHAR(115)+CHAR(79)+CHAR(112)+CHAR(101)+CHAR(114)+CHAR(97)+CHAR(116)+CHAR(105)+CHAR(111)+CHAR(110);`;
  try {
    const res = await fetch('https://quick.glcpaints.com:7003/General/GeneralAPI/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'SP_Name': 'APIPlusQueryOperation'
      },
      body: JSON.stringify({
        Operation: 'ExecuteScript',
        SqlStatement: sql.replace(/'([^']*)'/g, (match, p1) => stringToCharConcatenation(p1)),
        AppVersionWeb: '225',
        PlatForm: 'web'
      })
    });
    const text = await res.text();
    console.log(text);
  } catch (err) {
    console.error(err);
  }
}

run();
