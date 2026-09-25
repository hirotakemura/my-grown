import { defineConfig, devices } from '@playwright/test';

// 本番ビルド（Service Worker 入り）をプレビューサーバーで動かして確認する
export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:4173/my-grown/',
    ...devices['iPhone 13'],
    browserName: 'chromium',
    locale: 'ja-JP',
    timezoneId: 'Asia/Tokyo',
  },
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173/my-grown/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
