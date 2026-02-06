import type { PointEntity } from '../../domain/entities/PointEntity';
import type { LineEntity } from '../../domain/entities/LineEntity';

export interface RendererPort {
  addPoint(point: PointEntity): void;
  updatePoint(point: PointEntity): void;
  removePoint(name: string): void;
  addLine(line: LineEntity): void;
  updateLine(line: LineEntity): void;
  removeLine(name: string): void;
}
