import * as PIXI from 'pixi.js';
import type { Camera } from '../utils/Camera';
import type { LineEntity } from '../domain/entities/LineEntity';
import type { RenderContext } from './RenderContext';

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
  private style: RenderContext['styles']['entities']['line'] | null = null;

  constructor(layer: PIXI.Container, camera: Camera) {
    this.layer = layer;
    this.camera = camera;
  }

  sync(lines: LineEntity[], ctx: RenderContext) {
    this.style = ctx.styles.entities.line;
    const seen = new Set<string>();

    for (const entity of lines) {
      const name = entity.name;
      seen.add(name);
      const rootX = entity.root.x;
      const rootY = entity.root.y;
      const directionX = entity.direction.x;
      const directionY = entity.direction.y;

      let line = this.lines.get(name);
      if (!line) {
        line = {
          name,
          root: { x: rootX, y: rootY },
          direction: { x: directionX, y: directionY },
        };
        const graphics = new PIXI.Graphics();
        line.graphics = graphics;
        this.layer.addChild(graphics);
        this.lines.set(name, line);
      } else {
        line.root.x = rootX;
        line.root.y = rootY;
        line.direction.x = directionX;
        line.direction.y = directionY;
      }

      this.updateLineVisuals(line);
    }

    for (const [name, line] of this.lines.entries()) {
      if (!seen.has(name)) {
        if (line.graphics) {
          this.layer.removeChild(line.graphics);
        }
        this.lines.delete(name);
      }
    }
  }

  updateLineVisuals(line: LineRenderModel) {
    if (!line.graphics) return;

    const segment = this.getSegmentForBounds(line, this.camera.getVisibleBounds());

    line.graphics.clear();
    if (!segment) {
      return;
    }

    const scale = this.camera.getScale();
    const baseWidth = (this.style?.width ?? 1.35) / scale;
    const baseColor = this.style?.color ?? 0xffffff;
    const baseAlpha = this.style?.alpha ?? 0.85;
    const accentWidth = (this.style?.accentWidth ?? 2.9) / scale;
    const accentColor = this.style?.accentColor ?? baseColor;
    const accentAlpha = this.style?.accentAlpha ?? 0.95;

    // Draw thinner salmon extensions for the infinite portions of the line.
    line.graphics.setStrokeStyle({ width: baseWidth, color: baseColor, alpha: baseAlpha });
    const lowerExtensionEndT = Math.min(segment.maxT, 0);
    if (segment.minT < lowerExtensionEndT) {
      const start = this.pointAt(line, segment.minT);
      const end = this.pointAt(line, lowerExtensionEndT);
      line.graphics.moveTo(start.x, start.y);
      line.graphics.lineTo(end.x, end.y);
    }
    const upperExtensionStartT = Math.max(segment.minT, 1);
    if (upperExtensionStartT < segment.maxT) {
      const start = this.pointAt(line, upperExtensionStartT);
      const end = this.pointAt(line, segment.maxT);
      line.graphics.moveTo(start.x, start.y);
      line.graphics.lineTo(end.x, end.y);
    }
    line.graphics.stroke();

    // Draw solid orange segment between the two reference points (t=0..1).
    const segmentStartT = Math.max(segment.minT, 0);
    const segmentEndT = Math.min(segment.maxT, 1);
    if (segmentStartT < segmentEndT) {
      const start = this.pointAt(line, segmentStartT);
      const end = this.pointAt(line, segmentEndT);
      line.graphics.setStrokeStyle({ width: accentWidth, color: accentColor, alpha: accentAlpha });
      line.graphics.moveTo(start.x, start.y);
      line.graphics.lineTo(end.x, end.y);
      line.graphics.stroke();
    }
  }

  private pointAt(line: LineRenderModel, t: number) {
    return {
      x: line.root.x + line.direction.x * t,
      y: line.root.y + line.direction.y * t,
    };
  }

  private getSegmentForBounds(line: LineRenderModel, bounds: Bounds) {
    const { x: x0, y: y0 } = line.root;
    const { x: dx, y: dy } = line.direction;
    const epsilon = 1e-9;

    if (Math.abs(dx) < epsilon && Math.abs(dy) < epsilon) {
      return null;
    }

    const samples: { t: number; point: { x: number; y: number } }[] = [];
    const within = (value: number, min: number, max: number) => value >= min - epsilon && value <= max + epsilon;

    if (Math.abs(dx) >= epsilon) {
      const tMinX = (bounds.minX - x0) / dx;
      const yAtMinX = y0 + tMinX * dy;
      if (within(yAtMinX, bounds.minY, bounds.maxY)) {
        samples.push({ t: tMinX, point: { x: bounds.minX, y: yAtMinX } });
      }

      const tMaxX = (bounds.maxX - x0) / dx;
      const yAtMaxX = y0 + tMaxX * dy;
      if (within(yAtMaxX, bounds.minY, bounds.maxY)) {
        samples.push({ t: tMaxX, point: { x: bounds.maxX, y: yAtMaxX } });
      }
    }

    if (Math.abs(dy) >= epsilon) {
      const tMinY = (bounds.minY - y0) / dy;
      const xAtMinY = x0 + tMinY * dx;
      if (within(xAtMinY, bounds.minX, bounds.maxX)) {
        samples.push({ t: tMinY, point: { x: xAtMinY, y: bounds.minY } });
      }

      const tMaxY = (bounds.maxY - y0) / dy;
      const xAtMaxY = x0 + tMaxY * dx;
      if (within(xAtMaxY, bounds.minX, bounds.maxX)) {
        samples.push({ t: tMaxY, point: { x: xAtMaxY, y: bounds.maxY } });
      }
    }

    const unique = this.dedupeSamples(samples, epsilon);
    if (unique.length < 2) {
      return null;
    }

    let min = unique[0];
    let max = unique[0];
    for (let i = 1; i < unique.length; i += 1) {
      if (unique[i].t < min.t) min = unique[i];
      if (unique[i].t > max.t) max = unique[i];
    }
    return { start: min.point, end: max.point, minT: min.t, maxT: max.t };
  }

  private dedupeSamples(samples: { t: number; point: { x: number; y: number } }[], epsilon: number) {
    const unique: { t: number; point: { x: number; y: number } }[] = [];
    for (const sample of samples) {
      if (
        !unique.some(
          (candidate) =>
            Math.abs(candidate.point.x - sample.point.x) < epsilon &&
            Math.abs(candidate.point.y - sample.point.y) < epsilon
        )
      ) {
        unique.push(sample);
      }
    }
    return unique;
  }

  updateAllVisuals(ctx: RenderContext) {
    this.style = ctx.styles.entities.line;
    for (const line of this.lines.values()) {
      this.updateLineVisuals(line);
    }
  }

  clear() {
    for (const line of this.lines.values()) {
      if (line.graphics) {
        this.layer.removeChild(line.graphics);
      }
    }
    this.lines.clear();
  }

}
