import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  // Capture console messages
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  await page.goto('http://localhost:5173/');
  
  // Login
  await page.type('input[placeholder="Enter username"]', 'mhd');
  await page.type('input[placeholder="Enter password"]', '1');
  await page.click('button.btn-login');
  
  await page.waitForSelector('.sb-nav', { timeout: 10000 });
  
  // Click Accounting group
  const accountingGroup = await page.evaluateHandle(() => {
    return Array.from(document.querySelectorAll('.sb-group-title')).find(el => el.textContent.includes('Accounting'));
  });
  
  // Click Journal Model
  await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('.sb-sub-item'));
    const jm = items.find(el => el.textContent.includes('Journal Model'));
    if (jm) jm.click();
  });
  
  await page.waitForTimeout(2000);
  
  // Click New Model
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const addBtn = btns.find(b => b.textContent.includes('+ Add'));
    if (addBtn) addBtn.click();
  });
  
  await page.waitForTimeout(2000);
  
  // Add Line
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const addLineBtn = btns.find(b => b.textContent.includes('+ Add Line'));
    if (addLineBtn) addLineBtn.click();
  });
  
  await page.waitForTimeout(1000);
  
  // Expand line
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const toggleBtn = btns.find(b => b.textContent === '▼');
    if (toggleBtn) toggleBtn.click();
  });
  
  await page.waitForTimeout(1000);
  
  // Add Detail
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const addDetailBtn = btns.find(b => b.textContent.includes('+ Add Detail'));
    if (addDetailBtn) addDetailBtn.click();
  });
  
  await page.waitForTimeout(1000);
  
  // Click on the SearchableSelect trigger for segment
  await page.evaluate(() => {
    const triggers = Array.from(document.querySelectorAll('.searchable-trigger'));
    if (triggers.length > 1) {
      // The second one should be the segment dropdown (first is prefix)
      triggers[1].click();
    }
  });
  
  await page.waitForTimeout(1000);
  
  // Extract options from the dropdown portal
  const options = await page.evaluate(() => {
    // Portal dropdown is appended to document.body
    const drop = document.querySelector('div[style*="z-index: 999999"]');
    if (!drop) return null;
    return Array.from(drop.querySelectorAll('div')).map(d => d.textContent);
  });
  
  console.log('DROPDOWN OPTIONS:', options);
  
  await browser.close();
})();
