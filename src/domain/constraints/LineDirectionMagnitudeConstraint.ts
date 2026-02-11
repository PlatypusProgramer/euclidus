import type { Constraint } from './Constraint';
import type { ConstraintContext, VariableRef } from './types';
import { pointVar } from './types';
import { createGuid } from '../../utils/guid';

export class LineDirectionMagnitudeConstraint implements Constraint {
  id: string;
  type: string = 'lineDirectionMagnitude';
  weight?: number;
  startName: string;
  endName: string;
  targetLengthSq: number;

  constructor(startName: string, endName: string, targetLength: number, id: string = createGuid(), weight?: number) {
    this.id = id;
    this.startName = startName;
    this.endName = endName;
    this.targetLengthSq = targetLength * targetLength;
    this.weight = weight;
  }

  getVariables(): VariableRef[] {
    return [
      pointVar(this.startName, 'x'),
      pointVar(this.startName, 'y'),
      pointVar(this.endName, 'x'),
      pointVar(this.endName, 'y'),
    ];
  }

  evaluate(ctx: ConstraintContext): number[] {
    const start = ctx.getPoint(this.startName);
    const end = ctx.getPoint(this.endName);
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    return [dx * dx + dy * dy - this.targetLengthSq];
  }

  jacobian(ctx: ConstraintContext): number[][] {
    const start = ctx.getPoint(this.startName);
    const end = ctx.getPoint(this.endName);
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    return [[-2 * dx, -2 * dy, 2 * dx, 2 * dy]];
  }
}
