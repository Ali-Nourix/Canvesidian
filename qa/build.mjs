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
  `<!doctype html><html><meta charset="UTF-8"><style>:root{--background-primary:#fff;--background-secondary:#f5f5f3;--background-modifier-border:#dddeda;--text-normal:#292b28;--text-muted:#62665f;--text-error:#b22;--interactive-accent:#2783de;--font-monospace:monospace}*{box-sizing:border-box}body{margin:0;font:15px/1.5 Arial;color:var(--text-normal)}#app{height:100vh}button{font:inherit;background:var(--background-primary);color:inherit;border:1px solid var(--background-modifier-border);border-radius:6px;padding:6px 10px;cursor:pointer}dialog{width:640px;max-width:95vw;border:1px solid #ddd;border-radius:12px}textarea{font-size:15px}h1{font-size:26px;line-height:1.25}p{margin:12px 0}${readFileSync("styles.css", "utf8")}</style><main id="app"></main><script type="module">${readFileSync("qa/harness.js", "utf8")}</script></html>`,
);
