# Canvsidian 0.6.2

## Changes

- Fix progressive note compression when objects move left. Expanding the horizontal world now translates the editor content without changing its flex-layout width; disabling/destroying restores its original inline translation. Negative object positions remain scrollable.
- Restore the previous two-click **Connect objects** workflow. Normal **Draw arrow** is free drawing again. Remove plus connection ports and automatic drag snapping. Keep existing connector and single-ended-arrow data, routing and persistence for compatibility.
- Remove source and floating-object grip hover overlays entirely. Grips still reveal only in their own hit areas. Rotation remains selected-only and floating Markdown stays transparent by default.
- Replace handcrafted grip menus with Obsidian's real `Menu`/`MenuItem` API. The host owns theme rendering, placement and keyboard navigation. Preserve selection while interacting with host menus and close menus when their owner is destroyed.
- Add source Markdown copy/selection; floating Markdown copy, alignment to the note, rotation reset and return-to-source editing; independent drawing alignment/rotation reset and annotation text copy. Existing appearance, layering, duplicate and confirmed delete actions remain available.

## Verification

- `npm run check`: TypeScript, 55 passing unit/model tests, production build.
- `npm run test:ui`: 97 passing browser checks. Chromium harness tests cover original flows and the revised interactions. The regression fixture permits flex shrinking, moves a Markdown object left 180 times, checks unchanged note width and line heights as the origin grows beyond 1,000px, pans to the negative object and checks toggle restoration.
- Native-menu tests use an Obsidian API stand-in. Production imports `Menu` from Obsidian; the stand-in is QA-only and is not bundled. Host menu invocation, extra actions, selection retention, no hover overlay, no plus ports, two-click connectors, free arrows, reload and original Markdown integrity are checked.
- Drag benchmark: 120 pointer moves, zero editor transactions during movement and one at release. This is transaction overhead, not an FPS measurement.
- Single-ended arrow compatibility remains covered by routing and normalization unit tests.
- The browser harness uses real CodeMirror and mocked Obsidian APIs/Markdown rendering. This is not certification inside the real Obsidian app or across all themes/plugins. Test in a backed-up vault first.

## Installation and publication

Keep installation ID/folder `canvesidian` and display name **Canvsidian**. Replace only `main.js`, `manifest.json` and `styles.css`, keep the user's `data.json`, then reload the plugin. The installer includes no personal data.

No GitHub write was retried: the previously observed 403 token-permission blocker remains unresolved. No remote branch, tag or release was modified or removed. The complete source ZIP is included for review/manual upload.
