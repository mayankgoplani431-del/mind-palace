// Renders public/icons/icon.svg to PNG icons using Playwright (run manually; output is committed).
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';

const svg = readFileSync('public/icons/icon.svg', 'utf8');
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined });
for (const size of [192, 512]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(
    `<style>html,body{margin:0}svg{width:${size}px;height:${size}px;display:block}</style>${svg}`,
  );
  await page.screenshot({ path: `public/icons/icon-${size}.png`, omitBackground: true });
  await page.close();
}
await browser.close();
