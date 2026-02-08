import type { ConstraintContext, VariableRef } from './types';

export interface Constraint {
  id: string;
  type: string;
  weight?: number;
  getVariables(): VariableRef[];
  evaluate(ctx: ConstraintContext): number[];
  jacobian?(ctx: ConstraintContext): number[][];
}
