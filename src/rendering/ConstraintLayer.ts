import * as PIXI from 'pixi.js';
import type { Constraint } from '../domain/constraints/Constraint';
import type { FixedPointConstraint } from '../domain/constraints/FixedPointConstraint';
import type { ParallelConstraint, ParallelSource } from '../domain/constraints/ParallelConstraint';
import type { PerpendicularConstraint, PerpendicularSource } from '../domain/constraints/PerpendicularConstraint';
import type { EqualLengthConstraint, EqualLengthSource } from '../domain/constraints/EqualLengthConstraint';
import type { RenderContext } from './RenderContext';

type Vec2 = { x: number; y: number };

export class ConstraintLayer {
  private graphicsById: Map<string, PIXI.Graphics> = new Map();
  private layer: PIXI.Container;

  constructor(layer: PIXI.Container) {
    this.layer = layer;
  }

  sync(constraints: Constraint[], ctx: RenderContext) {
    const seen = new Set<string>();

    for (const constraint of constraints) {
      if (!this.isRenderable(constraint)) {
        continue;
      }
      seen.add(constraint.id);
      let graphics = this.graphicsById.get(constraint.id);
      if (!graphics) {
        graphics = new PIXI.Graphics();
        this.layer.addChild(graphics);
        this.graphicsById.set(constraint.id, graphics);
      }
      this.drawConstraint(constraint, graphics, ctx);
    }

    for (const [id, graphics] of this.graphicsById.entries()) {
      if (!seen.has(id)) {
        this.layer.removeChild(graphics);
        this.graphicsById.delete(id);
      }
    }
  }

  updateAllVisuals(ctx: RenderContext) {
    this.sync(ctx.state.getConstraints(), ctx);
  }

  clear() {
    for (const graphics of this.graphicsById.values()) {
      this.layer.removeChild(graphics);
    }
    this.graphicsById.clear();
  }

  private isRenderable(constraint: Constraint) {
    return (
      constraint.type === 'perpendicular' ||
      constraint.type === 'parallel' ||
      constraint.type === 'fixedPoint' ||
      constraint.type === 'equalLength'
    );
  }

  private drawConstraint(constraint: Constraint, graphics: PIXI.Graphics, ctx: RenderContext) {
    graphics.clear();
    const style = this.getStyleForConstraint(constraint, ctx);
    const scale = ctx.scale;
    const strokeWidth = (style.width ?? 2) / scale;
    const color = style.color ?? 0xffffff;
    const alpha = style.alpha ?? 0.8;
    const markerSize = (style.markerSize ?? 10) / scale;

    graphics.setStrokeStyle({ width: strokeWidth, color, alpha });

    if (constraint.type === 'fixedPoint') {
      const fixed = constraint as FixedPointConstraint;
      const point = ctx.state.getPoint(fixed.pointName);
      const x = point?.x ?? fixed.targetX;
      const y = point?.y ?? fixed.targetY;
      this.drawSquare(graphics, { x, y }, markerSize);
      graphics.stroke();
      return;
    }

    if (constraint.type === 'perpendicular') {
      const perpendicular = constraint as PerpendicularConstraint;
      const pointsA = this.getSourcePoints(perpendicular.sourceA, ctx);
      const pointsB = this.getSourcePoints(perpendicular.sourceB, ctx);
      if (!pointsA || !pointsB) return;
      const intersection = this.intersectLines(pointsA.start, pointsA.end, pointsB.start, pointsB.end);
      if (!intersection) return;
      const dirA = this.normalize(this.sub(pointsA.end, pointsA.start));
      const dirB = this.normalize(this.sub(pointsB.end, pointsB.start));
      if (!dirA || !dirB) return;
      this.drawPerpendicularMarker(graphics, intersection, dirA, dirB, markerSize);
      graphics.stroke();
      return;
    }

    if (constraint.type === 'parallel') {
      const parallel = constraint as ParallelConstraint;
      const pointsA = this.getSourcePoints(parallel.sourceA, ctx);
      const pointsB = this.getSourcePoints(parallel.sourceB, ctx);
      if (!pointsA || !pointsB) return;

      const projectionInfo = this.projectPointToLineWithParam(pointsA.start, pointsB.start, pointsB.end);
      if (!projectionInfo) return;
      const { point: projection, t } = projectionInfo;
      const dirB = this.normalize(this.sub(pointsB.end, pointsB.start));
      const dirPerp = this.normalize(this.sub(pointsA.start, projection));

      const dashPattern = style.dash ?? [6, 6];
      const dash = (dashPattern[0] ?? 6) / scale;
      const gap = (dashPattern[1] ?? dashPattern[0] ?? 6) / scale;

      this.drawDashedLine(graphics, pointsA.start, projection, dash, gap);
      if (t < 0 || t > 1) {
        const anchor = t < 0 ? pointsB.start : pointsB.end;
        this.drawDashedLine(graphics, anchor, projection, dash, gap);
      }
      if (dirB && dirPerp) {
        this.drawPerpendicularMarker(graphics, projection, dirB, dirPerp, markerSize);
        this.drawPerpendicularMarker(graphics, pointsA.start, dirB, this.mul(dirPerp, -1), markerSize);
      } else {
        this.drawSquare(graphics, projection, markerSize);
      }
      graphics.stroke();
    }

    if (constraint.type === 'equalLength') {
      const equal = constraint as EqualLengthConstraint;
      const pointsA = this.getSourcePoints(equal.sourceA, ctx);
      const pointsB = this.getSourcePoints(equal.sourceB, ctx);
      if (!pointsA || !pointsB) return;

      const midA = this.mul(this.add(pointsA.start, pointsA.end), 0.5);
      const midB = this.mul(this.add(pointsB.start, pointsB.end), 0.5);
      const dirA = this.normalize(this.sub(pointsA.end, pointsA.start));
      const dirB = this.normalize(this.sub(pointsB.end, pointsB.start));
      if (!dirA || !dirB) return;

      const tickSize = markerSize * 0.8;
      const tickDirA = this.normalize({ x: -dirA.y, y: dirA.x });
      const tickDirB = this.normalize({ x: -dirB.y, y: dirB.x });
      if (!tickDirA || !tickDirB) return;

      this.drawTickMark(graphics, midA, tickDirA, tickSize);
      this.drawTickMark(graphics, midB, tickDirB, tickSize);
      graphics.stroke();
    }
  }

