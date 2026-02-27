import * as PIXI from 'pixi.js';
import type { Camera } from '../utils/Camera';

export class GridLayer {
  private camera: Camera;
  private graphics: PIXI.Graphics;

  constructor(container: PIXI.Container, camera: Camera) {
    this.camera = camera;
    this.graphics = new PIXI.Graphics();
    container.addChild(this.graphics);
  }

  sync() {
    this.graphics.clear();

    const bounds = this.camera.getVisibleBounds();
    const minGridX = Math.floor(bounds.minX);
    const maxGridX = Math.ceil(bounds.maxX);
    const minGridY = Math.floor(bounds.minY);
    const maxGridY = Math.ceil(bounds.maxY);
    const scale = this.camera.getScale();

    for (let x = minGridX; x <= maxGridX; x++) {
      const isMajor = x === 0;
      const isEmphasis = x !== 0 && x % 5 === 0;
      const style = this.getLineStyle(isMajor, isEmphasis);

      this.graphics.setStrokeStyle({
        width: style.width / scale,
        color: style.color,
        alpha: style.alpha,
      });

      this.graphics.moveTo(x, bounds.minY);
      this.graphics.lineTo(x, bounds.maxY);
      this.graphics.stroke();
    }

    for (let y = minGridY; y <= maxGridY; y++) {
      const isMajor = y === 0;
      const isEmphasis = y !== 0 && y % 5 === 0;
      const style = this.getLineStyle(isMajor, isEmphasis);

      this.graphics.setStrokeStyle({
        width: style.width / scale,
        color: style.color,
        alpha: style.alpha,
      });

      this.graphics.moveTo(bounds.minX, y);
      this.graphics.lineTo(bounds.maxX, y);
      this.graphics.stroke();
    }
  }

  private getLineStyle(isMajor: boolean, isEmphasis: boolean) {
    if (isMajor) {
      return { color: 0x888888, width: 2, alpha: 1 };
    }
    if (isEmphasis) {
      return { color: 0x444444, width: 1, alpha: 0.6 };
    }
    return { color: 0x2a2a2a, width: 1, alpha: 0.3 };
  }
}
