// Preserve unmodified screenshot pixels in a self-contained, GitHub-readable SVG.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
const dir = new URL("../docs/images/", import.meta.url);
const shots = [
  [
    "obsidian-overview-dark",
    "Canvsidian running in Obsidian: Markdown, floating text, sticky notes and connected arrows",
  ],
  [
    "obsidian-edit-light",
    "Editing the original Markdown block in place, in the native Obsidian light theme",
  ],
  [
    "obsidian-actions-light",
    "Native Obsidian context menu for a Canvsidian object",
  ],
  [
    "obsidian-normal-flow-dark",
    "The same Markdown note after Canvsidian effects are hidden",
  ],
];
const info = JSON.parse(
  readFileSync(new URL("capture-info.json", dir), "utf8"),
);
info.imageEncoding =
  "Unmodified lossless PNG embedded in standalone SVG; no composited or generated UI";
info.screenshots = shots.map(([name, title]) => {
  const png = readFileSync(new URL(name + ".png", dir));
  if (png.toString("hex", 0, 8) !== "89504e470d0a1a0a")
    throw Error("Not a PNG");
  const width = png.readUInt32BE(16),
    height = png.readUInt32BE(20);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${title}"><title>${title}</title><image width="${width}" height="${height}" xlink:href="data:image/png;base64,${png.toString("base64")}"/></svg>\n`;
  writeFileSync(new URL(name + ".svg", dir), svg);
  return {
    file: name + ".svg",
    width,
    height,
    pngSha256: createHash("sha256").update(png).digest("hex"),
  };
});
writeFileSync(
  new URL("capture-info.json", dir),
  JSON.stringify(info, null, 2) + "\n",
);
console.log("Packed four unmodified Obsidian screenshots.");
