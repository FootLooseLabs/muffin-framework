# Request / reply correlation over the web interface — 31 Oct 2026

## The issue

A reply on the web interface names only the interface it came from: the gateway sends `{ op: <interface address>,
result | error, … }`, and the web SDK matches a reply to its request by `op` alone (`atom-websdk/src/main.js`,
`webrequest`: `msg.op === opLabel`). Nothing in a reply says *which* request it answers.

So two requests in flight at once to the same interface on one connection cannot be told apart:

- every waiting request whose `op` matches takes the **first** reply that arrives — the others' replies are dropped;
- a request to one operation can take the reply meant for another operation on the same interface (the address is the
  service's, e.g. `@vritti/x:::SomeService`; the subject is inside the request, not in the reply);
- a reply that arrives after its request timed out is taken by the next request to that interface.

The services behind the gateway are not the cause: each request is a REQ/REP exchange with its own correlation id
between gateway and service. The loss is on the last hop, gateway → browser.

## Where it was encountered

Testing a client project that reads several records from one service at once on page load, and sends a burst of
requests to it as simulation events fire: every record read came back as the first one, and the burst's answers were
crossed. Confirmed against a fake gateway that answers requests in any order.

## What exists today

`Service.lockInterface` / `unlockInterface` (`atom-websdk/src/service.js`) serialise calls, but:

- they are keyed by a name the caller chooses (the docs' example uses the operation, `getDetails`), while replies are
  matched by interface address — two operations on one interface still cross;
- they poll (`throttle`, 500 ms by default), adding up to that much latency to each waiting call;
- they unlock in `finally`, also after a timeout, so a late reply is taken by the next call.

A client can make it correct on its own — one request in flight per interface address on a connection, handed on in
order without polling, a timed-out request keeping its turn until its late reply (or a grace period) — at the cost of
one browser ↔ gateway round trip per waiting request.

## The fix, at the protocol

A request id, echoed:

1. The client sends `ref` (unique per connection) with each request: `{ interface, request, token, ref }`.
2. The gateway copies `ref` into the reply, success and error alike — beside `token`, which it already echoes.
   The lexicon allows the field.
3. The SDK matches a reply by `ref` when the reply has one; without one (an older gateway) it falls back to one request
   in flight per interface address.

Additive both ways: an older client ignores `ref` in a reply; a newer client against an older gateway stays correct
through the fallback. With it, requests to one interface run side by side again, each getting its own reply.

`lockInterface` keeps its other use (not asking for the same thing twice at once), but stops being needed for
correctness; its docs should say what it does and does not guarantee.

## Built (20 Nov 2026)

The fix above is built and deployed; the sections above describe the state before it ("Status: not built" no longer
holds).

- **Gateway** (`agents/rtc:webrequest-handler`): every reply to a message carries its `ref` (with its `op` and
  `token`) — success, error, timeout, refusal, subscription, unsubscription; made in one place
  (`src/component/replies.js`, `send_reply.js`). Deployed on gcp-vritti-dogfooding (`npm run deploy-dogfooding`) and
  vritti-dev-server (`npm run deploy-staging`) — the gateway runs on both. Its `docs/README.md` has the protocol.
- **Correction:** "the lexicon allows the field" (step 2 above) was wrong: atom's `Lexeme` keeps only its schema's
  keys, so `ref` was added to `IncomingWsMsg`'s schema; replies set `token` and `ref` after inflection.
- **atom-websdk 3.4.0** — `RequestChannel` (`src/request_channel.js`), runtime-neutral, under the browser SDK and as
  `@muffin/atom-websdk/core` for Node. Matches by `ref`; on a connection whose first reply shows no `ref`, one request
  per interface at a time (a timed-out one keeping its turn until its late reply or a grace period). Also: a reply with
  `result: null` resolves, a close rejects everything waiting, no listeners left behind, `webunsubscribe`; `Service`
  caches are per class and its locks hand on in order (no polling). **3.4.1**: installable from git. **3.4.2**:
  `connect()` called while connecting shares the one attempt (it opened a second socket).
- **Node clients** (jity-mcp, wity-mcp, wity-cli): `WebInterface-cli.ts` on the core; wity-mcp's `InterfaceQueue`
  removed; their `connect()` also one attempt at a time. jity-mcp and wity-mcp deployed (dogfooding); wity-cli
  committed, not released.
- **Apps**: pins 3.3.0/3.2.0 → 3.4.2 (23 repos); the guards in jity-video-studio, jity-design-studio and
  jity-photo-studio removed; the hand-sent unsubscribe frame (its token was a Promise) replaced by `webunsubscribe` in
  wity-app, wity-thought-player, wity-notebook-viewer, wity-todos and agent-studio-shell. Committed; deploys and a
  browser pass of the studios and wity-app pending. Apps on 2.0.x and 3.1.x not moved (a migration of their own).
- **Verified**: SDK 17 Node + 57 Playwright tests; gateway unit and end-to-end tests; the core against the real gateway
  handler; live, through all three Node clients — six requests to one interface at once, each its own reply.
- **Locks**: `lockInterface` is no longer needed for correct replies. The services that hold it (hais-services,
  ~450 places) keep it — a service's calls one at a time; reviewing each is separate work.
