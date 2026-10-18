# Canvsidian 0.6.5 — object-only horizontal view

## Fix

Negative horizontal placement is supported again without moving the native note. The previous origin rebasing, content translation, synthetic horizontal extent and native scrolling-direction overrides remain removed.

An absolutely positioned, zero-height object viewport clips horizontal overflow only. Its width follows the native scroller's client width. Only the child spatial layer receives a horizontal camera transform. Native content, inline title and metadata receive no camera transform or layout offset. Vertical scrolling remains native; no JavaScript scroll-following loop is used.

- Dragging near either horizontal edge pans only the object view, compensating world coordinates so the dragged object follows the pointer.
- Alt + wheel pans the object view; native horizontal scrolling is not used for this interaction.
- Object view offers left/right navigation, Show selected object and Reset object view.
- Camera offset is saved per note as optional schema-5 `viewX`. Coordinates and connector IDs are not rewritten to restore visibility.
- Escape/pointer cancel restores both gesture placement and the original camera offset.
- Creation, keyboard nudge/reveal, Markdown editing, note alignment, connector hit testing, selection controls and import placement account for camera offset.
- Source grips stay outside document layout. Object grips stay vertically centered against the rendered object bounds, including rotation and height changes.

## Installation

Back up the vault and existing `data.json`. Replace only `main.js`, `manifest.json`, and `styles.css` in `.obsidian/plugins/canvesidian/`, then reload Obsidian. Keep the existing `data.json` and folder/id `canvesidian`; the display name remains Canvsidian. Do not install a second plugin folder. Older versions may not retain negative positions or the new view offset; use the matching backup when downgrading.

## Validation scope

Automated tests use real CodeMirror and Chromium with a mocked Obsidian API/Markdown renderer, not the actual Obsidian application. Header regression fixtures include native-shaped inline titles and metadata outside `contentDOM`, long wrapped notes, LTR/RTL, wide/split panes and explicit scrollbars. Tests cover negative drags, release stability, cancellation, hover stability, centered grips, native geometry/scroll-range invariance, saved view restoration, connectors, creation, alignment and in-place editing after camera movement. Actual Obsidian and third-party themes still require vault-level validation.

The camera intentionally moves all floating objects together relative to the stationary note. An object deliberately dragged completely offscreen can be recovered through Show selected object or Alt + wheel. Camera offsets are bounded to ±50,000 pixels, matching the persisted object-coordinate limits. The connector workflow remains the previous two-click tool, not drag-to-connect ports.

Validation results: typecheck, production build, 59 unit tests and 119 browser checks passed. The synthetic 120-pointer-move benchmark used zero editor transactions during movement and one after release; this is not an FPS measurement.
