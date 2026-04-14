// Muffin local test rig — components.js
// Run: cd muffin-framework && npx serve test/
// Then open http://localhost:3000

// ─── SDK status check ────────────────────────────────────────────────────────

const statusEl = document.getElementById('sdk-status');
if (window.Muffin && Muffin.DOMComponent && Muffin.Service) {
    statusEl.innerHTML = '<span class="pass">✓ SDK loaded — Muffin.DOMComponent and Muffin.Service available</span>';
} else {
    statusEl.innerHTML = '<span class="fail">✗ SDK failed to load</span>';
    console.error('SDK load failed. window.Muffin =', window.Muffin);
}

// ─── Test 1: Basic render ─────────────────────────────────────────────────────
// Sets uiVars in constructor, verifies render shows correct values.

class TestCounter extends Muffin.DOMComponent {
    static domElName = 'test-counter';

    static markupFunc(_data, uid, uiVars) {
        return `<div data-testid="counter">
            <p>Count: <strong>${uiVars.count}</strong></p>
            <p>Label: <em>${uiVars.label}</em></p>
            <p class="${uiVars.count > 0 ? 'pass' : 'fail'}">
                ${uiVars.count > 0 ? '✓ count set in constructor' : '✗ count is 0 — constructor uiVars not applied'}
            </p>
        </div>`;
    }

    constructor() {
        super();
        this.uiVars.count = 42;         // set in constructor
        this.uiVars.label = 'hello';    // set in constructor
    }
}

TestCounter.compose();

// ─── Test 2: Reactive re-render ───────────────────────────────────────────────
// Clicking the button increments a counter and should trigger a re-render.

class TestReactive extends Muffin.DOMComponent {
    static domElName = 'test-reactive';

    static markupFunc(_data, uid, uiVars) {
        return `<div>
            <p>Clicks: <strong>${uiVars.clicks}</strong></p>
            <button on-click="handleClick">Click me</button>
            <p class="${uiVars.clicks > 0 ? 'pass' : ''}">
                ${uiVars.clicks > 0 ? '✓ reactive re-render working' : 'Waiting for click...'}
            </p>
        </div>`;
    }

    constructor() {
        super();
        this.uiVars.clicks = 0;
    }

    handleClick(srcEl, ev) {
        this.uiVars.clicks++;
    }
}

TestReactive.compose();

// ─── Test 3: Inheritance ──────────────────────────────────────────────────────
// Base class + subclass, mirrors the asset-initialization-page / brainstorming pattern
// seen in wity-app stack traces.

class TestBase extends Muffin.DOMComponent {
    static domElName = 'test-base';

    static markupFunc(_data, uid, uiVars) {
        return `<div><p>Base markupFunc — should be overridden</p></div>`;
    }

    constructor() {
        super();
        this.uiVars.baseValue = 'from-base';
    }

    baseMethod() {
        this.uiVars.baseValue = 'updated-by-baseMethod';
    }
}

class TestChild extends TestBase {
    static domElName = 'test-child';

    static markupFunc(_data, uid, uiVars) {
        return `<div>
            <p>Child markupFunc rendered.</p>
            <p>baseValue: <strong>${uiVars.baseValue}</strong></p>
            <p>childValue: <strong>${uiVars.childValue}</strong></p>
            <p class="${uiVars.childValue === 'from-child' ? 'pass' : 'fail'}">
                ${uiVars.childValue === 'from-child' ? '✓ inheritance works' : '✗ childValue missing'}
            </p>
        </div>`;
    }

    constructor() {
        super();
        this.uiVars.childValue = 'from-child';
    }
}

TestChild.compose();

// ─── Test 4: onConnect ────────────────────────────────────────────────────────
// Constructor sets loading=true, onConnect sets real data.

class TestConnect extends Muffin.DOMComponent {
    static domElName = 'test-connect';

    static markupFunc(_data, uid, uiVars) {
        return `<div>
            <p>loading: <strong>${uiVars.loading}</strong></p>
            <p>message: <strong>${uiVars.message}</strong></p>
            <p class="${!uiVars.loading && uiVars.message === 'loaded' ? 'pass' : ''}">
                ${!uiVars.loading && uiVars.message === 'loaded' ? '✓ onConnect uiVars work' : 'loading...'}
            </p>
        </div>`;
    }

