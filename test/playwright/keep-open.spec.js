/**
 * WebRequestSdk kept open (`reconnect`), its state, a credential asked on every connect, and one route unsubscribed —
 * in the built SDK (dist/sdk.min.js), over a fake gateway (page.routeWebSocket) that answers every request and
 * subscription at once and records each socket it is given.
 */
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SDK = readFileSync(join(__dirname, '../../atom-websdk/dist/sdk.min.js'), 'utf8');
const ORIGIN = 'https://app.test';
const A = '@svc/a:::AService';
const SUB = '@svc/a|||Changes';

const page_ = (options) => `<!doctype html><html><head><meta charset="utf-8"><script>${SDK}</script>
<script>
  let n = 0;
  window.states = [];
  window.resumed = 0;
  window.events = [];
  window.sdk = new Muffin.WebRequestSdk({ name: 'gw', client_id: 'c1', token: ${options.tokenFn ? "() => 'tok-' + (++n)" : "'t'"},
    config: { api_protocol: 'wss://', hostName: 'gw.test', path: 'wsapi' }, ${options.reconnect ? `reconnect: { backoff: [50, 100] },` : ''} });
  sdk.eventInterface.on('state', (s) => states.push(s));
  sdk.eventInterface.on('resumed', () => { resumed += 1; });
</script></head><body></body></html>`;

/** A page and its gateway: each socket's url and frames; `refuse` makes new sockets fail to open. */
async function open(page, options = {}) {
    const gw = { sockets: [], refuse: false };
    await page.routeWebSocket('wss://gw.test/**', (ws) => {
        if (gw.refuse) { ws.close(); return; }
        const socket = { url: ws.url(), frames: [], ws };
        gw.sockets.push(socket);
        ws.onMessage((text) => {
            if (text === 'ping') return;
            const m = JSON.parse(text);
            socket.frames.push(m);
            ws.send(JSON.stringify({ op: m.interface ?? m.subscribe ?? m.unsubscribe, token: m.token, ref: m.ref, statusCode: 200, result: m.request ?? null }));
        });
    });
    await page.route(`${ORIGIN}/**`, (route) => route.fulfill({ contentType: 'text/html; charset=utf-8', body: page_(options) }));
    await page.goto(ORIGIN + '/');
    await page.evaluate(() => sdk.connect());
    return gw;
}

const state = (page) => page.evaluate(() => ({ state: sdk.state, connected: sdk.connected, states: states.slice(), resumed }));

test('without reconnect: as before — a close leaves it closed (idle), and nothing is made again', async ({ page }) => {
    const gw = await open(page);
    expect(await state(page)).toMatchObject({ state: 'connected', connected: true, states: ['connecting', 'connected'] });
    await gw.sockets[0].ws.close();
    await expect.poll(async () => (await state(page)).state).toBe('idle');
    await page.waitForTimeout(300);
    expect(gw.sockets.length).toBe(1);
});

test('kept open: closed, it is opened again; its subscriptions made again at the gateway, then resumed', async ({ page }) => {
    const gw = await open(page, { reconnect: true });
    await page.evaluate(([SUB]) => {
        Muffin.PostOffice.sockets.global.on('changes', (m) => events.push(m.n));
        return sdk.websubscribe(SUB, 'global', 'changes');
    }, [SUB]);
    await gw.sockets[0].ws.close();
    await expect.poll(async () => (await state(page)).resumed).toBe(1);
    expect(gw.sockets.length).toBe(2);
    expect(gw.sockets[1].frames).toEqual([expect.objectContaining({ subscribe: SUB })]);
    expect((await state(page)).states).toEqual(['connecting', 'connected', 'reconnecting', 'connected']);
    // its events still come, once, on the new socket
    gw.sockets[1].ws.send(JSON.stringify({ op: `EVENT:::${SUB}`, n: 7 }));
    await expect.poll(() => page.evaluate(() => events)).toEqual([7]);
    // and requests go on it
    expect((await page.evaluate(([A]) => sdk.webrequest(A, { x: 1 }), [A])).result).toEqual({ x: 1 });
});

