/**
 * Muffin Playground — scenario components.
 * Loads element and atom-websdk from source so changes are reflected without rebuilding.
 *
 * Design rule: postRender() must NEVER write to uiVars. uiVars has no dirty-check —
 * any assignment (even same value) calls _scheduleRender(), causing an infinite loop.
 * postRender() manipulates the live DOM directly instead (no re-render triggered).
 *
 * Playwright reads [data-result] from the live DOM after postRender has run.
 */

import '@element';
import { applyAtomWebSDK } from '@sdk';

if (window.Muffin && !Muffin.DOMComponent.prototype.__domExtensionsApplied) {
    applyAtomWebSDK(window.Muffin);
}

// ─── SDK status banner ────────────────────────────────────────────────────────

const statusEl = document.getElementById('sdk-status');
if (window.Muffin?.DOMComponent && window.Muffin?.Service) {
    statusEl.textContent = '✓ SDK loaded from source — Muffin.DOMComponent and Muffin.Service available';
    statusEl.className = 'ok';
} else {
    statusEl.textContent = '✗ SDK failed to load';
    statusEl.className = 'err';
}

// ─── Scenario 1: Boolean attribute removal ────────────────────────────────────
//
// Verifies __patchUnequalAttributes calls removeAttribute.
// postRender reads the live DOM and sets [data-result] directly — no uiVars write.

class ScenarioBooleanAttr extends Muffin.DOMComponent {
    static domElName = 'scenario-boolean-attr';

    static markupFunc(_data, uid, uiVars) {
        return `<div>
            <button id="target-btn" ${uiVars.isDisabled ? 'disabled' : ''} style="margin-right:8px">
                ${uiVars.isDisabled ? 'Disabled button' : 'Enabled button'}
            </button>
            <button on-click="toggle">Toggle disabled</button>
            <p data-result="pending" style="margin-top:8px">Click "Toggle disabled" to test.</p>
        </div>`;
    }

    constructor() {
        super();
        this.uiVars.isDisabled = true;
        this.uiVars.toggleCount = 0;
    }

    toggle() {
        this.uiVars.isDisabled = !this.uiVars.isDisabled;
        this.uiVars.toggleCount++;
    }

    postRender() {
        if (this.uiVars.toggleCount === 0) return;
        const btn    = this.getElement('#target-btn');
        const result = this.getElement('[data-result]');
        if (!btn || !result) return;

        // Write directly to live DOM — NOT to uiVars (would re-trigger render).
        const domHasDisabled  = btn.hasAttribute('disabled');
        const shouldBeEnabled = !this.uiVars.isDisabled;

        if (shouldBeEnabled && !domHasDisabled) {
            result.setAttribute('data-result', 'pass');
            result.textContent = '✓ PASS — disabled removed from DOM after toggle';
        } else if (shouldBeEnabled && domHasDisabled) {
            result.setAttribute('data-result', 'fail');
            result.textContent = '✗ FAIL — disabled still in DOM after toggle (attribute removal bug)';
        }
    }
}

ScenarioBooleanAttr.compose();

// ─── Scenario 2: Empty string slot ────────────────────────────────────────────
//
// Verifies ${condition ? '<el/>' : ''} doesn't break the reconciler.
// No [data-result] needed — Playwright asserts DOM presence directly.

class ScenarioEmptyStringSlot extends Muffin.DOMComponent {
    static domElName = 'scenario-empty-string-slot';

    static markupFunc(_data, uid, uiVars) {
        return `<div>
            ${uiVars.show ? '<p id="conditional-el" style="color:green">Conditional element is visible</p>' : ''}
            <button on-click="toggle">Toggle (show=${uiVars.show})</button>
        </div>`;
    }

    constructor() {
        super();
        this.uiVars.show = false;
    }

    toggle() {
        this.uiVars.show = !this.uiVars.show;
    }
}

ScenarioEmptyStringSlot.compose();

// ─── Scenario 3: Variable-count slot ──────────────────────────────────────────
//
// Verifies inline ${list.map(...).join('')} reconciles when count grows.
// No [data-result] needed — Playwright counts .item elements directly.

class ScenarioVariableCount extends Muffin.DOMComponent {
    static domElName = 'scenario-variable-count';

    static markupFunc(_data, uid, uiVars) {
        const items = uiVars.items
            .map((item, i) => `<p class="item" data-idx="${i}">${item}</p>`)
            .join('');

        return `<div>
            <div id="list-wrapper">${items}</div>
            <button on-click="addItem" style="margin-top:8px">Add item</button>
            <p style="margin-top:4px;font-size:13px;color:#555">
                uiVars.items.length = ${uiVars.items.length}
            </p>
        </div>`;
    }

    constructor() {
        super();
        this.uiVars.items = ['Item A', 'Item B'];
    }

    addItem() {
        const labels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const next = labels[this.uiVars.items.length] ?? this.uiVars.items.length;
        this.uiVars.items = [...this.uiVars.items, `Item ${next}`];
    }
}

ScenarioVariableCount.compose();

// ─── Scenario 4: on-load for cached / data-URI images ─────────────────────────
//
// Verifies the synthetic load event fires for el.complete===true images.
// postRender sets [data-result] directly — NOT through uiVars.
//
// Guard in event_binder: only fires synthetic event when _getDomNode() is null
// (first render). Without this, every re-render would re-invoke the handler via
// uiVars → _scheduleRender → infinite loop.

const TRANSPARENT_GIF =
    'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

class ScenarioOnloadCached extends Muffin.DOMComponent {
    static domElName = 'scenario-onload-cached';

    static markupFunc(_data, uid, uiVars) {
        return `<div>
            <img
                id="test-img"
                src="${TRANSPARENT_GIF}"
                on-load="handleLoad"
                alt="1x1 transparent (always cached/complete)"
                style="border:1px solid #ccc;width:32px;height:32px;display:block;margin-bottom:8px"
            />
            <p data-result="pending">Waiting for on-load to fire…</p>
        </div>`;
    }

    constructor() {
        super();
        // No state needed — result is set directly in postRender after handler fires.
        this._loadFired = false;
    }

    handleLoad(el, ev) {
        // Store on instance (not uiVars) so postRender can read it without re-rendering.
        this._loadFired = true;
    }

    postRender() {
        const result = this.getElement('[data-result]');
        if (!result) return;
        // Direct DOM write — no uiVars, no render loop.
        if (this._loadFired) {
            result.setAttribute('data-result', 'pass');
            result.textContent = '✓ PASS — on-load handler fired (synthetic event for cached image)';
        }
    }
}

ScenarioOnloadCached.compose();
