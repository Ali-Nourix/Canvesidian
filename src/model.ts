import { parser, GFM } from "@lezer/markdown";
const markdown = parser.configure(GFM);
export interface Block {
  from: number;
  to: number;
  kind: string;
  text: string;
}
export interface Placement {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface Pin extends Placement {
  id: string;
  from: number;
  to: number;
  text: string;
}
export interface SavedPin extends Pin {
  before: string;
  after: string;
}
export interface SavedNote {
  enabled: boolean;
  pins: SavedPin[];
}
export interface RecoveryDraft {
  id: string;
  path: string;
  text: string;
  savedAt: string;
}
export interface InlineStore {
  version: 2;
  recoveryDrafts?: RecoveryDraft[];
  notes: Record<string, SavedNote>;
  legacyBoards?: unknown;
}
export const limit = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));
export function blocks(source: string): Block[] {
  const frontmatter =
    source.match(
      /^(?:\uFEFF)?---[ \t]*\r?\n[\s\S]*?\r?\n(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/,
    )?.[0].length ?? 0;
  const result: Block[] = [];
  for (
    let node = markdown.parse(source).topNode.firstChild;
    node;
    node = node.nextSibling
  ) {
    if (node.from < frontmatter || !source.slice(node.from, node.to).trim())
      continue;
    result.push({
      from: node.from,
      to: node.to,
      kind: node.name,
      text: source.slice(node.from, node.to),
    });
  }
  return result;
}
export function blockAt(source: string, pos: number): Block | undefined {
  return blocks(source).find((b) => b.from <= pos && pos <= b.to);
}
export function capture(pin: Pin, source: string): SavedPin {
  return {
    ...pin,
    text: source.slice(pin.from, pin.to),
    before: source.slice(Math.max(0, pin.from - 64), pin.from),
    after: source.slice(pin.to, pin.to + 64),
  };
}
/** Fail closed: ambiguous or edited-offline anchors must not hide unrelated text. */
export function restore(
  saved: SavedPin[],
  source: string,
): { pins: Pin[]; detached: SavedPin[] } {
  const pins: Pin[] = [];
  const detached: SavedPin[] = [];
  for (const old of saved) {
    const candidates: number[] = [];
    let at = 0;
    if (old.text)
      while (at <= source.length - old.text.length) {
        const found = source.indexOf(old.text, at);
        if (found < 0) break;
        const end = found + old.text.length;
        if (
          (found === 0 || source[found - 1] === "\n") &&
          (end === source.length ||
            source[end] === "\n" ||
            source.slice(end, end + 2) === "\r\n")
        )
          candidates.push(found);
        at = found + 1;
      }
    const contextual = candidates.filter(
      (p) =>
        source.slice(Math.max(0, p - 64), p) === old.before &&
        source.slice(p + old.text.length, p + old.text.length + 64) ===
          old.after,
    );
    const found =
      candidates.length === 1
        ? candidates[0]
        : contextual.length === 1
          ? contextual[0]
          : undefined;
    const end = found === undefined ? 0 : found + old.text.length;
    if (found === undefined || pins.some((p) => found < p.to && end > p.from)) {
      detached.push(old);
      continue;
    }
    pins.push({ ...old, from: found, to: end });
  }
  return { pins, detached };
}
export function normalize(raw: unknown): InlineStore {
  const result: InlineStore = { version: 2, notes: {} };
  if (!raw || typeof raw !== "object") return result;
  const object = raw as any;
  if (object.version === 1) {
    result.legacyBoards = object.boards;
    return result;
  }
  if (object.version !== 2)
    throw new Error(
      "Unsupported Canvesidian data version. Existing layout data was not overwritten.",
    );
  if (object.legacyBoards) result.legacyBoards = object.legacyBoards;
  if (Array.isArray(object.recoveryDrafts))
    result.recoveryDrafts = object.recoveryDrafts.filter(
      (d: any) =>
        d &&
        ["id", "path", "text", "savedAt"].every(
          (k) => typeof d[k] === "string",
        ),
    );
  for (const [path, note] of Object.entries(object.notes ?? {}) as [
    string,
    any,
  ][]) {
    if (!Array.isArray(note?.pins)) continue;
    result.notes[path] = {
      enabled: note.enabled !== false,
      pins: note.pins
        .filter(
          (p: any) =>
            p &&
            typeof p.id === "string" &&
            typeof p.text === "string" &&
            typeof p.before === "string" &&
            typeof p.after === "string" &&
            [p.from, p.to, p.x, p.y, p.width, p.height].every(
              Number.isFinite,
            ) &&
            p.from >= 0 &&
            p.to >= p.from,
        )
        .map((p: SavedPin) => ({
          ...p,
          x: limit(p.x, 0, 50000),
          y: limit(p.y, 0, 50000),
          width: limit(p.width, 200, 1200),
          height: limit(p.height, 80, 10000),
        })),
    };
  }
  return result;
}
