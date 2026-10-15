import { test } from "node:test";
import assert from "node:assert/strict";
import {
  sections,
  replaceSection,
  ensureTiles,
  normalizeStore,
  Board,
} from "../src/model";
test("source slices round-trip including CRLF and Persian", () => {
  const s =
    "---\r\ntitle: hello\r\n---\r\n\r\n# ایده\r\nمتن\r\n## Next\r\nBody";
  assert.equal(
    sections(s)
      .map((s) => s.markdown)
      .join(""),
    s,
  );
  assert.equal(sections(s).length, 3);
});
test("empty notes have an editable opening", () =>
  assert.deepEqual(
    sections("").map((s) => s.id),
    ["preamble"],
  ));
test("headings inside backtick and tilde fences are not split", () => {
  const s = "# A\n```md\n# not a section\n```\n~~~\n# neither\n~~~\n## B\ntext";
  assert.deepEqual(
    sections(s).map((s) => s.title),
    ["A", "B"],
  );
});
test("shorter fence cannot close a longer fence", () =>
  assert.equal(sections("# A\n````\n```\n# hidden\n````\n# B").length, 2));
test("duplicate headings have unique and deterministic keys", () => {
  const a = sections("# Same\nA\n# Same\nB");
  assert.notEqual(a[0].id, a[1].id);
  assert.deepEqual(a, sections("# Same\nA\n# Same\nB"));
});
test("editing body preserves identity", () =>
  assert.equal(sections("# A\nold")[0].id, sections("# A\nnew")[0].id));
test("replacement preserves unrelated bytes and heading line boundaries", () => {
  const source = "# A\nold\n\n# B\nkeep";
  const part = sections(source)[0];
  assert.equal(
    replaceSection(source, source, part, "# A\nnew"),
    "# A\nnew\n# B\nkeep",
  );
});
test("conflicting source changes abort rather than overwrite", () => {
  const source = "# A\nold";
  assert.throws(
    () =>
      replaceSection(source + "\nchanged", source, sections(source)[0], "new"),
    /changed/,
  );
});
test("missing section layouts are retained for recovery", () => {
  const board: Board = { tiles: {} };
  ensureTiles(board, sections("# A\nx"));
  const tile = board.tiles[sections("# A\nx")[0].id];
  tile.annotations.push({ id: "s", kind: "sticker", text: "⭐", x: 4, y: 6 });
  ensureTiles(board, sections("# Renamed\nx"));
  assert.equal(Object.keys(board.tiles).length, 2);
  assert.equal(tile.annotations[0].text, "⭐");
});
test("layout defaults do not overlap horizontally", () => {
  const b: Board = { tiles: {} };
  ensureTiles(b, sections("# A\nx\n# B\ny"));
  const [a, c] = Object.values(b.tiles);
  assert.ok(c.x > a.x + a.width);
});
test("corrupt saved layouts are filtered and bounded", () => {
  const result = normalizeStore({
    version: 1,
    boards: {
      a: {
        tiles: {
          bad: { x: null, y: 1, width: 20 },
          good: {
            x: -2,
            y: 5,
            width: 9000,
            annotations: [
              {},
              { id: "a", kind: "note", text: "hi", x: 2, y: 4 },
            ],
          },
        },
      },
    },
  });
  assert.equal(result.boards.a.tiles.good.width, 1200);
  assert.equal(result.boards.a.tiles.good.x, 0);
  assert.equal(result.boards.a.tiles.good.annotations.length, 1);
  assert.equal(result.boards.a.tiles.bad, undefined);
});
test("unknown schema versions do not load as valid layouts", () =>
  assert.deepEqual(normalizeStore({ version: 99 }), {
    version: 1,
    boards: {},
  }));

test("YAML comments are not mistaken for note sections", () =>
  assert.deepEqual(
    sections("---\n# YAML comment\ntitle: test\n---\n# Real\ncontent").map(
      (s) => s.title,
    ),
    ["Opening", "Real"],
  ));
