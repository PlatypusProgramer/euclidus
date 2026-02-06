import type { Container } from 'pixi.js';
import type { Camera } from './Camera';
import { EuclidianGrid } from './EuclidianGrid';

export class ViewportOverlay {
  private grid: EuclidianGrid;

  constructor(camera: Camera) {
    this.grid = new EuclidianGrid(camera);
  }

  draw(stage: Container, canvas: HTMLCanvasElement): void {
    this.grid.draw(stage, canvas);
  }
}
