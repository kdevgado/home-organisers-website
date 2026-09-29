import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  use: { baseURL: 'http://127.0.0.1:4322', trace: 'retain-on-failure', screenshot: 'only-on-failure', launchOptions: process.platform === 'win32' ? { channel: 'chrome' } : {} },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
  ],
  webServer: { command: 'npm run preview -- --host 127.0.0.1 --port 4322', url: 'http://127.0.0.1:4322', reuseExistingServer: false, timeout: 120000 },
});
