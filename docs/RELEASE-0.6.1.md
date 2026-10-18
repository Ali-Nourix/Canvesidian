# Canvsidian 0.6.1 verification

Built from the previously delivered 0.6.0 source snapshot. The display name remains Canvsidian and the stable installation ID remains `canvesidian`.

## Fixes

- Action menus are portaled to the editor, bounded to the visible scroller, flipped inward at the sidebar, and repositioned on scroll/resize.
- Full-row source hover feedback is painted above the note but does not receive pointer input.
- Floating Markdown frames are transparent by default; explicit user fills and sticky-paper colors are retained.
- Rotation is visible on selection and hidden otherwise. Outside-editor clicks clear selection, while confirmation dialogs retain it.
- Arrow and connector tools support a single drag with a 24px snap halo and live target feedback. Single-ended arrows keep their attached endpoint on reload.
- Selected objects have four direct connection ports in a separate controls layer, so connector strokes cannot steal their drag and content layering is unchanged.
- Alt bypasses snapping; Escape/pointer cancellation discard the draft. The two-click connection fallback remains available.

## Validation

`npm run check`: 55 unit/model tests, TypeScript and production build.

`npm run test:ui`: 88 existing/revised browser checks plus 11 new targeted interaction checks (99 total). The new fixture deliberately puts the editor in an overflow-clipped split pane beside a right sidebar. It exercises menus in light/dark themes, transparent frames, selected-only rotation, ordinary arrow snapping, direct-port dragging, one-ended arrows, Alt override, cancellation and reload integrity.

The harness uses real CodeMirror with mocked Obsidian APIs and renderer. Real Obsidian, all themes and third-party extensions are not certified by these automated results.

## Source and publication limitations

The previously known Ali-Nourix/NGIN source URL returned 404 through both connected GitHub accounts. The interaction was implemented from the user's requested behavior rather than claiming source parity. Repository publication was not retried because the prior 403 write-access blocker had not been resolved. No remote branch or release was created or deleted.
