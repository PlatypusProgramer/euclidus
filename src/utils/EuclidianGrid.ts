// Grid utility for managing Euclidean space visualization
import * as PIXI from 'pixi.js';
import { Camera } from './Camera';

export class EuclidianGrid {
  camera: Camera;
  graphics?: PIXI.Graphics;
  
  constructor(camera: Camera) {
    this.camera = camera;
  }
  
  draw(stage: PIXI.Container, canvas: HTMLCanvasElement): PIXI.Graphics {
    if (!this.graphics) {
      this.graphics = new PIXI.Graphics();
      stage.addChild(this.graphics);
    } else {
      this.graphics.clear();
    }
    
    // Update camera with canvas dimensions
    this.camera.setCanvasSize(canvas.width, canvas.height);
    
    // Get visible world bounds from camera
    const bounds = this.camera.getVisibleBounds(canvas.width, canvas.height);
    
    // Draw grid lines
    const minGridX = Math.floor(bounds.minX);
    const maxGridX = Math.ceil(bounds.maxX);

    const minGridY = Math.floor(bounds.minY);
    const maxGridY = Math.ceil(bounds.maxY);
    
    // Vertical lines (parallel to Y-axis)
    for (let x = minGridX; x <= maxGridX; x++) {
      const isMajor = x === 0;
      const isEmphasis = x !== 0 && x % 5 === 0;
      const style = this.getLineStyle(isMajor, isEmphasis);
      
      this.graphics.setStrokeStyle({ width: style.width, color: style.color, alpha: style.alpha });
      
      this.graphics.moveTo(x, bounds.minY);
      this.graphics.lineTo(x, bounds.maxY);
      this.graphics.stroke();
    }
    
    // Horizontal lines (parallel to X-axis)
    for (let y = minGridY; y <= maxGridY; y++) {
      const isMajor = y === 0;
      const isEmphasis = y !== 0 && y % 5 === 0;
      const style = this.getLineStyle(isMajor, isEmphasis);
      
      this.graphics.setStrokeStyle({ width: style.width, color: style.color, alpha: style.alpha });
      
      this.graphics.moveTo(bounds.minX, y);
      this.graphics.lineTo(bounds.maxX, y);
      this.graphics.stroke();
    }
    
    return this.graphics;
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
