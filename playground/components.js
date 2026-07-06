/**
 * Muffin Playground — scenario components.
 * Loads element and atom-websdk from source so changes are reflected without rebuilding.
 *
 * Each component is self-evaluating: postRender() sets a [data-result] attribute
 * ("pass" | "fail" | "pending") so Playwright can assert without inspecting styles.
 */

import '@element';
import { applyAtomWebSDK } from '@sdk';

// atom-websdk auto-applies when window.Muffin exists, but belt-and-suspenders here.
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
// Repro: button starts with `disabled` in template. After toggle, `disabled`
// must be absent from the live DOM (tests __patchUnequalAttributes removeAttribute fix).

class ScenarioBooleanAttr extends Muffin.DOMComponent {
    static domElName = 'scenario-boolean-attr';

    static markupFunc(_data, uid, uiVars) {
        return `<div>
            <button id="target-btn" ${uiVars.isDisabled ? 'disabled' : ''} style="margin-right:8px">
                ${uiVars.isDisabled ? 'Disabled button' : 'Enabled button'}
            </button>
            <button on-click="toggle">Toggle disabled</button>
            <p data-result="${uiVars.result}" style="margin-top:8px">
                ${uiVars.resultText}
            </p>
        </div>`;
    }

    constructor() {
        super();
        this.uiVars.isDisabled = true;
        this.uiVars.result = 'pending';
        this.uiVars.resultText = 'Click "Toggle disabled" to test.';
        this.uiVars.toggleCount = 0;
    }

    toggle() {
        this.uiVars.isDisabled = !this.uiVars.isDisabled;
        this.uiVars.toggleCount++;
    }

    postRender() {
        const btn = this.getElement('#target-btn');
        if (!btn || this.uiVars.toggleCount === 0) return;

        const hasDisabled = btn.hasAttribute('disabled');
        const expectedDisabled = this.uiVars.isDisabled;

        if (hasDisabled === expectedDisabled) {
            if (!expectedDisabled) {
                // Toggled to enabled — this is the key pass condition
                this.uiVars.result = 'pass';
                this.uiVars.resultText = '✓ PASS — disabled removed from DOM after toggle';
            } else {
                this.uiVars.result = 'pending';
                this.uiVars.resultText = 'Toggled back to disabled — toggle again to test removal.';
            }
        } else {
            this.uiVars.result = 'fail';
            this.uiVars.resultText = `✗ FAIL — DOM hasAttribute(disabled)=${hasDisabled} but expected ${expectedDisabled}`;
        }
    }
}

ScenarioBooleanAttr.compose();

// ─── Scenario 2: Empty string slot ────────────────────────────────────────────
//
// Repro: ${condition ? '<p>visible</p>' : ''} — the empty-string branch should not
// break subsequent renders. Toggle through false→true→false to exercise both paths.

class ScenarioEmptyStringSlot extends Muffin.DOMComponent {
    static domElName = 'scenario-empty-string-slot';

    static markupFunc(_data, uid, uiVars) {
        return `<div>
            ${uiVars.show ? '<p id="conditional-el" style="color:green">Conditional element is visible</p>' : ''}
            <button on-click="toggle">Toggle (show=${uiVars.show})</button>
            <p data-result="${uiVars.result}" style="margin-top:8px">${uiVars.resultText}</p>
        </div>`;
    }

    constructor() {
        super();
        this.uiVars.show = false;
        this.uiVars.result = 'pending';
        this.uiVars.resultText = 'Click "Toggle" to test.';
        this.uiVars.toggleCount = 0;
    }

    toggle() {
        this.uiVars.show = !this.uiVars.show;
        this.uiVars.toggleCount++;
    }

