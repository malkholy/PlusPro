const { sql } = require('./src/shared/db.js');
async function run() {
  try {
    const res = await sql.query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'JournalLine' AND TABLE_SCHEMA = 'acc'");
    console.log(res.recordset.map(r => r.COLUMN_NAME).join(', '));
  } catch (e) { console.error(e); }
  process.exit(0);
}
run();
