import type { Constraint } from './Constraint';
import type { ConstraintContext, VariableRef } from './types';
import { lineDirectionVar } from './types';
import { createGuid } from '../../utils/guid';

export class LineDirectionMagnitudeConstraint implements Constraint {
  id: string;
  type: string = 'lineDirectionMagnitude';
  weight?: number;
  lineName: string;
  targetLengthSq: number;

  constructor(lineName: string, targetLength: number, id: string = createGuid(), weight?: number) {
    this.id = id;
    this.lineName = lineName;
    this.targetLengthSq = targetLength * targetLength;
    this.weight = weight;
  }

  getVariables(): VariableRef[] {
    return [lineDirectionVar(this.lineName, 'x'), lineDirectionVar(this.lineName, 'y')];
  }

  evaluate(ctx: ConstraintContext): number[] {
    const line = ctx.getLine(this.lineName);
    const dx = line.direction.x;
    const dy = line.direction.y;
    return [dx * dx + dy * dy - this.targetLengthSq];
  }

  jacobian(ctx: ConstraintContext): number[][] {
    const line = ctx.getLine(this.lineName);
    const dx = line.direction.x;
    const dy = line.direction.y;
    return [[2 * dx, 2 * dy]];
  }
}
