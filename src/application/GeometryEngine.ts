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
import { ParallelConstraint, type ParallelSource } from '../domain/constraints/ParallelConstraint';
import { EqualLengthConstraint, type EqualLengthSource } from '../domain/constraints/EqualLengthConstraint';

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
    this.refreshRenderer();
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

  updatePointsById(updates: { id: string; x: number; y: number }[]) {
    if (updates.length === 0) {
      return;
    }

    let changed = false;
    for (const update of updates) {
      const point = this.state.getPointById(update.id);
      if (!point) continue;
      point.setPosition(update.x, update.y);
      changed = true;
    }

    if (!changed) {
      return;
    }

    this.solveConstraints();
    this.refreshRenderer();
  }

  removePoint(name: string) {
    const point = this.state.getPoint(name);
    if (!point) {
      return;
    }
    this.state.removePoint(name);
    this.refreshRenderer();
  }

  deleteEntitiesById(ids: string[]) {
    const pointsToDelete = new Set<string>();
    const linesToDelete = new Set<string>();
    const segmentsToDelete = new Set<string>();

    for (const id of ids) {
      const entity = this.state.findEntityById(id);
      if (!entity) continue;
      if (entity.type === 'point') {
        pointsToDelete.add(entity.name);
      }
      if (entity.type === 'line') {
        linesToDelete.add(entity.name);
      }
      if (entity.type === 'lineSegment') {
        segmentsToDelete.add(entity.name);
      }
    }

    for (const pointName of pointsToDelete) {
      for (const line of this.state.getLinesForPoint(pointName)) {
        linesToDelete.add(line.name);
      }
      for (const lineSegment of this.state.getLineSegmentsForPoint(pointName)) {
        segmentsToDelete.add(lineSegment.name);
      }
    }

    const constraintsToDelete = new Set<string>();

    for (const [pointName, constraintId] of this.lockedPointConstraints.entries()) {
      if (pointsToDelete.has(pointName)) {
        constraintsToDelete.add(constraintId);
      }
    }

    for (const [lineName, constraintId] of this.lineDirectionConstraints.entries()) {
      if (linesToDelete.has(lineName)) {
        constraintsToDelete.add(constraintId);
      }
    }

    const referencesDeletedPoint = (pointName: string) => pointsToDelete.has(pointName);
    const referencesDeletedLine = (lineName?: string) => Boolean(lineName && linesToDelete.has(lineName));
    const referencesDeletedSegment = (segmentName?: string) => Boolean(segmentName && segmentsToDelete.has(segmentName));

    for (const constraint of this.state.getConstraints()) {
      if (constraint instanceof FixedPointConstraint) {
        if (referencesDeletedPoint(constraint.pointName)) {
          constraintsToDelete.add(constraint.id);
        }
        continue;
      }

      if (constraint instanceof LineDirectionMagnitudeConstraint) {
        if (referencesDeletedPoint(constraint.startName) || referencesDeletedPoint(constraint.endName)) {
          constraintsToDelete.add(constraint.id);
          continue;
        }
        for (const [lineName, constraintId] of this.lineDirectionConstraints.entries()) {
          if (constraintId === constraint.id && linesToDelete.has(lineName)) {
            constraintsToDelete.add(constraint.id);
            break;
          }
        }
        continue;
      }

      if (constraint instanceof PerpendicularConstraint) {
        const referencesDeletedEntity =
          (constraint.sourceA.type === 'line' && referencesDeletedLine(constraint.sourceA.lineName)) ||
          (constraint.sourceA.type === 'segment' && referencesDeletedSegment(constraint.sourceA.segmentName)) ||
          (constraint.sourceB.type === 'line' && referencesDeletedLine(constraint.sourceB.lineName)) ||
          (constraint.sourceB.type === 'segment' && referencesDeletedSegment(constraint.sourceB.segmentName));
        const referencesDeletedPoints =
          referencesDeletedPoint(constraint.sourceA.start) ||
          referencesDeletedPoint(constraint.sourceA.end) ||
          referencesDeletedPoint(constraint.sourceB.start) ||
          referencesDeletedPoint(constraint.sourceB.end);
        if (referencesDeletedEntity || referencesDeletedPoints) {
          constraintsToDelete.add(constraint.id);
        }
        continue;
      }

      if (constraint instanceof ParallelConstraint) {
        const referencesDeletedEntity =
          (constraint.sourceA.type === 'line' && referencesDeletedLine(constraint.sourceA.lineName)) ||
          (constraint.sourceA.type === 'segment' && referencesDeletedSegment(constraint.sourceA.segmentName)) ||
          (constraint.sourceB.type === 'line' && referencesDeletedLine(constraint.sourceB.lineName)) ||
          (constraint.sourceB.type === 'segment' && referencesDeletedSegment(constraint.sourceB.segmentName));
        const referencesDeletedPoints =
          referencesDeletedPoint(constraint.sourceA.start) ||
          referencesDeletedPoint(constraint.sourceA.end) ||
          referencesDeletedPoint(constraint.sourceB.start) ||
          referencesDeletedPoint(constraint.sourceB.end);
        if (referencesDeletedEntity || referencesDeletedPoints) {
          constraintsToDelete.add(constraint.id);
        }
        continue;
      }

      if (constraint instanceof EqualLengthConstraint) {
        const referencesDeletedEntity =
          referencesDeletedSegment(constraint.sourceA.segmentName) ||
          referencesDeletedSegment(constraint.sourceB.segmentName);
        const referencesDeletedPoints =
          referencesDeletedPoint(constraint.sourceA.start) ||
          referencesDeletedPoint(constraint.sourceA.end) ||
          referencesDeletedPoint(constraint.sourceB.start) ||
          referencesDeletedPoint(constraint.sourceB.end);
        if (referencesDeletedEntity || referencesDeletedPoints) {
          constraintsToDelete.add(constraint.id);
        }
      }
    }

    const result = {
      points: 0,
      lines: 0,
      lineSegments: 0,
      constraints: 0,
    };

    for (const constraintId of constraintsToDelete) {
      if (!this.state.getConstraint(constraintId)) continue;
      this.state.removeConstraint(constraintId);
      result.constraints += 1;
    }

    for (const lineName of linesToDelete) {
      if (!this.state.getLine(lineName)) continue;
      this.state.removeLine(lineName);
      result.lines += 1;
    }

    for (const lineSegmentName of segmentsToDelete) {
      if (!this.state.getLineSegment(lineSegmentName)) continue;
      this.state.removeLineSegment(lineSegmentName);
      result.lineSegments += 1;
    }

    for (const pointName of pointsToDelete) {
      if (!this.state.getPoint(pointName)) continue;
      this.state.removePoint(pointName);
      result.points += 1;
    }

    for (const [pointName, constraintId] of Array.from(this.lockedPointConstraints.entries())) {
      if (pointsToDelete.has(pointName) || !this.state.getPoint(pointName) || !this.state.getConstraint(constraintId)) {
        this.lockedPointConstraints.delete(pointName);
      }
    }

    for (const [lineName, constraintId] of Array.from(this.lineDirectionConstraints.entries())) {
      if (linesToDelete.has(lineName) || !this.state.getLine(lineName) || !this.state.getConstraint(constraintId)) {
        this.lineDirectionConstraints.delete(lineName);
      }
    }

    const changed = result.points + result.lines + result.lineSegments + result.constraints > 0;
    if (changed) {
      this.solveConstraints();
      this.refreshRenderer();
    }

    return result;
  }

  addLineSegment(name: string, startName: string, endName: string) {
    const start = this.state.getPoint(startName);
    const end = this.state.getPoint(endName);
    if (!start || !end) {
      throw new Error(`Line segment ${name} requires existing points ${startName} and ${endName}`);
    }
    const line = new LineSegmentEntity(name, start, end);
    this.state.addLineSegment(line);
    this.refreshRenderer();
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
    this.refreshRenderer();
  }

  addLine(name: string, rootName: string, directionName: string) {
    const root = this.state.getPoint(rootName);
    if (!root) {
      throw new Error(`Line ${name} requires existing point ${rootName}`);
    }
    const directionPoint = this.state.getPoint(directionName);
    if (!directionPoint) {
      throw new Error(`Line ${name} requires existing point ${directionName}`);
    }
    const line = new LineEntity(name, root, directionPoint);
    this.state.addLine(line);
    this.refreshRenderer();
    return line;
  }

  updateLine(name: string, rootName: string, directionName: string) {
    const line = this.state.getLine(name);
    if (!line) {
      throw new Error(`Line ${name} does not exist`);
    }
    const root = this.state.getPoint(rootName);
    if (!root) {
      throw new Error(`Line ${name} requires existing point ${rootName}`);
    }
    const directionPoint = this.state.getPoint(directionName);
    if (!directionPoint) {
      throw new Error(`Line ${name} requires existing point ${directionName}`);
    }
    line.setPoints(root, directionPoint);
    this.refreshLineDirectionConstraint(name);
    this.solveConstraints();
    this.refreshRenderer();
    return line;
  }

  addLineFromSegment(name: string, segmentName: string) {
    const segment = this.state.getLineSegment(segmentName);
    if (!segment) {
      throw new Error(`Line ${name} requires existing line segment ${segmentName}`);
    }
    const line = new LineEntity(name, segment);
    this.state.addLine(line);
    this.refreshRenderer();
    return line;
  }

  updateLineFromSegment(name: string, segmentName: string) {
    const line = this.state.getLine(name);
    if (!line) {
      throw new Error(`Line ${name} does not exist`);
    }
    const segment = this.state.getLineSegment(segmentName);
    if (!segment) {
      throw new Error(`Line ${name} requires existing line segment ${segmentName}`);
    }
    line.setPoints(segment.start, segment.end);
    this.refreshLineDirectionConstraint(name);
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
      this.ensureLineDirectionConstraint(resolvedA.lineName ?? sourceA.name);
    }
    if (resolvedB.type === 'line') {
      this.ensureLineDirectionConstraint(resolvedB.lineName ?? sourceB.name);
    }

    const constraint = new PerpendicularConstraint(resolvedA, resolvedB);
    this.state.addConstraint(constraint);
    this.solveConstraints();
    this.refreshRenderer();
    return constraint;
  }

  addParallelConstraint(
    sourceA: { type: 'line' | 'lineSegment'; name: string },
    sourceB: { type: 'line' | 'lineSegment'; name: string }
  ) {
    const resolvedA = this.resolveParallelSource(sourceA);
    const resolvedB = this.resolveParallelSource(sourceB);

    if (resolvedA.type === 'line') {
      this.ensureLineDirectionConstraint(resolvedA.lineName ?? sourceA.name);
    }
    if (resolvedB.type === 'line') {
      this.ensureLineDirectionConstraint(resolvedB.lineName ?? sourceB.name);
    }

    const constraint = new ParallelConstraint(resolvedA, resolvedB);
    this.state.addConstraint(constraint);
    this.solveConstraints();
    this.refreshRenderer();
    return constraint;
  }

  addEqualLengthConstraint(segmentAName: string, segmentBName: string) {
    const sourceA = this.resolveEqualLengthSource(segmentAName);
    const sourceB = this.resolveEqualLengthSource(segmentBName);

    const constraint = new EqualLengthConstraint(sourceA, sourceB);
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

  clear() {
    this.state.clear();
    this.lockedPointConstraints.clear();
    this.lineDirectionConstraints.clear();
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
      return {
        type: 'line',
        start: line.root.name,
        end: line.directionPoint.name,
        lineName: source.name,
      };
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

  private resolveParallelSource(source: { type: 'line' | 'lineSegment'; name: string }): ParallelSource {
    if (source.type === 'line') {
      const line = this.state.getLine(source.name);
      if (!line) {
        throw new Error(`Line ${source.name} does not exist`);
      }
      return {
        type: 'line',
        start: line.root.name,
        end: line.directionPoint.name,
        lineName: source.name,
      };
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

  private resolveEqualLengthSource(segmentName: string): EqualLengthSource {
    const segment = this.state.getLineSegment(segmentName);
    if (!segment) {
      throw new Error(`Line segment ${segmentName} does not exist`);
    }
    return {
      start: segment.start.name,
      end: segment.end.name,
      segmentName,
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
    const constraint = new LineDirectionMagnitudeConstraint(line.root.name, line.directionPoint.name, length);
    this.state.addConstraint(constraint);
    this.lineDirectionConstraints.set(lineName, constraint.id);
  }

  private refreshLineDirectionConstraint(lineName: string) {
    const existingId = this.lineDirectionConstraints.get(lineName);
    if (!existingId) return;
    if (this.state.getConstraint(existingId)) {
      this.state.removeConstraint(existingId);
    }
    this.lineDirectionConstraints.delete(lineName);
    this.ensureLineDirectionConstraint(lineName);
  }

  private refreshRenderer() {
    this.renderer.render(this.state);
  }

  getState() {
    return this.state;
  }
}
