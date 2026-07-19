import fs from 'fs';
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
  
  const layout = await page.evaluate(() => {
    const btn = document.querySelector('button[title="Expand Filters"]');
    const collapsedPanel = btn.closest('div');
    const mainContainer = collapsedPanel.parentElement;
    const dataArea = mainContainer.children[1];
    
    return {
      mainFlexDirection: window.getComputedStyle(mainContainer).flexDirection,
      mainFlexWrap: window.getComputedStyle(mainContainer).flexWrap,
      mainDisplay: window.getComputedStyle(mainContainer).display,
      dataAreaDisplay: window.getComputedStyle(dataArea).display,
      dataAreaWidth: window.getComputedStyle(dataArea).width,
      dataAreaFlex: window.getComputedStyle(dataArea).flex,
      collapsedWidth: window.getComputedStyle(collapsedPanel).width,
      collapsedHeight: window.getComputedStyle(collapsedPanel).height,
      dataAreaY: dataArea.getBoundingClientRect().y,
      collapsedY: collapsedPanel.getBoundingClientRect().y
    };
  });
  console.log(JSON.stringify(layout, null, 2));
  await browser.close();
})();
