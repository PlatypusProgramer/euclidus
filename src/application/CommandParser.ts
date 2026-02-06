export type ParsedCommand =
  | { type: 'addPoint'; name: string; x: number; y: number }
  | { type: 'addLine'; name: string; start: string; end: string }
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

  const lineMatch = lowered.match(/^(new|add)\s+line\s+([a-z])\s*([a-z])$/i);
  if (lineMatch) {
    const start = lineMatch[2].toUpperCase();
    const end = lineMatch[3].toUpperCase();
    const name = `${start}${end}`;
    return { type: 'addLine', name, start, end };
  }

  const linePairMatch = lowered.match(/^(new|add)\s+line\s+([a-z]{2})$/i);
  if (linePairMatch) {
    const start = linePairMatch[2][0].toUpperCase();
    const end = linePairMatch[2][1].toUpperCase();
    const name = `${start}${end}`;
    return { type: 'addLine', name, start, end };
  }

  return { type: 'invalid', reason: 'Unrecognized command' };
}
