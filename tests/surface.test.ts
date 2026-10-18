import { test } from "node:test";
import assert from "node:assert/strict";
import {
  edgePanSpeed,
  worldFromScreen,
  screenFromWorld,
} from "../src/object-camera";
import { normalize } from "../src/model";
test("object camera projection is invertible for negative world x and RTL native scroll", () => {
  for (const x of [-50000, -600, 0, 250, 50000])
    for (const scroll of [-300, 0, 200])
      for (const camera of [-800, 0, 800])
        assert.equal(
          worldFromScreen(screenFromWorld(x, scroll, camera), scroll, camera),
          x,
        );
});
test("edge pan is bounded, symmetric and inactive away from edges", () => {
  assert.equal(edgePanSpeed(100, 0, 500), 0);
  assert.equal(edgePanSpeed(0, 0, 500), 9.600000000000001);
  assert.equal(edgePanSpeed(-200, 0, 500), 10);
  assert.equal(edgePanSpeed(700, 0, 500), -10);
  assert.equal(edgePanSpeed(500, 0, 500), -edgePanSpeed(0, 0, 500));
});
test("negative object positions and object view survive normalization without moving or removing objects", () => {
  const raw = {
    version: 5,
    notes: {
      "test.md": {
        enabled: true,
        viewX: 800,
        pins: [],
        drawings: [
          {
            id: "a",
            kind: "rect",
            x: -500,
            y: 80,
            width: 160,
            height: 100,
            stroke: "#333333",
            strokeWidth: 2,
            opacity: 1,
          },
          {
            id: "b",
            kind: "connector",
            sourceId: "a",
            targetId: "z",
            x: -400,
            y: 100,
            width: 100,
            height: 100,
            stroke: "#333333",
            strokeWidth: 2,
            opacity: 1,
          },
        ],
      },
    },
  };
  const note = normalize(raw).notes["test.md"];
  assert.equal(note.viewX, 800);
  assert.equal(note.drawings?.[0].x, -500);
  assert.equal(note.drawings?.[1].sourceId, "a");
  assert.equal(raw.notes["test.md"].drawings[0].x, -500);
});
test("invalid camera data cannot poison coordinates and old notes default to original view", () => {
  assert.equal(
    normalize({
      version: 5,
      notes: {
        a: { pins: [], viewX: NaN },
        b: { pins: [] },
        c: { pins: [], viewX: 1e9 },
      },
    }).notes.a.viewX,
    0,
  );
  assert.equal(
    normalize({ version: 5, notes: { a: { pins: [] } } }).notes.a.viewX,
    0,
  );
  assert.equal(
    normalize({ version: 5, notes: { a: { pins: [], viewX: 1e9 } } }).notes.a
      .viewX,
    50000,
  );
});
