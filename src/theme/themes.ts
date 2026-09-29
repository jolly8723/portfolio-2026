/**
 * Theme registry. Each theme is the single source of truth for:
 *  - `tokens`: CSS custom properties applied on <html data-theme="…">
 *  - `fx`: colours fed to the WebGL dither renderers (background + accent fills)
 *
 * Adding a theme = adding an entry here (and its id to the inline script in index.html).
 * Dither parameters themselves are theme-independent and live in src/fx/params.ts.
 */

export type RGB = [number, number, number];
export type Scheme = 'light' | 'dark';

export interface ThemeFx {
  /** Three gradient stops (0, 0.5, 1) for the page background. */
  background: [string, string, string];
  /** Stops for small dithered fills (theme toggle, Copy Mail button). */
  accent: [string, string, string];
  /** Multiplied into the pixel-art landscape at the bottom of the page. */
  landscapeTint: string;
  /** 0–1 blend of the landscape over the gradient. */
  landscapeMix: number;
}

export interface Theme {
  id: string;
  label: string;
  scheme: Scheme;
  tokens: Record<string, string>;
  fx: ThemeFx;
}

export const THEME_TRANSITION_MS = 700;

const light: Theme = {
  id: 'light',
  label: 'Light',
  scheme: 'light',
  tokens: {
    '--page-bg': '#f2fbff',
    '--fg': '#001a4d',
    '--fg-strong': '#19202b',
    '--chip-bg': 'rgba(25, 32, 43, 0.1)',
    '--chip-bg-hover': 'rgba(25, 32, 43, 0.17)',
    '--panel-border': 'rgba(0, 0, 0, 0.2)',
    '--hairline': 'rgba(25, 32, 43, 0.2)',
    '--hairline-thin': 'rgba(25, 32, 43, 0.08)',
    '--row-bg': 'rgba(255, 255, 255, 0.12)',
    '--row-bg-hover': 'rgba(255, 255, 255, 0.4)',
    '--card-bg': 'rgba(255, 255, 255, 0.5)',
    '--card-bg-hover': 'rgba(255, 255, 255, 0.78)',
    '--card-border': 'rgba(255, 255, 255, 0)',
    '--card-shadow': 'rgba(0, 26, 77, 0.08)',
    '--exp-card-bg': 'rgba(255, 255, 255, 0.65)',
    '--placeholder': '#ececec',
    '--logo-bg': '#001a4d',
    '--polaroid-frame': '#ffffff',
    '--polaroid-border': 'rgba(25, 32, 43, 0.2)',
    '--polaroid-fill': '#19202b',
    '--contact-bg': 'rgba(255, 255, 255, 0.3)',
    '--contact-border': '#ffffff',
    '--toggle-bg': 'rgba(255, 255, 255, 0.2)',
    '--toggle-bg-hover': 'rgba(255, 255, 255, 0.55)',
    '--toggle-active': '#ffffff',
    '--toggle-icon': '#19202b',
    '--icon-doc': '#001a4d',
    '--icon-github': '#004b0f',
    '--icon-linkedin': '#0052f6',
    '--icon-x': '#595959',
    '--icon-spotify': '#06d957',
    '--noise-strength': '0.55',
    '--panel-sheen': 'rgba(255, 255, 255, 0.05)',
    '--panel-shade': 'rgba(0, 0, 0, 0)',
  },
  fx: {
    background: ['#f6fdff', '#dcf4ff', '#bfeefd'],
    accent: ['#ffffff', '#c4ebff', '#cef4fe'],
    landscapeTint: '#ffffff',
    landscapeMix: 1,
  },
};