    constructor() {
        super();
        this.uiVars.loading = true;
        this.uiVars.message = '';
    }

    onConnect() {
        // Simulates async data fetch
        setTimeout(() => {
            this.uiVars.loading = false;
            this.uiVars.message = 'loaded';
        }, 500);
    }
}

TestConnect.compose();

// ─── Test 5: stateSpace with idle root (wity-app pattern) ────────────────────
// Component defines stateSpace without idle; idle is merged via defaultStateSpace.
// onConnect calls switchState("loading") synchronously, then switchState("loaded")
// after a short async delay. Render count and final state are verified.

class TestStatePage extends Muffin.DOMComponent {
    static domElName = 'test-state-page';

    static stateSpace = {
        "loading": { apriori: ["idle", "errored", "loaded"] },
        "errored":  { apriori: ["loading"] },
        "loaded":   { apriori: ["loading"] }
    }

    static idleMarkup(_data, uid, uiVars) {
        return `<p>idle (loading spinner placeholder)</p>`;
    }
    static loadingMarkup(_data, uid, uiVars) {
        return `<p>loading...</p>`;
    }
    static loadedMarkup(_data, uid, uiVars) {
        return `<p class="pass">✓ loaded — state: ${uiVars.state?.name}</p>`;
    }
    static erroredMarkup(_data, uid, uiVars) {
        return `<p class="fail">errored</p>`;
    }

    static markupFunc(_data, uid, uiVars, routeVars, _constructor) {
        const stateMarkup = _constructor[`${this.current_state}Markup`];
        if (!stateMarkup) return `<div><p class="fail">✗ no markup for state: ${this.current_state}</p></div>`;
        return `<div>
            <p>current_state: <strong>${this.current_state}</strong></p>
            <p>render count: <strong>${uiVars.renderCount}</strong></p>
            ${stateMarkup(_data, uid, uiVars)}
            <p class="${this.current_state === 'loaded' ? 'pass' : ''}">
                ${this.current_state === 'loaded' ? '✓ state machine works correctly' : 'waiting...'}
            </p>
        </div>`;
    }

    constructor() {
        super();
        this.uiVars.renderCount = 0;
    }

    postRender() {
        this.uiVars.renderCount++;
    }

    async onConnect() {
        this.switchState("loading");    // sync, before any await
        await new Promise(r => setTimeout(r, 300));
        this.switchState("loaded");
    }
}

TestStatePage.compose();

// ─── Test 6: switchToIdleState does NOT trigger extra render ─────────────────
// Component with onConnect that has an await before switchState.
// In v3, switchToIdleState() must NOT schedule a render — otherwise the component
// would render in "idle" state before onConnect can set the real state.

class TestIdleNoRender extends Muffin.DOMComponent {
    static domElName = 'test-idle-no-render';

    static stateSpace = {
        "ready": { apriori: ["idle"] }
    }

    static markupFunc(_data, uid, uiVars) {
        const stateOk = uiVars.state?.name === 'ready' || uiVars.state == null;
        return `<div>
            <p>current_state: <strong>${uiVars.finalState || 'pending...'}</strong></p>
            <p>uiVars.state.name: <strong>${uiVars.state?.name ?? '(not set)'}</strong></p>
            <p>render count: <strong>${uiVars.renderCount}</strong></p>
            <p class="${uiVars.finalState === 'ready' ? 'pass' : ''}">
                ${uiVars.finalState === 'ready' ? '✓ no spurious idle render, reached ready state' : 'waiting...'}
            </p>
        </div>`;
    }

    constructor() {
        super();
        this.uiVars.renderCount = 0;
        this.uiVars.finalState = null;
    }

    postRender() {
        this.uiVars.renderCount++;
    }

    async onConnect() {
        // await BEFORE switchState — if switchToIdleState triggered a spurious
        // microtask render, it would fire here with current_state still "idle"
        await new Promise(r => setTimeout(r, 100));
        this.switchState("ready");
        this.uiVars.finalState = this.current_state;
    }
}

TestIdleNoRender.compose();
