// Entity Transform - Local to World transformation
import { multiply } from 'mathjs';

export class Transform {
  position: { x: number; y: number } = { x: 0, y: 0 };
  scale: { x: number; y: number } = { x: 1, y: 1 };
  rotation: number = 0; // in radians

  private matrix: any = null;
  private dirty: boolean = true;

  constructor(x: number = 0, y: number = 0) {
    this.position = { x, y };
    this.updateMatrix();
  }

  setPosition(x: number, y: number): void {
    this.position = { x, y };
    this.dirty = true;
  }

  setScale(x: number, y: number): void {
    this.scale = { x, y };
    this.dirty = true;
  }

  setRotation(angle: number): void {
    this.rotation = angle;
    this.dirty = true;
  }

  private updateMatrix(): void {
    // T * R * S composition (translate * rotate * scale)
    const cos = Math.cos(this.rotation);
    const sin = Math.sin(this.rotation);

    // Translation matrix
    const T = [
      [1, 0, this.position.x],
      [0, 1, this.position.y],
      [0, 0, 1],
    ];

    // Rotation matrix
    const R = [
      [cos, -sin, 0],
      [sin, cos, 0],
      [0, 0, 1],
    ];

    // Scale matrix
    const S = [
      [this.scale.x, 0, 0],
      [0, this.scale.y, 0],
      [0, 0, 1],
    ];

    this.matrix = multiply(multiply(T, R), S);
    this.dirty = false;
  }

  getMatrix(): any {
    if (this.dirty) {
      this.updateMatrix();
    }
    return this.matrix;
  }

  transformPoint(x: number, y: number): { x: number; y: number } {
    const point = [x, y, 1];
    const result = multiply(this.getMatrix(), point) as any;
    const coords = result.valueOf();
    return { x: coords[0], y: coords[1] };
  }
}
