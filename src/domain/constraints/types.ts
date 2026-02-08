import type { LineEntity } from '../entities/LineEntity';
import type { LineSegmentEntity } from '../entities/LineSegmentEntity';
import type { PointEntity } from '../entities/PointEntity';

export type VariableRef =
  | { kind: 'point'; name: string; component: 'x' | 'y' }
  | { kind: 'lineDirection'; name: string; component: 'x' | 'y' };

export interface ConstraintContext {
  getPoint(name: string): PointEntity;
  getLine(name: string): LineEntity;
  getLineSegment(name: string): LineSegmentEntity;
}

export const pointVar = (name: string, component: 'x' | 'y'): VariableRef => ({
  kind: 'point',
  name,
  component,
});

export const lineDirectionVar = (name: string, component: 'x' | 'y'): VariableRef => ({
  kind: 'lineDirection',
  name,
  component,
});
