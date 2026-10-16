import { test } from "node:test";
import assert from "node:assert/strict";
import {
  rotatedBounds,
  rotatedResize,
  normalizeAngle,
  normalizePreferences,
  normalize,
  normalizeDrawings,
  drawingFromPoints,
  safeAssetPath,
  tapeOnSticky,
} from "../src/model";
import { rasterExtension } from "../src/raster";
test("rotation is bounded and invalid values are rejected", () => {
  assert.equal(normalizeAngle(450), 90);
  assert.equal(normalizeAngle(NaN), 0);
  assert.equal(normalizeAngle(Infinity), 0);
});
test("90 degree rotated bounds swap width/height and preserve center", () => {
  const p = rotatedBounds({
    x: 100,
    y: 100,
    width: 200,
    height: 80,
    rotation: 90,
  });
  assert.ok(Math.abs(p.width - 80) < 0.001);
  assert.ok(Math.abs(p.height - 200) < 0.001);
  assert.ok(Math.abs(p.x - 160) < 0.001);
});
test("rotated resize maps world delta to local shape axes", () => {
  const p = rotatedResize(
    { x: 300, y: 300, width: 100, height: 80, rotation: 90 },
    0,
    50,
    "e",
  );
  assert.ok(Math.abs(p.width - 150) < 0.001);
  assert.ok(Math.abs(p.x - 275) < 0.001);
  assert.ok(Math.abs(p.y - 325) < 0.001);
});
test("unsafe raster content and overlarge files are rejected", () => {
  assert.throws(
    () => rasterExtension(new TextEncoder().encode("<svg><script/>")),
    /Choose/,
  );
  assert.throws(
    () => rasterExtension(new Uint8Array(20 * 1024 * 1024 + 1)),
    /20 MB/,
  );
});
test("supported image signatures are detected", () => {
  assert.equal(rasterExtension(new Uint8Array([137, 80, 78, 71])), "png");
  assert.equal(rasterExtension(new Uint8Array([255, 216, 255])), "jpg");
  assert.equal(rasterExtension(new TextEncoder().encode("GIF89a")), "gif");
  assert.equal(
    rasterExtension(new TextEncoder().encode("RIFF0000WEBP")),
    "webp",
  );
});
test("external and parent-traversing asset paths are rejected", () => {
  for (const path of [
    "/etc/passwd",
    "../x.png",
    "https://x/y",
    "C:\\x.png",
    "x/../a",
  ])
    assert.equal(safeAssetPath(path), false);
  assert.ok(safeAssetPath("attachments/تصویر.png"));
});
test("grid preferences are bounded and default off", () => {
  assert.equal(normalizePreferences(null).dotGrid, false);
  assert.equal(
    normalizePreferences({ gridSpacing: 999, gridOpacity: -2 }).gridSpacing,
    64,
  );
  assert.equal(normalizePreferences({ gridOpacity: -2 }).gridOpacity, 0.05);
});
test("v4 data migrates with rotation, image and grid preferences intact", () => {
  const d = {
    ...drawingFromPoints("rect", [
      [0, 0],
      [200, 100],
    ])!,
    kind: "image",
    assetPath: "attachments/test.png",
    rotation: 45,
  };
  const store = normalize({
    version: 4,
    settings: { dotGrid: true },
    notes: { a: { pins: [], drawings: [d] } },
  });
  assert.equal(store.version, 5);
  assert.equal(store.notes.a.drawings![0].rotation, 45);
  assert.equal(store.notes.a.drawings![0].assetPath, d.assetPath);
  assert.equal(store.settings!.dotGrid, true);
});
test("tape stays at rotated sticky top with its relative tilt", () => {
  const parent = {
    ...drawingFromPoints("rect", [
      [200, 200],
      [400, 400],
    ])!,
    kind: "sticky" as const,
    rotation: 90,
  };
  const tape = {
    ...parent,
    id: "tape",
    kind: "tape" as const,
    width: 100,
    height: 32,
    rotationOffset: -8,
  };
  const out = tapeOnSticky(tape, parent);
  assert.equal(out.rotation, 82);
  assert.ok(Math.abs(out.x - 350) < 0.001);
  assert.ok(Math.abs(out.y - 284) < 0.001);
});
test("unsafe asset links cannot survive normalization", () => {
  const d = {
    ...drawingFromPoints("rect", [
      [0, 0],
      [200, 100],
    ])!,
    kind: "image",
    assetPath: "file:///etc/passwd",
  };
  assert.equal(normalizeDrawings([d])[0].assetPath, undefined);
});
