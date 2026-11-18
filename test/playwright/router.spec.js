/**
 * Router — reading and writing the address, in each of its styles.
 *
 * Each test opens a page at a real-looking address (https://app.test/…, served here by page.route for any path, as a
 * host with history fallback does) that loads the element build and makes a router with the given options. What the
 * router saw is kept on window.__seen (each route shown, with its params) and the history length before it started
 * on window.__lengthAtLoad.
 */
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ELEMENT = readFileSync(join(__dirname, '../../element/dist/element.min.js'), 'utf8');
const ORIGIN = 'https://app.test';

const page_ = (options, routes) => `<!doctype html><html><head><meta charset="utf-8">
<script>${ELEMENT}</script>
<script>
  window.__lengthAtLoad = history.length;
  window.__seen = [];
  Muffin._router = new Muffin.Router(${JSON.stringify(options)});
  Muffin._router.addRouteConfig(${JSON.stringify(routes)});
  Muffin.PostOffice.sockets.element_router.on('onBeforeLoad', (r) => window.__seen.push({ name: r.name, params: r.params }));
  window.__changes = [];
  Muffin._router.onChange((c) => window.__changes.push({ name: c.name, route: c.route, params: c.params, from: c.from && c.from.name }));
</script></head><body></body></html>`;

async function open(page, path, options = { routeDelimiter: '/' }, routes = [{ name: 'home', defaultRoute: true }, { name: 'learn' }]) {
    await page.route(`${ORIGIN}/**`, (route) => route.fulfill({ contentType: 'text/html; charset=utf-8', body: page_(options, routes) }));
    await page.goto(ORIGIN + path);
    await page.waitForFunction(() => window.__seen.length > 0);
}

const here = (page) => page.evaluate(() => location.pathname + location.search + location.hash);
const seen = (page) => page.evaluate(() => window.__seen);
const added = (page) => page.evaluate(() => history.length - window.__lengthAtLoad);

// ─── path style ───────────────────────────────────────────────────────────────

test.describe('path style', () => {
    test('an address with no route shows the default one and is left as it is', async ({ page }) => {
        await open(page, '/?assistant-session=s1');
        expect(await seen(page)).toEqual([{ name: 'home', params: { 'assistant-session': 's1' } }]);
        expect(await here(page)).toBe('/?assistant-session=s1');
        expect(await added(page)).toBe(0);
    });

    test('a route and its params are read from the path and a standard query, the address untouched', async ({ page }) => {
        await open(page, '/explore/coffee?tab=a%20b&utm_source=x#notes');
        expect(await seen(page)).toEqual([{ name: 'explore/coffee', params: { tab: 'a b', utm_source: 'x' } }]);
        expect(await here(page)).toBe('/explore/coffee?tab=a%20b&utm_source=x#notes');
        expect(await added(page)).toBe(0);
    });

    test('the form earlier versions wrote is read and rewritten in place', async ({ page }) => {
        await open(page, '/learn&tab=x&id=7?utm_source=y#part');
        expect(await seen(page)).toEqual([{ name: 'learn', params: { tab: 'x', id: '7', utm_source: 'y' } }]);
        expect(await here(page)).toBe('/learn?tab=x&id=7&utm_source=y#part');
        expect(await added(page)).toBe(0);
    });

    test('go writes a standard query, adds one entry, and Back returns', async ({ page }) => {
        await open(page, '/');
        await page.evaluate(() => Muffin._router.go('explore/coffee', { tab: 'notes & more', none: undefined }));
        expect(await here(page)).toBe('/explore/coffee?tab=notes+%26+more');
        expect(await added(page)).toBe(1);
        expect(await page.evaluate(() => Muffin._router.getCurrentRouteParams())).toEqual({ tab: 'notes & more' });

        await page.evaluate(() => Muffin._router.go('explore/coffee', { tab: 'notes & more' }));
        expect(await added(page)).toBe(1); // same address: no second entry

        await page.goBack();
        await page.waitForFunction(() => window.__seen.length === 4);
        expect((await seen(page)).at(-1).name).toBe('home');
        expect(await page.evaluate(() => Muffin._router.getCurrentRouteName())).toBe('home');
    });

    test('a redirect replaces the address it leaves: Back does not return to it', async ({ page }) => {
        await open(page, '/');
        await page.evaluate(() => Muffin._router.go('learn', { a: 1 }));
        await page.evaluate(() => Muffin._router.go('explore', {}, { replace: true }));
        expect(await here(page)).toBe('/explore');
        expect(await added(page)).toBe(1);
        await page.goBack();
        await page.waitForFunction(() => window.__seen.at(-1).name === 'home');
        expect(await here(page)).toBe('/');
    });

    test('params may be given as a query string', async ({ page }) => {
        await open(page, '/');
        await page.evaluate(() => Muffin._router.go('learn', 'a=1&b=two'));
        expect(await here(page)).toBe('/learn?a=1&b=two');
        expect((await seen(page)).at(-1)).toEqual({ name: 'learn', params: { a: '1', b: 'two' } });
    });

    test('href gives the address go would write (a link starts at the top: no hash of this page)', async ({ page }) => {
        await open(page, '/#somewhere');
        expect(await page.evaluate(() => Muffin._router.href('learn', { q: 'a b' }))).toBe('/learn?q=a+b');
        expect(await page.evaluate(() => Muffin._router.match('/learn&x=1?y=2'))).toEqual({ name: 'learn', route: 'learn', params: { x: '1', y: '2' }, legacy: true });
    });

    test('basePath: routes live below it, the base itself names none', async ({ page }) => {
        const options = { routeDelimiter: '/', basePath: '/tools/ab' };
        await open(page, '/tools/ab', options);
        expect((await seen(page))[0].name).toBe('home');
        expect(await here(page)).toBe('/tools/ab');

        await page.evaluate(() => Muffin._router.go('learn', { x: 1 }));
        expect(await here(page)).toBe('/tools/ab/learn?x=1');

        await page.unrouteAll();
        await open(page, '/tools/ab/learn?x=2', options);
        expect(await seen(page)).toEqual([{ name: 'learn', params: { x: '2' } }]);
    });
});

