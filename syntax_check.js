const fs = require('fs');

const sql = fs.readFileSync('SQLScript/APIPlusJournalOperation.sql', 'utf8');

// Basic checks
const goCount = (sql.match(/^GO/gm) || []).length;
console.log('GO statements:', goCount);

const createProc = (sql.match(/CREATE PROCEDURE/g) || []).length;
console.log('CREATE PROCEDURE:', createProc);

const alterProc = (sql.match(/ALTER PROCEDURE/g) || []).length;
console.log('ALTER PROCEDURE:', alterProc);
