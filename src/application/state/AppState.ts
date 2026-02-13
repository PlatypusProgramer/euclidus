import type { PointEntity } from '../../domain/entities/PointEntity';
import type { LineEntity } from '../../domain/entities/LineEntity';
import type { LineSegmentEntity } from '../../domain/entities/LineSegmentEntity';
import type { Constraint } from '../../domain/constraints/Constraint';

export class AppState {
  private points: Map<string, PointEntity> = new Map();
  private lineSegments: Map<string, LineSegmentEntity> = new Map();
  private lines: Map<string, LineEntity> = new Map();
  private constraints: Map<string, Constraint> = new Map();

  addPoint(point: PointEntity) {
    this.points.set(point.name, point);
  }

  removePoint(name: string) {
    this.points.delete(name);
  }

  getPoint(name: string) {
    return this.points.get(name);
  }

  getPointById(id: string) {
    for (const point of this.points.values()) {
      if (point.id === id) {
        return point;
      }
    }
    return undefined;
  }

  getAllPoints() {
    return Array.from(this.points.values());
  }

  addLineSegment(line: LineSegmentEntity) {
    this.lineSegments.set(line.name, line);
  }

  removeLineSegment(name: string) {
    this.lineSegments.delete(name);
  }

  getLineSegment(name: string) {
    return this.lineSegments.get(name);
  }

  getLineSegmentById(id: string) {
    for (const line of this.lineSegments.values()) {
      if (line.id === id) {
        return line;
      }
    }
    return undefined;
  }

  getAllLineSegments() {
    return Array.from(this.lineSegments.values());
  }

  getLineSegmentsForPoint(pointName: string) {
    const matches: LineSegmentEntity[] = [];
    for (const line of this.lineSegments.values()) {
      if (line.start.name === pointName || line.end.name === pointName) {
        matches.push(line);
      }
    }
    return matches;
  }

  addLine(line: LineEntity) {
    this.lines.set(line.name, line);
  }

  removeLine(name: string) {
    this.lines.delete(name);
  }

  getLine(name: string) {
    return this.lines.get(name);
  }

  getLineById(id: string) {
    for (const line of this.lines.values()) {
      if (line.id === id) {
        return line;
      }
    }
    return undefined;
  }

  getAllLines() {
    return Array.from(this.lines.values());
  }

  getLinesForPoint(pointName: string) {
    const matches: LineEntity[] = [];
    for (const line of this.lines.values()) {
      if (line.root.name === pointName || line.directionPoint.name === pointName) {
        matches.push(line);
      }
    }
    return matches;
  }

  addConstraint(constraint: Constraint) {
    this.constraints.set(constraint.id, constraint);
  }

  removeConstraint(id: string) {
    this.constraints.delete(id);
  }

  getConstraint(id: string) {
    return this.constraints.get(id);
  }

  getConstraints() {
    return Array.from(this.constraints.values());
  }

  findEntityById(id: string): { type: 'point' | 'line' | 'lineSegment'; name: string } | null {
    const point = this.getPointById(id);
    if (point) {
      return { type: 'point', name: point.name };
    }

    const line = this.getLineById(id);
    if (line) {
      return { type: 'line', name: line.name };
    }

    const lineSegment = this.getLineSegmentById(id);
    if (lineSegment) {
      return { type: 'lineSegment', name: lineSegment.name };
    }

    return null;
  }

  clear() {
    this.points.clear();
    this.lineSegments.clear();
    this.lines.clear();
    this.constraints.clear();
  }
}
