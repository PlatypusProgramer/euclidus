// Grid utility for managing Euclidean space visualization
import * as PIXI from 'pixi.js';
import { Camera } from './Camera';

export class Grid {
  camera: Camera;
  graphics?: PIXI.Graphics;
  
  constructor(camera: Camera) {
    this.camera = camera;
  }
  
  draw(stage: PIXI.Container, canvas: HTMLCanvasElement): PIXI.Graphics {
    // Remove old grid
    if (this.graphics) {
      stage.removeChild(this.graphics);
    }
    
    const majorInterval = 5; // every 5th line is emphasized
    const bounds = this.camera.getVisibleBounds(canvas.width, canvas.height);
    
    // Create grid graphics
    const grid = new PIXI.Graphics();
    
    // Canvas center is now at stage position, draw relative to that
    const centerX = 0;
    const centerY = 0;
    
    // Draw vertical lines
    for (let unitX = Math.floor(bounds.minX); unitX <= Math.ceil(bounds.maxX); unitX++) {
      const isMajor = unitX === 0;
      const isEmphasis = unitX !== 0 && Math.abs(unitX) % majorInterval === 0;
      
      const { color, width, alpha } = this.getLineStyle(isMajor, isEmphasis);
      
      const screenX = this.camera.worldToScreen(unitX, 0).x;
      const screenTopY = this.camera.worldToScreen(0, bounds.maxY).y;
      const screenBottomY = this.camera.worldToScreen(0, bounds.minY).y;
      
      grid.moveTo(screenX - centerX, screenTopY - centerY);
      grid.lineTo(screenX - centerX, screenBottomY - centerY);
      grid.stroke({ color, width, alpha });
    }
    
    // Draw horizontal lines
    for (let unitY = Math.floor(bounds.minY); unitY <= Math.ceil(bounds.maxY); unitY++) {
      const isMajor = unitY === 0;
      const isEmphasis = unitY !== 0 && Math.abs(unitY) % majorInterval === 0;
      
      const { color, width, alpha } = this.getLineStyle(isMajor, isEmphasis);
      
      const screenY = this.camera.worldToScreen(0, unitY).y;
      const screenLeftX = this.camera.worldToScreen(bounds.minX, 0).x;
      const screenRightX = this.camera.worldToScreen(bounds.maxX, 0).x;
      
      grid.moveTo(screenLeftX - centerX, screenY - centerY);
      grid.lineTo(screenRightX - centerX, screenY - centerY);
      grid.stroke({ color, width, alpha });
    }
    
    // Add grid as first child so it appears behind points
    stage.addChildAt(grid, 0);
    this.graphics = grid;
    
    return grid;
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
