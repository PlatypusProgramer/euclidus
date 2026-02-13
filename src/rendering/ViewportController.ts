import type * as PIXI from 'pixi.js';
import type { Camera } from '../utils/Camera';
import type { ViewportOverlay } from '../utils/ViewportOverlay';

type RefreshOptions = { updatePointVisuals?: boolean };

export class ViewportController {
  private camera: Camera;
  private overlay: ViewportOverlay;
  private worldLayer: PIXI.Container;
  private canvas: HTMLCanvasElement;
  private updatePointVisuals: () => void;
  private isPanning: boolean = false;
  private lastPanPointer: { x: number; y: number } | null = null;
  private zoomTarget: number | null = null;
  private zoomPointer: { x: number; y: number } | null = null;
  private zoomAnimationFrame: number | null = null;

  constructor(options: {
    camera: Camera;
    overlay: ViewportOverlay;
    worldLayer: PIXI.Container;
    canvas: HTMLCanvasElement;
    updatePointVisuals: () => void;
  }) {
    this.camera = options.camera;
    this.overlay = options.overlay;
    this.worldLayer = options.worldLayer;
    this.canvas = options.canvas;
    this.updatePointVisuals = options.updatePointVisuals;
  }

  init() {
    this.installPanHandlers();
    this.installZoomHandlers();
  }

  setCanvasSize(width: number, height: number) {
    this.camera.setCanvasSize(width, height);
  }

  refreshView(options: RefreshOptions = {}) {
    this.camera.applyTo(this.worldLayer);
    this.overlay.draw(this.worldLayer, this.canvas);
    if (options.updatePointVisuals) {
      this.updatePointVisuals();
    }
  }

  getCamera() {
    return this.camera;
  }

  private clampZoom(zoom: number) {
    return Math.min(20, Math.max(0.1, zoom));
  }

  private getScreenPosition(e: PointerEvent) {
    const rect = this.canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    return { screenX, screenY };
  }

  private getWorldPosition(e: PointerEvent) {
    const { screenX, screenY } = this.getScreenPosition(e);
    return this.camera.screenToWorld(screenX, screenY);
  }

  private installPanHandlers() {
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    this.canvas.addEventListener('pointerdown', (e) => {
      if (e.button !== 2) return;
      this.isPanning = true;
      this.lastPanPointer = { x: e.clientX, y: e.clientY };
      this.canvas.setPointerCapture(e.pointerId);
    });

    this.canvas.addEventListener('pointermove', (e) => {
      if (this.isPanning && this.lastPanPointer) {
        const dx = e.clientX - this.lastPanPointer.x;
        const dy = e.clientY - this.lastPanPointer.y;
        this.lastPanPointer = { x: e.clientX, y: e.clientY };

        const scale = this.camera.getScale();
        this.camera.panBy(-dx / scale, dy / scale);
        this.refreshView();
        return;
      }
    });

    const endPan = (e: PointerEvent) => {
      if (!this.isPanning) return;
      this.isPanning = false;
      this.lastPanPointer = null;
      try {
        this.canvas.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore if capture is already released.
      }
    };

    this.canvas.addEventListener('pointerup', endPan);
    this.canvas.addEventListener('pointercancel', endPan);
    this.canvas.addEventListener('pointerleave', endPan);
  }

  private installZoomHandlers() {
    this.canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();

        const rect = this.canvas.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;

        const zoomIntensity = 0.0015;
        const zoomFactor = Math.exp(-e.deltaY * zoomIntensity);
        const currentTarget = this.zoomTarget ?? this.camera.getZoom();
        this.zoomTarget = this.clampZoom(currentTarget * zoomFactor);
        this.zoomPointer = { x: screenX, y: screenY };

        if (this.zoomAnimationFrame === null) {
          this.animateZoom();
        }
      },
      { passive: false }
    );
  }

  private animateZoom() {
    if (this.zoomTarget === null || !this.zoomPointer) {
      this.zoomAnimationFrame = null;
      return;
    }

    const currentZoom = this.camera.getZoom();
    const delta = this.zoomTarget - currentZoom;
    const nextZoom = Math.abs(delta) < 0.0005 ? this.zoomTarget : currentZoom + delta * 0.2;

    const before = this.camera.screenToWorld(this.zoomPointer.x, this.zoomPointer.y);
    this.camera.setZoom(nextZoom);
    this.camera.applyTo(this.worldLayer);
    const after = this.camera.screenToWorld(this.zoomPointer.x, this.zoomPointer.y);
    this.camera.panBy(before.x - after.x, before.y - after.y);

    this.refreshView({ updatePointVisuals: true });

    if (nextZoom === this.zoomTarget) {
      this.zoomTarget = null;
      this.zoomAnimationFrame = null;
      return;
    }

    this.zoomAnimationFrame = requestAnimationFrame(() => this.animateZoom());
  }
}
