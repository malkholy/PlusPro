async function run() {
  try {
    const res = await fetch('https://sila.silasystem.com:7103/General/GeneralAPI/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'SP_Name': 'APIPlusJournalOperation'
      },
      body: JSON.stringify({
        Operation: 'Get Database Tables',
        AppVersionWeb: '225',
        PlatForm: 'web'
      })
    });
    const data = await res.json();
    console.log('API Response State:', data.State);
    console.log('API Response Message:', data.Message);
    console.log('Number of tables returned:', data.List0?.length || 0);
    if (data.List0 && data.List0.length > 0) {
      console.log('Sample table:', data.List0[0]);
    }
  } catch (err) {
    console.error('Error:', err);
  }
}
run();
