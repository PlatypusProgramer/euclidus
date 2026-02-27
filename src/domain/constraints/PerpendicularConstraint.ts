import type { Constraint } from './Constraint';
import type { ConstraintContext, VariableRef } from './types';
import { pointVar } from './types';
import { createGuid } from '../../utils/guid';
import { dotVec2, subVec2, type Vec2 } from '../../utils/vec2';

export type PerpendicularSource =
  | { type: 'line'; start: string; end: string; lineName?: string }
  | { type: 'segment'; start: string; end: string; segmentName?: string };

export class PerpendicularConstraint implements Constraint {
  id: string;
  type: string = 'perpendicular';
  weight?: number;
  sourceA: PerpendicularSource;
  sourceB: PerpendicularSource;

  constructor(
    sourceA: PerpendicularSource,
    sourceB: PerpendicularSource,
    id: string = createGuid(),
    weight?: number
  ) {
    this.id = id;
    this.sourceA = sourceA;
    this.sourceB = sourceB;
    this.weight = weight;
  }

  getVariables(): VariableRef[] {
    return [...this.getSourceVariables(this.sourceA), ...this.getSourceVariables(this.sourceB)];
  }

  evaluate(ctx: ConstraintContext): number[] {
    const d1 = this.getDirection(this.sourceA, ctx);
    const d2 = this.getDirection(this.sourceB, ctx);
    return [dotVec2(d1, d2)];
  }

  jacobian(ctx: ConstraintContext): number[][] {
    const d1 = this.getDirection(this.sourceA, ctx);
    const d2 = this.getDirection(this.sourceB, ctx);
    const row: number[] = [];

    this.appendDerivatives(d2, row);
    this.appendDerivatives(d1, row);

    return [row];
  }

  private getSourceVariables(source: PerpendicularSource): VariableRef[] {
    return [
      pointVar(source.start, 'x'),
      pointVar(source.start, 'y'),
      pointVar(source.end, 'x'),
      pointVar(source.end, 'y'),
    ];
  }

  private getDirection(source: PerpendicularSource, ctx: ConstraintContext): Vec2 {
    const start = ctx.getPoint(source.start);
    const end = ctx.getPoint(source.end);
    return subVec2({ x: end.x, y: end.y }, { x: start.x, y: start.y });
  }

  private appendDerivatives(otherDir: { x: number; y: number }, row: number[]) {
    row.push(-otherDir.x, -otherDir.y, otherDir.x, otherDir.y);
  }
}