// ─── query style ──────────────────────────────────────────────────────────────

test.describe('query style', () => {
    const options = { routeDelimiter: '?', basePath: '/tools/ab/' };

    test('the route is the first key, its params the rest; the page path is kept', async ({ page }) => {
        await open(page, '/tools/ab/?learn&tab=x', options);
        expect(await seen(page)).toEqual([{ name: 'learn', params: { tab: 'x' } }]);
        expect(await here(page)).toBe('/tools/ab/?learn&tab=x');
        expect(await added(page)).toBe(0);

        await page.evaluate(() => Muffin._router.go('home', { a: 1 }));
        expect(await here(page)).toBe('/tools/ab/?home&a=1');
    });

    test('a name re-serialised by URLSearchParams (?learn=) is still the name', async ({ page }) => {
        await open(page, '/tools/ab/?learn=&tab=x', options);
        expect(await seen(page)).toEqual([{ name: 'learn', params: { tab: 'x' } }]);
    });

    test('a query with no route shows the default one and is left as it is', async ({ page }) => {
        await open(page, '/tools/ab/?assistant-session=s1', options);
        expect(await seen(page)).toEqual([{ name: 'home', params: { 'assistant-session': 's1' } }]);
        expect(await here(page)).toBe('/tools/ab/?assistant-session=s1');
    });
});

// ─── hash style ───────────────────────────────────────────────────────────────

test.describe('hash style', () => {
    test('a hash that is data, not a route, is left alone', async ({ page }) => {
        await open(page, '/call#p=1&c=2', { routeDelimiter: '#' }, [{ name: '/', defaultRoute: true }]);
        expect((await seen(page))[0].name).toBe('/');
        expect(await here(page)).toBe('/call#p=1&c=2');
    });

    test('go writes the route into the hash, the path and query kept', async ({ page }) => {
        await open(page, '/call?x=1', { routeDelimiter: '#' });
        await page.evaluate(() => Muffin._router.go('learn', { a: 'b c' }));
        expect(await here(page)).toBe('/call?x=1#learn&a=b+c');
        expect((await seen(page)).at(-1)).toEqual({ name: 'learn', params: { a: 'b c' } });
    });
});

// ─── route table: declared paths with named params ────────────────────────────

test.describe('route table', () => {
    const routes = [{ name: 'home', defaultRoute: true }, { name: 'idea', path: 'explore/:slug' }, { name: 'files', path: 'files/*' }];

    test('an address is matched to the declared route, its params read from the path and the query', async ({ page }) => {
        await open(page, '/explore/a%20b%2Fc?tab=x', { routeDelimiter: '/' }, routes);
        expect(await page.evaluate(() => window.__changes)).toEqual([{ name: 'explore/a b%2Fc', route: 'idea', params: { slug: 'a b/c', tab: 'x' }, from: null }]);
        expect(await page.evaluate(() => Muffin._router.match('/files/x/y.png'))).toEqual({ name: 'files/x/y.png', route: 'files', params: { '*': 'x/y.png' }, legacy: false });
    });

    test('go and href by the route name fill its path; the rest is the query; a missing param is refused', async ({ page }) => {
        await open(page, '/', { routeDelimiter: '/' }, routes);
        expect(await page.evaluate(() => Muffin._router.href('idea', { slug: 'a b', tab: 'x' }))).toBe('/explore/a%20b?tab=x');
        expect(await page.evaluate(() => { try { Muffin._router.href('idea', {}); return 'no error'; } catch (e) { return e.message; } })).toBe("Router: route 'idea' needs slug");
        await page.evaluate(() => Muffin._router.go('idea', { slug: 'coffee' }));
        await page.evaluate(() => Muffin._router.go('home'));
        await page.evaluate(() => Muffin._router.go('explore/tea')); // gone to by its address, as apps do today
        expect(await here(page)).toBe('/explore/tea');
        const changes = await page.evaluate(() => window.__changes);
        expect(changes.map((c) => [c.route, c.params.slug, c.from])).toEqual([['home', undefined, null], ['idea', 'coffee', 'home'], ['home', undefined, 'explore/coffee'], ['idea', 'tea', 'home']]);
    });
});

