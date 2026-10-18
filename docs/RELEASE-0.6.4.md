# Canvsidian 0.6.4 — restore fixed-surface behavior

## Historical baseline

Compared with the repository's pre-0.6 implementation at commit `71b9858c6f3e31a30e757910f8bd7c9735d81a5a`, `src/spatial.ts` (v0.5). That implementation renders objects directly into the existing scroller, without rebasing the world or translating native content. Its drag/nudge paths stop at x=0.

Source: https://github.com/Ali-Nourix/Canvsidian/blob/71b9858c6f3e31a30e757910f8bd7c9735d81a5a/src/spatial.ts

## Changes

- Restore that fixed-surface sync and left-boundary behavior. Remove the subsequent origin expansion, extent element/observer, content translation, direction overrides, flex-axis changes, scrollbar-gutter and overflow-anchoring changes. Dragging an object must not reposition native note content, its inline title/header or metadata/properties.
- New drag/nudge/alignment placements stop at the surface's left boundary. This intentionally removes the newer automatic negative-x world. Do not describe this as an infinite canvas or continued negative-coordinate panning.
- Recover existing independently placed negative-x objects to x=0 without removing their content/IDs/anchors. Keep connector endpoint references; the route follows the recovered targets. Reposition attached tape when its negative parent is recovered. Unresolved text anchors remain retained as before. Recovered coordinates are persisted on the next layout save, so back up data.json before installing.
- Center each object grip on its actual rendered rotated frame, beside its right edge. Recalculate after resize/rotation and keep the control reachable inside narrow viewports. Do not align floating/drawing object grips with the ordinary note's shared gutter.
- Keep the source-block grip in the non-layout controls layer and center multiline source grips over the whole block. Keep native Obsidian action menus, two-click connections, current style controls and the stable plugin ID.

## Verification and limits

TypeScript, 58 unit/model checks and production build pass. Surface unit tests cover nonnegative placement preservation, non-destructive negative-position recovery, retained text/IDs/links and attached tape recovery.

The browser suite has 109 checks. The revised header regression fixture places an inline-title/header and metadata element **outside CodeMirror content**, in a shared cm-sizer. It tests LTR/RTL, wide/split panes and long wrapped notes. It compares header, properties, content, line and viewport geometry during repeated grip show/hide and real left-edge drags; checks object grips against frame centers before/after height and rotation changes; and asserts no origin/extent/host direction/style mutation. The older shared-gutter object-grip assertion was explicitly replaced with frame-edge/center assertions, matching the user's changed requirement.

The synthetic drag benchmark checks zero transactions during movement and one at release; it is not an FPS claim.

CodeMirror is real; Obsidian APIs, Markdown rendering, and the native-shaped header/properties fixture are mocked. This is not an in-app Obsidian verification or a guarantee for all themes/plugins. Use a backed-up/test vault first.

## Delivery

Version 0.6.4, display name Canvsidian, stable ID/folder canvesidian. Replace only main.js, styles.css and manifest.json; keep data.json. No remote write was attempted because the existing GitHub token-permission blocker remains unresolved. No branch/tag/release was changed or deleted.
