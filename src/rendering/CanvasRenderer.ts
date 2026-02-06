import * as PIXI from 'pixi.js';
import { Camera } from '../utils/Camera';
import { ViewportOverlay } from '../utils/ViewportOverlay';
import { PointLayer } from './PointLayer';
import { ViewportController } from './ViewportController';
import type { RendererPort } from '../application/ports/RendererPort';
import type { PointEntity } from '../domain/entities/PointEntity';
import type { LineEntity } from '../domain/entities/LineEntity';
import { LineLayer } from './LineLayer';

export class CanvasRenderer implements RendererPort {
  app!: PIXI.Application;
  private container: HTMLElement;
  private worldLayer!: PIXI.Container;
  private viewport!: ViewportController;
  private pointLayer!: PointLayer;
  private lineLayer!: LineLayer;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  async init() {
    this.app = new PIXI.Application();
    await this.app.init({
      width: this.container.clientWidth,
      height: this.container.clientHeight,
      backgroundColor: 0x1a1a1a,
      antialias: true,
    });

    this.container.appendChild(this.app.canvas as HTMLCanvasElement);

    this.worldLayer = new PIXI.Container();
    this.app.stage.addChild(this.worldLayer);

    const camera = new Camera(25); // 25 pixels per unit
    const overlay = new ViewportOverlay(camera);
    this.pointLayer = new PointLayer(this.worldLayer, camera);
    this.lineLayer = new LineLayer(this.worldLayer, camera);
    this.viewport = new ViewportController({
      camera,
      overlay,
      worldLayer: this.worldLayer,
      canvas: this.app.canvas as HTMLCanvasElement,
      updatePointVisuals: () => {
        this.pointLayer.updateAllVisuals();
        this.lineLayer.updateAllVisuals();
      },
    });

    this.viewport.setCanvasSize(this.app.canvas.width, this.app.canvas.height);
    this.viewport.refreshView({ updatePointVisuals: true });
    this.viewport.init();

    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.app.renderer.resize(width, height);

    this.viewport.setCanvasSize(this.app.canvas.width, this.app.canvas.height);
    this.viewport.refreshView();
  }

  addPoint(point: PointEntity) {
    this.pointLayer.addPoint(point.name, point.x, point.y);
  }

  updatePoint(point: PointEntity) {
    this.pointLayer.updatePoint(point.name, point.x, point.y);
    this.lineLayer.updateAllVisuals();
  }

  removePoint(label: string) {
    this.pointLayer.removePoint(label);
  }

  addLine(line: LineEntity) {
    this.lineLayer.addLine(line.name, line.start.x, line.start.y, line.end.x, line.end.y);
  }

  updateLine(line: LineEntity) {
    this.lineLayer.updateLine(line.name, line.start.x, line.start.y, line.end.x, line.end.y);
  }

  removeLine(name: string) {
    this.lineLayer.removeLine(name);
  }

  getAllPoints() {
    return this.pointLayer.getAllPoints();
  }

  getCamera() {
    return this.viewport.getCamera();
  }
}
