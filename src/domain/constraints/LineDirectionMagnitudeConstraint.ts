import type { Constraint } from './Constraint';
import type { ConstraintContext, VariableRef } from './types';
import { pointVar } from './types';
import { createGuid } from '../../utils/guid';
import { lengthSqVec2, subVec2 } from '../../utils/vec2';

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
    const delta = subVec2({ x: end.x, y: end.y }, { x: start.x, y: start.y });
    return [lengthSqVec2(delta) - this.targetLengthSq];
  }

  jacobian(ctx: ConstraintContext): number[][] {
    const start = ctx.getPoint(this.startName);
    const end = ctx.getPoint(this.endName);
    const delta = subVec2({ x: end.x, y: end.y }, { x: start.x, y: start.y });
    return [[-2 * delta.x, -2 * delta.y, 2 * delta.x, 2 * delta.y]];
  }
}
