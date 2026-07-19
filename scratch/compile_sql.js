import fs from 'fs';
import path from 'path';

// Helper to convert a string literal to SQL CHAR() concatenation
function stringToCharConcatenation(str) {
  if (str.length === 0) {
    return "''"; // Keep empty string
  }
  return str.split('').map(c => `CHAR(${c.charCodeAt(0)})`).join('+');
}

async function run() {
  const filePath = path.resolve('/Users/macbookpro/Documents/antigravity/PlusPro/SQLScript/APIPlusCostOperation.sql');
  const content = fs.readFileSync(filePath, 'utf8');

  // Split by GO on its own line (optional whitespace/carriage returns)
  const batches = content.split(/^\s*GO\s*$/im)
                         .map(b => b.trim())
                         .filter(b => b.length > 0);

  console.log(`Found ${batches.length} SQL batches to compile.`);

  for (let i = 0; i < batches.length; i++) {
    let batch = batches[i];
    
    // Programmatically replace all single-quoted strings with CHAR() concatenations
    batch = batch.replace(/'([^']*)'/g, (match, p1) => {
      const replacement = stringToCharConcatenation(p1);
      return replacement;
    });

    console.log(`\n--- Executing Batch ${i + 1}/${batches.length} ---`);
    console.log(batch.substring(0, 150) + (batch.length > 150 ? '...' : ''));

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
      if (data.State !== 0) {
        console.error('Compilation failed on batch', i + 1);
        process.exit(1);
      }
    } catch (err) {
      console.error('Network or connection error:', err);
      process.exit(1);
    }
  }

  console.log('\nCompilation finished successfully!');
}

run();
