import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 90_000,
  retries: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4173/mind-palace/',
    // In CI chromium is installed by `playwright install`; locally set PW_CHANNEL=chrome to reuse system Chrome.
    channel: process.env.PW_CHANNEL || undefined,
    launchOptions: {
      args: [
        '--use-gl=angle',
        '--use-angle=swiftshader',
        '--enable-unsafe-swiftshader',
        '--ignore-gpu-blocklist',
      ],
    },
    viewport: { width: 1280, height: 720 },
  },
  webServer: {
    command: 'npm run preview',
    url: 'http://127.0.0.1:4173/mind-palace/',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
