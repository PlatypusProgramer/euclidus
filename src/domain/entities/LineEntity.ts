import { multiply } from 'mathjs';
import type { Matrix } from 'mathjs';
import type { CanvasRenderer } from '../../rendering/CanvasRenderer';
import type { GeometryEntity } from './GeometryEntity';
import type { PointEntity } from './PointEntity';
import { createGuid } from '../../utils/guid';

export class LineEntity implements GeometryEntity {
  id: string;
  name: string;
  root: PointEntity;
  direction: { x: number; y: number };

  constructor(
    name: string,
    root: PointEntity,
    directionX: number,
    directionY: number,
    id: string = createGuid(),
  ) {
    if (directionX === 0 && directionY === 0) {
      throw new Error('Line direction cannot be a zero vector');
    }
    this.id = id;
    this.name = name;
    this.root = root;
    this.direction = { x: directionX, y: directionY };
  }

  setRoot(root: PointEntity) {
    this.root = root;
  }

  setDirection(directionX: number, directionY: number) {
    if (directionX === 0 && directionY === 0) {
      throw new Error('Line direction cannot be a zero vector');
    }
    this.direction.x = directionX;
    this.direction.y = directionY;
  }

  draw(renderer: CanvasRenderer) {
    renderer.addLine(this);
  }

  transform(matrix: Matrix) {
    this.root.transform(matrix);
    const result = multiply(matrix, [this.direction.x, this.direction.y, 0]) as any;
    const coords = result?.valueOf ? result.valueOf() : result;
    this.direction.x = coords[0];
    this.direction.y = coords[1];
  }
}
