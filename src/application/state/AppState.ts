import type { PointEntity } from '../../domain/entities/PointEntity';
import type { LineEntity } from '../../domain/entities/LineEntity';

export class AppState {
  private points: Map<string, PointEntity> = new Map();
  private lines: Map<string, LineEntity> = new Map();

  addPoint(point: PointEntity) {
    this.points.set(point.name, point);
  }

  removePoint(name: string) {
    this.points.delete(name);
  }

  getPoint(name: string) {
    return this.points.get(name);
  }

  getAllPoints() {
    return Array.from(this.points.values());
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

  getAllLines() {
    return Array.from(this.lines.values());
  }
}
