import { defineConfig, devices } from '@playwright/test'
import config from './playwright.config'

// Functional checks across engines. Pixel baselines stay on their reviewed
// Windows/Chromium environment, as recommended by Playwright.
export default defineConfig({
  ...config,
  testMatch: ['privacy.spec.ts', 'reliability.spec.ts', 'experiences.spec.ts', 'inquiry.spec.ts', 'order-motion.spec.ts'],
  projects: [
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
})
