/**
 * Muffin Playground — Playwright scenario tests.
 *
 * Muffin replaces the custom element tag with the rendered <div> during __patchDOMCompletely,
 * so locating by tag name (e.g. 'scenario-boolean-attr') finds nothing after first render.
 * Instead we locate via the [data-scenario] wrapper div in index.html, which is stable.
 *
 * Pass condition : [data-result="pass"]
 * Fail condition : [data-result="fail"]
 * Pending        : [data-result="pending"] (interaction required)
 */

import { test, expect } from '@playwright/test';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Scoped locator for a scenario's root (the data-scenario wrapper). */
const scenario = (page, name) => page.locator(`[data-scenario="${name}"]`);

// ─── Scenario 1: Boolean attribute removal ────────────────────────────────────

test('Scenario 1 — boolean attribute removal: disabled removed from DOM after toggle', async ({ page }) => {
    await page.goto('/');

    const s = scenario(page, 'boolean-attr-removal');

    // Start state: button should have disabled
    const btn = s.locator('#target-btn');
    await expect(btn).toHaveAttribute('disabled', '');

    // Toggle → disabled attribute must be gone
    await s.locator('button:has-text("Toggle")').click();

    await expect(btn).not.toHaveAttribute('disabled');
    await expect(s.locator('[data-result]')).toHaveAttribute('data-result', 'pass');
});

// ─── Scenario 2: Empty string slot ────────────────────────────────────────────

test('Scenario 2 — empty string slot: show=true renders element', async ({ page }) => {
    await page.goto('/');

    const s = scenario(page, 'empty-string-slot');

    // Initial state: element absent (show=false)
    await expect(s.locator('#conditional-el')).not.toBeAttached();

    // Toggle → show=true → element should appear
    await s.locator('button').click();
    await expect(s.locator('#conditional-el')).toBeAttached();
    await expect(s.locator('[data-result]')).toHaveAttribute('data-result', 'pass');
});

test('Scenario 2 — empty string slot: show=false removes element (double toggle)', async ({ page }) => {
    await page.goto('/');

    const s   = scenario(page, 'empty-string-slot');
    const btn = s.locator('button');

    // Toggle to true then back to false
    await btn.click();
    await expect(s.locator('#conditional-el')).toBeAttached();

    await btn.click();
    await expect(s.locator('#conditional-el')).not.toBeAttached();
    await expect(s.locator('[data-result]')).toHaveAttribute('data-result', 'pass');
});

// ─── Scenario 3: Variable-count slot ──────────────────────────────────────────

test('Scenario 3 — variable-count slot: adding items renders correctly', async ({ page }) => {
    await page.goto('/');

    const s      = scenario(page, 'variable-count-slot');
    const wrapper = s.locator('#list-wrapper');
    const addBtn  = s.locator('button:has-text("Add item")');
    const result  = s.locator('[data-result]');

    // Initial: 2 items
    await expect(wrapper.locator('.item')).toHaveCount(2);

    // Add 3rd item
    await addBtn.click();
    await expect(wrapper.locator('.item')).toHaveCount(3);
    await expect(result).toHaveAttribute('data-result', 'pass');

    // Add 4th item — regression guard
    await addBtn.click();
    await expect(wrapper.locator('.item')).toHaveCount(4);
    await expect(result).toHaveAttribute('data-result', 'pass');
});

// ─── Scenario 4: on-load for cached images ────────────────────────────────────

test('Scenario 4 — on-load cached: handler fires for data-URI image', async ({ page }) => {
    await page.goto('/');

    const s = scenario(page, 'onload-cached');

    // data: URI is always synchronously complete — synthetic event fires on first render.
    // No interaction needed; just verify the pass state is set on initial render.
    await expect(s.locator('[data-result]')).toHaveAttribute('data-result', 'pass', { timeout: 3000 });
});
