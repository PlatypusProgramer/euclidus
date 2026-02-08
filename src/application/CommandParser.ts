export type ParsedCommand =
  | { type: 'addPoint'; name: string; x: number; y: number }
  | { type: 'addLineSegment'; name: string; start: string; end: string }
  | { type: 'addLine'; name: string; root: string; directionX: number; directionY: number }
  | { type: 'lockPoint'; name: string }
  | { type: 'unlockPoint'; name: string }
  | {
      type: 'addPerpendicular';
      a: { type: 'line' | 'lineSegment'; name: string };
      b: { type: 'line' | 'lineSegment'; name: string };
    }
  | { type: 'invalid'; reason: string };

export function parseCommand(input: string): ParsedCommand {
  const trimmed = input.trim();
  if (!trimmed) {
    return { type: 'invalid', reason: 'Empty command' };
  }

  const lowered = trimmed.toLowerCase();
  const pointMatch = lowered.match(/^(new|add)\s+point\s+([a-z])\s+([\-\d.]+)[,\s]+([\-\d.]+)$/i);
  if (pointMatch) {
    const name = pointMatch[2].toUpperCase();
    const x = parseFloat(pointMatch[3]);
    const y = parseFloat(pointMatch[4]);

    if (Number.isNaN(x) || Number.isNaN(y)) {
      return { type: 'invalid', reason: 'Invalid coordinates' };
    }

    return { type: 'addPoint', name, x, y };
  }

  const lineSegmentMatch = lowered.match(/^(new|add)\s+linesegment\s+([a-z])\s*([a-z])$/i);
  if (lineSegmentMatch) {
    const start = lineSegmentMatch[2].toUpperCase();
    const end = lineSegmentMatch[3].toUpperCase();
    const name = `${start}${end}`;
    return { type: 'addLineSegment', name, start, end };
  }

  const lineSegmentPairMatch = lowered.match(/^(new|add)\s+linesegment\s+([a-z]{2})$/i);
  if (lineSegmentPairMatch) {
    const start = lineSegmentPairMatch[2][0].toUpperCase();
    const end = lineSegmentPairMatch[2][1].toUpperCase();
    const name = `${start}${end}`;
    return { type: 'addLineSegment', name, start, end };
  }

  const lineMatch = lowered.match(
    /^(new|add)\s+line\s+([a-z]+)\s+([a-z])\s+([\-\d.]+)[,\s]+([\-\d.]+)$/i
  );
  if (lineMatch) {
    const name = lineMatch[2].toUpperCase();
    const root = lineMatch[3].toUpperCase();
    const directionX = parseFloat(lineMatch[4]);
    const directionY = parseFloat(lineMatch[5]);

    if (Number.isNaN(directionX) || Number.isNaN(directionY)) {
      return { type: 'invalid', reason: 'Invalid direction vector' };
    }

    return { type: 'addLine', name, root, directionX, directionY };
  }

  const lockMatch = lowered.match(/^lock\s+point\s+([a-z])$/i);
  if (lockMatch) {
    const name = lockMatch[1].toUpperCase();
    return { type: 'lockPoint', name };
  }

  const unlockMatch = lowered.match(/^unlock\s+point\s+([a-z])$/i);
  if (unlockMatch) {
    const name = unlockMatch[1].toUpperCase();
    return { type: 'unlockPoint', name };
  }

  const perpendicularMatch = lowered.match(
    /^(perpendicular|perp)\s+(line|segment|linesegment)\s+([a-z0-9]+)\s+(line|segment|linesegment)\s+([a-z0-9]+)$/i
  );
  if (perpendicularMatch) {
    const normalizeType = (value: string): 'line' | 'lineSegment' =>
      value.startsWith('line') ? 'line' : 'lineSegment';
    const aType = normalizeType(perpendicularMatch[2].toLowerCase());
    const bType = normalizeType(perpendicularMatch[4].toLowerCase());
    const aName = perpendicularMatch[3].toUpperCase();
    const bName = perpendicularMatch[5].toUpperCase();

    return { type: 'addPerpendicular', a: { type: aType, name: aName }, b: { type: bType, name: bName } };
  }

  return { type: 'invalid', reason: 'Unrecognized command' };
}
