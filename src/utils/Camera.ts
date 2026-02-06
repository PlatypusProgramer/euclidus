// Camera - World to Screen transformation with pan and zoom
import { multiply, inv } from 'mathjs';

export class Camera {
  private panX: number = 0; // World units
  private panY: number = 0; // World units
  private zoom: number = 1; // Scaling factor (zoom level)
  private gridSize: number = 25; // Pixels per world unit

  private viewMatrix: any = null;
  private inverseViewMatrix: any = null;
  private dirty: boolean = true;

  constructor(gridSize: number = 25) {
    this.gridSize = gridSize;
    this.updateViewMatrix();
  }

  setPan(x: number, y: number): void {
    this.panX = x;
    this.panY = y;
    this.dirty = true;
  }

  getPan(): { x: number; y: number } {
    return { x: this.panX, y: this.panY };
  }

  setGridSize(gridSize: number): void {
    this.gridSize = gridSize;
    this.dirty = true;
  }

  getGridSize(): number {
    return this.gridSize;
  }

  setZoom(zoom: number): void {
    this.zoom = Math.max(0.1, zoom); // Prevent zero/negative zoom
    this.dirty = true;
  }

  getZoom(): number {
    return this.zoom;
  }

  private updateViewMatrix(): void {
    // View matrix: translate by -pan, then scale by zoom*gridSize
    const scale = this.gridSize * this.zoom;

    // Translation matrix (move pan point to origin)
    const translation = [
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

    // Multiply: translation * scaling
    this.viewMatrix = multiply(translation, scaling);
    this.inverseViewMatrix = null; // Will be calculated on demand
    this.dirty = false;
  }

  getViewMatrix(): any {
    if (this.dirty) {
      this.updateViewMatrix();
    }
    return this.viewMatrix;
  }

  private getInverseViewMatrix(): any {
    if (!this.inverseViewMatrix) {
      this.inverseViewMatrix = inv(this.getViewMatrix());
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