  private getStyleForConstraint(constraint: Constraint, ctx: RenderContext) {
    switch (constraint.type) {
      case 'fixedPoint':
        return ctx.styles.constraints.fixedPoint;
      case 'perpendicular':
        return ctx.styles.constraints.perpendicular;
      case 'parallel':
        return ctx.styles.constraints.parallel;
      case 'equalLength':
        return ctx.styles.constraints.equalLength;
      default:
        return ctx.styles.constraints.perpendicular;
    }
  }

  private getSourcePoints(
    source: PerpendicularSource | ParallelSource | EqualLengthSource,
    ctx: RenderContext
  ): { start: Vec2; end: Vec2 } | null {
    const start = ctx.state.getPoint(source.start);
    const end = ctx.state.getPoint(source.end);
    if (!start || !end) return null;
    return { start: { x: start.x, y: start.y }, end: { x: end.x, y: end.y } };
  }

  private intersectLines(a0: Vec2, a1: Vec2, b0: Vec2, b1: Vec2): Vec2 | null {
    const r = this.sub(a1, a0);
    const s = this.sub(b1, b0);
    const denom = this.cross(r, s);
    if (Math.abs(denom) < 1e-9) return null;
    const t = this.cross(this.sub(b0, a0), s) / denom;
    return this.add(a0, this.mul(r, t));
  }

  private projectPointToLine(point: Vec2, lineStart: Vec2, lineEnd: Vec2): Vec2 | null {
    const d = this.sub(lineEnd, lineStart);
    const denom = this.dot(d, d);
    if (denom < 1e-9) return null;
    const t = this.dot(this.sub(point, lineStart), d) / denom;
    return this.add(lineStart, this.mul(d, t));
  }

  private projectPointToLineWithParam(
    point: Vec2,
    lineStart: Vec2,
    lineEnd: Vec2
  ): { point: Vec2; t: number } | null {
    const d = this.sub(lineEnd, lineStart);
    const denom = this.dot(d, d);
    if (denom < 1e-9) return null;
    const t = this.dot(this.sub(point, lineStart), d) / denom;
    return { point: this.add(lineStart, this.mul(d, t)), t };
  }

  private drawSquare(graphics: PIXI.Graphics, center: Vec2, size: number) {
    const half = size / 2;
    graphics.rect(center.x - half, center.y - half, size, size);
  }

  private drawPerpendicularMarker(
    graphics: PIXI.Graphics,
    origin: Vec2,
    dirA: Vec2,
    dirB: Vec2,
    size: number
  ) {
    const a = this.add(origin, this.mul(dirA, size));
    const b = this.add(a, this.mul(dirB, size));
    const c = this.add(origin, this.mul(dirB, size));
    graphics.moveTo(a.x, a.y);
    graphics.lineTo(b.x, b.y);
    graphics.lineTo(c.x, c.y);
  }

  private drawDashedLine(graphics: PIXI.Graphics, start: Vec2, end: Vec2, dash: number, gap: number) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy);
    if (length < 1e-9) return;
    const ux = dx / length;
    const uy = dy / length;

    let distance = 0;
    while (distance < length) {
      const segment = Math.min(dash, length - distance);
      const sx = start.x + ux * distance;
      const sy = start.y + uy * distance;
      const ex = start.x + ux * (distance + segment);
      const ey = start.y + uy * (distance + segment);
      graphics.moveTo(sx, sy);
      graphics.lineTo(ex, ey);
      distance += dash + gap;
    }
  }

  private drawTickMark(graphics: PIXI.Graphics, center: Vec2, dir: Vec2, size: number) {
    const half = size / 2;
    const a = this.add(center, this.mul(dir, -half));
    const b = this.add(center, this.mul(dir, half));
    graphics.moveTo(a.x, a.y);
    graphics.lineTo(b.x, b.y);
  }

  private add(a: Vec2, b: Vec2): Vec2 {
    return { x: a.x + b.x, y: a.y + b.y };
  }

  private sub(a: Vec2, b: Vec2): Vec2 {
    return { x: a.x - b.x, y: a.y - b.y };
  }

  private mul(v: Vec2, scalar: number): Vec2 {
    return { x: v.x * scalar, y: v.y * scalar };
  }

  private normalize(v: Vec2): Vec2 | null {
    const len = Math.hypot(v.x, v.y);
    if (len < 1e-9) return null;
    return { x: v.x / len, y: v.y / len };
  }

  private dot(a: Vec2, b: Vec2): number {
    return a.x * b.x + a.y * b.y;
  }

  private cross(a: Vec2, b: Vec2): number {
    return a.x * b.y - a.y * b.x;
  }
}
