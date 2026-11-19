/**
 * WebRequestSdk — requests and their replies over a real (faked) gateway socket, in the built SDK (dist/sdk.min.js).
 *
 * The gateway is page.routeWebSocket: `echo` true answers as the gateway does now (each reply carries the request's
 * ref), false as an older one (no ref). Replies are held until a test releases them, so the order is the test's.
 */
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SDK = readFileSync(join(__dirname, '../../atom-websdk/dist/sdk.min.js'), 'utf8');
const ORIGIN = 'https://app.test';
const A = '@svc/a:::AService';
const B = '@svc/b:::BService';
const SUB = '@svc/a|||Changes';

const html = `<!doctype html><html><head><meta charset="utf-8"><script>${SDK}</script>
<script>
  window.sdk = new Muffin.WebRequestSdk({ name: 'gw', client_id: 'c1', token: 't',
    config: { api_protocol: 'wss://', hostName: 'gw.test', path: 'wsapi' } });
  window.results = {};
  window.track = (name, p) => p.then((v) => { results[name] = { ok: v }; }, (e) => { results[name] = { err: e }; });
</script></head><body></body></html>`;

/** Opens the page with a fake gateway; returns the frames it received and a way to answer them. */
async function open(page, { echo = true } = {}) {
    const frames = [];
    let server;
    await page.routeWebSocket('wss://gw.test/**', (ws) => {
        server = ws;
        ws.onMessage((text) => { if (text !== 'ping') frames.push(JSON.parse(text)); });
    });
    await page.route(`${ORIGIN}/**`, (route) => route.fulfill({ contentType: 'text/html; charset=utf-8', body: html }));
    await page.goto(ORIGIN + '/');
    await page.evaluate(() => sdk.connect());
    const answer = (frame, fields) => server.send(JSON.stringify({
        op: frame.interface ?? frame.subscribe ?? frame.unsubscribe, token: frame.token,
        ...(echo ? { ref: frame.ref } : {}), statusCode: 200, ...fields,
    }));
    const sent = async (n) => { await expect.poll(() => frames.length).toBe(n); return frames; };
    return { frames, answer, sent, server: () => server };
}

const results = (page) => page.evaluate(() => results);

test('reconnecting: connect() called again while connecting opens one socket, and requests go on it', async ({ page }) => {
    const gw = await open(page);
    let sockets = 1;
    await page.routeWebSocket('wss://gw.test/**', (ws) => {
        sockets += 1;
        ws.onMessage((text) => {
            if (text === 'ping') return;
            const m = JSON.parse(text);
            ws.send(JSON.stringify({ op: m.interface, token: m.token, ref: m.ref, statusCode: 200, result: m.request.n }));
        });
    });
    await page.evaluate(() => sdk.disconnect());
    await page.evaluate(([A]) => {
        // two parts of an app each see it disconnected and reconnect, then ask
        const ask = (n) => sdk.connect().then(() => sdk.webrequest(A, { n }));
        track('x1', ask(1)); track('x2', ask(2));
    }, [A]);
    await expect.poll(async () => { const r = await results(page); return [r.x1?.ok?.result, r.x2?.ok?.result]; }).toEqual([1, 2]);
    expect(sockets).toBe(2);
    expect(await page.evaluate(() => sdk._socketState)).toBe(1);
});

test('requests to one interface, answered out of order, each get their own reply', async ({ page }) => {
    const gw = await open(page);
    await page.evaluate(([A]) => { track('warm', sdk.webrequest(A, { n: 0 })); }, [A]);
    gw.answer((await gw.sent(1))[0], { result: 0 }); // the gateway is seen to echo ref
    await expect.poll(async () => (await results(page)).warm?.ok?.result).toBe(0);
    await page.evaluate(([A]) => { [1, 2, 3].forEach((n) => track(`r${n}`, sdk.webrequest(A, { n }))); }, [A]);
    const f = await gw.sent(4);
    for (const i of [3, 1, 2]) gw.answer(f[i], { result: f[i].request.n });
    await expect.poll(async () => {
        const r = await results(page);
        return [r.r1?.ok?.result, r.r2?.ok?.result, r.r3?.ok?.result];
    }).toEqual([1, 2, 3]);
    expect(f[1]).toMatchObject({ interface: A, ttl: 5000, ref: expect.any(String), token: expect.stringMatching(/^[0-9a-f]{64}$/) });
});

test('an older gateway (no ref): one at a time per interface, still each its own reply', async ({ page }) => {
    const gw = await open(page, { echo: false });
    await page.evaluate(([A, B]) => {
        track('a1', sdk.webrequest(A, { n: 1 })); track('a2', sdk.webrequest(A, { n: 2 })); track('b1', sdk.webrequest(B, {}));
    }, [A, B]);
    let f = await gw.sent(2);
    expect(f.map((x) => x.interface)).toEqual([A, B]);
    gw.answer(f[0], { result: 'a1' });
    f = await gw.sent(3);
    gw.answer(f[2], { result: 'a2' });
    gw.answer(f[1], { result: 'b1' });
    await expect.poll(async () => {
        const r = await results(page);
        return [r.a1?.ok?.result, r.a2?.ok?.result, r.b1?.ok?.result];
    }).toEqual(['a1', 'a2', 'b1']);
});

