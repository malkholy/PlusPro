import fs from 'fs';
import readline from 'readline';

async function run() {
  const filePath = '/Users/macbookpro/.gemini/antigravity-ide/brain/3068428e-4651-49e9-a175-c184e8d29225/.system_generated/logs/transcript_full.jsonl';
  
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    if (line.includes('register_journal_queries.js') && line.includes('CodeContent')) {
      try {
        const obj = JSON.parse(line);
        const toolCalls = obj.tool_calls || [];
        for (const call of toolCalls) {
          if (call.args && call.args.TargetFile && call.args.TargetFile.includes('register_journal_queries.js')) {
            console.log('Found code content length:', call.args.CodeContent.length);
            fs.writeFileSync('/Users/macbookpro/Documents/antigravity/PlusPro/scratch/register_journal_queries.js', call.args.CodeContent);
            console.log('Successfully restored register_journal_queries.js from history!');
            return;
          }
        }
      } catch (err) {
        // ignore JSON parse errors of individual lines
      }
    }
  }
  console.log('register_journal_queries.js not found in transcript_full.jsonl');
}

run();
