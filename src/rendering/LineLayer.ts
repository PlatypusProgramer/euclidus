import * as PIXI from 'pixi.js';
import type { Camera } from '../utils/Camera';

export interface LineRenderModel {
  name: string;
  root: { x: number; y: number };
  direction: { x: number; y: number };
  graphics?: PIXI.Graphics;
}

type Bounds = { minX: number; maxX: number; minY: number; maxY: number };

export class LineLayer {
  private lines: Map<string, LineRenderModel> = new Map();
  private layer: PIXI.Container;
  private camera: Camera;

  constructor(layer: PIXI.Container, camera: Camera) {
    this.layer = layer;
    this.camera = camera;
  }

  addLine(name: string, rootX: number, rootY: number, directionX: number, directionY: number) {
    if (this.lines.has(name)) {
      this.removeLine(name);
    }

    const line: LineRenderModel = {
      name,
      root: { x: rootX, y: rootY },
      direction: { x: directionX, y: directionY },
    };

    const graphics = new PIXI.Graphics();
    line.graphics = graphics;
    this.layer.addChild(graphics);
    this.lines.set(name, line);
    this.updateLineVisuals(line);
  }

  updateLine(name: string, rootX: number, rootY: number, directionX: number, directionY: number) {
    const line = this.lines.get(name);
    if (!line) return;
    line.root.x = rootX;
    line.root.y = rootY;
    line.direction.x = directionX;
    line.direction.y = directionY;
    this.updateLineVisuals(line);
  }

  updateLineVisuals(line: LineRenderModel) {
    if (!line.graphics) return;

    const segment = this.getSegmentForBounds(line, this.camera.getVisibleBounds());

    line.graphics.clear();
    if (!segment) {
      return;
    }

    const scale = this.camera.getScale();
    const strokeWidth = 2 / scale;

    line.graphics.setStrokeStyle({ width: strokeWidth, color: 0xffffff, alpha: 0.7 });
    line.graphics.moveTo(segment.start.x, segment.start.y);
    line.graphics.lineTo(segment.end.x, segment.end.y);
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

  private getSegmentForBounds(line: LineRenderModel, bounds: Bounds) {
    const { x: x0, y: y0 } = line.root;
    const { x: dx, y: dy } = line.direction;
    const epsilon = 1e-9;

    if (Math.abs(dx) < epsilon && Math.abs(dy) < epsilon) {
      return null;
    }

    const points: { x: number; y: number }[] = [];
    const within = (value: number, min: number, max: number) => value >= min - epsilon && value <= max + epsilon;

    if (Math.abs(dx) >= epsilon) {
      const tMinX = (bounds.minX - x0) / dx;
      const yAtMinX = y0 + tMinX * dy;
      if (within(yAtMinX, bounds.minY, bounds.maxY)) {
        points.push({ x: bounds.minX, y: yAtMinX });
      }

      const tMaxX = (bounds.maxX - x0) / dx;
      const yAtMaxX = y0 + tMaxX * dy;
      if (within(yAtMaxX, bounds.minY, bounds.maxY)) {
        points.push({ x: bounds.maxX, y: yAtMaxX });
      }
    }

    if (Math.abs(dy) >= epsilon) {
      const tMinY = (bounds.minY - y0) / dy;
      const xAtMinY = x0 + tMinY * dx;
      if (within(xAtMinY, bounds.minX, bounds.maxX)) {
        points.push({ x: xAtMinY, y: bounds.minY });
      }

      const tMaxY = (bounds.maxY - y0) / dy;
      const xAtMaxY = x0 + tMaxY * dx;
      if (within(xAtMaxY, bounds.minX, bounds.maxX)) {
        points.push({ x: xAtMaxY, y: bounds.maxY });
      }
    }

    const unique = this.dedupePoints(points, epsilon);
    if (unique.length < 2) {
      return null;
    }

    const [start, end] = this.pickFarthestPair(unique);
    return { start, end };
  }

  private dedupePoints(points: { x: number; y: number }[], epsilon: number) {
    const unique: { x: number; y: number }[] = [];
    for (const point of points) {
      if (!unique.some((candidate) => Math.abs(candidate.x - point.x) < epsilon && Math.abs(candidate.y - point.y) < epsilon)) {
        unique.push(point);
      }
    }
    return unique;
  }

  private pickFarthestPair(points: { x: number; y: number }[]) {
    let maxDistance = -1;
    let best: [{ x: number; y: number }, { x: number; y: number }] = [points[0], points[1] ?? points[0]];
    for (let i = 0; i < points.length; i += 1) {
      for (let j = i + 1; j < points.length; j += 1) {
        const dx = points[i].x - points[j].x;
        const dy = points[i].y - points[j].y;
        const distance = dx * dx + dy * dy;
        if (distance > maxDistance) {
          maxDistance = distance;
          best = [points[i], points[j]];
        }
      }
    }
    return best;
  }
}
