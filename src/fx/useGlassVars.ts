import { useEffect } from 'react';
import { useFxParams } from './params';

/** Matches the --glass-on transition in Home.module.css (plus a little slack). */
const GLASS_FADE_MS = 700;

/** Mirrors the glass + surface parameters onto :root custom properties consumed by the CSS. */
export function useGlassVars() {
  const { glass, surfaces } = useFxParams();

  useEffect(() => {
    const s = document.documentElement.style;
    s.setProperty('--glass-blur', `${glass.blur}px`);
    s.setProperty('--glass-saturate', String(glass.saturate));
    s.setProperty('--glass-tint', String(glass.tint));
    s.setProperty('--glass-noise', String(glass.noise));
    s.setProperty('--glass-noise-size', `${Math.round(256 * glass.noiseScale)}px`);
    s.setProperty('--surface-backdrop', `blur(${surfaces.blur}px) saturate(${surfaces.saturate})`);
  }, [glass, surfaces]);

  // Toggling: fade via --glass-on, and only remove the panel's backdrop-filter
  // (data-glass="off") after the fade so the blur can animate out.
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--glass-on', glass.enabled ? '1' : '0');
    if (glass.enabled) {
      root.dataset.glass = 'on';
      return;
    }
    const firstRun = root.dataset.glass === undefined;
    if (firstRun) {
      root.dataset.glass = 'off';
      return;
    }
    const t = window.setTimeout(() => (root.dataset.glass = 'off'), GLASS_FADE_MS);
    return () => window.clearTimeout(t);
  }, [glass.enabled]);
}
