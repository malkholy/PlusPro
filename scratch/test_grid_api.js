async function run() {
  try {
    const res = await fetch('https://sila.silasystem.com:7103/General/GeneralAPI/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'SP_Name': 'APIPlusOperation'
      },
      body: JSON.stringify({
        Operation: 'Journal Entry',
        LineData: JSON.stringify({ fromDate: '2025-01-01', toDate: '2027-01-01' }),
        AppVersionWeb: '225',
        PlatForm: 'web'
      })
    });
    const data = await res.json();
    console.log('API Response State:', data.State);
    console.log('API Response Message:', data.Message);
    console.log('Number of journal entries returned:', data.List0?.length || 0);
    if (data.List0 && data.List0.length > 0) {
      console.log('Sample journal entry:', data.List0[0]);
    }
  } catch (err) {
    console.error('Error:', err);
  }
}
run();
