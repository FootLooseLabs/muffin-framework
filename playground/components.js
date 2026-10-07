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

// ─── Scenario 5: Focused button grafted into unrelated markup ─────────────────
//
// A real mouse click focuses the "← Back" button. When the body swaps back to
// the choice view, the reconciler must NOT keep the focused button and graft it
// into the "Paste" choice's title slot (answer-spaces-editor bug, wity-app).

class ScenarioFocusGraft extends Muffin.DOMComponent {
    static domElName = 'scenario-focus-graft';

    static markupFunc(_data, uid, uiVars, routeVars, _constructor) {
        return `<div class="s5">
            <p class="s5-intro">Pick a mode.</p>
            ${uiVars.mode === 'paste' ? _constructor._pasteMarkup() : _constructor._chooseMarkup()}
        </div>`;
    }

    static _chooseMarkup() {
        return `<div class="s5-choose">
            <button type="button" on-click="onAdd"><span class="s5-title"><b>+</b> Add</span><span class="s5-sub">new item</span></button>
            <button type="button" id="s5-paste" on-click="onStartPaste"><span class="s5-title"><b>#</b> Paste</span><span class="s5-sub">import</span></button>
        </div>`;
    }

    static _pasteMarkup() {
        return `<div class="s5-paste">
            <textarea></textarea>
            <div class="s5-actions">
                <button type="button" id="s5-back" on-click="onCancel">← Back</button>
                <button type="button" on-click="onImport">Import</button>
            </div>
        </div>`;
    }

    constructor() {
        super();
        this.uiVars.mode = 'choose';
    }

    onAdd() {}
    onImport() {}
    onStartPaste() { this.uiVars.mode = 'paste'; }
    onCancel() { this.uiVars.mode = 'choose'; }
}

ScenarioFocusGraft.compose();

// ─── Scenario 6: Typing while the surrounding structure changes ───────────────
//
// The input's sibling list changes length on every keystroke, and its wrapper
// switches tag (div → section) once the query is longer than 3 chars. Focus,
// value and caret must survive every re-render.

class ScenarioTypingStructural extends Muffin.DOMComponent {
    static domElName = 'scenario-typing-structural';

    static markupFunc(_data, uid, uiVars) {
        const q = uiVars.query;
        const items = Array.from({ length: q.length }, (_, i) => `<li>${i}</li>`).join('');
        const tag = q.length > 3 ? 'section' : 'div';
        return `<div class="s6">
            <${tag} class="s6-wrap">
                <input id="s6-input" type="text" value="${this.esc(q)}" on-input="onType" />
                <ul class="s6-list">${items}</ul>
            </${tag}>
        </div>`;
    }

    constructor() {
        super();
        this.uiVars.query = '';
    }

    onType(srcEl) { this.uiVars.query = srcEl.value; }
}

ScenarioTypingStructural.compose();

// ─── Scenario 7: Keyboard toggle button keeps focus and updates its label ─────

class ScenarioToggleButton extends Muffin.DOMComponent {
    static domElName = 'scenario-toggle-button';

    static markupFunc(_data, uid, uiVars) {
        return `<div class="s7">
            <button type="button" id="s7-toggle" on-click="onToggle">${uiVars.open ? 'Close' : 'Open'}</button>
            ${uiVars.open ? '<div class="s7-panel"><p>Panel content</p></div>' : ''}
        </div>`;
    }

    constructor() {
        super();
        this.uiVars.open = false;
    }

    onToggle() { this.uiVars.open = !this.uiVars.open; }
}

ScenarioToggleButton.compose();

// ─── Scenario 8: Imperatively-set attributes survive re-renders ───────────────
//
// Mirrors boards-directory-modal.show(): a state write schedules a re-render,
// then toggleRootAttr('is-open', true) sets an attribute markupFunc never renders,
// then a later re-render follows (data load). The attribute must survive.
// Rendered attributes (Scenario 1) must still be removed.

class ScenarioImperativeAttrs extends Muffin.DOMComponent {
    static domElName = 'scenario-imperative-attrs';

    static markupFunc(_data, uid, uiVars) {
        return `<div class="s8">
            <p class="s8-status">loads: ${uiVars.loads}</p>
            <button type="button" id="s8-open" on-click="show">Open</button>
        </div>`;
    }

    constructor() {
        super();
        this.uiVars.loads = 0;
    }

    show() {
        this.uiVars.loads = this.uiVars.loads + 1;            // schedules a re-render
        this.toggleRootAttr('is-open', true);                  // set imperatively
        setTimeout(() => { this.uiVars.loads = this.uiVars.loads + 1; }, 50); // later re-render
    }
}

ScenarioImperativeAttrs.compose();
