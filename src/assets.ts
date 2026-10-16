import { App, TFile } from "obsidian";
import { rasterExtension } from "./raster";
export async function importRaster(app: App, file: File, sourcePath: string) {
  if (file.size > 20 * 1024 * 1024)
    throw Error("Images must be at most 20 MB.");
  const bytes = await file.arrayBuffer();
  const extension = rasterExtension(new Uint8Array(bytes));
  const bitmap = await createImageBitmap(new Blob([bytes]));
  const ratio = bitmap.width / bitmap.height;
  bitmap.close();
  const base =
    file.name
      .replace(/\.[^.]+$/, "")
      .replace(/[^\p{L}\p{N}_ -]/gu, "")
      .slice(0, 64) || "image";
  const assetPath = await app.fileManager.getAvailablePathForAttachment(
    base + "." + extension,
    sourcePath,
  );
  await app.vault.createBinary(assetPath, bytes);
  return {
    assetPath,
    width: 320,
    height: Math.max(24, Math.min(1200, 320 / ratio)),
  };
}
export function imageURL(app: App, path: string) {
  const file = app.vault.getAbstractFileByPath(path);
  return file instanceof TFile ? app.vault.getResourcePath(file) : "";
}
