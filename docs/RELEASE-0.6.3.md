# Canvsidian 0.6.3 — left-edge stability

## Reproduced regression

The 0.6.2 checks kept note width fixed but did not assert screen position during pointer release. A real left-edge drag in the Chromium harness reproduced a different defect: expanding the coordinate origin requested more horizontal scroll than object/content overflow provided. The browser clamped the scroll, moving the note and object on screen. Inherited RTL and reversed flex scrolling also made the positive-offset assumption invalid. This could move native content out of view even though Markdown remained unchanged.

## Fix

- Add a non-interactive, absolute world extent so every origin increment has enough physical scroll range before compensating scrollLeft. Include the full outer viewport width, including reserved scrollbar gutter, and retain the visible right-side extent across object moves.
- Do not rebase merely because an object is close to the left edge; rebase only once its real rotated bounds are negative. Reserve the additional margin after crossing that boundary.
- Keep physical scrolling left-to-right with an unreversed flex axis, while preserving the note's RTL text direction, right alignment and gutter order. Restore inline direction/flex styles and translation on disable/destroy.
- Disable browser overflow anchoring and smooth scrolling for the active spatial surface so the controlled rebase is not animated or double-compensated.
- Portal the ordinary source-block grip into a clipped controls layer outside the scroller. Showing/hiding it cannot add scroll overflow. Use actual client bounds for right-edge placement, explicit control sizing and a stable vertical scrollbar gutter.

## Validation

`npm run check`: TypeScript, 55 passing unit/model tests and production build.

`npm run test:ui`: 109 passing browser checks, including 12 new edge regression checks. The new cases cover LTR/RTL, direct CodeMirror content and a nested `.cm-sizer` inside a clipped 680px split pane, long wrapped Persian/English notes, and explicit 17px scrollbars. Each case runs eight grip show/hide cycles and three real left-edge pointer drags. They compare the box at preview/release/settled states, all rendered note lines, note dimensions and position, viewport ranges and original Markdown. Direction restoration on disabling is also checked. No editor transactions occur during movement.

The synthetic drag benchmark additionally checks 120 pointer moves with zero transactions during movement and one transaction at release; this is not an FPS measurement.

These tests use real CodeMirror with mocked Obsidian APIs and Markdown rendering. They do not certify the real Obsidian app, every theme or third-party extension. Back up the vault and plugin data before installing, and verify in a test vault first.

## Delivery

Display name **Canvsidian**, stable installation ID/folder `canvesidian`, version 0.6.3. Installer contains only main.js, manifest.json and styles.css. Keep the user's data.json. No Markdown migration is required.

GitHub publication remains blocked by the previously observed token write-permission error. No remote branch/tag/release was modified or deleted; installable and complete-source ZIPs are supplied instead.
