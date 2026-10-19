# Canvsidian 0.6.6 — right-click object menus

The native object menu shown in the README previously opened from a grip click. This release adds the same menu to an actual right-click on rendered object bodies.

- Floating Markdown: edit, appearance, copy Markdown, align, reset rotation, layers, duplicate, return to normal flow / source, and confirmed deletion.
- Drawings, sticky notes, stickers, images and other annotations: the same relevant per-object actions already available on the grip. Right-click selects the targeted object before an action runs.
- Source grips also support right-click, without starting a drag or floating a block until that action is chosen.
- Menus use Obsidian Menu/MenuItem and open at the pointer, with positioning/clamping owned by the host. Left-click grip menus still work.
- Input fields, textareas, editable content and appearance panels retain their normal field context behavior; ordinary Markdown editor menus are not replaced.
- Secondary-button gestures do not start a drag. Menu creation does not alter Markdown, object placement or layer order.

Replace only `main.js`, `manifest.json` and `styles.css` in the existing `.obsidian/plugins/canvesidian/` folder, keep `data.json`, then reload Obsidian. Data remains schema 5; no migration is required.

Automated coverage includes pointer positioning, unchanged placement/source on opening, selection of the right target, Edit/Duplicate actions, native text/number fields, SVG shape/sticker bodies, source grips, Escape and destruction cleanup. The README screenshots were captured on 0.6.5 and illustrate the same menu; the new interaction in 0.6.6 is opening it from the object body with the secondary mouse button.

Validation: typecheck, production build, 59 unit tests and 128 browser checks passed. Four additional smoke checks passed in actual Obsidian 1.14.4 on the disposable Linux demo vault: rendered Markdown context menu, Edit text and textarea preservation, sticky body context menu, Escape and unchanged source. The synthetic drag benchmark still records 0 editor transactions during 120 moves and 1 after release; not an FPS measurement.
