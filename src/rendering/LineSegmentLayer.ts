import * as PIXI from 'pixi.js';
import type { Camera } from '../utils/Camera';
import type { LineSegmentEntity } from '../domain/entities/LineSegmentEntity';
import type { RenderContext } from './RenderContext';

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
  private style: RenderContext['styles']['entities']['segment'] | null = null;

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
          name,
          start: { x: startX, y: startY },
          end: { x: endX, y: endY },
        };

        const graphics = new PIXI.Graphics();
        line.graphics = graphics;
        this.layer.addChild(graphics);
        this.lines.set(name, line);
      } else {
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
  }

  updateAllVisuals(ctx: RenderContext) {
    this.style = ctx.styles.entities.segment;
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
