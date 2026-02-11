import type { AppState } from '../state/AppState';
import type { Constraint } from '../../domain/constraints/Constraint';
import type { VariableRef } from '../../domain/constraints/types';

const variableKey = (ref: VariableRef): string => `${ref.kind}:${ref.name}:${ref.component}`;

export class VariableRegistry {
  private variables: VariableRef[];
  private indexByKey: Map<string, number>;
  private state: AppState;

  private constructor(state: AppState, variables: VariableRef[]) {
    this.state = state;
    this.variables = variables;
    this.indexByKey = new Map(variables.map((ref, index) => [variableKey(ref), index]));
  }

  static fromConstraints(state: AppState, constraints: Constraint[]): VariableRegistry {
    const variables: VariableRef[] = [];
    const seen = new Set<string>();
    for (const constraint of constraints) {
      for (const ref of constraint.getVariables()) {
        const key = variableKey(ref);
        if (seen.has(key)) continue;
        seen.add(key);
        variables.push(ref);
      }
    }
    return new VariableRegistry(state, variables);
  }

  getVariables(): VariableRef[] {
    return this.variables;
  }

  getIndex(ref: VariableRef): number {
    const key = variableKey(ref);
    const index = this.indexByKey.get(key);
    if (index === undefined) {
      throw new Error(`Variable ${key} not registered`);
    }
    return index;
  }

  getValue(ref: VariableRef): number {
    const point = this.state.getPoint(ref.name);
    if (!point) {
      throw new Error(`Point ${ref.name} not found`);
    }
    return ref.component === 'x' ? point.x : point.y;
  }

  setValue(ref: VariableRef, value: number) {
    const point = this.state.getPoint(ref.name);
    if (!point) {
      throw new Error(`Point ${ref.name} not found`);
    }
    if (ref.component === 'x') {
      point.x = value;
    } else {
      point.y = value;
    }
  }

  readVector(): number[] {
    return this.variables.map((ref) => this.getValue(ref));
  }

  applyDelta(delta: number[]) {
    if (delta.length !== this.variables.length) {
      throw new Error(`Delta length ${delta.length} does not match variables ${this.variables.length}`);
    }
    for (let i = 0; i < this.variables.length; i += 1) {
      const ref = this.variables[i];
      const value = this.getValue(ref);
      this.setValue(ref, value + delta[i]);
    }
  }
}
