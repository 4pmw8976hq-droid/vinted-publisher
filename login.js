
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('https://www.vinted.it/');

  console.log('Fai il login manualmente nel browser aperto, poi premi INVIO.');
  await new Promise(resolve => process.stdin.once('data', resolve));

  await context.storageState({ path: 'vinted-state.json' });
  console.log('Stato salvato in vinted-state.json');
  await browser.close();
})();



