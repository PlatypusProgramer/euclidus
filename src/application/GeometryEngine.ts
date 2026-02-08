import { AppState } from './state/AppState';
import type { RendererPort } from './ports/RendererPort';
import { PointEntity } from '../domain/entities/PointEntity';
import { LineEntity } from '../domain/entities/LineEntity';
import { LineSegmentEntity } from '../domain/entities/LineSegmentEntity';
import { ConstraintSolver } from './solver/ConstraintSolver';
import { FixedPointConstraint } from '../domain/constraints/FixedPointConstraint';
import { LineDirectionMagnitudeConstraint } from '../domain/constraints/LineDirectionMagnitudeConstraint';
import {
  PerpendicularConstraint,
  type PerpendicularSource,
} from '../domain/constraints/PerpendicularConstraint';

export class GeometryEngine {
  private renderer: RendererPort;
  private state: AppState;
  private solver: ConstraintSolver;
  private lockedPointConstraints: Map<string, string> = new Map();
  private lineDirectionConstraints: Map<string, string> = new Map();

  constructor(renderer: RendererPort, state: AppState = new AppState()) {
    this.renderer = renderer;
    this.state = state;
    this.solver = new ConstraintSolver();
  }

  addPoint(name: string, x: number, y: number) {
    const point = new PointEntity(name, x, y);
    this.state.addPoint(point);
    this.renderer.addPoint(point);
    return point;
  }

  updatePoint(name: string, x: number, y: number) {
    const point = this.state.getPoint(name);
    if (!point) {
      throw new Error(`Point ${name} does not exist`);
    }
    point.setPosition(x, y);
    this.solveConstraints();
    this.refreshRenderer();
    return point;
  }

  removePoint(name: string) {
    const point = this.state.getPoint(name);
    if (!point) {
      return;
    }
    this.state.removePoint(name);
    this.renderer.removePoint(name);
  }

  addLineSegment(name: string, startName: string, endName: string) {
    const start = this.state.getPoint(startName);
    const end = this.state.getPoint(endName);
    if (!start || !end) {
      throw new Error(`Line segment ${name} requires existing points ${startName} and ${endName}`);
    }
    const line = new LineSegmentEntity(name, start, end);
    this.state.addLineSegment(line);
    this.renderer.addLineSegment(line);
    return line;
  }

  updateLineSegment(name: string, startName: string, endName: string) {
    const line = this.state.getLineSegment(name);
    if (!line) {
      throw new Error(`Line segment ${name} does not exist`);
    }
    const start = this.state.getPoint(startName);
    const end = this.state.getPoint(endName);
    if (!start || !end) {
      throw new Error(`Line segment ${name} requires existing points ${startName} and ${endName}`);
    }
    line.setPoints(start, end);
    this.solveConstraints();
    this.refreshRenderer();
    return line;
  }

  removeLineSegment(name: string) {
    const line = this.state.getLineSegment(name);
    if (!line) return;
    this.state.removeLineSegment(name);
    this.renderer.removeLineSegment(name);
  }

  addLine(name: string, rootName: string, directionX: number, directionY: number) {
    const root = this.state.getPoint(rootName);
    if (!root) {
      throw new Error(`Line ${name} requires existing point ${rootName}`);
    }
    const line = new LineEntity(name, root, directionX, directionY);
    this.state.addLine(line);
    this.renderer.addLine(line);
    return line;
  }

  updateLine(name: string, rootName: string, directionX: number, directionY: number) {
    const line = this.state.getLine(name);
    if (!line) {
      throw new Error(`Line ${name} does not exist`);
    }
    const root = this.state.getPoint(rootName);
    if (!root) {
      throw new Error(`Line ${name} requires existing point ${rootName}`);
    }
    line.setRoot(root);
    line.setDirection(directionX, directionY);
    this.solveConstraints();
    this.refreshRenderer();
    return line;
  }

