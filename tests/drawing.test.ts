import { test } from "node:test";
import assert from "node:assert/strict";
import { drawingFromPoints, normalizeDrawings, normalize } from "../src/model";
import { resized } from "../src/model";
test("reverse-direction rectangle gets positive bounds", () => {
  const d = drawingFromPoints("rect", [
    [100, 90],
    [30, 20],
  ])!;
  assert.equal(d.x, 30);
  assert.equal(d.y, 20);
  assert.equal(d.width, 70);
  assert.equal(d.height, 70);
});
test("pen geometry stores normalized points within its bounds", () => {
  const d = drawingFromPoints("pen", [
    [10, 20],
    [20, 35],
    [40, 30],
  ])!;
  assert.ok(d.points!.every((p) => p.every((n) => n >= 0 && n <= 1)));
  assert.equal(d.width, 30);
});
test("a tap is not saved as an invisible drawing", () =>
  assert.equal(
    drawingFromPoints("pen", [
      [10, 10],
      [10.2, 10.1],
    ]),
    null,
  ));
test("freehand payloads are capped at 5000 points", () => {
  const pts = Array.from(
    { length: 8000 },
    (_, i) => [i, i % 9] as [number, number],
  );
  assert.ok(drawingFromPoints("pen", pts)!.points!.length <= 5000);
});
test("untrusted drawing colors cannot inject SVG references", () => {
  const d = drawingFromPoints("rect", [
    [0, 0],
    [30, 40],
  ])!;
  assert.equal(
    normalizeDrawings([{ ...d, stroke: "url(https://example.org/x)" }]).length,
    0,
  );
});
test("saved drawing values are bounded and IDs deduplicated", () => {
  const d = drawingFromPoints("line", [
    [0, 0],
    [30, 40],
  ])!;
  const list = normalizeDrawings([{ ...d, width: -100, opacity: 7 }, d]);
  assert.equal(list.length, 1);
  assert.equal(list[0].width, 2);
  assert.equal(list[0].opacity, 1);
});
test("drawing points with NaN or invalid tuples are filtered", () => {
  const d = drawingFromPoints("pen", [
    [0, 0],
    [30, 40],
  ])!;
  const result = normalizeDrawings([
    { ...d, points: [[0, 0], [1, 1], [NaN, 2], [4]] },
  ]);
  assert.equal(result[0].points!.length, 2);
});
test("drawings survive storage round trip", () => {
  const d = drawingFromPoints("ellipse", [
    [20, 20],
    [100, 80],
  ])!;
  const data = normalize(
    JSON.parse(
      JSON.stringify({ version: 3, notes: { a: { pins: [], drawings: [d] } } }),
    ),
  );
  assert.equal(data.notes.a.drawings![0].kind, "ellipse");
});
test("north-west resize keeps the opposite corner fixed", () => {
  const p = resized({ x: 30, y: 40, width: 100, height: 80 }, 10, 20, "nw");
  assert.deepEqual(p, { x: 40, y: 60, width: 90, height: 60 });
});
test("resize cannot invert the box or cross the origin", () => {
  const p = resized({ x: 30, y: 40, width: 100, height: 80 }, 1000, 1000, "nw");
  assert.equal(p.width, 24);
  assert.equal(p.height, 24);
  const q = resized({ x: 30, y: 40, width: 100, height: 80 }, -100, -100, "nw");
  assert.equal(q.x, 0);
  assert.equal(q.y, 0);
});

test("corrupt optional point fields cannot crash shape restoration", () => {
  const d = drawingFromPoints("rect", [
    [0, 0],
    [30, 40],
  ])!;
  assert.equal(normalizeDrawings([{ ...d, points: "invalid" }]).length, 1);
});

test("v3 layouts migrate to v4 with drawings and placements intact", () => {
  const d = drawingFromPoints("rect", [
    [0, 0],
    [100, 80],
  ])!;
  const data = normalize({
    version: 3,
    notes: { a: { pins: [], drawings: [d] } },
  });
  assert.equal(data.version, 4);
  assert.equal(data.notes.a.drawings![0].id, d.id);
});
test("annotations round trip multilingual text, paper, font and sticker ID", () => {
  const base = {
    ...drawingFromPoints("rect", [
      [0, 0],
      [100, 80],
    ])!,
    kind: "sticky",
    text: "ایده جدید\nNew idea",
    fill: "#FFF0AD",
    fontSize: 24,
    sticker: "heart",
  };
  const data = normalize(
    JSON.parse(
      JSON.stringify({
        version: 4,
        notes: { a: { pins: [], drawings: [base] } },
      }),
    ),
  );
  const actual = data.notes.a.drawings![0];
  assert.equal(actual.text, base.text);
  assert.equal(actual.fill, base.fill);
  assert.equal(actual.fontSize, 24);
});
test("annotation payload rejects unsafe fills and clamps long text and font", () => {
  const d = {
    ...drawingFromPoints("rect", [
      [0, 0],
      [100, 80],
    ])!,
    kind: "label",
    text: "x".repeat(20000),
    fill: "url(https://evil)",
    fontSize: 900,
    sticker: "unknown",
  };
  const actual = normalizeDrawings([d])[0];
  assert.equal(actual.fill, "none");
  assert.equal(actual.text!.length, 10000);
  assert.equal(actual.fontSize, 72);
  assert.equal(actual.sticker, "star");
});
test("new diamond arrow and sticker kinds are retained", () => {
  for (const kind of ["diamond", "arrow", "sticker"]) {
    const d = {
      ...drawingFromPoints("rect", [
        [0, 0],
        [100, 80],
      ])!,
      kind,
    };
    assert.equal(normalizeDrawings([d])[0].kind, kind);
  }
});
