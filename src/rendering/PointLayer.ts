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
  private hoveredLabel: string | null = null;

  constructor(layer: PIXI.Container, camera: Camera) {
    this.layer = layer;
    this.camera = camera;
  }

  updatePointDisplay(point: Point) {
    const scale = this.camera.getScale();
    const labelOffset = 12 / scale;

    if (point.graphics) {
      point.graphics.position.x = point.x;
      point.graphics.position.y = point.y;
    }

    if (point.text) {
      point.text.x = point.x + labelOffset;
      point.text.y = point.y - labelOffset;
    }
  }

  updatePointVisuals(point: Point) {
    if (!point.graphics || !point.text) return;
    const scale = this.camera.getScale();
    const isHovered = this.hoveredLabel === point.label;
    const radius = 6 / scale;
    const glowRadius = 12 / scale;
    const labelOffset = 12 / scale;

    point.graphics.clear();
    if (isHovered) {
      point.graphics.circle(0, 0, glowRadius);
      point.graphics.fill({ color: 0xffd27a, alpha: 0.2 });
      point.graphics.circle(0, 0, glowRadius * 0.7);
      point.graphics.fill({ color: 0xffd27a, alpha: 0.35 });
    }
    point.graphics.circle(0, 0, radius);
    point.graphics.fill({ color: isHovered ? 0xfff1c7 : 0xff8c00 });

    point.text.scale.set(1 / scale, -1 / scale);
    point.text.x = point.x + labelOffset;
    point.text.y = point.y - labelOffset;
  }

  updatePoint(label: string, x: number, y: number) {
    const point = this.points.get(label);
    if (!point) return;
    point.x = x;
    point.y = y;
    point.transform.setPosition(x, y);
    this.updatePointDisplay(point);
  }

  updateAllVisuals() {
    for (const point of this.points.values()) {
      this.updatePointVisuals(point);
    }
  }

  setHoveredPoint(label: string | null) {
    if (this.hoveredLabel === label) return;
    const previous = this.hoveredLabel;
    this.hoveredLabel = label;
    if (previous) {
      const point = this.points.get(previous);
      if (point) this.updatePointVisuals(point);
    }
    if (label) {
      const point = this.points.get(label);
      if (point) this.updatePointVisuals(point);
    }
  }

  getPointAt(worldX: number, worldY: number) {
    const tolerance = 8 / this.camera.getScale();
    const toleranceSq = tolerance * tolerance;
    let closest: Point | null = null;
    let closestDist = Infinity;

    for (const point of this.points.values()) {
      const dx = worldX - point.x;
      const dy = worldY - point.y;
      const dist = dx * dx + dy * dy;
      if (dist <= toleranceSq && dist < closestDist) {
        closest = point;
        closestDist = dist;
      }
    }

    return closest;
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
