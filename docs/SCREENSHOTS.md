# Real Obsidian screenshots

The four README images are screenshots of the **actual Obsidian desktop application**, not the Chromium test harness, an HTML recreation, an AI-generated image or a composited UI mockup.

## Capture environment

- Obsidian **1.14.4**, official Linux x64 distribution.
- Canvsidian **0.6.5**, production `main.js`, `manifest.json` and `styles.css` from this repository.
- Native Obsidian Live Preview, its real MarkdownRenderer, native Menu API and default light/dark themes.
- A disposable vault with synthetic content from [demo-note.md](demo-note.md). No user vault, account, note, identifier or private information was included.
- App viewport: **1440 × 960**. The app ran on an isolated virtual display. No HTML/CSS overlay, replacement toolbar or imitation Obsidian chrome was added.

## What is shown

| Image | Real interaction |
| --- | --- |
| `obsidian-overview-dark.svg` | Float an existing Markdown block; change its size/font; move it; create three sticky notes, attached tape, two connected arrows and a rocket sticker. |
| `obsidian-edit-light.svg` | Switch the app to its native light theme and open the original Markdown block for in-place editing. The `**` characters are the actual Markdown textarea, not a rendering error. |
| `obsidian-actions-light.svg` | Open the object's native Obsidian menu for alignment, appearance, layer ordering, duplication and deletion. Menus intentionally overlay the scene behind them. |
| `obsidian-normal-flow-dark.svg` | Hide note effects with the plugin's toggle and show the original note flow. The capture script compares the editor source before and after toggling and requires equality. |

Only demo content and regular app settings were changed. The visible UI and rendered objects come from the installed plugin and Obsidian itself.

## Image format and integrity

Each SVG is a **self-contained wrapper around an unmodified lossless PNG screenshot**. The wrapper has only a title and one raster image; it does not redraw the interface. This keeps the assets self-contained and readable through the repository's text-file publishing path. [capture-info.json](images/capture-info.json) records the app/plugin versions, dimensions and SHA-256 hash of each original PNG. Original PNGs can be recovered by decoding the embedded `data:image/png;base64,...` payload.

## Reproduce

This is an optional documentation workflow, not part of `npm run test:ui`.

1. Create a **disposable** vault at `/data/canvsidian-demo-vault`. Do not point the capture script at a real user vault; it intentionally rejects other paths.
2. Install this plugin's three production files under `.obsidian/plugins/canvesidian/`, enable it and open `Launch plan.md` containing the exact contents of `docs/demo-note.md`. Use Live Preview, inline title on, readable line length off and an empty plugin `data.json` (`{"version":5,"notes":{}}`). Close/reopen the app for a clean capture; do not run the script twice against an already populated scene.
3. Start the official Obsidian application in an isolated profile with local debugging enabled on port `9224`. It requires a working graphical display (a virtual X display is sufficient on Linux). This port is for the disposable local app, not a user browser.
4. With dependencies installed, run `node qa/readme-obsidian-capture.mjs`, then `node qa/pack-readme-screenshots.mjs`.
5. Inspect all generated images before committing. Source PNGs are local generated files; the SVGs and capture metadata are committed.

The script drives the actual app and plugin controls. It never imports `qa/obsidian-mock.ts` or injects a fake MarkdownRenderer.

## Validation scope

These captures establish an actual-app smoke/demo run for the displayed interactions on one Linux setup. They do **not** establish full compatibility with every Obsidian version, theme, plugin, device, sync setup, renderer feature or large vault. The automated regression suite remains a separate real-CodeMirror/mocked-host test suite. Earlier release notes that say actual-app execution was not yet verified describe the historical state at those releases.
