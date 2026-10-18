# Canvsidian 0.6 release verification

## Scope

Quiet right-gutter block actions, theme-aware hover feedback, atomic layer ordering, routed attached arrows, 29 stickers, negative horizontal workspace, expanded text appearance and a simplified dock. Display name changed; the stable plugin ID remains `canvesidian` for upgrade compatibility.

## Automated checks

- `npm run check`: TypeScript, unit/model tests and production esbuild bundle.
- `CHROMIUM_PATH=/path/to/chromium npm run test:ui`: existing source-editing, drawing, annotation and advanced suites, plus refinement acceptance checks.
- `CHROMIUM_PATH=/path/to/chromium npm run benchmark`: synthetic drag transaction count. This is not an FPS benchmark.
- `tests/connectors.test.ts`: edge snapping, orthogonal obstacle routing, geometry recalculation, endpoint persistence, negative geometry and sticker IDs.
- `qa/refinement-test.mjs`: content-vs-gutter hover, click-vs-drag menu, rotation visibility, font/width persistence, moving targets, keyboard/menu layering, toggle, left workspace and reload integrity.

The browser harness uses real CodeMirror with a mocked Obsidian host/renderer. It does not validate actual Obsidian Live Preview or all third-party themes. Manual app installation, RTL note configuration, embeds, restart and a large vault are still required before treating this as production-proven.

## Upgrade

Back up the vault and `.obsidian/plugins/canvesidian/data.json`. Replace only `main.js`, `manifest.json` and `styles.css`; do not delete or replace personal `data.json`. Reload the plugin. Its display name is now Canvsidian.

## Safe branch cleanup

The three obsolete feature heads were verified as ancestors of `main` at `71b9858c6f3e31a30e757910f8bd7c9735d81a5a`. There were no open pull requests at inspection time. Remote deletion was not performed by the coding session because its Git client was unauthenticated and the connected GitHub toolset did not expose ref deletion. No branch was force-pushed or rewritten.

## Delivery status

The implementation and local build are complete. Both configured GitHub MCP connections rejected the commit with HTTP 403 (resource not accessible by personal access token). No remote code, branch, tag or release was changed. Re-authorized repository write access is required to publish. The installation ZIP and complete source patch can be applied locally in the meantime.

Final automated result: 51 model tests and 88 browser acceptance checks passed. Synthetic drag: 120 pointer moves, zero editor transactions during preview and one after release. These counts do not establish real Obsidian FPS or large-vault performance.
