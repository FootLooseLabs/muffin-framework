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
