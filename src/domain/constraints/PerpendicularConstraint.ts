import type { Constraint } from './Constraint';
import type { ConstraintContext, VariableRef } from './types';
import { lineDirectionVar, pointVar } from './types';
import { createGuid } from '../../utils/guid';

export type PerpendicularSource =
  | { type: 'line'; name: string }
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
    return [d1.x * d2.x + d1.y * d2.y];
  }

  jacobian(ctx: ConstraintContext): number[][] {
    const d1 = this.getDirection(this.sourceA, ctx);
    const d2 = this.getDirection(this.sourceB, ctx);
    const row: number[] = [];

    this.appendDerivatives(this.sourceA, d2, row);
    this.appendDerivatives(this.sourceB, d1, row);

    return [row];
  }

  private getSourceVariables(source: PerpendicularSource): VariableRef[] {
    if (source.type === 'line') {
      return [lineDirectionVar(source.name, 'x'), lineDirectionVar(source.name, 'y')];
    }
    return [
      pointVar(source.start, 'x'),
      pointVar(source.start, 'y'),
      pointVar(source.end, 'x'),
      pointVar(source.end, 'y'),
    ];
  }

  private getDirection(source: PerpendicularSource, ctx: ConstraintContext): { x: number; y: number } {
    if (source.type === 'line') {
      const line = ctx.getLine(source.name);
      return { x: line.direction.x, y: line.direction.y };
    }
    const start = ctx.getPoint(source.start);
    const end = ctx.getPoint(source.end);
    return { x: end.x - start.x, y: end.y - start.y };
  }

  private appendDerivatives(
    source: PerpendicularSource,
    otherDir: { x: number; y: number },
    row: number[]
  ) {
    if (source.type === 'line') {
      row.push(otherDir.x, otherDir.y);
      return;
    }
    row.push(-otherDir.x, -otherDir.y, otherDir.x, otherDir.y);
  }
}
