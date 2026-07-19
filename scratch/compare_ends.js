import fs from 'fs';

function run() {
  const dbDef = fs.readFileSync('/Users/macbookpro/Documents/antigravity/PlusPro/scratch/db_def.sql', 'utf8');
  const localDef = fs.readFileSync('/Users/macbookpro/Documents/antigravity/PlusPro/scratch/local_def.sql', 'utf8');

  console.log('--- DB DEF END ---');
  console.log(dbDef.substring(dbDef.length - 1000));
  console.log('\n--- LOCAL DEF END ---');
  console.log(localDef.substring(localDef.length - 1000));
}

run();
