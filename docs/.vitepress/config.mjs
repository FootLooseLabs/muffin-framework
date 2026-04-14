import { defineConfig } from 'vitepress'

export default defineConfig({
    title: 'Muffin Framework',
    description: 'element + atom-websdk — Footloose Labs internal framework',
    base: '/muffin-framework/',

    themeConfig: {
        nav: [
            { text: 'Guide', link: '/guide/getting-started' },
            { text: 'API', link: '/api/dom-component' },
            { text: 'Patterns', link: '/patterns/muffin-only' },
            { text: 'Migration', link: '/migration/v3' }
        ],

        sidebar: [
            {
                text: 'Guide',
                items: [
                    { text: 'Getting Started', link: '/guide/getting-started' },
                    { text: 'Components', link: '/guide/components' },
                    { text: 'Reactive State (uiVars)', link: '/guide/ui-vars' },
                    { text: 'Stores', link: '/guide/stores' },
                    { text: 'State Machine', link: '/guide/state-machine' },
                    { text: 'PostOffice', link: '/guide/post-office' },
                    { text: 'WebSocket SDK', link: '/guide/websdk' }
                ]
            },
            {
                text: 'API Reference',
                items: [
                    { text: 'DOMComponent', link: '/api/dom-component' },
                    { text: 'createStore()', link: '/api/create-store' },
                    { text: 'PostOffice', link: '/api/post-office' },
                    { text: 'Service', link: '/api/service' },
                    { text: 'DOM Extensions', link: '/api/dom-extensions' },
                    { text: 'WebRequestSdk', link: '/api/web-request-sdk' }
                ]
            },
            {
                text: 'Patterns',
                items: [
                    { text: 'Muffin + Tailwind + Vite', link: '/patterns/muffin-only' },
                    { text: 'React + Muffin', link: '/patterns/react-muffin' }
                ]
            },
            {
                text: 'Migration',
                items: [
                    { text: 'Upgrading to v3.0.0', link: '/migration/v3' }
                ]
            }
        ],

        socialLinks: [
            { icon: 'github', link: 'https://github.com/FootLooseLabs/muffin-framework' }
        ]
    }
})
