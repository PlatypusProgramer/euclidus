import { add, identity, inv, multiply, transpose } from 'mathjs';
import type { AppState } from '../state/AppState';
import type { Constraint } from '../../domain/constraints/Constraint';
import type { ConstraintContext, VariableRef } from '../../domain/constraints/types';
import { VariableRegistry } from './VariableRegistry';

export type SolverOptions = {
  maxIterations?: number;
  tolerance?: number;
  damping?: number;
  stepTolerance?: number;
  numericEpsilon?: number;
};

export type SolveResult = {
  iterations: number;
  converged: boolean;
  residual: number;
};

export class ConstraintSolver {
  private maxIterations: number;
  private tolerance: number;
  private damping: number;
  private stepTolerance: number;
  private numericEpsilon: number;

  constructor(options: SolverOptions = {}) {
    this.maxIterations = options.maxIterations ?? 20;
    this.tolerance = options.tolerance ?? 1e-6;
    this.damping = options.damping ?? 1e-3;
    this.stepTolerance = options.stepTolerance ?? this.tolerance;
    this.numericEpsilon = options.numericEpsilon ?? 1e-6;
  }

  solve(state: AppState, constraints: Constraint[]): SolveResult {
    if (constraints.length === 0) {
      return { iterations: 0, converged: true, residual: 0 };
    }

    const ctx: ConstraintContext = {
      getPoint: (name) => {
        const point = state.getPoint(name);
        if (!point) {
          throw new Error(`Point ${name} not found`);
        }
        return point;
      },
      getLine: (name) => {
        const line = state.getLine(name);
        if (!line) {
          throw new Error(`Line ${name} not found`);
        }
        return line;
      },
      getLineSegment: (name) => {
        const segment = state.getLineSegment(name);
        if (!segment) {
          throw new Error(`Line segment ${name} not found`);
        }
        return segment;
      },
    };

    const registry = VariableRegistry.fromConstraints(state, constraints);
    const variableCount = registry.getVariables().length;
    if (variableCount === 0) {
      return { iterations: 0, converged: true, residual: 0 };
    }

    let residualNorm = 0;

    for (let iteration = 0; iteration < this.maxIterations; iteration += 1) {
      const { residuals, jacobian } = this.buildSystem(constraints, ctx, registry);
      residualNorm = this.norm(residuals);

      if (residualNorm < this.tolerance) {
        return { iterations: iteration, converged: true, residual: residualNorm };
      }

      const delta = this.solveNormalEquation(jacobian, residuals);
      if (!delta) {
        break;
      }

      const stepNorm = this.norm(delta);
      registry.applyDelta(delta);

      if (stepNorm < this.stepTolerance) {
        return { iterations: iteration + 1, converged: true, residual: residualNorm };
      }
    }

    return { iterations: this.maxIterations, converged: false, residual: residualNorm };
  }

  private buildSystem(
    constraints: Constraint[],
    ctx: ConstraintContext,
    registry: VariableRegistry
  ): { residuals: number[]; jacobian: number[][] } {
    const variables = registry.getVariables();
    const variableCount = variables.length;
    const residuals: number[] = [];
    const jacobian: number[][] = [];

    for (const constraint of constraints) {
      const localVars = constraint.getVariables();
      const baseResiduals = constraint.evaluate(ctx);
      const localJacobian =
        constraint.jacobian?.(ctx) ??
        this.numericJacobian(constraint, ctx, registry, localVars, baseResiduals);

      if (localJacobian.length !== baseResiduals.length) {
        throw new Error(`Constraint ${constraint.type} returned mismatched residual and jacobian sizes`);
      }
      for (const row of localJacobian) {
        if (row.length !== localVars.length) {
          throw new Error(`Constraint ${constraint.type} jacobian column count does not match variables`);
        }
      }

      const weight = constraint.weight && constraint.weight > 0 ? constraint.weight : 1;
      const scale = Math.sqrt(weight);

      for (let rowIndex = 0; rowIndex < baseResiduals.length; rowIndex += 1) {
        const row = new Array(variableCount).fill(0);
        for (let colIndex = 0; colIndex < localVars.length; colIndex += 1) {
          const globalIndex = registry.getIndex(localVars[colIndex]);
          row[globalIndex] = localJacobian[rowIndex][colIndex] * scale;
        }
        jacobian.push(row);
        residuals.push(baseResiduals[rowIndex] * scale);
      }
    }

    return { residuals, jacobian };
  }

  private numericJacobian(
    constraint: Constraint,
    ctx: ConstraintContext,
    registry: VariableRegistry,
    localVars: VariableRef[],
    baseResiduals: number[]
  ): number[][] {
    const rows = baseResiduals.length;
    const cols = localVars.length;
    const jacobian: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));

    for (let col = 0; col < cols; col += 1) {
      const ref = localVars[col];
      const original = registry.getValue(ref);
      const epsilon = this.numericEpsilon * Math.max(1, Math.abs(original));

      registry.setValue(ref, original + epsilon);
      const nextResiduals = constraint.evaluate(ctx);
      registry.setValue(ref, original);

      for (let row = 0; row < rows; row += 1) {
        jacobian[row][col] = (nextResiduals[row] - baseResiduals[row]) / epsilon;
      }
    }

    return jacobian;
  }

  private solveNormalEquation(jacobian: number[][], residuals: number[]): number[] | null {
    const variableCount = jacobian.length > 0 ? jacobian[0].length : 0;
    if (variableCount === 0 || residuals.length === 0) {
      return null;
    }

    try {
      const jt = transpose(jacobian) as any;
      const jtJ = multiply(jt, jacobian) as any;
      const dampingMatrix = multiply(identity(variableCount), this.damping) as any;
      const system = add(jtJ, dampingMatrix) as any;
      const jtr = multiply(jt, residuals) as any;
      const delta = multiply(inv(system), multiply(jtr, -1)) as any;
      const raw = delta?.valueOf ? delta.valueOf() : delta;
      if (!Array.isArray(raw)) {
        return null;
      }
      if (Array.isArray(raw[0])) {
        return raw.map((row: number[]) => row[0]);
      }
      return raw as number[];
    } catch {
      return null;
    }
  }

  private norm(vector: number[]): number {
    let sum = 0;
    for (const value of vector) {
      sum += value * value;
    }
    return Math.sqrt(sum);
  }
}
