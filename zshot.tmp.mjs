import { chromium } from '@playwright/test';
const [port, keysArg, extra = 't=1.2'] = process.argv.slice(2);
const keys = keysArg.split(',');
const browser = await chromium.launch({ channel: 'chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
await Promise.all(keys.map(async (k) => {
  const page = await browser.newPage({ viewport: { width: 1500, height: 1200 } });
  page.on('pageerror', (e) => console.log(k, 'pageerror', e.message));
  page.on('console', (m) => { if (m.type()==='error' && !m.text().includes('404')) console.log(k, m.text().slice(0,200)); });
  await page.goto(`http://127.0.0.1:${port}/mind-palace/sheet.html?key=${k}&${extra}`);
  await page.waitForFunction('window.__sheetReady === true', null, { timeout: 60000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `shots/z-${k}.png`, clip: { x: 400, y: 270, width: 700, height: 640 } });
  await page.close();
}));
await browser.close();
