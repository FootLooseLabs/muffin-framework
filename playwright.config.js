import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './test/playwright',
    fullyParallel: false,
    workers: process.env.CI ? 2 : 1, // sequential locally (tests are fast; parallel tabs cause OOM)
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
