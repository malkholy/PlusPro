import fs from 'fs';
import path from 'path';

function run() {
  const filePath = path.resolve('/Users/macbookpro/Documents/antigravity/PlusPro/SQLScript/APIPlusJournalOperation.sql');
  const content = fs.readFileSync(filePath, 'utf8');

  // Let's find IF @Operation = '...' or if @operation='...'
  const opRegex = /if\s+(?:@operation|@Operation)\s*=\s*'([^']+)'([\s\S]*?)(?=if\s+(?:@operation|@Operation)\s*=\s*'|end\s*$)/gi;
  let match;
  const queries = [];

  while ((match = opRegex.exec(content)) !== null) {
    const opName = match[1];
    const body = match[2];
    
    // Find SELECT statements that select rows (not count/exists/assignment)
    // We look for SELECT that returns rows.
    const selectMatches = [];
    const selectRegex = /select\s+(?!\s*@|1\s*=\s*1|1\s*AS\s*State|1\s*from\s+acr\.)[^;=]+from\s+[\s\S]*?(?=return|end|GO|select|insert|update|delete|declare|$)/gi;
    let sMatch;
    while ((sMatch = selectRegex.exec(body)) !== null) {
      selectMatches.push(sMatch[0].trim());
    }

    if (selectMatches.length > 0) {
      queries.push({
        operation: opName,
        queries: selectMatches
      });
    }
  }

  const outPath = path.resolve('/Users/macbookpro/Documents/antigravity/PlusPro/scratch/journal_queries.json');
  fs.writeFileSync(outPath, JSON.stringify(queries, null, 2));
  console.log(`Saved ${queries.length} operations with SELECT queries to ${outPath}`);
}

run();
