// Usage: node scripts/shot-sheet.mjs <port> "<query>" <out.png> [w] [h]
// Screenshots the dev object sheet (requires `npx vite --port <port>` running). Uses system Chrome.
import { chromium } from '@playwright/test';

const [port, query = '', out = 'shots/sheet.png', w = '1400', h = '900'] = process.argv.slice(2);
const browser = await chromium.launch({
  channel: process.env.PW_CHANNEL || 'chrome',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: Number(w), height: Number(h) } });
const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`);
});
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
await page.goto(`http://127.0.0.1:${port}/mind-palace/sheet.html?${query}`);
await page.waitForFunction('window.__sheetReady === true', null, { timeout: 60000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: out });
await browser.close();
console.log(errors.length ? errors.join('\n') : 'no console errors/warnings');
