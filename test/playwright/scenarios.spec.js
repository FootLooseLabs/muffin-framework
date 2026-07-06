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