const dark: Theme = {
  id: 'dark',
  label: 'Dark',
  scheme: 'dark',
  tokens: {
    '--page-bg': '#111516',
    '--fg': '#ffffff',
    '--fg-strong': '#ffffff',
    '--chip-bg': 'rgba(255, 255, 255, 0.1)',
    '--chip-bg-hover': 'rgba(255, 255, 255, 0.18)',
    '--panel-border': 'rgba(255, 255, 255, 0.2)',
    '--hairline': 'rgba(255, 255, 255, 0.1)',
    '--hairline-thin': 'rgba(255, 255, 255, 0.07)',
    '--row-bg': 'rgba(255, 255, 255, 0.05)',
    '--row-bg-hover': 'rgba(255, 255, 255, 0.1)',
    '--card-bg': 'rgba(255, 255, 255, 0.08)',
    '--card-bg-hover': 'rgba(255, 255, 255, 0.14)',
    '--card-border': 'rgba(255, 255, 255, 0.1)',
    '--card-shadow': 'rgba(0, 0, 0, 0.35)',
    '--exp-card-bg': 'rgba(255, 255, 255, 0.08)',
    '--placeholder': '#ffffff',
    '--logo-bg': '#ffffff',
    '--polaroid-frame': '#ffffff',
    '--polaroid-border': 'rgba(255, 255, 255, 0.2)',
    '--polaroid-fill': '#2c2c2c',
    '--contact-bg': 'rgba(255, 255, 255, 0.05)',
    '--contact-border': 'rgba(255, 255, 255, 0.2)',
    '--toggle-bg': 'rgba(255, 255, 255, 0.2)',
    '--toggle-bg-hover': 'rgba(255, 255, 255, 0.32)',
    '--toggle-active': 'rgba(255, 255, 255, 0.5)',
    '--toggle-icon': '#ffffff',
    '--icon-doc': '#ffffff',
    '--icon-github': '#0bfc3b',
    '--icon-linkedin': '#5c92ff',
    '--icon-x': '#f1f1f1',
    '--icon-spotify': '#06d957',
    '--noise-strength': '1',
    '--panel-sheen': 'rgba(255, 255, 255, 0.05)',
    '--panel-shade': 'rgba(6, 8, 9, 0.32)',
  },
  fx: {
    background: ['#0e1011', '#3d4345', '#0b0c0d'],
    accent: ['#1e2427', '#3b4a52', '#2a3439'],
    landscapeTint: '#4a5561',
    landscapeMix: 0.9,
  },
};

export const THEMES: Theme[] = [light, dark];
export const THEME_BY_ID: Record<string, Theme> = Object.fromEntries(THEMES.map((t) => [t.id, t]));

/** Which theme "system" resolves to for each OS colour scheme. */
export const SYSTEM_THEME: Record<Scheme, string> = { light: 'light', dark: 'dark' };

export function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.replace(/./g, (c) => c + c) : h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/**
 * Builds the stylesheet for every theme: token blocks, @property registrations
 * (so colour tokens interpolate instead of snapping) and the root transition.
 */
export function buildThemeStylesheet(): string {
  const names = new Set<string>();
  THEMES.forEach((t) => Object.keys(t.tokens).forEach((k) => names.add(k)));

  const isNumber = (v: string) => /^-?\d*\.?\d+$/.test(v.trim());
  const registrations = [...names]
    .map((name) => {
      const sample = light.tokens[name] ?? dark.tokens[name];
      const syntax = isNumber(sample) ? '<number>' : '<color>';
      const initial = syntax === '<number>' ? '0' : 'transparent';
      return `@property ${name} { syntax: '${syntax}'; inherits: true; initial-value: ${initial}; }`;
    })
    .join('\n');

  const blocks = THEMES.map((t) => {
    const body = Object.entries(t.tokens)
      .map(([k, v]) => `  ${k}: ${v};`)
      .join('\n');
    return `:root[data-theme="${t.id}"] {\n${body}\n}`;
  }).join('\n');

  const transition = [...names].map((n) => `${n} var(--theme-duration) var(--ease-theme)`).join(', ');

  return `${registrations}\n${blocks}\n:root { transition: ${transition}; }`;
}
