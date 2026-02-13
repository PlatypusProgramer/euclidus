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
import {
  SelectionEngine,
  type SelectionApi,
  type SelectionHit,
  type SelectionMoveUpdate,
} from './SelectionEngine';

export class CanvasRenderer implements RendererPort {
  app!: PIXI.Application;
  private container: HTMLElement;
  private worldLayer!: PIXI.Container;
  private viewport!: ViewportController;
  private pointLayer!: PointLayer;
  private lineSegmentLayer!: LineSegmentLayer;
  private lineLayer!: LineLayer;
  private constraintLayer!: ConstraintLayer;
  private selectionEngine!: SelectionEngine;
  private selectionApi!: SelectionApi;
  private onSelectionMove?: (updates: SelectionMoveUpdate[]) => void;
  private onSelectionDelete?: (selectedIds: string[]) => void;
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
    });

    this.viewport.setCanvasSize(this.app.canvas.width, this.app.canvas.height);
    this.viewport.refreshView({ updatePointVisuals: true });
    this.viewport.init();

    this.selectionEngine = new SelectionEngine({
      camera,
      canvas: this.app.canvas as HTMLCanvasElement,
      hitTest: (worldX, worldY) => this.hitTestEntity(worldX, worldY),
      resolveMovablePointIds: (selectedIds) => this.resolvePointIdsForSelection(selectedIds),
      getPointById: (id) => {
        const point = this.pointLayer.getPointById(id);
        if (!point) return null;
        return { id: point.id, x: point.x, y: point.y };
      },
      movePoints: (updates) => {
        if (this.onSelectionMove) {
          this.onSelectionMove(updates);
          return;
        }
        for (const update of updates) {
          this.pointLayer.movePointById(update.id, update.x, update.y);
        }
      },
      deleteSelection: (selectedIds) => {
        if (this.onSelectionDelete) {
          this.onSelectionDelete(selectedIds);
        }
      },
      setHoveredPoint: (name) => {
        this.pointLayer.setHoveredPoint(name);
      },
    });
    this.selectionApi = this.selectionEngine.getApi();
    this.selectionApi.onChange((ids) => {
      this.applySelectionVisuals(ids);
    });
    this.selectionEngine.init();

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
    const lines = state.getAllLines();
    const segments = state.getAllLineSegments();
    const points = state.getAllPoints();

    this.lineLayer.sync(lines, ctx);
    this.lineSegmentLayer.sync(segments, ctx);
    this.constraintLayer.sync(state.getConstraints(), ctx);
    this.pointLayer.sync(points, ctx);

    const availableIds: string[] = [];
    for (const point of points) availableIds.push(point.id);
    for (const segment of segments) availableIds.push(segment.id);
    for (const line of lines) availableIds.push(line.id);
    this.selectionEngine.syncAvailableEntityIds(availableIds);
    this.applySelectionVisuals(this.selectionApi.getSelected());
  }

  setHoveredPoint(name: string | null) {
    this.pointLayer.setHoveredPoint(name);
  }

  setSelectionMoveHandler(handler: (updates: SelectionMoveUpdate[]) => void) {
    this.onSelectionMove = handler;
  }

  setSelectionDeleteHandler(handler: (selectedIds: string[]) => void) {
    this.onSelectionDelete = handler;
  }

  setPointDragHandler(handler: (name: string, x: number, y: number) => void) {
    this.onSelectionMove = (updates) => {
      for (const update of updates) {
        const point = this.pointLayer.getPointById(update.id);
        if (!point) continue;
        handler(point.label, update.x, update.y);
      }
    };
  }

  getSelectionApi() {
    return this.selectionApi;
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

  private hitTestEntity(worldX: number, worldY: number): SelectionHit | null {
    const point = this.pointLayer.getPointAt(worldX, worldY);
    if (point) {
      return { id: point.id, type: 'point', pointName: point.label };
    }

    const segment = this.lineSegmentLayer.getLineSegmentAt(worldX, worldY);
    if (segment) {
      return { id: segment.id, type: 'lineSegment' };
    }

    const line = this.lineLayer.getLineAt(worldX, worldY);
    if (line) {
      return { id: line.id, type: 'line' };
    }

    return null;
  }

  private resolvePointIdsForSelection(selectedIds: string[]) {
    const pointIds = new Set<string>();

    for (const id of selectedIds) {
      const point = this.pointLayer.getPointById(id);
      if (point) {
        pointIds.add(point.id);
        continue;
      }

      const segment = this.lineSegmentLayer.getLineSegmentById(id);
      if (segment) {
        pointIds.add(segment.startId);
        pointIds.add(segment.endId);
        continue;
      }

      const line = this.lineLayer.getLineById(id);
      if (line) {
        pointIds.add(line.rootId);
        pointIds.add(line.directionPointId);
      }
    }

    return Array.from(pointIds);
  }

  private applySelectionVisuals(ids: string[]) {
    this.pointLayer.setSelectedIds(ids);
    this.lineLayer.setSelectedIds(ids);
    this.lineSegmentLayer.setSelectedIds(ids);
  }
}
