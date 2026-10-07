/**
 * Muffin Playground — Playwright scenario tests.
 *
 * Muffin replaces the custom element tag with the rendered <div> during __patchDOMCompletely,
 * so locating by tag name (e.g. 'scenario-boolean-attr') finds nothing after first render.
 * Instead we locate via the [data-scenario] wrapper div in index.html, which is stable.
 *
 * Scenarios 1 and 4 write [data-result] directly from postRender (no uiVars, no loop).
 * Scenarios 2 and 3 are asserted by direct DOM inspection (no [data-result] needed).
 */

import { test, expect } from '@playwright/test';

const scenario = (page, name) => page.locator(`[data-scenario="${name}"]`);

// ─── Scenario 1: Boolean attribute removal ────────────────────────────────────

test('Scenario 1 — boolean attribute removal: disabled removed after toggle', async ({ page }) => {
    await page.goto('/');

    const s   = scenario(page, 'boolean-attr-removal');
    const btn = s.locator('#target-btn');

    await expect(btn).toHaveAttribute('disabled', '');

    await s.locator('button:has-text("Toggle")').click();

    await expect(btn).not.toHaveAttribute('disabled');
    await expect(s.locator('[data-result]')).toHaveAttribute('data-result', 'pass');
});

// ─── Scenario 2: Empty string slot ────────────────────────────────────────────

test('Scenario 2 — empty string slot: show=true renders element', async ({ page }) => {
    await page.goto('/');

    const s = scenario(page, 'empty-string-slot');

    await expect(s.locator('#conditional-el')).not.toBeAttached();

    await s.locator('button').click();
    await expect(s.locator('#conditional-el')).toBeAttached();
});

test('Scenario 2 — empty string slot: show=false removes element', async ({ page }) => {
    await page.goto('/');

    const s   = scenario(page, 'empty-string-slot');
    const btn = s.locator('button');

    await btn.click();
    await expect(s.locator('#conditional-el')).toBeAttached();

    await btn.click();
    await expect(s.locator('#conditional-el')).not.toBeAttached();
});

// ─── Scenario 3: Variable-count slot ──────────────────────────────────────────

test('Scenario 3 — variable-count slot: adding items renders correctly', async ({ page }) => {
    await page.goto('/');

    const s      = scenario(page, 'variable-count-slot');
    const wrapper = s.locator('#list-wrapper');
    const addBtn  = s.locator('button:has-text("Add item")');

    await expect(wrapper.locator('.item')).toHaveCount(2);

    await addBtn.click();
    await expect(wrapper.locator('.item')).toHaveCount(3);

    await addBtn.click();
    await expect(wrapper.locator('.item')).toHaveCount(4);
});

// ─── Scenario 4: on-load for cached images ────────────────────────────────────

test('Scenario 4 — on-load cached: handler fires for data-URI image', async ({ page }) => {
    await page.goto('/');

    const s = scenario(page, 'onload-cached');
    await expect(s.locator('[data-result]')).toHaveAttribute('data-result', 'pass', { timeout: 3000 });
});

// ─── Scenario 5: Focused button grafted into unrelated markup ─────────────────
// Uses real mouse clicks: element.click() does not move focus and hides the bug.

test('Scenario 5 — focused button is not grafted into the choice view after Back', async ({ page }) => {
    await page.goto('/');

    const s = scenario(page, 'focus-graft');

    for (let i = 0; i < 3; i++) {
        await s.locator('#s5-paste').click();
        await expect(s.locator('#s5-back')).toBeVisible();
        await s.locator('#s5-back').click();

        const title = s.locator('#s5-paste .s5-title');
        await expect(title).toHaveText('# Paste');
        await expect(title).toHaveJSProperty('tagName', 'SPAN');
        await expect(s.locator('#s5-paste button')).toHaveCount(0);
        await expect(s.locator('#s5-back')).toHaveCount(0);
    }
});

// ─── Scenario 6: Typing while the surrounding structure changes ───────────────

test('Scenario 6 — typing keeps focus, value and caret across structural re-renders', async ({ page }) => {
    await page.goto('/');

    const s     = scenario(page, 'typing-structural');
    const input = s.locator('#s6-input');

    await input.click();
    await page.keyboard.type('abcdef', { delay: 30 });

    await expect(input).toBeFocused();
    await expect(input).toHaveValue('abcdef');
    await expect(s.locator('.s6-list li')).toHaveCount(6);
    await expect(s.locator('section.s6-wrap')).toHaveCount(1);

    // caret editing mid-string: move left twice, insert
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.type('X', { delay: 30 });
    await expect(input).toBeFocused();
    await expect(input).toHaveValue('abcdXef');

    // caret is after X ("abcdX|ef"): four backspaces delete X,d,c,b; the last one
    // drops below the threshold, so the wrapper swaps section → div mid-edit
    for (let i = 0; i < 4; i++) await page.keyboard.press('Backspace');
    await expect(input).toBeFocused();
    await expect(input).toHaveValue('aef');
    await expect(s.locator('div.s6-wrap')).toHaveCount(1);

    // caret must have survived the wrapper swap ("a|ef"): typing lands mid-string,
    // and pushes back over the threshold (div → section)
    await page.keyboard.type('Z', { delay: 30 });
    await expect(input).toBeFocused();
    await expect(input).toHaveValue('aZef');
    await expect(s.locator('section.s6-wrap')).toHaveCount(1);
});

// ─── Scenario 7: Keyboard toggle button ───────────────────────────────────────

test('Scenario 7 — toggle button label updates and focus stays on it', async ({ page }) => {
    await page.goto('/');

    const s   = scenario(page, 'toggle-button');
    const btn = s.locator('#s7-toggle');

    await btn.focus();
    await page.keyboard.press('Enter');
    await expect(btn).toHaveText('Close');
    await expect(s.locator('.s7-panel')).toHaveCount(1);
    await expect(btn).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(btn).toHaveText('Open');
    await expect(s.locator('.s7-panel')).toHaveCount(0);
    await expect(btn).toBeFocused();
});
