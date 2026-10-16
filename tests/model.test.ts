import { test } from "node:test";
import assert from "node:assert/strict";
import {
  blocks,
  blockAt,
  capture,
  restore,
  normalize,
  Pin,
  SavedPin,
} from "../src/model";
const pin = (source: string): Pin => ({
  ...blocks(source)[0],
  id: "test",
  x: 20,
  y: 40,
  width: 320,
  height: 160,
});
test("paragraphs, not heading sections, are independent units", () =>
  assert.deepEqual(
    blocks("# Title\n\nFirst paragraph.\n\nSecond paragraph.").map(
      (b) => b.kind,
    ),
    ["ATXHeading1", "Paragraph", "Paragraph"],
  ));
test("multiline paragraph is one block", () =>
  assert.equal(blocks("One line\nanother line").length, 1));
test("fenced code including Markdown headings stays one block", () =>
  assert.deepEqual(
    blocks("```md\n# Not a section\n\ntext\n```").map((b) => b.kind),
    ["FencedCode"],
  ));
test("image paragraph is an independent block", () =>
  assert.equal(
    blocks("Text.\n\n![image](picture.png)\n\nMore.")[1].text,
    "![image](picture.png)",
  ));
test("whole list, quotation and GFM table are atomic top-level units", () =>
  assert.deepEqual(
    blocks("- A\n- B\n\n> Quote\n\n| A | B |\n|---|---|\n| 1 | 2 |").map(
      (b) => b.kind,
    ),
    ["BulletList", "Blockquote", "Table"],
  ));
test("frontmatter and comments cannot accidentally float", () =>
  assert.deepEqual(
    blocks("---\n# comment\ntitle: test\n---\n\nمتن فارسی").map((b) => b.text),
    ["متن فارسی"],
  ));
test("cursor resolves whole containing block", () =>
  assert.equal(blockAt("First\n\nSecond", 9)?.text, "Second"));
test("empty document has no imaginary block", () =>
  assert.equal(blocks("").length, 0));
test("capturing geometry never changes source text", () => {
  const s = "متن فارسی\r\nخط دوم\r\n\r\nبعدی";
  const saved = capture(pin(s), s);
  assert.equal(saved.text, blocks(s)[0].text);
  assert.equal(s, "متن فارسی\r\nخط دوم\r\n\r\nبعدی");
});
test("unique anchors survive insertion before source block", () => {
  const s = "First\n\nSecond";
  const saved = capture(pin(s), s);
  const result = restore([saved], "New\n\n" + s);
  assert.equal(result.pins[0].from, 5);
  assert.equal(result.detached.length, 0);
});
test("edited-offline text is detached, never hidden at an old offset", () => {
  const saved = capture(pin("Original"), "Original");
  assert.equal(restore([saved], "Different").pins.length, 0);
  assert.equal(restore([saved], "Different").detached[0].text, "Original");
});
test("matching is block bounded, not a substring of another word", () => {
  const saved = capture(pin("word"), "word");
  assert.equal(restore([saved], "sword").pins.length, 0);
});
test("context disambiguates repeated paragraphs", () => {
  const s = "A\n\nRepeated\n\nB\n\nRepeated\n\nC";
  const p = { ...pin(s), ...blocks(s)[3] };
  const saved = capture(p, s);
  assert.equal(restore([saved], s).pins[0].from, p.from);
});
test("ambiguous references fail closed instead of picking first occurrence", () => {
  const saved = {
    ...capture(pin("Same"), "Same"),
    before: "missing",
    after: "missing",
  };
  const result = restore([saved], "Same\n\nSame");
  assert.equal(result.pins.length, 0);
  assert.equal(result.detached.length, 1);
});
test("overlapping restored records cannot hide the same range twice", () => {
  const saved = capture(pin("One"), "One");
  assert.equal(
    restore([saved, { ...saved, id: "other" }], "One").pins.length,
    1,
  );
});
test("legacy board data is retained but not opened as a separate view", () => {
  const legacy = { note: { tiles: {} } };
  assert.deepEqual(
    normalize({ version: 1, boards: legacy }).legacyBoards,
    legacy,
  );
});
test("future data schemas are rejected without silent reset", () =>
  assert.throws(() => normalize({ version: 99 }), /not overwritten/));
test("persisted coordinates are bounded and corrupt records filtered", () => {
  const saved = { ...capture(pin("Hi"), "Hi"), x: -30, width: 9999 };
  const data = normalize({ version: 2, notes: { a: { pins: [saved, {}] } } });
  assert.equal(data.notes.a.pins.length, 1);
  assert.equal(data.notes.a.pins[0].x, 0);
  assert.equal(data.notes.a.pins[0].width, 1200);
});

test("interrupted drafts survive serialization and corrupt drafts are filtered", () => {
  const value = normalize(
    JSON.parse(
      JSON.stringify({
        version: 2,
        notes: {},
        recoveryDrafts: [
          {
            id: "draft",
            path: "note.md",
            text: "متن ذخیره‌نشده",
            savedAt: "2026-10-15",
          },
          {},
        ],
      }),
    ),
  );
  assert.equal(value.recoveryDrafts?.length, 1);
  assert.equal(value.recoveryDrafts?.[0].text, "متن ذخیره‌نشده");
});

test("v2 data migrates to v5 without losing existing block placement", () => {
  const saved = capture(pin("Hi"), "Hi");
  const value = normalize({
    version: 2,
    notes: { "note.md": { pins: [saved] } },
  });
  assert.equal(value.version, 5);
  assert.equal(value.notes["note.md"].pins[0].text, "Hi");
  assert.deepEqual(value.notes["note.md"].drawings, []);
});