    postRender() {
        if (this.uiVars.toggleCount === 0) return;

        const el = this.getElement('#conditional-el');
        const show = this.uiVars.show;

        // Both conditions must hold: element present when show=true, absent when show=false.
        if (show && el) {
            this.uiVars.result = 'pass';
            this.uiVars.resultText = `✓ PASS (toggle ${this.uiVars.toggleCount}) — show=true, element in DOM`;
        } else if (!show && !el) {
            this.uiVars.result = 'pass';
            this.uiVars.resultText = `✓ PASS (toggle ${this.uiVars.toggleCount}) — show=false, element absent`;
        } else if (show && !el) {
            this.uiVars.result = 'fail';
            this.uiVars.resultText = `✗ FAIL — show=true but element missing from DOM`;
        } else {
            this.uiVars.result = 'fail';
            this.uiVars.resultText = `✗ FAIL — show=false but element still in DOM`;
        }
    }
}

ScenarioEmptyStringSlot.compose();

// ─── Scenario 3: Variable-count slot ──────────────────────────────────────────
//
// Repro: inline ${list.map(...).join('')} where item count grows. The reconciler's
// __findAndReplaceUnequalNodes silently drops new items when _root2Child is undefined
// (root1 has more children than root2 at that index).
//
// Structure mirrors the wity-app pattern that triggered the bug:
//   root → wrapper div → dynamic p.item siblings.

class ScenarioVariableCount extends Muffin.DOMComponent {
    static domElName = 'scenario-variable-count';

    static markupFunc(_data, uid, uiVars) {
        const items = uiVars.items
            .map((item, i) => `<p class="item" data-idx="${i}">${item}</p>`)
            .join('');

        return `<div>
            <div id="list-wrapper">
                ${items}
            </div>
            <button on-click="addItem" style="margin-top:8px">Add item</button>
            <p style="margin-top:8px;font-size:13px;color:#555">
                Expected: ${uiVars.items.length} item(s)
            </p>
            <p data-result="${uiVars.result}">${uiVars.resultText}</p>
        </div>`;
    }

    constructor() {
        super();
        this.uiVars.items = ['Item A', 'Item B'];
        this.uiVars.result = 'pending';
        this.uiVars.resultText = 'Click "Add item" to test.';
    }

    addItem() {
        const labels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const next = labels[this.uiVars.items.length] ?? this.uiVars.items.length;
        this.uiVars.items = [...this.uiVars.items, `Item ${next}`];
    }

    postRender() {
        const wrapper = this.getElement('#list-wrapper');
        if (!wrapper || this.uiVars.items.length <= 2) return;

        const domCount = wrapper.querySelectorAll('.item').length;
        const expected = this.uiVars.items.length;

        if (domCount === expected) {
            this.uiVars.result = 'pass';
            this.uiVars.resultText = `✓ PASS — ${domCount} items in DOM, expected ${expected}`;
        } else {
            this.uiVars.result = 'fail';
            this.uiVars.resultText = `✗ FAIL — ${domCount} items in DOM, expected ${expected} (reconciler dropped ${expected - domCount})`;
        }
    }
}

ScenarioVariableCount.compose();

// ─── Scenario 4: on-load for cached / data-URI images ─────────────────────────
//
// Repro: a data: URI image has el.complete===true synchronously. Without the fix,
// the on-load handler is attached after the load event already fired → handler never called.
// The synthetic event fix checks el.complete after attaching the handler and fires manually.
//
// A 1×1 transparent GIF data URI is always immediately complete.

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
            <p style="font-size:13px;color:#555">
                Image complete on attach: <strong>${uiVars.wasComplete ?? '?'}</strong>
            </p>
            <p data-result="${uiVars.result}">${uiVars.resultText}</p>
        </div>`;
    }

    constructor() {
        super();
        this.uiVars.loaded = false;
        this.uiVars.wasComplete = null;
        this.uiVars.result = 'pending';
        this.uiVars.resultText = 'Waiting for on-load to fire…';
    }

    handleLoad(el, ev) {
        // Record whether the image was complete at the time the handler fired
        this.uiVars.wasComplete = el?.complete ?? true;
        this.uiVars.loaded = true;
        this.uiVars.result = 'pass';
        this.uiVars.resultText = '✓ PASS — on-load handler fired (synthetic event for cached image)';
    }
}

ScenarioOnloadCached.compose();
