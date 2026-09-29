import { useEffect, useRef } from 'react';

/**
 * Calls `tick(dt)` every animation frame (dt in seconds, clamped so returning to a
 * background tab doesn't cause a jump). dt is 0 when the user prefers reduced motion,
 * so renderers still redraw for theme tweens but the gradient stays still.
 */
export function useFrameLoop(tick: (dt: number) => void) {
  const tickRef = useRef(tick);

  useEffect(() => {
    tickRef.current = tick;
  });

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      tickRef.current(reduced.matches ? 0 : dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
}