  addPerpendicularConstraint(
    sourceA: { type: 'line' | 'lineSegment'; name: string },
    sourceB: { type: 'line' | 'lineSegment'; name: string }
  ) {
    const resolvedA = this.resolvePerpendicularSource(sourceA);
    const resolvedB = this.resolvePerpendicularSource(sourceB);

    if (resolvedA.type === 'line') {
      this.ensureLineDirectionConstraint(resolvedA.name);
    }
    if (resolvedB.type === 'line') {
      this.ensureLineDirectionConstraint(resolvedB.name);
    }

    const constraint = new PerpendicularConstraint(resolvedA, resolvedB);
    this.state.addConstraint(constraint);
    this.solveConstraints();
    this.refreshRenderer();
    return constraint;
  }

  addFixedPointConstraint(pointName: string, x: number, y: number) {
    const point = this.state.getPoint(pointName);
    if (!point) {
      throw new Error(`Point ${pointName} does not exist`);
    }
    const constraint = new FixedPointConstraint(pointName, x, y);
    this.state.addConstraint(constraint);
    this.solveConstraints();
    this.refreshRenderer();
    return constraint;
  }

  removeConstraint(id: string) {
    this.state.removeConstraint(id);
    for (const [pointName, constraintId] of this.lockedPointConstraints.entries()) {
      if (constraintId === id) {
        this.lockedPointConstraints.delete(pointName);
        break;
      }
    }
    for (const [lineName, constraintId] of this.lineDirectionConstraints.entries()) {
      if (constraintId === id) {
        this.lineDirectionConstraints.delete(lineName);
        break;
      }
    }
    this.solveConstraints();
    this.refreshRenderer();
  }

  lockPoint(pointName: string) {
    const point = this.state.getPoint(pointName);
    if (!point) {
      throw new Error(`Point ${pointName} does not exist`);
    }
    const existing = this.lockedPointConstraints.get(pointName);
    if (existing) {
      return existing;
    }
    const constraint = new FixedPointConstraint(pointName, point.x, point.y);
    this.state.addConstraint(constraint);
    this.lockedPointConstraints.set(pointName, constraint.id);
    this.solveConstraints();
    this.refreshRenderer();
    return constraint.id;
  }

  unlockPoint(pointName: string) {
    const constraintId = this.lockedPointConstraints.get(pointName);
    if (!constraintId) return;
    this.state.removeConstraint(constraintId);
    this.lockedPointConstraints.delete(pointName);
    this.solveConstraints();
    this.refreshRenderer();
  }

  private solveConstraints() {
    const constraints = this.state.getConstraints();
    if (constraints.length === 0) return;
    this.solver.solve(this.state, constraints);
  }

  private resolvePerpendicularSource(source: {
    type: 'line' | 'lineSegment';
    name: string;
  }): PerpendicularSource {
    if (source.type === 'line') {
      const line = this.state.getLine(source.name);
      if (!line) {
        throw new Error(`Line ${source.name} does not exist`);
      }
      return { type: 'line', name: source.name };
    }
    const segment = this.state.getLineSegment(source.name);
    if (!segment) {
      throw new Error(`Line segment ${source.name} does not exist`);
    }
    return {
      type: 'segment',
      start: segment.start.name,
      end: segment.end.name,
      segmentName: source.name,
    };
  }

  private ensureLineDirectionConstraint(lineName: string) {
    const existingId = this.lineDirectionConstraints.get(lineName);
    if (existingId && this.state.getConstraint(existingId)) {
      return;
    }
    const line = this.state.getLine(lineName);
    if (!line) {
      throw new Error(`Line ${lineName} does not exist`);
    }
    const length = Math.hypot(line.direction.x, line.direction.y);
    const constraint = new LineDirectionMagnitudeConstraint(lineName, length);
    this.state.addConstraint(constraint);
    this.lineDirectionConstraints.set(lineName, constraint.id);
  }

  private refreshRenderer() {
    for (const point of this.state.getAllPoints()) {
      this.renderer.updatePoint(point);
    }
    for (const segment of this.state.getAllLineSegments()) {
      this.renderer.updateLineSegment(segment);
    }
    for (const line of this.state.getAllLines()) {
      this.renderer.updateLine(line);
    }
  }

  getState() {
    return this.state;
  }
}
