import { test } from "node:test";
import assert from "node:assert/strict";
import {
  connectorRoute,
  routeConnector,
  targetAt,
  Target,
} from "../src/connectors";
import { normalize, normalizeDrawings, Drawing, STICKERS } from "../src/model";
const a: Target = { id: "a", x: 100, y: 100, width: 100, height: 100 };
const b: Target = { id: "b", x: 600, y: 100, width: 100, height: 100 };
const connector: Drawing = {
  id: "link",
  kind: "connector",
  sourceId: "a",
  targetId: "b",
  x: 0,
  y: 0,
  width: 2,
  height: 2,
  stroke: "currentColor",
  strokeWidth: 2,
  opacity: 1,
};
test("connector snaps to shape edges with orthogonal segments", () => {
  const p = connectorRoute(a, b, [a, b]);
  assert.deepEqual(p[0], [200, 150]);
  assert.deepEqual(p.at(-1), [600, 150]);
  for (let i = 1; i < p.length; i++)
    assert.ok(p[i][0] === p[i - 1][0] || p[i][1] === p[i - 1][1]);
});
test("connector routes around a blocking rectangle", () => {
  const obstacle: Target = {
    id: "wall",
    x: 300,
    y: 50,
    width: 100,
    height: 200,
  };
  const p = connectorRoute(a, b, [a, b, obstacle]);
  assert.ok(p.length >= 4);
  for (let i = 1; i < p.length; i++) {
    const [x1, y1] = p[i - 1],
      [x2, y2] = p[i];
    const crosses =
      x1 === x2
        ? x1 > 300 &&
          x1 < 400 &&
          Math.max(y1, y2) > 50 &&
          Math.min(y1, y2) < 250
        : y1 > 50 &&
          y1 < 250 &&
          Math.max(x1, x2) > 300 &&
          Math.min(x1, x2) < 400;
    assert.equal(crosses, false);
  }
});
test("movement, resize and rotation recalculate routes without changing endpoint IDs", () => {
  const initial = routeConnector(connector, [a, b]);
  const changed = routeConnector(connector, [
    a,
    { ...b, x: 800, y: 300, width: 200, rotation: 90 },
  ]);
  assert.notDeepEqual(changed.points, initial.points);
  assert.equal(changed.sourceId, "a");
  assert.equal(changed.targetId, "b");
});
test("connector endpoint references and style survive normalization", () => {
  const d = normalizeDrawings([routeConnector(connector, [a, b])])[0];
  assert.equal(d.kind, "connector");
  assert.equal(d.targetId, "b");
});
test("negative horizontal geometry, layers and large text persist safely", () => {
  const d = normalizeDrawings([
    { ...connector, x: -800, layer: 7.5, fontSize: 100 },
  ])[0];
  assert.equal(d.x, -800);
  assert.equal(d.layer, 7.5);
  assert.equal(d.fontSize, 100);
  const p = normalize({
    version: 5,
    notes: {
      n: {
        pins: [
          {
            id: "p",
            from: 0,
            to: 1,
            text: "a",
            before: "",
            after: "",
            x: -400,
            y: 0,
            width: 2000,
            height: 120,
            fontSize: 80,
            layer: 2,
            color: "#E56458",
            background: "#FFF0AD",
          },
        ],
      },
    },
  }).notes.n.pins[0];
  assert.equal(p.x, -400);
  assert.equal(p.fontSize, 80);
  assert.equal(p.width, 2000);
  assert.equal(p.color, "#E56458");
});
test("hit testing respects layers and sticker catalog has unique IDs", () => {
  assert.equal(
    targetAt([120, 120], [a, { ...a, id: "top", layer: 8 }])?.id,
    "top",
  );
  assert.ok(STICKERS.length >= 28);
  assert.equal(new Set(STICKERS.map((s) => s.id)).size, STICKERS.length);
});

test("near-edge snapping excludes the source and respects a bounded halo", async () => {
  const { snapTarget } = await import("../src/connectors");
  assert.equal(snapTarget([a.x + a.width + 20, a.y + 30], [a, b])?.id, "a");
  assert.equal(snapTarget([a.x + a.width + 30, a.y + 30], [a, b]), undefined);
  assert.equal(snapTarget([a.x + 30, a.y + 30], [a, b], "a"), undefined);
});
test("single-ended arrows follow the source and preserve the free destination", () => {
  const arrow: Drawing = {
    ...connector,
    kind: "arrow",
    targetId: undefined,
    x: 200,
    y: 150,
    width: 200,
    height: 150,
    points: [
      [0, 0],
      [1, 1],
    ],
  };
  const routed = routeConnector(arrow, [{ ...a, x: 140 }, b]);
  const last = routed.points!.at(-1)!;
  assert.equal(routed.x + last[0] * routed.width, 400);
  assert.equal(routed.y + last[1] * routed.height, 300);
  assert.equal(routed.sourceId, "a");
});
test("target-only arrows preserve the free origin and snap to destination bounds", () => {
  const arrow: Drawing = {
    ...connector,
    kind: "arrow",
    sourceId: undefined,
    x: 400,
    y: 150,
    width: 200,
    height: 80,
    points: [
      [0, 0],
      [1, 1],
    ],
  };
  const routed = routeConnector(arrow, [a, b]);
  assert.equal(routed.x + routed.points![0][0] * routed.width, 400);
  assert.equal(routed.y + routed.points![0][1] * routed.height, 150);
  const last = routed.points!.at(-1)!;
  assert.equal(routed.x + last[0] * routed.width, 600);
});
test("single-ended arrow references survive data normalization", () => {
  const arrow = normalizeDrawings([
    { ...connector, kind: "arrow", targetId: undefined },
  ])[0];
  assert.equal(arrow.sourceId, "a");
  assert.equal(arrow.targetId, undefined);
});
