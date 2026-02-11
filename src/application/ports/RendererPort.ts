import type { AppState } from '../state/AppState';

export interface RendererPort {
  render(state: AppState): void;
}
