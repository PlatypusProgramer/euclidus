import type { Constraint } from './Constraint';
import type { ConstraintContext, VariableRef } from './types';
import { pointVar } from './types';
import { createGuid } from '../../utils/guid';

export type ParallelSource =
  | { type: 'line'; start: string; end: string; lineName?: string }
  | { type: 'segment'; start: string; end: string; segmentName?: string };

export class ParallelConstraint implements Constraint {
  id: string;
  type: string = 'parallel';
  weight?: number;
  sourceA: ParallelSource;
  sourceB: ParallelSource;

  constructor(sourceA: ParallelSource, sourceB: ParallelSource, id: string = createGuid(), weight?: number) {
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
    return [d1.x * d2.y - d1.y * d2.x];
  }

  jacobian(ctx: ConstraintContext): number[][] {
    const d1 = this.getDirection(this.sourceA, ctx);
    const d2 = this.getDirection(this.sourceB, ctx);
    const row: number[] = [];

    this.appendDerivatives({ x: d2.y, y: -d2.x }, row);
    this.appendDerivatives({ x: -d1.y, y: d1.x }, row);

    return [row];
  }

  private getSourceVariables(source: ParallelSource): VariableRef[] {
    return [
      pointVar(source.start, 'x'),
      pointVar(source.start, 'y'),
      pointVar(source.end, 'x'),
      pointVar(source.end, 'y'),
    ];
  }

  private getDirection(source: ParallelSource, ctx: ConstraintContext): { x: number; y: number } {
    const start = ctx.getPoint(source.start);
    const end = ctx.getPoint(source.end);
    return { x: end.x - start.x, y: end.y - start.y };
  }

  private appendDerivatives(derivative: { x: number; y: number }, row: number[]) {
    row.push(-derivative.x, -derivative.y, derivative.x, derivative.y);
  }
}