// ─── the transition: guards and the change event ──────────────────────────────

test.describe('leaving', () => {
    test('a guard is asked before go: refused, nothing changes; allowed, it goes', async ({ page }) => {
        await open(page, '/');
        await page.evaluate(() => { window.__answer = false; window.__asked = []; Muffin._router.beforeLeave(({ from, to }) => { window.__asked.push([from.name, to.name]); return Promise.resolve(window.__answer); }); });
        expect(await page.evaluate(() => Muffin._router.go('learn', { a: 1 }))).toBe(false);
        expect(await here(page)).toBe('/');
        expect(await added(page)).toBe(0);
        await page.evaluate(() => { window.__answer = true; });
        expect(await page.evaluate(() => Muffin._router.go('learn', { a: 1 }))).toBe(true);
        expect(await here(page)).toBe('/learn?a=1');
        expect(await page.evaluate(() => window.__asked)).toEqual([['home', 'learn'], ['home', 'learn']]);
    });

    test('a guard is asked before Back: refused, the page stays; allowed, it goes back', async ({ page }) => {
        test.skip(!(await page.evaluate(() => 'navigation' in window).catch(() => true)), 'Navigation API');
        await open(page, '/');
        await page.evaluate(() => Muffin._router.go('learn'));
        await page.evaluate(() => { window.__answer = false; Muffin._router.beforeLeave(() => window.__answer); });
        await page.evaluate(() => history.back());
        await page.waitForTimeout(300);
        expect(await here(page)).toBe('/learn');
        expect((await seen(page)).at(-1).name).toBe('learn');
        await page.evaluate(() => { window.__answer = true; });
        await page.evaluate(() => history.back());
        await page.waitForFunction(() => location.pathname === '/');
        await page.waitForFunction(() => window.__seen.at(-1).name === 'home');
    });

    test('a guard that asks the person: Back waits for the answer — no, it stays; yes, it goes back to that entry', async ({ page }) => {
        test.skip(!(await page.evaluate(() => 'navigation' in window).catch(() => true)), 'Navigation API');
        await open(page, '/');
        await page.evaluate(() => Muffin._router.go('learn'));
        await page.evaluate(() => Muffin._router.go('explore/x'));
        await page.evaluate(() => Muffin._router.beforeLeave(() => new Promise((answer) => { window.__answer = answer; })));
        await page.evaluate(() => history.back());
        await page.waitForFunction(() => typeof window.__answer === 'function');
        expect(await here(page)).toBe('/explore/x');
        await page.evaluate(() => window.__answer(false));
        await page.waitForTimeout(200);
        expect(await here(page)).toBe('/explore/x');
        await page.evaluate(() => { window.__answer = null; history.back(); });
        await page.waitForFunction(() => typeof window.__answer === 'function');
        await page.evaluate(() => window.__answer(true));
        await page.waitForFunction(() => location.pathname === '/learn');
        await page.waitForFunction(() => window.__seen.at(-1).name === 'learn');
        expect(await page.evaluate(() => navigation.currentEntry.index)).toBe(1);
    });

    test('a guard that throws keeps the page where it is', async ({ page }) => {
        await open(page, '/');
        await page.evaluate(() => Muffin._router.beforeLeave(() => { throw new Error('boom'); }));
        expect(await page.evaluate(() => Muffin._router.go('learn'))).toBe(false);
        expect(await here(page)).toBe('/');
    });

    test('a removed guard is not asked; pending asks the browser before the page is left', async ({ page }) => {
        await open(page, '/');
        await page.evaluate(() => { window.__off = Muffin._router.beforeLeave(() => false); window.__off(); });
        expect(await page.evaluate(() => Muffin._router.go('learn'))).toBe(true);
        await page.evaluate(() => Muffin._router.beforeLeave({ ask: () => true, pending: () => true }));
        await page.mouse.click(5, 5); // the browser asks only a page that was used
        const asked = new Promise((resolve) => page.once('dialog', (d) => { resolve(d.type()); d.dismiss(); }));
        await page.close({ runBeforeUnload: true });
        expect(await asked).toBe('beforeunload');
    });
});
