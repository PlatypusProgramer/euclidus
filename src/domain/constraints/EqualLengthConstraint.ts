import type { Constraint } from './Constraint';
import type { ConstraintContext, VariableRef } from './types';
import { pointVar } from './types';
import { createGuid } from '../../utils/guid';

export type EqualLengthSource = { start: string; end: string; segmentName?: string };

export class EqualLengthConstraint implements Constraint {
  id: string;
  type: string = 'equalLength';
  weight?: number;
  sourceA: EqualLengthSource;
  sourceB: EqualLengthSource;

  constructor(sourceA: EqualLengthSource, sourceB: EqualLengthSource, id: string = createGuid(), weight?: number) {
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
    return [d1.x * d1.x + d1.y * d1.y - (d2.x * d2.x + d2.y * d2.y)];
  }

  jacobian(ctx: ConstraintContext): number[][] {
    const d1 = this.getDirection(this.sourceA, ctx);
    const d2 = this.getDirection(this.sourceB, ctx);
    return [[-2 * d1.x, -2 * d1.y, 2 * d1.x, 2 * d1.y, 2 * d2.x, 2 * d2.y, -2 * d2.x, -2 * d2.y]];
  }

  private getSourceVariables(source: EqualLengthSource): VariableRef[] {
    return [
      pointVar(source.start, 'x'),
      pointVar(source.start, 'y'),
      pointVar(source.end, 'x'),
      pointVar(source.end, 'y'),
    ];
  }

  private getDirection(source: EqualLengthSource, ctx: ConstraintContext): { x: number; y: number } {
    const start = ctx.getPoint(source.start);
    const end = ctx.getPoint(source.end);
    return { x: end.x - start.x, y: end.y - start.y };
  }
}
