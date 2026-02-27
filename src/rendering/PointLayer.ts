import * as PIXI from 'pixi.js';
import type { Camera } from '../utils/Camera';
import { Transform } from '../utils/Transform';
import { distanceSqVec2 } from '../utils/vec2';
import type { PointEntity } from '../domain/entities/PointEntity';
import type { RenderContext } from './RenderContext';

export interface Point {
  id: string;
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
  private selectedIds: Set<string> = new Set();
  private lastContext: RenderContext | null = null;

  constructor(layer: PIXI.Container, camera: Camera) {
    this.layer = layer;
    this.camera = camera;
  }

  updatePointDisplay(point: Point, scale: number) {
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

  updatePointVisuals(point: Point, ctx: RenderContext) {
    if (!point.graphics || !point.text) return;
    const scale = ctx.scale;
    const isHovered = this.hoveredLabel === point.label;
    const isSelected = this.selectedIds.has(point.id);
    const radius = ctx.styles.entities.point.radius / scale;
    const glowRadius = 12 / scale;
    const labelOffset = 12 / scale;

    point.graphics.clear();
    if (isSelected) {
      point.graphics.circle(0, 0, glowRadius * 1.2);
      point.graphics.fill({
        color: ctx.styles.entities.point.selectedGlowColor,
        alpha: ctx.styles.entities.point.selectedGlowAlpha,
      });
    } else if (isHovered) {
      point.graphics.circle(0, 0, glowRadius);
      point.graphics.fill({ color: 0xffd27a, alpha: 0.2 });
      point.graphics.circle(0, 0, glowRadius * 0.7);
      point.graphics.fill({ color: 0xffd27a, alpha: 0.35 });
    }
    point.graphics.circle(0, 0, radius);
    point.graphics.fill({
      color: isSelected
        ? ctx.styles.entities.point.selectedColor
        : isHovered
          ? ctx.styles.entities.point.hoverColor
          : ctx.styles.entities.point.color,
    });

    point.text.scale.set(1 / scale, -1 / scale);
    point.text.x = point.x + labelOffset;
    point.text.y = point.y - labelOffset;
  }

  movePoint(label: string, x: number, y: number) {
    const point = this.points.get(label);
    if (!point) return;
    point.x = x;
    point.y = y;
    point.transform.setPosition(x, y);
    if (this.lastContext) {
      this.updatePointDisplay(point, this.lastContext.scale);
      this.updatePointVisuals(point, this.lastContext);
    }
  }

  updateAllVisuals(ctx: RenderContext) {
    this.lastContext = ctx;
    for (const point of this.points.values()) {
      this.updatePointVisuals(point, ctx);
    }
  }

  setSelectedIds(ids: string[]) {
    const next = new Set(ids);
    if (this.selectedIds.size === next.size && Array.from(this.selectedIds).every((id) => next.has(id))) {
      return;
    }
    this.selectedIds = next;
    if (!this.lastContext) return;
    for (const point of this.points.values()) {
      this.updatePointVisuals(point, this.lastContext);
    }
  }

  setHoveredPoint(label: string | null) {
    if (this.hoveredLabel === label) return;
    const previous = this.hoveredLabel;
    this.hoveredLabel = label;
    if (!this.lastContext) return;
    if (previous) {
      const point = this.points.get(previous);
      if (point) this.updatePointVisuals(point, this.lastContext);
    }
    if (label) {
      const point = this.points.get(label);
      if (point) this.updatePointVisuals(point, this.lastContext);
    }
  }

  getPointAt(worldX: number, worldY: number) {
    const tolerance = 8 / this.camera.getScale();
    const toleranceSq = tolerance * tolerance;
    let closest: Point | null = null;
    let closestDist = Infinity;

    for (const point of this.points.values()) {
      const dist = distanceSqVec2({ x: worldX, y: worldY }, { x: point.x, y: point.y });
      if (dist <= toleranceSq && dist < closestDist) {
        closest = point;
        closestDist = dist;
      }
    }

    return closest;
  }

  getPointById(id: string) {
    for (const point of this.points.values()) {
      if (point.id === id) {
        return point;
      }
    }
    return null;
  }

  movePointById(id: string, x: number, y: number) {
    const point = this.getPointById(id);
    if (!point) return;
    point.x = x;
    point.y = y;
    point.transform.setPosition(x, y);
    if (this.lastContext) {
      this.updatePointDisplay(point, this.lastContext.scale);
      this.updatePointVisuals(point, this.lastContext);
    }
  }

  sync(points: PointEntity[], ctx: RenderContext) {
    this.lastContext = ctx;
    const seen = new Set<string>();

    for (const entity of points) {
      const label = entity.name;
      seen.add(label);
      const x = entity.x;
      const y = entity.y;

      let point = this.points.get(label);
      if (!point) {
        const transform = new Transform(x, y);
        point = { id: entity.id, label, x, y, transform };

        const graphics = new PIXI.Graphics();
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
        this.layer.addChild(text);
        point.text = text;

        this.points.set(label, point);
      } else {
        point.id = entity.id;
        point.x = x;
        point.y = y;
        point.transform.setPosition(x, y);
      }

      this.updatePointDisplay(point, ctx.scale);
      this.updatePointVisuals(point, ctx);
    }

    for (const [label, point] of this.points.entries()) {
      if (!seen.has(label)) {
        if (this.hoveredLabel === label) {
          this.hoveredLabel = null;
        }
        this.selectedIds.delete(point.id);
        if (point.graphics) {
          this.layer.removeChild(point.graphics);
        }
        if (point.text) {
          this.layer.removeChild(point.text);
        }
        this.points.delete(label);
      }
    }
  }

  clear() {
    for (const point of this.points.values()) {
      if (point.graphics) {
        this.layer.removeChild(point.graphics);
      }
      if (point.text) {
        this.layer.removeChild(point.text);
      }
    }
    this.points.clear();
    this.selectedIds.clear();
  }

  getAllPoints() {
    return Array.from(this.points.values());
  }
}
