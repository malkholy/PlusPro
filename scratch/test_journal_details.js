async function run() {
  try {
    const res = await fetch('https://sila.silasystem.com:7103/General/GeneralAPI/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'SP_Name': 'APIPlusJournalOperation' // Correct SP we just mapped in api.js
      },
      body: JSON.stringify({
        Operation: 'Get Journal For View',
        LineData: JSON.stringify({ JournalNo: 'TJ2600030', EventNo: 33001 }),
        User: 'mhd',
        AppVersionWeb: '225',
        PlatForm: 'web'
      })
    });
    const data = await res.json();
    console.log('API Response State:', data.State);
    console.log('API Response Message:', data.Message);
    console.log('Header records returned (List0):', data.List0?.length || 0);
    console.log('Line records returned (List1):', data.List1?.length || 0);
    if (data.List0 && data.List0.length > 0) {
      console.log('Sample Header:', data.List0[0]);
    }
  } catch (err) {
    console.error('Error:', err);
  }
}
run();
