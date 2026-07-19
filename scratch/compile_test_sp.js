import fs from 'fs';
import path from 'path';

async function run() {
  const filePath = path.resolve('/Users/macbookpro/Documents/antigravity/PlusPro/SQLScript/APIPlusJournalOperation.sql');
  let content = fs.readFileSync(filePath, 'utf8');

  // Change ALTER to CREATE and name to APIPlusJournalOperationTest
  content = content.replace(/ALTER\s+PROCEDURE\s+\[?dbo\]?\.\[?APIPlusJournalOperation\]?/i, 'CREATE PROCEDURE [dbo].[APIPlusJournalOperationTest]');

  const batches = content.split(/^\s*GO\s*$/im)
                         .map(b => b.trim())
                         .filter(b => b.length > 0);

  const batch4 = batches[3];
  console.log('Batch 4 Start:', batch4.substring(0, 150));
}

run();
