import type { PointEntity } from './PointEntity';

export class LineEntity {
  name: string;
  start: PointEntity;
  end: PointEntity;

  constructor(name: string, start: PointEntity, end: PointEntity) {
    this.name = name;
    this.start = start;
    this.end = end;
  }

  setPoints(start: PointEntity, end: PointEntity) {
    this.start = start;
    this.end = end;
  }
}
