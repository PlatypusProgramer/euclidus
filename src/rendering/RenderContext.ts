import type { AppState } from '../application/state/AppState';
import type { Camera } from '../utils/Camera';

export type RenderStyles = {
  point: { radius: number; color: number; hoverColor: number };
  line: { width: number; color: number; alpha: number };
  segment: { width: number; color: number; alpha: number };
  constraint: { width: number; color: number; alpha: number; dash: number[]; markerSize: number };
};

export type RenderContext = {
  state: AppState;
  camera: Camera;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  scale: number;
  styles: RenderStyles;
};
