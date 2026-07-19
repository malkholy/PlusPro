async function run() {
  const sql = `
    CREATE OR ALTER VIEW [PLS].[QGetTableColumns] AS
    SELECT 
        COLUMN_NAME AS ColumnName, 
        TABLE_SCHEMA AS TableSchema, 
        TABLE_NAME AS TableName,
        ORDINAL_POSITION AS OrdinalPosition
    FROM INFORMATION_SCHEMA.COLUMNS;
  `;

  // Escape single quotes for C# SQL statement parameter
  const finalSql = sql.replace(/'/g, "''");

  try {
    const res = await fetch('https://sila.silasystem.com:7103/General/GeneralAPI/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'SP_Name': 'APIPlusQueryOperation'
      },
      body: JSON.stringify({
        Operation: 'ExecuteScript',
        SqlStatement: finalSql,
        AppVersionWeb: '225',
        PlatForm: 'web'
      })
    });
    const data = await res.json();
    console.log('Recreate View Result:', data);
  } catch (err) {
    console.error('Error:', err);
  }
}
run();
