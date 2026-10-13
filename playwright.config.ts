// Tests d'interface (Playwright) : l'appli construite (dist/) est ouverte comme par un joueur,
// sur ordinateur et sur téléphone. Lancer : npm run build, puis npm run test:e2e.
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4173/',
    trace: 'retain-on-failure',
    locale: 'fr-FR',
  },
  projects: [
    { name: 'ordinateur', use: { browserName: 'chromium', viewport: { width: 1280, height: 800 } } },
    {
      name: 'telephone',
      use: { browserName: 'chromium', viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true },
    },
  ],
  webServer: {
    command: 'npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173/',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
