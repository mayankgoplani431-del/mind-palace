// Dev helper: drive the app in system Chrome, save screenshots to shots/.
// Usage: node scripts/drive.mjs <port> <sample en|hi|mr> '<steps json>' [width height]
// steps: [{"eval":"js to run in page (window.__mp = app)","wait":ms,"shot":"name","click":"text","waitFor":"js condition"}]
import { chromium } from '@playwright/test';

const [port = '5170', sample = 'en', stepsJson = '[]', W = '1280', H = '720'] = process.argv.slice(2);
const mobile = Number(W) < 700;
const browser = await chromium.launch({
  channel: 'chrome',
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
    '--autoplay-policy=no-user-gesture-required',
  ],
});
const ctx = await browser.newContext({
  viewport: { width: Number(W), height: Number(H) },
  hasTouch: mobile,
  isMobile: mobile,
  deviceScaleFactor: 1,
});
const page = await ctx.newPage();
const logs = [];
page.on(
  'console',
  (m) => ['error', 'warning'].includes(m.type()) && logs.push(`${m.type()}: ${m.text().slice(0, 300)}`),
);
page.on('pageerror', (e) => logs.push(`pageerror: ${e.message}`));
await page.goto(`http://127.0.0.1:${port}/mind-palace/`);
await page.waitForSelector('.screen', { timeout: 30000 });
const idx = { en: 0, hi: 1, mr: 2 }[sample] ?? 0;
await page
  .locator('.card button.btn.small', { hasText: /Physics|Biology|History|भौतिकी|जीव|इतिहास/ })
  .nth(idx)
  .click();
await page.locator('button.btn.primary', { hasText: /✨/ }).click();
await page.waitForFunction('window.__mp && window.__mp.state === "palace"', null, { timeout: 60000 });
await page.waitForTimeout(1500);
for (const s of JSON.parse(stepsJson)) {
  if (s.eval) console.log('eval →', JSON.stringify(await page.evaluate(s.eval)));
  if (s.click) await page.getByText(s.click, { exact: false }).first().click();
  if (s.waitFor)
    await page
      .waitForFunction(s.waitFor, null, { timeout: 40000 })
      .catch(() => console.log('waitFor timeout:', s.waitFor));
  if (s.wait) await page.waitForTimeout(s.wait);
  if (s.shot) await page.screenshot({ path: `shots/${s.shot}.png` });
}
console.log('debug', await page.evaluate(() => JSON.stringify(window.__mp.debug)));
console.log(logs.length ? logs.slice(0, 12).join('\n') : 'no console errors');
await browser.close();
