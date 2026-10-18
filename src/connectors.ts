import { Drawing, Placement, rotatedBounds } from "./model";
type Point = [number, number];
export interface Target extends Placement {
  id: string;
}
const margin = 18;
const contains = (r: Placement, p: Point) =>
  p[0] > r.x && p[0] < r.x + r.width && p[1] > r.y && p[1] < r.y + r.height;
function clear(a: Point, b: Point, boxes: Placement[]) {
  return !boxes.some((r) =>
    a[0] === b[0]
      ? a[0] > r.x &&
        a[0] < r.x + r.width &&
        Math.max(a[1], b[1]) > r.y &&
        Math.min(a[1], b[1]) < r.y + r.height
      : a[1] > r.y &&
        a[1] < r.y + r.height &&
        Math.max(a[0], b[0]) > r.x &&
        Math.min(a[0], b[0]) < r.x + r.width,
  );
}
function port(a: Placement, b: Placement): [Point, Point] {
  const dx = b.x + b.width / 2 - a.x - a.width / 2,
    dy = b.y + b.height / 2 - a.y - a.height / 2;
  if (
    Math.abs(dx) / (a.width + b.width) >=
    Math.abs(dy) / (a.height + b.height)
  ) {
    const x = dx >= 0 ? a.x + a.width : a.x;
    return [
      [x, a.y + a.height / 2],
      [x + (dx >= 0 ? margin : -margin), a.y + a.height / 2],
    ];
  }
  const y = dy >= 0 ? a.y + a.height : a.y;
  return [
    [a.x + a.width / 2, y],
    [a.x + a.width / 2, y + (dy >= 0 ? margin : -margin)],
  ];
}
/** Orthogonal visibility-grid routing around expanded object bounds. */
export function connectorRoute(
  source: Target,
  target: Target,
  targets: Target[],
): Point[] {
  const a = rotatedBounds(source),
    b = rotatedBounds(target);
  const [start, exit] = port(a, b),
    [end, entry] = port(b, a);
  const boxes = targets.map(rotatedBounds).map((r) => ({
    ...r,
    x: r.x - margin,
    y: r.y - margin,
    width: r.width + margin * 2,
    height: r.height + margin * 2,
  }));
  // Overlapping endpoints have no collision-free escape; retain a visible elbow.
  const fallback: Point[] = [start, exit, [entry[0], exit[1]], entry, end];
  if (boxes.some((r) => contains(r, exit) || contains(r, entry)))
    return fallback;
  const xs = [
    ...new Set([
      exit[0],
      entry[0],
      ...boxes.flatMap((r) => [r.x, r.x + r.width]),
    ]),
  ].sort((a, b) => a - b);
  const ys = [
    ...new Set([
      exit[1],
      entry[1],
      ...boxes.flatMap((r) => [r.y, r.y + r.height]),
    ]),
  ].sort((a, b) => a - b);
  const key = (x: number, y: number) => y * xs.length + x;
  const sx = xs.indexOf(exit[0]),
    sy = ys.indexOf(exit[1]),
    ex = xs.indexOf(entry[0]),
    ey = ys.indexOf(entry[1]);
  const startKey = key(sx, sy),
    endKey = key(ex, ey);
  const distance = new Map<number, number>([[startKey, 0]]),
    prev = new Map<number, number>();
  const queue = new Set<number>([startKey]);
  while (queue.size) {
    let current = -1,
      best = Infinity;
    for (const k of queue) {
      const x = k % xs.length,
        y = Math.floor(k / xs.length);
      const score =
        distance.get(k)! +
        Math.abs(xs[x] - entry[0]) +
        Math.abs(ys[y] - entry[1]);
      if (score < best) {
        best = score;
        current = k;
      }
    }
    queue.delete(current);
    if (current === endKey) {
      const path: Point[] = [];
      let k = current;
      while (true) {
        path.push([xs[k % xs.length], ys[Math.floor(k / xs.length)]]);
        if (k === startKey) break;
        k = prev.get(k)!;
      }
      const route: Point[] = [start, ...path.reverse(), end];
      return route.filter(
        (p, i) =>
          i === 0 ||
          i === route.length - 1 ||
          !(
            (route[i - 1][0] === p[0] && p[0] === route[i + 1][0]) ||
            (route[i - 1][1] === p[1] && p[1] === route[i + 1][1])
          ),
      );
    }
    const x = current % xs.length,
      y = Math.floor(current / xs.length);
    for (const [nx, ny] of [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
    ]) {
      if (nx < 0 || ny < 0 || nx >= xs.length || ny >= ys.length) continue;
      const p: Point = [xs[nx], ys[ny]],
        q: Point = [xs[x], ys[y]];
      if (boxes.some((r) => contains(r, p)) || !clear(q, p, boxes)) continue;
      const next = key(nx, ny),
        cost =
          distance.get(current)! +
          Math.abs(p[0] - q[0]) +
          Math.abs(p[1] - q[1]);
      if (cost < (distance.get(next) ?? Infinity)) {
        distance.set(next, cost);
        prev.set(next, current);
        queue.add(next);
      }
    }
  }
  return fallback;
}
function geometry(d: Drawing, points: Point[]): Drawing {
  const x = Math.min(...points.map((p) => p[0])),
    y = Math.min(...points.map((p) => p[1]));
  const width = Math.max(2, Math.max(...points.map((p) => p[0])) - x),
    height = Math.max(2, Math.max(...points.map((p) => p[1])) - y);
  return {
    ...d,
    x,
    y,
    width,
    height,
    rotation: 0,
    points: points.map((p) => [(p[0] - x) / width, (p[1] - y) / height]),
  };
}
export function routeConnector(d: Drawing, targets: Target[]): Drawing {
  const source = targets.find((t) => t.id === d.sourceId),
    target = targets.find((t) => t.id === d.targetId);
  if (source && target)
    return geometry(d, connectorRoute(source, target, targets));
  const pts = d.points ?? [
      [0, 0],
      [1, 1],
    ],
    first = pts[0],
    last = pts[pts.length - 1];
  const start: Point = [d.x + first[0] * d.width, d.y + first[1] * d.height],
    end: Point = [d.x + last[0] * d.width, d.y + last[1] * d.height];
  if (source) {
    const [edge] = port(rotatedBounds(source), {
      x: end[0],
      y: end[1],
      width: 1,
      height: 1,
    });
    return geometry(d, [edge, end]);
  }
  if (target) {
    const [edge] = port(rotatedBounds(target), {
      x: start[0],
      y: start[1],
      width: 1,
      height: 1,
    });
    return geometry(d, [start, edge]);
  }
  return d;
}
/** Snap in a small edge halo, not just after the pointer enters the shape. */
export function snapTarget(
  point: Point,
  targets: Target[],
  exclude?: string,
  radius = 24,
) {
  let best: Target | undefined,
    distance = Infinity;
  for (const target of [...targets]
    .reverse()
    .sort((a, b) => (b.layer ?? 0) - (a.layer ?? 0))) {
    if (target.id === exclude) continue;
    const r = rotatedBounds(target),
      dx = Math.max(r.x - point[0], 0, point[0] - r.x - r.width),
      dy = Math.max(r.y - point[1], 0, point[1] - r.y - r.height);
    const next = Math.hypot(dx, dy);
    if (next <= radius && next < distance) {
      best = target;
      distance = next;
    }
  }
  return best;
}
export function targetAt(point: Point, targets: Target[]) {
  return [...targets]
    .reverse()
    .sort((a, b) => (b.layer ?? 0) - (a.layer ?? 0))
    .find((t) => contains(rotatedBounds(t), point));
}
