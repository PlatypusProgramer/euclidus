import * as PIXI from 'pixi.js';
import { Camera } from '../utils/Camera';
import { ViewportOverlay } from '../utils/ViewportOverlay';
import { PointLayer } from './PointLayer';
import { ViewportController } from './ViewportController';
import type { RendererPort } from '../application/ports/RendererPort';
import { LineSegmentLayer } from './LineSegmentLayer';
import { LineLayer } from './LineLayer';
import { ConstraintLayer } from './ConstraintLayer';
import type { AppState } from '../application/state/AppState';
import { createDefaultRenderStyles, type RenderContext, type RenderStyles } from './RenderContext';

export class CanvasRenderer implements RendererPort {
  app!: PIXI.Application;
  private container: HTMLElement;
  private worldLayer!: PIXI.Container;
  private viewport!: ViewportController;
  private pointLayer!: PointLayer;
  private lineSegmentLayer!: LineSegmentLayer;
  private lineLayer!: LineLayer;
  private constraintLayer!: ConstraintLayer;
  private onPointDrag?: (name: string, x: number, y: number) => void;
  private lastState: AppState | null = null;
  private styles: RenderStyles = createDefaultRenderStyles();

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
    const lineContainer = new PIXI.Container();
    const segmentContainer = new PIXI.Container();
    const constraintContainer = new PIXI.Container();
    const pointContainer = new PIXI.Container();
    this.worldLayer.addChild(lineContainer, segmentContainer, constraintContainer, pointContainer);

    this.pointLayer = new PointLayer(pointContainer, camera);
    this.lineSegmentLayer = new LineSegmentLayer(segmentContainer, camera);
    this.lineLayer = new LineLayer(lineContainer, camera);
    this.constraintLayer = new ConstraintLayer(constraintContainer);
    this.viewport = new ViewportController({
      camera,
      overlay,
      worldLayer: this.worldLayer,
      canvas: this.app.canvas as HTMLCanvasElement,
      updatePointVisuals: () => {
        this.updateAllVisuals();
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
          this.pointLayer.movePoint(name, worldX, worldY);
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

  render(state: AppState) {
    this.lastState = state;
    const ctx = this.buildContext(state);
    this.lineLayer.sync(state.getAllLines(), ctx);
    this.lineSegmentLayer.sync(state.getAllLineSegments(), ctx);
    this.constraintLayer.sync(state.getConstraints(), ctx);
    this.pointLayer.sync(state.getAllPoints(), ctx);
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

  private buildContext(state: AppState): RenderContext {
    const camera = this.viewport.getCamera();
    return {
      state,
      camera,
      bounds: camera.getVisibleBounds(),
      scale: camera.getScale(),
      styles: this.styles,
    };
  }

  private updateAllVisuals() {
    if (!this.lastState) return;
    const ctx = this.buildContext(this.lastState);
    this.lineLayer.updateAllVisuals(ctx);
    this.lineSegmentLayer.updateAllVisuals(ctx);
    this.constraintLayer.updateAllVisuals(ctx);
    this.pointLayer.updateAllVisuals(ctx);
  }
}
