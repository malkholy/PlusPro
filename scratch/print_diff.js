import fs from 'fs';

function getProcedureBodyLines(text) {
  const lines = text.split('\n');
  const bodyIndex = lines.findIndex(l => l.includes('PROCEDURE') && l.includes('APIPlusJournalOperation'));
  if (bodyIndex === -1) {
    return lines.map(l => l.trim()).filter(l => l.length > 0);
  }
  return lines.slice(bodyIndex).map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith('--'));
}

function run() {
  const dbLines = getProcedureBodyLines(fs.readFileSync('/Users/macbookpro/Documents/antigravity/PlusPro/scratch/db_def.sql', 'utf8'));
  const localLines = getProcedureBodyLines(fs.readFileSync('/Users/macbookpro/Documents/antigravity/PlusPro/scratch/local_def.sql', 'utf8'));

  console.log(`Aligned DB Lines: ${dbLines.length}, Aligned Local Lines: ${localLines.length}`);

  let diffs = 0;
  // We compare up to the shorter length to focus on replacements first
  const limit = Math.min(dbLines.length, localLines.length);
  for (let i = 0; i < limit; i++) {
    if (dbLines[i] !== localLines[i]) {
      diffs++;
      if (diffs <= 40) {
        console.log(`Diff #${diffs} (Index ${i}):`);
        console.log(`  DB   : ${dbLines[i]}`);
        console.log(`  Local: ${localLines[i]}`);
      }
    }
  }

  console.log(`Found ${diffs} differences in the overlapping body section.`);
}

run();
