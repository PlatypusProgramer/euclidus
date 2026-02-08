import type { Constraint } from './Constraint';
import type { ConstraintContext, VariableRef } from './types';
import { pointVar } from './types';
import { createGuid } from '../../utils/guid';

export class FixedPointConstraint implements Constraint {
  id: string;
  type: string = 'fixedPoint';
  weight?: number;
  pointName: string;
  targetX: number;
  targetY: number;

  constructor(pointName: string, targetX: number, targetY: number, id: string = createGuid(), weight?: number) {
    this.id = id;
    this.pointName = pointName;
    this.targetX = targetX;
    this.targetY = targetY;
    this.weight = weight;
  }

  getVariables(): VariableRef[] {
    return [pointVar(this.pointName, 'x'), pointVar(this.pointName, 'y')];
  }

  evaluate(ctx: ConstraintContext): number[] {
    const point = ctx.getPoint(this.pointName);
    return [point.x - this.targetX, point.y - this.targetY];
  }

  jacobian(): number[][] {
    return [
      [1, 0],
      [0, 1],
    ];
  }
}
