import * as PIXI from 'pixi.js';
import { Camera } from '../utils/Camera';
import { ViewportOverlay } from '../utils/ViewportOverlay';
import { PointLayer } from './PointLayer';
import { ViewportController } from './ViewportController';
import type { RendererPort } from '../application/ports/RendererPort';
import type { PointEntity } from '../domain/entities/PointEntity';
import type { LineEntity } from '../domain/entities/LineEntity';
import type { LineSegmentEntity } from '../domain/entities/LineSegmentEntity';
import { LineSegmentLayer } from './LineSegmentLayer';
import { LineLayer } from './LineLayer';

export class CanvasRenderer implements RendererPort {
  app!: PIXI.Application;
  private container: HTMLElement;
  private worldLayer!: PIXI.Container;
  private viewport!: ViewportController;
  private pointLayer!: PointLayer;
  private lineSegmentLayer!: LineSegmentLayer;
  private lineLayer!: LineLayer;
  private onPointDrag?: (name: string, x: number, y: number) => void;

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
      // Prefer WebGL to avoid WebGPU init hangs in some hosted environments.
      preference: 'webgl',
      powerPreference: 'high-performance',
    });

    this.container.appendChild(this.app.canvas as HTMLCanvasElement);

    this.worldLayer = new PIXI.Container();
    this.app.stage.addChild(this.worldLayer);

    const camera = new Camera(25); // 25 pixels per unit
    const overlay = new ViewportOverlay(camera);
    this.pointLayer = new PointLayer(this.worldLayer, camera);
    this.lineSegmentLayer = new LineSegmentLayer(this.worldLayer, camera);
    this.lineLayer = new LineLayer(this.worldLayer, camera);
    this.viewport = new ViewportController({
      camera,
      overlay,
      worldLayer: this.worldLayer,
      canvas: this.app.canvas as HTMLCanvasElement,
      updatePointVisuals: () => {
        this.pointLayer.updateAllVisuals();
        this.lineSegmentLayer.updateAllVisuals();
        this.lineLayer.updateAllVisuals();
      },
      findPointAt: (worldX, worldY) => {
        const point = this.pointLayer.getPointAt(worldX, worldY);
        if (!point) return null;
        return { name: point.label, x: point.x, y: point.y };
      },
      setHoveredPoint: (name) => {
        this.pointLayer.setHoveredPoint(name);
      },
      movePoint: (name, worldX, worldY) => {
        if (this.onPointDrag) {
          this.onPointDrag(name, worldX, worldY);
        } else {
          this.pointLayer.updatePoint(name, worldX, worldY);
          this.lineSegmentLayer.updateAllVisuals();
          this.lineLayer.updateAllVisuals();
        }
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
  }

  removePoint(label: string) {
    this.pointLayer.removePoint(label);
  }

  addLineSegment(line: LineSegmentEntity) {
    this.lineSegmentLayer.addLine(line.name, line.start.x, line.start.y, line.end.x, line.end.y);
  }

  updateLineSegment(line: LineSegmentEntity) {
    this.lineSegmentLayer.updateLine(line.name, line.start.x, line.start.y, line.end.x, line.end.y);
  }

  removeLineSegment(name: string) {
    this.lineSegmentLayer.removeLine(name);
  }

  addLine(line: LineEntity) {
    this.lineLayer.addLine(line.name, line.root.x, line.root.y, line.direction.x, line.direction.y);
  }

  updateLine(line: LineEntity) {
    this.lineLayer.updateLine(line.name, line.root.x, line.root.y, line.direction.x, line.direction.y);
  }

  removeLine(name: string) {
    this.lineLayer.removeLine(name);
  }

  setHoveredPoint(name: string | null) {
    this.pointLayer.setHoveredPoint(name);
  }

  setPointDragHandler(handler: (name: string, x: number, y: number) => void) {
    this.onPointDrag = handler;
  }

  getAllPoints() {
    return this.pointLayer.getAllPoints();
  }

  getCamera() {
    return this.viewport.getCamera();
  }
}
