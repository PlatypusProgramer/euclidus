export type ParsedCommand =
  | { type: 'addPoint'; name: string; x: number; y: number }
  | { type: 'addLineSegment'; name: string; start: string; end: string }
  | { type: 'addLine'; name: string; start: string; end: string }
  | { type: 'addLineFromSegment'; name: string; segment: string }
  | { type: 'lockPoint'; name: string }
  | { type: 'unlockPoint'; name: string }
  | {
      type: 'addPerpendicular';
      a: { type: 'line' | 'lineSegment'; name: string };
      b: { type: 'line' | 'lineSegment'; name: string };
    }
  | {
      type: 'addParallel';
      a: { type: 'line' | 'lineSegment'; name: string };
      b: { type: 'line' | 'lineSegment'; name: string };
    }
  | {
      type: 'addEqualLength';
      a: string;
      b: string;
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

  const lineFromSegmentMatch = lowered.match(/^(new|add)\s+line\s+([a-z]+)\s+(segment|linesegment)\s+([a-z0-9]+)$/i);
  if (lineFromSegmentMatch) {
    const name = lineFromSegmentMatch[2].toUpperCase();
    const segment = lineFromSegmentMatch[4].toUpperCase();
    return { type: 'addLineFromSegment', name, segment };
  }

  const linePointsMatch = lowered.match(/^(new|add)\s+line\s+([a-z]+)\s+([a-z])\s+([a-z])$/i);
  if (linePointsMatch) {
    const name = linePointsMatch[2].toUpperCase();
    const start = linePointsMatch[3].toUpperCase();
    const end = linePointsMatch[4].toUpperCase();
    return { type: 'addLine', name, start, end };
  }

  const linePairMatch = lowered.match(/^(new|add)\s+line\s+([a-z]+)\s+([a-z]{2})$/i);
  if (linePairMatch) {
    const name = linePairMatch[2].toUpperCase();
    const start = linePairMatch[3][0].toUpperCase();
    const end = linePairMatch[3][1].toUpperCase();
    return { type: 'addLine', name, start, end };
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
    /^(add\s*)?(perpendicular|perp)\s+(line|segment|linesegment)\s+([a-z0-9]+)\s+(line|segment|linesegment)\s+([a-z0-9]+)$/i
  );
  if (perpendicularMatch) {
    const normalizeType = (value: string): 'line' | 'lineSegment' =>
      value.startsWith('line') ? 'line' : 'lineSegment';
    const aType = normalizeType(perpendicularMatch[3].toLowerCase());
    const bType = normalizeType(perpendicularMatch[5].toLowerCase());
    const aName = perpendicularMatch[4].toUpperCase();
    const bName = perpendicularMatch[6].toUpperCase();

    return { type: 'addPerpendicular', a: { type: aType, name: aName }, b: { type: bType, name: bName } };
  }

  const parallelMatch = lowered.match(
    /^(add\s*)?(parallel|par)\s+(line|segment|linesegment)\s+([a-z0-9]+)\s+(line|segment|linesegment)\s+([a-z0-9]+)$/i
  );
  if (parallelMatch) {
    const normalizeType = (value: string): 'line' | 'lineSegment' =>
      value.startsWith('line') ? 'line' : 'lineSegment';
    const aType = normalizeType(parallelMatch[3].toLowerCase());
    const bType = normalizeType(parallelMatch[5].toLowerCase());
    const aName = parallelMatch[4].toUpperCase();
    const bName = parallelMatch[6].toUpperCase();

    return { type: 'addParallel', a: { type: aType, name: aName }, b: { type: bType, name: bName } };
  }

  const equalLengthMatch = lowered.match(
    /^(add\s*)?(equal|equals|eq|equal-length|equallength)\s+(segment|linesegment)\s+([a-z0-9]+)\s+(segment|linesegment)\s+([a-z0-9]+)$/i
  );
  if (equalLengthMatch) {
    const aName = equalLengthMatch[4].toUpperCase();
    const bName = equalLengthMatch[6].toUpperCase();
    return { type: 'addEqualLength', a: aName, b: bName };
  }

  return { type: 'invalid', reason: 'Unrecognized command' };
}
