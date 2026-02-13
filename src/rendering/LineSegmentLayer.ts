import * as PIXI from 'pixi.js';
import type { Camera } from '../utils/Camera';
import type { LineSegmentEntity } from '../domain/entities/LineSegmentEntity';
import type { RenderContext } from './RenderContext';

export interface LineSegmentRenderModel {
  id: string;
  name: string;
  startId: string;
  endId: string;
  start: { x: number; y: number };
  end: { x: number; y: number };
  graphics?: PIXI.Graphics;
}

export class LineSegmentLayer {
  private lines: Map<string, LineSegmentRenderModel> = new Map();
  private layer: PIXI.Container;
  private camera: Camera;
  private style: RenderContext['styles']['entities']['segment'] | null = null;
  private selectedIds: Set<string> = new Set();

  constructor(layer: PIXI.Container, camera: Camera) {
    this.layer = layer;
    this.camera = camera;
  }

  sync(lines: LineSegmentEntity[], ctx: RenderContext) {
    this.style = ctx.styles.entities.segment;
    const seen = new Set<string>();

    for (const entity of lines) {
      const name = entity.name;
      seen.add(name);
      const startX = entity.start.x;
      const startY = entity.start.y;
      const endX = entity.end.x;
      const endY = entity.end.y;

      let line = this.lines.get(name);
      if (!line) {
        line = {
          id: entity.id,
          name,
          startId: entity.start.id,
          endId: entity.end.id,
          start: { x: startX, y: startY },
          end: { x: endX, y: endY },
        };

        const graphics = new PIXI.Graphics();
        line.graphics = graphics;
        this.layer.addChild(graphics);
        this.lines.set(name, line);
      } else {
        line.id = entity.id;
        line.startId = entity.start.id;
        line.endId = entity.end.id;
        line.start.x = startX;
        line.start.y = startY;
        line.end.x = endX;
        line.end.y = endY;
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

  updateLineVisuals(line: LineSegmentRenderModel) {
    if (!line.graphics) return;
    const isSelected = this.selectedIds.has(line.id);
    const scale = this.camera.getScale();
    const baseWidth = (this.style?.width ?? 2) / scale;
    const baseColor = this.style?.color ?? 0xffffff;
    const baseAlpha = this.style?.alpha ?? 0.9;
    const accentWidth = (this.style?.accentWidth ?? 1.2) / scale;
    const accentColor = this.style?.accentColor ?? baseColor;
    const accentAlpha = this.style?.accentAlpha ?? 1;
    const endpointRadius = (this.style?.endpointRadius ?? 2.5) / scale;
    const endpointColor = this.style?.endpointColor ?? accentColor;
    const endpointAlpha = this.style?.endpointAlpha ?? accentAlpha;
    const selectedWidth = (this.style?.selectedWidth ?? 4.8) / scale;
    const selectedColor = this.style?.selectedColor ?? accentColor;
    const selectedAlpha = this.style?.selectedAlpha ?? 0.98;
    const selectedEndpointColor = this.style?.selectedEndpointColor ?? endpointColor;
    const selectedEndpointAlpha = this.style?.selectedEndpointAlpha ?? selectedAlpha;

    line.graphics.clear();
    line.graphics.setStrokeStyle({ width: baseWidth, color: baseColor, alpha: baseAlpha });
    line.graphics.moveTo(line.start.x, line.start.y);
    line.graphics.lineTo(line.end.x, line.end.y);
    line.graphics.stroke();

    line.graphics.setStrokeStyle({ width: accentWidth, color: accentColor, alpha: accentAlpha });
    line.graphics.moveTo(line.start.x, line.start.y);
    line.graphics.lineTo(line.end.x, line.end.y);
    line.graphics.stroke();

    line.graphics.setStrokeStyle({ width: accentWidth, color: endpointColor, alpha: endpointAlpha });
    line.graphics.circle(line.start.x, line.start.y, endpointRadius);
    line.graphics.circle(line.end.x, line.end.y, endpointRadius);
    line.graphics.stroke();

    if (isSelected) {
      line.graphics.setStrokeStyle({ width: selectedWidth, color: selectedColor, alpha: selectedAlpha });
      line.graphics.moveTo(line.start.x, line.start.y);
      line.graphics.lineTo(line.end.x, line.end.y);
      line.graphics.stroke();

      line.graphics.setStrokeStyle({
        width: accentWidth,
        color: selectedEndpointColor,
        alpha: selectedEndpointAlpha,
      });
      line.graphics.circle(line.start.x, line.start.y, endpointRadius * 1.2);
      line.graphics.circle(line.end.x, line.end.y, endpointRadius * 1.2);
      line.graphics.stroke();
    }
  }

  updateAllVisuals(ctx: RenderContext) {
    this.style = ctx.styles.entities.segment;
    for (const line of this.lines.values()) {
      this.updateLineVisuals(line);
    }
  }

  setSelectedIds(ids: string[]) {
    const next = new Set(ids);
    if (this.selectedIds.size === next.size && Array.from(this.selectedIds).every((id) => next.has(id))) {
      return;
    }
    this.selectedIds = next;
    for (const line of this.lines.values()) {
      this.updateLineVisuals(line);
    }
  }

  getLineSegmentById(id: string) {
    for (const line of this.lines.values()) {
      if (line.id === id) {
        return line;
      }
    }
    return null;
  }

  getLineSegmentAt(worldX: number, worldY: number) {
    const tolerance = 8 / this.camera.getScale();
    const toleranceSq = tolerance * tolerance;
    let closest: LineSegmentRenderModel | null = null;
    let closestDistanceSq = Infinity;

    for (const segment of this.lines.values()) {
      const distSq = this.distanceSqToSegment(worldX, worldY, segment.start, segment.end);
      if (distSq <= toleranceSq && distSq < closestDistanceSq) {
        closest = segment;
        closestDistanceSq = distSq;
      }
    }

    return closest;
  }

  private distanceSqToSegment(
    px: number,
    py: number,
    start: { x: number; y: number },
    end: { x: number; y: number }
  ) {
    const vx = end.x - start.x;
    const vy = end.y - start.y;
    const lenSq = vx * vx + vy * vy;
    if (lenSq < 1e-9) {
      const dx = px - start.x;
      const dy = py - start.y;
      return dx * dx + dy * dy;
    }
    const t = Math.max(0, Math.min(1, ((px - start.x) * vx + (py - start.y) * vy) / lenSq));
    const closestX = start.x + t * vx;
    const closestY = start.y + t * vy;
    const dx = px - closestX;
    const dy = py - closestY;
    return dx * dx + dy * dy;
  }

  clear() {
    for (const line of this.lines.values()) {
      if (line.graphics) {
        this.layer.removeChild(line.graphics);
      }
    }
    this.lines.clear();
    this.selectedIds.clear();
  }
}
