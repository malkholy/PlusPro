import { apiCall } from './src/shared/api.js';

async function test() {
  try {
    const res = await apiCall('Journal Entry', {
      fromDate: '2026-01-01',
      toDate: '2026-12-31'
    });
    console.log(res.List0 && res.List0.length > 0 ? Object.keys(res.List0[0]) : "No data");
  } catch (e) {
    console.error(e);
  }
}
test();
