import { AppState } from './state/AppState';
import type { RendererPort } from './ports/RendererPort';
import { PointEntity } from '../domain/entities/PointEntity';
import { LineEntity } from '../domain/entities/LineEntity';

export class GeometryEngine {
  private renderer: RendererPort;
  private state: AppState;

  constructor(renderer: RendererPort, state: AppState = new AppState()) {
    this.renderer = renderer;
    this.state = state;
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
    this.renderer.updatePoint(point);
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

  addLine(name: string, startName: string, endName: string) {
    const start = this.state.getPoint(startName);
    const end = this.state.getPoint(endName);
    if (!start || !end) {
      throw new Error(`Line ${name} requires existing points ${startName} and ${endName}`);
    }
    const line = new LineEntity(name, start, end);
    this.state.addLine(line);
    this.renderer.addLine(line);
    return line;
  }

  updateLine(name: string, startName: string, endName: string) {
    const line = this.state.getLine(name);
    if (!line) {
      throw new Error(`Line ${name} does not exist`);
    }
    const start = this.state.getPoint(startName);
    const end = this.state.getPoint(endName);
    if (!start || !end) {
      throw new Error(`Line ${name} requires existing points ${startName} and ${endName}`);
    }
    line.setPoints(start, end);
    this.renderer.updateLine(line);
    return line;
  }

  removeLine(name: string) {
    const line = this.state.getLine(name);
    if (!line) return;
    this.state.removeLine(name);
    this.renderer.removeLine(name);
  }

  getState() {
    return this.state;
  }
}
