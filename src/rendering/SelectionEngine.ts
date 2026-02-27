import type { Camera } from '../utils/Camera';
import { addVec2, distanceSqVec2, subVec2 } from '../utils/vec2';

export type SelectionEntityType = 'point' | 'line' | 'lineSegment';

export type SelectionHit = {
  id: string;
  type: SelectionEntityType;
  pointName?: string;
};

export type PointPosition = {
  id: string;
  x: number;
  y: number;
};

export type SelectionMoveUpdate = {
  id: string;
  x: number;
  y: number;
};

export type SelectionApi = {
  getSelected(): string[];
  onChange(listener: (ids: string[]) => void): () => void;
  clear(): void;
  deleteSelected(): void;
};

type PointerSession = {
  pointerId: number;
  shiftKey: boolean;
  hit: SelectionHit | null;
  screenStart: { x: number; y: number };
  worldStart: { x: number; y: number };
  dragging: boolean;
  movablePointIds: string[];
  initialPointPositions: Map<string, { x: number; y: number }>;
};

export class SelectionEngine {
  private readonly camera: Camera;
  private readonly canvas: HTMLCanvasElement;
  private readonly hitTest: (worldX: number, worldY: number) => SelectionHit | null;
  private readonly resolveMovablePointIds: (selectedIds: string[]) => string[];
  private readonly getPointById: (id: string) => PointPosition | null;
  private readonly movePoints: (updates: SelectionMoveUpdate[]) => void;
  private readonly deleteSelection: (selectedIds: string[]) => void;
  private readonly setHoveredPoint: (name: string | null) => void;
  private readonly dragThresholdPx: number;

  private selectedIds: Set<string> = new Set();
  private availableIds: Set<string> = new Set();
  private listeners: Set<(ids: string[]) => void> = new Set();
  private activePointer: PointerSession | null = null;

  constructor(options: {
    camera: Camera;
    canvas: HTMLCanvasElement;
    hitTest: (worldX: number, worldY: number) => SelectionHit | null;
    resolveMovablePointIds: (selectedIds: string[]) => string[];
    getPointById: (id: string) => PointPosition | null;
    movePoints: (updates: SelectionMoveUpdate[]) => void;
    deleteSelection: (selectedIds: string[]) => void;
    setHoveredPoint: (name: string | null) => void;
    dragThresholdPx?: number;
  }) {
    this.camera = options.camera;
    this.canvas = options.canvas;
    this.hitTest = options.hitTest;
    this.resolveMovablePointIds = options.resolveMovablePointIds;
    this.getPointById = options.getPointById;
    this.movePoints = options.movePoints;
    this.deleteSelection = options.deleteSelection;
    this.setHoveredPoint = options.setHoveredPoint;
    this.dragThresholdPx = options.dragThresholdPx ?? 3;
  }

  init() {
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerup', this.onPointerUp);
    this.canvas.addEventListener('pointercancel', this.onPointerCancel);
    this.canvas.addEventListener('pointerleave', this.onPointerLeave);
  }

  getApi(): SelectionApi {
    return {
      getSelected: () => this.getSelected(),
      onChange: (listener) => this.onChange(listener),
      clear: () => this.clear(),
      deleteSelected: () => this.deleteSelectedByApi(),
    };
  }

  getSelected() {
    return Array.from(this.selectedIds);
  }

  syncAvailableEntityIds(ids: Iterable<string>) {
    this.availableIds = new Set(ids);
    if (this.selectedIds.size === 0) {
      return;
    }
    const next = new Set<string>();
    for (const id of this.selectedIds) {
      if (this.availableIds.has(id)) {
        next.add(id);
      }
    }
    if (next.size !== this.selectedIds.size) {
      this.selectedIds = next;
      this.emitSelectionChange();
    }
  }

