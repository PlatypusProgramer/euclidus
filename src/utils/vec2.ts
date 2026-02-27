export type Vec2 = { x: number; y: number };

const EPSILON = 1e-9;

export function addVec2(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function subVec2(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function mulVec2(v: Vec2, scalar: number): Vec2 {
  return { x: v.x * scalar, y: v.y * scalar };
}

export function normalizeVec2(v: Vec2): Vec2 | null {
  const len = Math.hypot(v.x, v.y);
  if (len < EPSILON) return null;
  return { x: v.x / len, y: v.y / len };
}

export function lengthSqVec2(v: Vec2): number {
  return dotVec2(v, v);
}

export function distanceSqVec2(a: Vec2, b: Vec2): number {
  return lengthSqVec2(subVec2(a, b));
}

export function lengthVec2(v: Vec2): number {
  return Math.hypot(v.x, v.y);
}

export function dotVec2(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

export function crossVec2(a: Vec2, b: Vec2): number {
  return a.x * b.y - a.y * b.x;
}

export function intersectLinesVec2(a0: Vec2, a1: Vec2, b0: Vec2, b1: Vec2): Vec2 | null {
  const r = subVec2(a1, a0);
  const s = subVec2(b1, b0);
  const denom = crossVec2(r, s);
  if (Math.abs(denom) < EPSILON) return null;
  const t = crossVec2(subVec2(b0, a0), s) / denom;
  return addVec2(a0, mulVec2(r, t));
}

export function projectPointToLineWithParamVec2(
  point: Vec2,
  lineStart: Vec2,
  lineEnd: Vec2
): { point: Vec2; t: number } | null {
  const d = subVec2(lineEnd, lineStart);
  const denom = dotVec2(d, d);
  if (denom < EPSILON) return null;
  const t = dotVec2(subVec2(point, lineStart), d) / denom;
  return { point: addVec2(lineStart, mulVec2(d, t)), t };
}

export function projectPointToSegmentWithParamVec2(
  point: Vec2,
  segmentStart: Vec2,
  segmentEnd: Vec2
): { point: Vec2; t: number } | null {
  const d = subVec2(segmentEnd, segmentStart);
  const denom = dotVec2(d, d);
  if (denom < EPSILON) return null;
  const rawT = dotVec2(subVec2(point, segmentStart), d) / denom;
  const t = Math.max(0, Math.min(1, rawT));
  return { point: addVec2(segmentStart, mulVec2(d, t)), t };
}

export function distancePointToLineVec2(point: Vec2, linePoint: Vec2, lineDirection: Vec2): number | null {
  const magnitude = lengthVec2(lineDirection);
  if (magnitude < EPSILON) return null;
  const delta = subVec2(point, linePoint);
  return Math.abs(crossVec2(delta, lineDirection)) / magnitude;
}
