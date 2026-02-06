// Camera - World to Screen transformation with pan and zoom
import { multiply, inv } from 'mathjs';
import type { Container } from 'pixi.js';

export class Camera {
  private panX: number = 0; // World units
  private panY: number = 0; // World units
  private zoom: number = 1; // Scaling factor (zoom level)
  private gridSize: number = 25; // Pixels per world unit
  private canvasWidth: number = 800; // Default canvas width
  private canvasHeight: number = 600; // Default canvas height

  private viewMatrix: any = null;
  private inverseViewMatrix: any = null;
  private dirty: boolean = true;
  constructor(gridSize: number = 25) {
    this.gridSize = gridSize;
    this.updateViewMatrix();
  }

  setCanvasSize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.dirty = true;
    this.inverseViewMatrix = null;
  }

  setPan(x: number, y: number): void {
    this.panX = x;
    this.panY = y;
    this.dirty = true;
    this.inverseViewMatrix = null;
  }

  panBy(dx: number, dy: number): void {
    this.panX += dx;
    this.panY += dy;
    this.dirty = true;
    this.inverseViewMatrix = null;
  }

  getPan(): { x: number; y: number } {
    return { x: this.panX, y: this.panY };
  }

  setGridSize(gridSize: number): void {
    this.gridSize = gridSize;
    this.dirty = true;
    this.inverseViewMatrix = null;
  }

  getGridSize(): number {
    return this.gridSize;
  }

  setZoom(zoom: number): void {
    this.zoom = Math.max(0.1, zoom); // Prevent zero/negative zoom
    this.dirty = true;
    this.inverseViewMatrix = null;
  }

  getZoom(): number {
    return this.zoom;
  }

  getScale(): number {
    return this.gridSize * this.zoom;
  }

  private updateViewMatrix(): void {
    // View matrix: translate to canvas center, translate by -pan, then scale by zoom*gridSize
    const scale = this.getScale();

    // First, center the canvas: translate by canvas center
    const centerTranslation = [
      [1, 0, this.canvasWidth / 2],
      [0, 1, this.canvasHeight / 2],
      [0, 0, 1],
    ];

    // Then, translate by -pan and flip Y
    const panTranslation = [
      [1, 0, -this.panX * scale],
      [0, -1, this.panY * scale], // Negative to flip Y axis
      [0, 0, 1],
    ];

    // Scale matrix
    const scaling = [
      [scale, 0, 0],
      [0, scale, 0],
      [0, 0, 1],
    ];

    // Multiply: centerTranslation * panTranslation * scaling
    const temp = multiply(panTranslation, scaling);
    this.viewMatrix = multiply(centerTranslation, temp);
    this.inverseViewMatrix = null; // Will be calculated on demand
    this.dirty = false;
  }

  applyTo(container: Container): void {
    const scale = this.getScale();
    const centerX = this.canvasWidth / 2;
    const centerY = this.canvasHeight / 2;
    container.scale.set(scale, -scale);
    container.position.set(centerX - this.panX * scale, centerY + this.panY * scale);
  }


  getViewMatrix(): any {
    if (this.dirty) {
      this.updateViewMatrix();
    }
    return this.viewMatrix;
  }

  private getInverseViewMatrix(): any {
    if (this.dirty) {
      this.updateViewMatrix();
    }
    if (!this.inverseViewMatrix) {
      this.inverseViewMatrix = inv(this.viewMatrix);
    }
    return this.inverseViewMatrix;
  }

  // Transform world coordinates to screen coordinates
  worldToScreen(x: number, y: number): { x: number; y: number } {
    const point = [x, y, 1];
    const result = multiply(this.getViewMatrix(), point) as any;
    const coords = result.valueOf();
    return { x: coords[0], y: coords[1] };
  }

  // Transform screen coordinates to world coordinates
  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    const point = [screenX, screenY, 1];
    const result = multiply(this.getInverseViewMatrix(), point) as any;
    const coords = result.valueOf();
    return { x: coords[0], y: coords[1] };
  }

  // Get visible world bounds
  getVisibleBounds(canvasWidth: number, canvasHeight: number): {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  } {
    const topLeft = this.screenToWorld(0, 0);
    const bottomRight = this.screenToWorld(canvasWidth, canvasHeight);

    return {
      minX: Math.min(topLeft.x, bottomRight.x),
      maxX: Math.max(topLeft.x, bottomRight.x),
      minY: Math.min(topLeft.y, bottomRight.y),
      maxY: Math.max(topLeft.y, bottomRight.y),
    };
  }
}
