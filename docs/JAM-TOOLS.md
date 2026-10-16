# v0.5 tool interaction notes

## Reference and scope

Behavior reference inspected: `Ali-Nourix/NGIN` at commit `a40c0eaef0483046b71b2f9f2e46f9347d3da4c8`, particularly `src/ui/panels/JamToolbar.tsx`, `src/core/jam/tools.ts`, and `src/core/jam/stickers.ts`.

The borrowed ideas are tool-specific trays above the bottom dock, independent marker/highlighter defaults, editable stickies, and a stamp picker. This implementation is independent DOM/SVG; it does not import NGIN's React code, engine, sticker path implementation or dependencies. Icons are supplied by Obsidian's native Lucide `setIcon` API. The QA mock contains local icon approximations and is not bundled into the plugin.

## Layout and direction

Toolbar and option panels use explicit LTR direction and row layout, isolated from RTL Markdown. Note text is not forced to LTR. Annotation text uses `dir=auto` plus `unicode-bidi: plaintext` for mixed Persian/English lines.

Select a tool to open its appearance tray; select it again to fold the tray without changing tools. Drawing outside the tray closes it. Escape cancels an active gesture and returns to Select. Existing objects have their own contextual toolbar above the object, and one appearance panel at a time. Annotation save/cancel actions also live in this toolbar, not in a permanent card header/footer.

## Data semantics

- Source Markdown is the sole source for floated existing blocks.
- Sticky text, labels, sticker identifiers and drawing geometry are **plugin annotations**, saved in `data.json`, not new Markdown blocks. They do not appear in Source/Reading/PDF export without spatial rendering.
- Tool defaults persist globally in `toolDefaults`. Switching notes does not erase defaults; undo/reset does not change defaults.
- Schema 2/3/4 upgrades to 5. Old versions may refuse or mishandle newer data; retain a pre-upgrade backup for rollback.
- Drawings, notes, labels and stickers share the per-note drawing undo/redo history (40 entries, current session). Native document undo remains separate.
- A note reset clears all annotation types after confirmation but never deletes original Markdown. Recovery drafts and other notes remain intact.
- Unsaved annotation text is retained in recovery drafts when its object/editor is destroyed; explicit Cancel discards its local edit. Recovery is a copy-only command, not a new note.
- New annotations use scroll-content coordinates; they scroll with the note. They are **not semantic attachments to a specific Markdown paragraph** and will not automatically track that paragraph through source edits. Decorative tape can specifically attach to a sticky top edge and follow its geometry/rotation; dragging the tape itself detaches it.

## Verification limits

Local validation uses real CodeMirror state/view/history with mocked Obsidian APIs and MarkdownRenderer. The original regression suite, design-tool suite, and JAM suite cover the new tool settings, RTL ordering, save/cancel, storage rehydration, recovery, reset integrity and coarse-pointer viewport layouts. Visual captures were inspected in light/dark/390px layouts.

This is **not** an actual Obsidian application run. Native rendering interactions, theme CSS, IME/touch on real devices, vault-scale behavior, and other plugins need manual verification. No new FPS or latency benchmark is claimed for v0.5. Existing v0.2/v0.3 transaction-count measurements remain historical comparisons.

## Not implemented

Full FigJam/NGIN parity; object-to-paragraph attachment; pressure-sensitive brush; grouping/multiselect; live connectors; zoom/pan canvas; collaborative layout/comment threads; Markdown export for annotations; eraser. Raster import is implemented, but not arbitrary SVG upload or an image asset library. Section/table/code are local annotation types, not a scene-graph/container/IDE engine.


## v0.5 additions

- Glyph-bounds aligned native hover grip, physically left regardless of RTL. Left-side drag grips on floated objects.
- Content/frame rotation with upright context controls, numeric degree control and a rotation knob. Rotation pointermoves are rAF DOM previews with one final commit. Rotated shape resizing converts world deltas into local axes. Text remains width-resized/auto-height rather than a full transformed text editor.
- Explicit Tool settings routing: selected object settings, active drawing tool settings, or general preferences when idle.
- Torn-edge tape, optionally attached to sticky top edges; parent movement/rotation updates child placement. Manually moving tape detaches it. Removing a parent sticky removes its attached tape in the same drawing-history action.
- Nested dock groups and duplicate annotation action.
- PNG/JPEG/GIF/WebP input from the system file picker (20 MB limit). Raster signatures and decoder are checked before writing. Imported files use the vault attachment path supplied by FileManager, remain separate vault files, and are never deleted by annotation removal/reset. Paths are vault-relative in plugin data. Asset rename/move tracking is not implemented; keep attachment paths stable.
- Native `getIconIds` search (first 60 matching IDs per query) and native `setIcon` rendering, not a hardcoded replacement library.
- Official PluginSettingTab plus a dock settings modal. Global dot-grid preferences use theme-aware dot colors and configurable spacing/opacity; effects off suppresses the grid regardless of preference.
- Per-note effects toggle preserves placements, rotations, annotations and assets; the compact re-enable dock remains visible in Live Preview. Source/Reading mode do not render the spatial UI. Reset is a separate confirmed operation, not a synonym for toggling.
- Text, section, simple TSV table (16×16 rendered cell cap), and monospace code annotations are editable local objects. They do not create source Markdown blocks, new notes or workspace views.

Local validation: 45 pure model/geometry/safety tests and 76 Chromium interaction checks with real CodeMirror and mocked Obsidian APIs. Includes raster file-input flow, invalid-file rejection, rotation commit/cancellation, sticky-tape following, Tool settings, physical RTL grip alignment, source-safe toggle/reset and mobile groups. Actual Obsidian/device testing is still required.
