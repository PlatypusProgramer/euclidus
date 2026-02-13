import type { AppState } from '../application/state/AppState';
import type { Camera } from '../utils/Camera';

export type PointRenderStyle = {
  radius: number;
  color: number;
  hoverColor: number;
  selectedColor: number;
  selectedGlowColor: number;
  selectedGlowAlpha: number;
};
export type LineRenderStyle = {
  width: number;
  color: number;
  alpha: number;
  accentWidth: number;
  accentColor: number;
  accentAlpha: number;
  selectedWidth: number;
  selectedColor: number;
  selectedAlpha: number;
};
export type SegmentRenderStyle = {
  width: number;
  color: number;
  alpha: number;
  accentWidth: number;
  accentColor: number;
  accentAlpha: number;
  endpointRadius: number;
  endpointColor: number;
  endpointAlpha: number;
  selectedWidth: number;
  selectedColor: number;
  selectedAlpha: number;
  selectedEndpointColor: number;
  selectedEndpointAlpha: number;
};
export type ConstraintRenderStyle = {
  width: number;
  color: number;
  alpha: number;
  dash: number[];
  markerSize: number;
};

export type EntityRenderStyles = {
  point: PointRenderStyle;
  line: LineRenderStyle;
  segment: SegmentRenderStyle;
};

export type ConstraintRenderStyles = {
  fixedPoint: ConstraintRenderStyle;
  perpendicular: ConstraintRenderStyle;
  parallel: ConstraintRenderStyle;
  equalLength: ConstraintRenderStyle;
};

export type RenderStyles = {
  entities: EntityRenderStyles;
  constraints: ConstraintRenderStyles;
};

export type RenderContext = {
  state: AppState;
  camera: Camera;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  scale: number;
  styles: RenderStyles;
};

export function createDefaultRenderStyles(): RenderStyles {
  return {
    entities: {
      point: {
        radius: 6,
        color: 0xff8c00,
        hoverColor: 0xfff1c7,
        selectedColor: 0xfff3bc,
        selectedGlowColor: 0xffd27a,
        selectedGlowAlpha: 0.45,
      },
      line: {
        width: 1.35,
        color: 0xff8f7a,
        alpha: 0.85,
        accentWidth: 2.9,
        accentColor: 0xff8c00,
        accentAlpha: 0.95,
        selectedWidth: 3.6,
        selectedColor: 0xfff0b4,
        selectedAlpha: 0.98,
      },
      segment: {
        width: 4.4,
        color: 0x7b2f16,
        alpha: 0.74,
        accentWidth: 2.2,
        accentColor: 0xff9f3a,
        accentAlpha: 0.95,
        endpointRadius: 3.4,
        endpointColor: 0xffc776,
        endpointAlpha: 0.85,
        selectedWidth: 4.8,
        selectedColor: 0xfff0b4,
        selectedAlpha: 0.98,
        selectedEndpointColor: 0xfff6cc,
        selectedEndpointAlpha: 1,
      },
    },
    constraints: {
      fixedPoint: { width: 2, color: 0xffd8a3, alpha: 0.85, dash: [6, 6], markerSize: 10 },
      perpendicular: { width: 2, color: 0xffffff, alpha: 0.8, dash: [6, 6], markerSize: 10 },
      parallel: { width: 2, color: 0xffd2a1, alpha: 0.82, dash: [6, 6], markerSize: 10 },
      equalLength: { width: 2, color: 0xffbe73, alpha: 0.9, dash: [6, 6], markerSize: 10 },
    },
  };
}
