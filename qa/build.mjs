import { build } from "esbuild";
import { readFileSync, writeFileSync } from "node:fs";
await build({
  entryPoints: ["qa/entry.ts"],
  bundle: true,
  format: "esm",
  target: "es2022",
  alias: { obsidian: new URL("./obsidian-mock.ts", import.meta.url).pathname },
  outfile: "qa/harness.js",
});
writeFileSync(
  "qa/harness.html",
  `<!doctype html><html><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>:root{--background-primary:#fff;--background-secondary:#f6f6f4;--background-modifier-border:#d9dcd7;--text-normal:#292c28;--text-muted:#686d64;--interactive-accent:#2783de}*{box-sizing:border-box}body{margin:0;font:16px/1.6 Arial;background:var(--background-primary);color:var(--text-normal)}header{height:52px;padding:12px 24px;border-bottom:1px solid var(--background-modifier-border);display:flex;gap:24px;font-size:14px;color:var(--text-muted)}header strong{color:var(--text-normal)}#editor{height:calc(100vh - 52px)}.cm-editor{height:100%}.cm-scroller{overflow:auto!important;font-family:Arial!important}.cm-editor .cm-content{padding:40px 56px;max-width:760px;width:100%;min-height:100%}.cm-editor .cm-line{padding:0;line-height:1.65}.cm-editor.cm-focused{outline:none}.test-modal-backdrop{position:fixed;left:50%;top:25%;transform:translateX(-50%);width:min(480px,calc(100% - 32px));background:var(--background-primary);padding:24px;border:1px solid var(--background-modifier-border);border-radius:12px;box-shadow:0 0 0 100vmax #0003;z-index:100}.setting-item{display:grid;grid-template-columns:1fr 110px;gap:8px;padding:12px 0;border-bottom:1px solid var(--background-modifier-border);font-size:14px}.setting-item>p{grid-column:1 / -1;margin:0;color:var(--text-muted);font-size:14px}.setting-item input[type=range]{width:110px}button{background:var(--background-primary);color:inherit;border:1px solid var(--background-modifier-border);border-radius:5px;cursor:pointer;font:inherit}pre{white-space:pre-wrap}h1{font-size:26px}p{margin:12px 0}${readFileSync("styles.css", "utf8")}@media(max-width:500px){.cm-editor .cm-content{padding:24px 16px}header{padding:12px 16px}}</style><header><strong>Vision.md</strong><span>Same note · Live Preview test harness</span></header><main id="editor"></main><script type="module">${readFileSync("qa/harness.js", "utf8")}</script></html>`,
);
