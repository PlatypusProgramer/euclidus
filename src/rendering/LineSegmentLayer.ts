import * as PIXI from 'pixi.js';
import type { Camera } from '../utils/Camera';

export interface LineSegmentRenderModel {
  name: string;
  start: { x: number; y: number };
  end: { x: number; y: number };
  graphics?: PIXI.Graphics;
}

export class LineSegmentLayer {
  private lines: Map<string, LineSegmentRenderModel> = new Map();
  private layer: PIXI.Container;
  private camera: Camera;

  constructor(layer: PIXI.Container, camera: Camera) {
    this.layer = layer;
    this.camera = camera;
  }

  addLine(name: string, startX: number, startY: number, endX: number, endY: number) {
    if (this.lines.has(name)) {
      this.removeLine(name);
    }

    const line: LineSegmentRenderModel = {
      name,
      start: { x: startX, y: startY },
      end: { x: endX, y: endY },
    };

    const graphics = new PIXI.Graphics();
    line.graphics = graphics;
    this.layer.addChild(graphics);
    this.lines.set(name, line);
    this.updateLineVisuals(line);
  }

  updateLine(name: string, startX: number, startY: number, endX: number, endY: number) {
    const line = this.lines.get(name);
    if (!line) return;
    line.start.x = startX;
    line.start.y = startY;
    line.end.x = endX;
    line.end.y = endY;
    this.updateLineVisuals(line);
  }

  updateLineVisuals(line: LineSegmentRenderModel) {
    if (!line.graphics) return;
    const scale = this.camera.getScale();
    const strokeWidth = 2 / scale;

    line.graphics.clear();
    line.graphics.setStrokeStyle({ width: strokeWidth, color: 0xffffff, alpha: 0.9 });
    line.graphics.moveTo(line.start.x, line.start.y);
    line.graphics.lineTo(line.end.x, line.end.y);
    line.graphics.stroke();
  }

  updateAllVisuals() {
    for (const line of this.lines.values()) {
      this.updateLineVisuals(line);
    }
  }

  removeLine(name: string) {
    const line = this.lines.get(name);
    if (!line) return;
    if (line.graphics) {
      this.layer.removeChild(line.graphics);
    }
    this.lines.delete(name);
  }
}
