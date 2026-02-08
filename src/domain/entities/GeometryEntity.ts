import type { Matrix } from 'mathjs';
import type { CanvasRenderer } from '../../rendering/CanvasRenderer';

export interface GeometryEntity {
  id: string;
  draw(renderer: CanvasRenderer): void;
  transform(matrix: Matrix): void;
}
