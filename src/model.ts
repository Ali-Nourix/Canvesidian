/** Pure model: source is never reconstructed from rendered Markdown. */
export interface Section {
  id: string;
  title: string;
  markdown: string;
  from: number;
  to: number;
}
export interface Annotation {
  id: string;
  kind: "sticker" | "note";
  text: string;
  x: number;
  y: number;
}
export interface Tile {
  x: number;
  y: number;
  width: number;
  annotations: Annotation[];
}
export interface Board {
  tiles: Record<string, Tile>;
}
export interface Store {
  version: 1;
  boards: Record<string, Board>;
}
export const uid = () => globalThis.crypto.randomUUID();
export function sections(source: string): Section[] {
  const cuts: { from: number; title: string; key: string }[] = [];
  const frontmatter =
    source.match(
      /^(?:\uFEFF)?---[ \t]*\r?\n[\s\S]*?\r?\n(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/,
    )?.[0].length ?? 0;
  const seen = new Map<string, number>();
  let offset = 0;
  let fence = "";
  let fenceLength = 0;
  for (const line of source.split(/(?<=\n)/)) {
    if (offset < frontmatter) {
      offset += line.length;
      continue;
    }
    const f = line.match(/^ {0,3}(`{3,}|~{3,})(.*)/);
    if (f) {
      if (!fence) {
        fence = f[1][0];
        fenceLength = f[1].length;
      } else if (
        f[1][0] === fence &&
        f[1].length >= fenceLength &&
        !f[2].trim()
      ) {
        fence = "";
      }
      offset += line.length;
      continue;
    }
    const h = !fence && line.match(/^ {0,3}(#{1,6})[ \t]+(.+?)[ \t]*\r?\n?$/);
    if (h) {
      const title = h[2].replace(/[ \t]+#+[ \t]*$/, "").trim();
      const key = `${h[1].length}:${title}`;
      const n = seen.get(key) || 0;
      seen.set(key, n + 1);
      cuts.push({ from: offset, title, key: `heading:${key}:${n}` });
    }
    offset += line.length;
  }
  if (!cuts.length || cuts[0].from > 0)
    cuts.unshift({ from: 0, title: "Opening", key: "preamble" });
  return cuts.map((cut, i) => ({
    id: cut.key,
    title: cut.title,
    from: cut.from,
    to: cuts[i + 1]?.from ?? source.length,
    markdown: source.slice(cut.from, cuts[i + 1]?.from ?? source.length),
  }));
}
export function replaceSection(
  current: string,
  expected: string,
  section: Section,
  replacement: string,
): string {
  if (current !== expected)
    throw new Error(
      "This note changed. Reopen the section before saving. Your draft is still here.",
    );
  // Keep the next heading at the start of its own line.
  const text =
    section.to < current.length && replacement && !replacement.endsWith("\n")
      ? replacement + "\n"
      : replacement;
  return current.slice(0, section.from) + text + current.slice(section.to);
}
export function ensureTiles(board: Board, parts: Section[]) {
  parts.forEach((s, i) => {
    board.tiles[s.id] ??= {
      x: 48 + i * 400,
      y: 48,
      width: 360,
      annotations: [],
    };
  });
}
export const bounded = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));
export function normalizeStore(raw: unknown): Store {
  const store: Store = { version: 1, boards: {} };
  if (!raw || typeof raw !== "object") return store;
  const candidate = raw as Store;
  if (
    candidate.version !== 1 ||
    !candidate.boards ||
    typeof candidate.boards !== "object"
  )
    return store;
  for (const [path, board] of Object.entries(candidate.boards)) {
    if (!board?.tiles || typeof board.tiles !== "object") continue;
    const tiles: Record<string, Tile> = {};
    for (const [id, t] of Object.entries(board.tiles)) {
      if (!t || ![t.x, t.y, t.width].every(Number.isFinite)) continue;
      tiles[id] = {
        x: bounded(t.x, 0, 50000),
        y: bounded(t.y, 0, 50000),
        width: bounded(t.width, 240, 1200),
        annotations: Array.isArray(t.annotations)
          ? t.annotations
              .filter(
                (a) =>
                  a &&
                  typeof a.id === "string" &&
                  ["note", "sticker"].includes(a.kind) &&
                  typeof a.text === "string" &&
                  Number.isFinite(a.x) &&
                  Number.isFinite(a.y),
              )
              .map((a) => ({
                ...a,
                x: bounded(a.x, 0, 1200),
                y: bounded(a.y, 0, 5000),
              }))
          : [],
      };
    }
    store.boards[path] = { tiles };
  }
  return store;
}
