import { multiply } from 'mathjs';
import type { Matrix } from 'mathjs';
import type { GeometryEntity } from './GeometryEntity';
import { createGuid } from '../../utils/guid';

export class PointEntity implements GeometryEntity {
  id: string;
  name: string;
  x: number;
  y: number;

  constructor(name: string, x: number, y: number, id: string = createGuid()) {
    this.id = id;
    this.name = name;
    this.x = x;
    this.y = y;
  }

  setPosition(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  transform(matrix: Matrix) {
    const result = multiply(matrix, [this.x, this.y, 1]) as any;
    const coords = result?.valueOf ? result.valueOf() : result;
    this.x = coords[0];
    this.y = coords[1];
  }
}
