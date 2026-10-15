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
  drawings?: Drawing[];
}
export interface RecoveryDraft {
  id: string;
  path: string;
  text: string;
  savedAt: string;
}
export interface InlineStore {
  version: 3;
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
  const result: InlineStore = { version: 3, notes: {} };
  if (!raw || typeof raw !== "object") return result;
  const object = raw as any;
  if (object.version === 1) {
    result.legacyBoards = object.boards;
    return result;
  }
  if (object.version !== 2 && object.version !== 3)
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
      drawings: normalizeDrawings(note.drawings),
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

export type DrawingKind = "pen" | "rect" | "ellipse" | "line";
export interface Drawing extends Placement {
  id: string;
  kind: DrawingKind;
  points?: [number, number][];
  stroke: string;
  strokeWidth: number;
  opacity: number;
}
export const validStroke = (s: unknown): s is string =>
  s === "currentColor" || (typeof s === "string" && /^#[0-9a-f]{6}$/i.test(s));
export function normalizeDrawings(raw: unknown): Drawing[] {
  if (!Array.isArray(raw)) return [];
  const ids = new Set<string>();
  return raw
    .filter(
      (d) =>
        d &&
        typeof d.id === "string" &&
        !ids.has(d.id) &&
        (ids.add(d.id), true) &&
        ["pen", "rect", "ellipse", "line"].includes(d.kind) &&
        [d.x, d.y, d.width, d.height, d.strokeWidth, d.opacity].every(
          Number.isFinite,
        ) &&
        validStroke(d.stroke) &&
        (d.kind !== "pen" || Array.isArray(d.points)),
    )
    .map((d) => ({
      ...d,
      x: limit(d.x, 0, 50000),
      y: limit(d.y, 0, 50000),
      width: limit(d.width, 2, 10000),
      height: limit(d.height, 2, 10000),
      strokeWidth: limit(d.strokeWidth, 1, 32),
      opacity: limit(d.opacity, 0.1, 1),
      points: (Array.isArray(d.points) ? d.points : undefined)
        ?.filter(
          (p: any) =>
            Array.isArray(p) && p.length === 2 && p.every(Number.isFinite),
        )
        .slice(0, 5000)
        .map((p: number[]) => [limit(p[0], 0, 1), limit(p[1], 0, 1)]),
    }));
}
/** Keep meaningful freehand points and normalize geometry; bounded to 5,000 points. */
export function drawingFromPoints(
  kind: DrawingKind,
  world: [number, number][],
  stroke = "currentColor",
  strokeWidth = 2,
  opacity = 1,
): Drawing | null {
  if (world.length < 2) return null;
  let points = world
    .filter(
      (p, i) =>
        i === 0 ||
        i === world.length - 1 ||
        Math.hypot(p[0] - world[i - 1][0], p[1] - world[i - 1][1]) >= 1.5,
    )
    .slice(0, 5000);
  if (points.length < 2) points = [world[0], world[world.length - 1]];
  const xs = points.map((p) => p[0]),
    ys = points.map((p) => p[1]);
  const x = Math.min(...xs),
    y = Math.min(...ys),
    width = Math.max(2, Math.max(...xs) - x),
    height = Math.max(2, Math.max(...ys) - y);
  if (width < 3 && height < 3) return null;
  return {
    id: crypto.randomUUID(),
    kind,
    x,
    y,
    width,
    height,
    stroke,
    strokeWidth,
    opacity,
    points: points.map((p) => [(p[0] - x) / width, (p[1] - y) / height]),
  };
}

export type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
export function resized(
  start: Placement,
  dx: number,
  dy: number,
  handle: Handle,
  minWidth = 24,
  minHeight = 24,
): Placement {
  let left = start.x,
    top = start.y,
    right = left + start.width,
    bottom = top + start.height;
  if (handle.includes("w")) left = limit(left + dx, 0, right - minWidth);
  if (handle.includes("e")) right = limit(right + dx, left + minWidth, 51200);
  if (handle.includes("n")) top = limit(top + dy, 0, bottom - minHeight);
  if (handle.includes("s")) bottom = limit(bottom + dy, top + minHeight, 60000);
  return { x: left, y: top, width: right - left, height: bottom - top };
}