test('kept open: attempts that fail wait longer each time, and the first that opens resumes', async ({ page }) => {
    const gw = await open(page, { reconnect: true });
    gw.refuse = true;
    await gw.sockets[0].ws.close();
    await expect.poll(async () => (await state(page)).state).toBe('reconnecting');
    await page.waitForTimeout(400);
    expect(gw.sockets.length).toBe(1);
    gw.refuse = false;
    await expect.poll(async () => (await state(page)).resumed, { timeout: 5000 }).toBe(1);
    expect((await state(page)).state).toBe('connected');
});

test('disconnect(): closed on purpose — idle, and not opened again', async ({ page }) => {
    const gw = await open(page, { reconnect: true });
    await page.evaluate(() => sdk.disconnect());
    await page.waitForTimeout(400);
    expect(gw.sockets.length).toBe(1);
    expect(await state(page)).toMatchObject({ state: 'idle', connected: false });
});

test('the device offline: the socket is closed at once, offline said; online again, it is opened again', async ({ page, context }) => {
    const gw = await open(page, { reconnect: true });
    await context.setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));
    await expect.poll(async () => (await state(page)).state).toBe('offline');
    await context.setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await expect.poll(async () => (await state(page)).resumed).toBe(1);
    expect(gw.sockets.length).toBe(2);
});

test('a credential function is asked on every connect, a reconnect too', async ({ page }) => {
    const gw = await open(page, { reconnect: true, tokenFn: true });
    await gw.sockets[0].ws.close();
    await expect.poll(async () => (await state(page)).resumed).toBe(1);
    expect(gw.sockets.map((s) => new URL(s.url).searchParams.get('auth'))).toEqual(['tok-1', 'tok-2']);
});

test('one route unsubscribed: the others go on and the gateway is not told; the last one tells it', async ({ page }) => {
    const gw = await open(page);
    await page.evaluate(([SUB]) => {
        Muffin.PostOffice.sockets.global.on('one', (m) => events.push(['one', m.n]));
        Muffin.PostOffice.sockets.global.on('two', (m) => events.push(['two', m.n]));
        return Promise.all([sdk.websubscribe(SUB, 'global', 'one'), sdk.websubscribe(SUB, 'global', 'two')]);
    }, [SUB]);
    const kept = await page.evaluate(([SUB]) => sdk.webunsubscribe(SUB, { socketName: 'global', label: 'one' }), [SUB]);
    expect(kept).toEqual({ statusCode: 200, kept: true });
    expect(gw.sockets[0].frames.filter((f) => f.unsubscribe)).toEqual([]);
    gw.sockets[0].ws.send(JSON.stringify({ op: `EVENT:::${SUB}`, n: 1 }));
    await expect.poll(() => page.evaluate(() => events)).toEqual([['two', 1]]);
    await page.evaluate(([SUB]) => sdk.webunsubscribe(SUB, { socketName: 'global', label: 'two' }), [SUB]);
    expect(gw.sockets[0].frames.filter((f) => f.unsubscribe)).toEqual([expect.objectContaining({ unsubscribe: SUB })]);
});

test('connect() whose socket closes before it opens rejects (it never waits forever)', async ({ page }) => {
    const gw = await open(page);
    gw.refuse = true;
    await page.evaluate(() => sdk.disconnect());
    const outcome = await page.evaluate(() => sdk.connect().then(() => 'opened', (e) => e.msg));
    expect(outcome).toMatch(/closed|could not be established|failed/i);
});

test('another SDK loaded later (window.Muffin replaced): the connection keeps its own PostOffice — events and reconnects', async ({ page }) => {
    const gw = await open(page, { reconnect: true });
    await page.evaluate(([SUB]) => {
        window.own = Muffin;
        Muffin.PostOffice.sockets.global.on('changes', (m) => events.push(m.n));
        return sdk.websubscribe(SUB, 'global', 'changes');
    }, [SUB]);
    await page.evaluate(() => { window.Muffin = { PostOffice: null }; });   // a 2.x SDK's, or anything else
    gw.sockets[0].ws.send(JSON.stringify({ op: `EVENT:::${SUB}`, n: 1 }));
    await expect.poll(() => page.evaluate(() => events)).toEqual([1]);
    await gw.sockets[0].ws.close();
    await expect.poll(async () => (await state(page)).resumed).toBe(1);
    gw.sockets[1].ws.send(JSON.stringify({ op: `EVENT:::${SUB}`, n: 2 }));
    await expect.poll(() => page.evaluate(() => events)).toEqual([1, 2]);
});
