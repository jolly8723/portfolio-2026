import { useSyncExternalStore } from 'react';

/**
 * Tunable visual parameters, edited live from the ⌘/ panel and persisted to localStorage.
 * These are deliberately theme-independent: switching themes only swaps colours,
 * so the dither pattern stays identical across light and dark.
 */

export const DITHER_ALGORITHMS = ['bayer2', 'bayer4', 'bayer8', 'bayer16', 'noise', 'threshold'] as const;
export type DitherAlgorithm = (typeof DITHER_ALGORITHMS)[number];

export const ALGORITHM_LABELS: Record<DitherAlgorithm, string> = {
  bayer2: 'Bayer 2×2',
  bayer4: 'Bayer 4×4',
  bayer8: 'Bayer 8×8',
  bayer16: 'Bayer 16×16',
  noise: 'Gradient noise',
  threshold: 'Threshold',
};

export interface DitherParams {
  algorithm: DitherAlgorithm;
  /** Size of one dither cell in CSS pixels. */
  pixelSize: number;
  /** Quantisation levels per channel. */
  levels: number;
  contrast: number;
  brightness: number;
  mono: boolean;
  monoColor: string;
}

export interface GradientParams {
  /** Animation speed multiplier (0 = frozen). */
  speed: number;
  /** Noise frequency — higher = smaller blobs. */
  scale: number;
  /** Domain-warp strength. */
  warp: number;
  /** 0 = pure diagonal gradient, 1 = pure noise field. */
  organic: number;
  /** Stretches the field across the gradient stops. */
  spread: number;
  /** Direction of the diagonal component in degrees. */
  angle: number;
}

export interface FxParams {
  background: { dither: DitherParams; gradient: GradientParams };
  accent: { dither: DitherParams; gradient: GradientParams };
  landscape: { enabled: boolean; height: number };
  /** `enabled: false` removes the glass panel entirely — content sits straight on the dither. */
  /** Backdrop blur on the small translucent surfaces: chips, rows, cards, contact box, toggle. */
  surfaces: { blur: number; saturate: number };
  glass: { enabled: boolean; blur: number; saturate: number; tint: number; noise: number; noiseScale: number };
}

export const DEFAULT_PARAMS: FxParams = {
  background: {
    dither: { algorithm: 'bayer16', pixelSize: 2, levels: 8, contrast: 1, brightness: 1, mono: false, monoColor: '#ffffff' },
    gradient: { speed: 0.35, scale: 1.1, warp: 0.6, organic: 0.75, spread: 2.2, angle: 52 },
  },
  accent: {
    dither: { algorithm: 'bayer16', pixelSize: 1, levels: 8, contrast: 1, brightness: 1, mono: false, monoColor: '#ffffff' },
    gradient: { speed: 1.2, scale: 3.2, warp: 1, organic: 0.9, spread: 3, angle: 52 },
  },
  landscape: { enabled: true, height: 672 },
  surfaces: { blur: 8, saturate: 1.1 },
  glass: { enabled: true, blur: 28, saturate: 1.15, tint: 0.05, noise: 0.22, noiseScale: 0.9 },
};

const STORAGE_KEY = 'fx-params:v1';

type Listener = () => void;
const listeners = new Set<Listener>();

function mergeDeep<T>(base: T, patch: unknown): T {
  if (typeof base !== 'object' || base === null || typeof patch !== 'object' || patch === null) {
    return (patch === undefined || typeof patch !== typeof base ? base : patch) as T;
  }
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const key of Object.keys(out)) {
    out[key] = mergeDeep(out[key], (patch as Record<string, unknown>)[key]);
  }
  return out as T;
}

function load(): FxParams {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return mergeDeep(DEFAULT_PARAMS, JSON.parse(raw));
  } catch {
    /* ignore corrupt storage */
  }
  return DEFAULT_PARAMS;
}

let state: FxParams = load();

function emit() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable */
  }
  listeners.forEach((l) => l());
}

export const fxStore = {
  get: () => state,
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  /** Immutable update of a nested path, e.g. update(['glass', 'blur'], 20). */
  update(path: string[], value: unknown) {
    const set = (obj: unknown, i: number): unknown => {
      const copy = { ...(obj as Record<string, unknown>) };
      copy[path[i]] = i === path.length - 1 ? value : set(copy[path[i]], i + 1);
      return copy;
    };
    state = set(state, 0) as FxParams;
    emit();
  },
  reset() {
    state = DEFAULT_PARAMS;
    emit();
  },
};

export function useFxParams(): FxParams {
  return useSyncExternalStore(fxStore.subscribe, fxStore.get, fxStore.get);
}