  private onChange(listener: (ids: string[]) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private clear() {
    if (this.selectedIds.size === 0) {
      return;
    }
    this.selectedIds.clear();
    this.emitSelectionChange();
  }

  private deleteSelectedByApi() {
    if (this.selectedIds.size === 0) {
      return;
    }
    const ids = this.getSelected();
    this.deleteSelection(ids);
  }

  private emitSelectionChange() {
    const ids = this.getSelected();
    for (const listener of this.listeners) {
      listener(ids);
    }
  }

  private setSelection(next: Set<string>) {
    if (this.selectedIds.size === next.size && Array.from(this.selectedIds).every((id) => next.has(id))) {
      return;
    }
    this.selectedIds = next;
    this.emitSelectionChange();
  }

  private setSelectionSingle(id: string) {
    this.setSelection(new Set([id]));
  }

  private toggleSelection(id: string) {
    const next = new Set(this.selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.setSelection(next);
  }

  private onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) {
      return;
    }
    const world = this.getWorldPosition(e);
    const hit = this.hitTest(world.x, world.y);

    this.activePointer = {
      pointerId: e.pointerId,
      shiftKey: e.shiftKey,
      hit,
      screenStart: { x: e.clientX, y: e.clientY },
      worldStart: world,
      dragging: false,
      movablePointIds: [],
      initialPointPositions: new Map(),
    };

    this.canvas.setPointerCapture(e.pointerId);
  };

  private onPointerMove = (e: PointerEvent) => {
    if (this.activePointer && this.activePointer.pointerId === e.pointerId) {
      const active = this.activePointer;
      if (!active.dragging && this.shouldStartDrag(active, e)) {
        this.startDrag(active);
      }
      if (active.dragging) {
        this.applyDrag(active, e);
      }
      return;
    }

    if ((e.buttons & 2) !== 0) {
      this.setHoveredPoint(null);
      return;
    }
    const world = this.getWorldPosition(e);
    const hit = this.hitTest(world.x, world.y);
    this.setHoveredPoint(hit?.type === 'point' ? (hit.pointName ?? null) : null);
  };

  private onPointerUp = (e: PointerEvent) => {
    this.endPointerInteraction(e, true);
  };

  private onPointerCancel = (e: PointerEvent) => {
    this.endPointerInteraction(e, false);
  };

  private onPointerLeave = (e: PointerEvent) => {
    this.endPointerInteraction(e, false);
    if (!this.activePointer) {
      this.setHoveredPoint(null);
    }
  };

  private endPointerInteraction(e: PointerEvent, treatAsClick: boolean) {
    if (!this.activePointer || this.activePointer.pointerId !== e.pointerId) {
      return;
    }
    const active = this.activePointer;
    this.activePointer = null;

    try {
      this.canvas.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore if capture was already released.
    }

    if (active.dragging || !treatAsClick) {
      return;
    }

    if (active.hit) {
      if (active.shiftKey) {
        this.toggleSelection(active.hit.id);
      } else {
        this.setSelectionSingle(active.hit.id);
      }
      return;
    }

    if (!active.shiftKey) {
      this.clear();
    }
  }

  private shouldStartDrag(active: PointerSession, e: PointerEvent) {
    if (active.shiftKey) return false;
    if (!active.hit) return false;

    const distanceSq = distanceSqVec2(
      { x: e.clientX, y: e.clientY },
      { x: active.screenStart.x, y: active.screenStart.y }
    );
    return distanceSq >= this.dragThresholdPx * this.dragThresholdPx;
  }

  private startDrag(active: PointerSession) {
    if (!active.hit) {
      return;
    }

    if (this.selectedIds.has(active.hit.id)) {
      this.setSelection(new Set(this.selectedIds));
    } else {
      this.setSelectionSingle(active.hit.id);
    }

    const idsForDrag = this.selectedIds.has(active.hit.id) ? this.getSelected() : [active.hit.id];
    active.movablePointIds = this.resolveMovablePointIds(idsForDrag);
    if (active.movablePointIds.length === 0) {
      return;
    }

    active.initialPointPositions = new Map();
    for (const id of active.movablePointIds) {
      const point = this.getPointById(id);
      if (!point) continue;
      active.initialPointPositions.set(id, { x: point.x, y: point.y });
    }

    if (active.initialPointPositions.size === 0) {
      return;
    }

    active.dragging = true;
    this.setHoveredPoint(null);
  }

  private applyDrag(active: PointerSession, e: PointerEvent) {
    if (active.initialPointPositions.size === 0) {
      return;
    }
    const world = this.getWorldPosition(e);
    const delta = subVec2(world, active.worldStart);
    const updates: SelectionMoveUpdate[] = [];

    for (const [id, start] of active.initialPointPositions.entries()) {
      const next = addVec2({ x: start.x, y: start.y }, delta);
      updates.push({ id, x: next.x, y: next.y });
    }

    if (updates.length > 0) {
      this.movePoints(updates);
    }
  }

  private getWorldPosition(e: PointerEvent) {
    const rect = this.canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    return this.camera.screenToWorld(screenX, screenY);
  }
}
