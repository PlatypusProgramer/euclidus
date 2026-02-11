import type { Matrix } from 'mathjs';
export interface GeometryEntity {
  id: string;
  transform(matrix: Matrix): void;
}
