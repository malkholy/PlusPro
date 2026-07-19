async function run() {
  try {
    const res = await fetch('http://localhost:5174/');
    console.log('HTTP Status:', res.status);
    const text = await res.text();
    console.log('Page Title:', text.match(/<title>(.*?)<\/title>/)?.[1] || 'No title');
  } catch (err) {
    console.error('Fetch error:', err.message);
  }
}
run();
