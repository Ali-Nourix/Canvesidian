/** Accept bounded raster images, not SVG/HTML or arbitrary system files. */
export function rasterExtension(bytes: Uint8Array): string {
  if (bytes.length > 20 * 1024 * 1024)
    throw Error("Images must be at most 20 MB.");
  if (bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71)
    return "png";
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "jpg";
  const text = new TextDecoder("ascii").decode(bytes.slice(0, 16));
  if (text.startsWith("GIF87a") || text.startsWith("GIF89a")) return "gif";
  if (text.startsWith("RIFF") && text.slice(8, 12) === "WEBP") return "webp";
  throw Error(
    "Choose a PNG, JPEG, GIF or WebP image. SVG and other files are not imported.",
  );
}
