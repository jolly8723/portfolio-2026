import { useEffect, useRef } from 'react';
import { DitherRenderer } from './DitherRenderer';
import { useFxParams } from './params';
import { useFrameLoop } from './useFrameLoop';
import { useTheme } from '../theme/useTheme';
import styles from './DitherFill.module.css';

/**
 * Animated dithered gradient that fills its positioned parent (used behind the theme
 * toggle and the Copy Mail button). Uses the "accent" parameter set and theme colours.
 */
export function DitherFill({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<DitherRenderer | null>(null);
  const sizeRef = useRef({ width: 0, height: 0 });
  const visibleRef = useRef(true);
  const params = useFxParams();
  const { theme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current!;
    const renderer = DitherRenderer.create(canvas);
    rendererRef.current = renderer;

    const host = canvas.parentElement!;
    const ro = new ResizeObserver(() => {
      sizeRef.current = { width: host.clientWidth, height: host.clientHeight };
    });
    ro.observe(host);
    const io = new IntersectionObserver(([entry]) => {
      visibleRef.current = entry.isIntersecting;
    });
    io.observe(host);

    return () => {
      ro.disconnect();
      io.disconnect();
      renderer?.dispose();
      rendererRef.current = null;
    };
  }, []);

  useEffect(() => {
    rendererRef.current?.setColors(theme.fx.accent);
  }, [theme]);

  useEffect(() => {
    rendererRef.current?.setParams(params.accent.dither, params.accent.gradient);
  }, [params.accent]);

  useFrameLoop((dt) => {
    const renderer = rendererRef.current;
    const canvas = canvasRef.current;
    const { width, height } = sizeRef.current;
    if (!renderer || !canvas || !width || !height || !visibleRef.current) return;
    const css = renderer.resize(width, height);
    canvas.style.width = `${css.width}px`;
    canvas.style.height = `${css.height}px`;
    renderer.frame(dt, { width, height, norm: Math.max(width, height) });
  });

  return <canvas ref={canvasRef} className={`${styles.canvas} ${className ?? ''}`} aria-hidden="true" />;
}