test('errors reject with the reply; result null resolves; requests leave no listeners behind', async ({ page }) => {
    const gw = await open(page);
    const before = await page.evaluate(() => sdk.eventInterface.listeners.length);
    await page.evaluate(([A, B]) => {
        track('bad', sdk.webrequest(A, {}));
        track('none', sdk.webrequest(B, {}));
        for (let i = 0; i < 50; i++) track(`m${i}`, sdk.webrequest(B, { i }));
    }, [A, B]);
    const f = await gw.sent(2);
    gw.answer(f[0], { error: 'No such thing', statusCode: 500 });
    gw.answer(f[1], { result: null });
    const all = await gw.sent(52);
    for (const x of all.slice(2)) gw.answer(x, { result: x.request.i });
    await expect.poll(async () => Object.keys(await results(page)).length).toBe(52);
    const r = await results(page);
    expect(r.bad.err.error).toBe('No such thing');
    expect(r.none.ok.result).toBe(null);
    expect(await page.evaluate(() => sdk.eventInterface.listeners.length)).toBe(before);
    expect(await page.evaluate(() => sdk._channel.pending)).toBe(0);
});

test('when the connection closes, what waits is rejected at once', async ({ page }) => {
    const gw = await open(page);
    await page.evaluate(([A]) => { track('w', sdk.webrequest(A, {}, { MAX_RESPONSE_TIME: 60000 })); }, [A]);
    await gw.sent(1);
    await gw.server().close();
    await expect.poll(async () => (await results(page)).w?.err?.message).toMatch(/connection closed/);
});

test('a reply that never comes rejects at its timeout; its late reply goes to no one else', async ({ page }) => {
    const gw = await open(page);
    await page.evaluate(([B]) => { track('warm', sdk.webrequest(B, {})); }, [B]);
    gw.answer((await gw.sent(1))[0], { result: 1 });
    await page.evaluate(([A]) => { track('slow', sdk.webrequest(A, {}, { MAX_RESPONSE_TIME: 100 })); }, [A]);
    await expect.poll(async () => (await results(page)).slow?.err?.message).toBe('No response in 0.1s');
    await page.evaluate(([A]) => { track('next', sdk.webrequest(A, {})); }, [A]);
    const f = await gw.sent(3);
    gw.answer(f[1], { result: 'late' });
    gw.answer(f[2], { result: 'mine' });
    await expect.poll(async () => (await results(page)).next?.ok?.result).toBe('mine');
});

test('subscribe routes each event once per route; unsubscribe tells the gateway and stops them', async ({ page }) => {
    const gw = await open(page);
    await page.evaluate(([SUB]) => {
        window.events = [];
        Muffin.PostOffice.sockets.global.on('changes', (m) => window.events.push(m.n));
        track('s1', sdk.websubscribe(SUB, 'global', 'changes'));
    }, [SUB]);
    let f = await gw.sent(1);
    expect(f[0]).toMatchObject({ subscribe: SUB, ref: expect.any(String) });
    gw.answer(f[0], { statusCode: 2, error: false, message: 'subscription initiated' });
    await expect.poll(async () => (await results(page)).s1?.ok).toBe(true);
    await page.evaluate(([SUB]) => { track('s2', sdk.websubscribe(SUB, 'global', 'changes')); }, [SUB]);
    f = await gw.sent(2);
    gw.answer(f[1], { statusCode: 2, error: false });
    await expect.poll(async () => (await results(page)).s2?.ok).toBe(true);
    gw.server().send(JSON.stringify({ op: `EVENT:::${SUB}`, n: 1 }));
    await expect.poll(() => page.evaluate(() => window.events)).toEqual([1]);
    await page.evaluate(([SUB]) => { track('u', sdk.webunsubscribe(SUB)); }, [SUB]);
    f = await gw.sent(3);
    expect(f[2]).toMatchObject({ unsubscribe: SUB, ref: expect.any(String) });
    gw.answer(f[2], { message: 'unsubscribed successfully' });
    await expect.poll(async () => (await results(page)).u?.ok?.message).toBe('unsubscribed successfully');
    gw.server().send(JSON.stringify({ op: `EVENT:::${SUB}`, n: 2 }));
    await page.waitForTimeout(100);
    expect(await page.evaluate(() => window.events)).toEqual([1]);
});

test('request(address, …) is webrequest; the earlier lexeme form still works', async ({ page }) => {
    const gw = await open(page);
    await page.evaluate(([A, B]) => {
        track('addr', sdk.request(A, { x: 1 }));
        track('lexeme', sdk.request('WebMessage', { interface: B, request: { y: 2 } }, B, { MAX_RESPONSE_TIME: 3000 }));
    }, [A, B]);
    const f = await gw.sent(2);
    expect(f[1]).toMatchObject({ interface: B, request: { y: 2 }, ttl: 3000 });
    gw.answer(f[0], { result: 'a' });
    gw.answer(f[1], { result: 'b' });
    await expect.poll(async () => {
        const r = await results(page);
        return [r.addr?.ok?.result, r.lexeme?.ok?.result];
    }).toEqual(['a', 'b']);
});
