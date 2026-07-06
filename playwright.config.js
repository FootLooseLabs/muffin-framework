import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './test/playwright',
    fullyParallel: true,
    retries: process.env.CI ? 2 : 0,
    reporter: process.env.CI ? 'github' : 'list',

    use: {
        baseURL: 'http://localhost:5174',
        trace: 'on-first-retry',
    },

    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],

    webServer: {
        command: 'pnpm --filter @muffin/playground run dev',
        port: 5174,
        reuseExistingServer: !process.env.CI,
    },
});
