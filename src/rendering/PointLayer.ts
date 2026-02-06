import * as PIXI from 'pixi.js';
import type { Camera } from '../utils/Camera';
import { Transform } from '../utils/Transform';

export interface Point {
  label: string;
  x: number;
  y: number;
  transform: Transform;
  graphics?: PIXI.Graphics;
  text?: PIXI.Text;
}

export class PointLayer {
  private points: Map<string, Point> = new Map();
  private layer: PIXI.Container;
  private camera: Camera;

  constructor(layer: PIXI.Container, camera: Camera) {
    this.layer = layer;
    this.camera = camera;
  }

  updatePointDisplay(point: Point) {
    if (point.graphics) {
      point.graphics.position.x = point.x;
      point.graphics.position.y = point.y;
    }

    if (point.text) {
      point.text.x = point.x + 12;
      point.text.y = point.y - 12;
    }
  }

  updatePointVisuals(point: Point) {
    if (!point.graphics || !point.text) return;
    const scale = this.camera.getScale();
    const radius = 6 / scale;
    const labelOffset = 12 / scale;

    point.graphics.clear();
    point.graphics.circle(0, 0, radius);
    point.graphics.fill({ color: 0xff8c00 });

    point.text.scale.set(1 / scale, -1 / scale);
    point.text.x = point.x + labelOffset;
    point.text.y = point.y - labelOffset;
  }

  updateAllVisuals() {
    for (const point of this.points.values()) {
      this.updatePointVisuals(point);
    }
  }

  addPoint(label: string, x: number, y: number) {
    if (this.points.has(label)) {
      this.removePoint(label);
    }

    const transform = new Transform(x, y);
    const point: Point = { label, x, y, transform };

    const graphics = new PIXI.Graphics();
    const scale = this.camera.getScale();
    graphics.circle(0, 0, 6 / scale);
    graphics.fill({ color: 0xff8c00 });
    graphics.position.x = x;
    graphics.position.y = y;
    this.layer.addChild(graphics);
    point.graphics = graphics;

    const text = new PIXI.Text({
      text: label,
      style: {
        fontSize: 16,
        fill: 0xffffff,
        fontWeight: 'bold',
      },
    });
    text.scale.set(1 / scale, -1 / scale);
    text.x = x + 12 / scale;
    text.y = y - 12 / scale;
    this.layer.addChild(text);
    point.text = text;

    this.points.set(label, point);
    console.log(`Added point ${label} at (${x}, ${y})`);
  }

  removePoint(label: string) {
    const point = this.points.get(label);
    if (!point) return;
    if (point.graphics) {
      this.layer.removeChild(point.graphics);
    }
    if (point.text) {
      this.layer.removeChild(point.text);
    }
    this.points.delete(label);
  }

  getAllPoints() {
    return Array.from(this.points.values());
  }
}
