import { build } from "esbuild";
await build({
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: [
    "obsidian",
    "@codemirror/state",
    "@codemirror/view",
    "@codemirror/commands",
  ],
  format: "cjs",
  platform: "browser",
  target: "es2022",
  outfile: "main.js",
  sourcemap: false,
  banner: { js: "/* Canvsidian — generated from src/. Run npm run build. */" },
});
