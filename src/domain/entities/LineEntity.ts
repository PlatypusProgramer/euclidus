import type { Matrix } from 'mathjs';
import type { GeometryEntity } from './GeometryEntity';
import type { PointEntity } from './PointEntity';
import { LineSegmentEntity } from './LineSegmentEntity';
import { createGuid } from '../../utils/guid';
import { lengthSqVec2, subVec2 } from '../../utils/vec2';

export class LineEntity implements GeometryEntity {
  id: string;
  name: string;
  root: PointEntity;
  directionPoint: PointEntity;

  constructor(name: string, root: PointEntity, directionPoint: PointEntity, id?: string);
  constructor(name: string, segment: LineSegmentEntity, id?: string);
  constructor(
    name: string,
    arg1: PointEntity | LineSegmentEntity,
    arg2?: PointEntity | string,
    arg3?: string
  ) {
    let root: PointEntity;
    let directionPoint: PointEntity;
    let id: string | undefined;

    if (arg1 instanceof LineSegmentEntity) {
      root = arg1.start;
      directionPoint = arg1.end;
      id = typeof arg2 === 'string' ? arg2 : undefined;
    } else {
      if (!arg2 || typeof arg2 === 'string') {
        throw new Error('Line constructor requires a direction point');
      }
      root = arg1;
      directionPoint = arg2;
      id = arg3;
    }

    if (this.isZeroDirection(root, directionPoint)) {
      throw new Error('Line direction cannot be a zero vector');
    }

    this.id = id ?? createGuid();
    this.name = name;
    this.root = root;
    this.directionPoint = directionPoint;
  }

  get direction() {
    return subVec2(
      { x: this.directionPoint.x, y: this.directionPoint.y },
      { x: this.root.x, y: this.root.y }
    );
  }

  setPoints(root: PointEntity, directionPoint: PointEntity) {
    if (this.isZeroDirection(root, directionPoint)) {
      throw new Error('Line direction cannot be a zero vector');
    }
    this.root = root;
    this.directionPoint = directionPoint;
  }

  transform(matrix: Matrix) {
    this.root.transform(matrix);
    this.directionPoint.transform(matrix);
  }

  private isZeroDirection(root: PointEntity, directionPoint: PointEntity) {
    const direction = subVec2(
      { x: directionPoint.x, y: directionPoint.y },
      { x: root.x, y: root.y }
    );
    return lengthSqVec2(direction) === 0;
  }
}
