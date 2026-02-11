import type { Matrix } from 'mathjs';
import type { GeometryEntity } from './GeometryEntity';
import type { PointEntity } from './PointEntity';
import { createGuid } from '../../utils/guid';

export class LineSegmentEntity implements GeometryEntity {
  id: string;
  name: string;
  start: PointEntity;
  end: PointEntity;

  constructor(name: string, start: PointEntity, end: PointEntity, id: string = createGuid()) {
    this.id = id;
    this.name = name;
    this.start = start;
    this.end = end;
  }

  setPoints(start: PointEntity, end: PointEntity) {
    this.start = start;
    this.end = end;
  }

  transform(matrix: Matrix) {
    this.start.transform(matrix);
    this.end.transform(matrix);
  }
}
