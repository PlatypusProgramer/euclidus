import type { PointEntity } from '../../domain/entities/PointEntity';
import type { LineEntity } from '../../domain/entities/LineEntity';
import type { LineSegmentEntity } from '../../domain/entities/LineSegmentEntity';

export interface RendererPort {
  addPoint(point: PointEntity): void;
  updatePoint(point: PointEntity): void;
  removePoint(name: string): void;
  addLineSegment(line: LineSegmentEntity): void;
  updateLineSegment(line: LineSegmentEntity): void;
  removeLineSegment(name: string): void;
  addLine(line: LineEntity): void;
  updateLine(line: LineEntity): void;
  removeLine(name: string): void;
}
