import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:5178/');
  await page.type('input[placeholder="Username"]', 'sysadmin');
  await page.type('input[placeholder="Password"]', '1');
  await page.click('button[type="submit"]');
  await page.waitForNavigation();
  await page.goto('http://localhost:5178/account-statement');
  await page.waitForSelector('button[title="Collapse Filters"]');
  await page.click('button[title="Collapse Filters"]');
  await page.waitForSelector('button[title="Expand Filters"]');
  
  const html = await page.evaluate(() => {
    const container = document.querySelector('button[title="Expand Filters"]').closest('div').parentElement;
    return container.outerHTML;
  });
  console.log(html);
  await browser.close();
})();
