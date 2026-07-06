import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    root: '.',
    // No aliases needed — components.js imports element/atom-websdk by relative path
    // so Vite hot-reloads source changes without a rebuild step.
    server: {
        port: 5174,
        strictPort: true,
        hmr: false, // disable HMR — avoids WS interference with Playwright test pages
    },
    resolve: {
        alias: {
            // Allow components.js to import cleanly without long relative paths
            '@element': path.resolve(__dirname, '../element/src/main.js'),
            '@sdk':     path.resolve(__dirname, '../atom-websdk/src/main.js'),
        }
    }
});
