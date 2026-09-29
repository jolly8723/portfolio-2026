import { useEffect, useRef, useState } from 'react';
import { DitherRenderer } from './DitherRenderer';
import { useFxParams } from './params';
import { useFrameLoop } from './useFrameLoop';
import { useTheme } from '../theme/useTheme';
import styles from './DitherBackground.module.css';

const LANDSCAPE_SRC = '/assets/bg/landscape.png';
const LANDSCAPE_MASK_SRC = '/assets/bg/landscape-mask.svg';

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Full-page dithered background. The canvas spans the whole document (not the viewport),
 * so the gradient and the landscape scroll natively with the content; each frame only the
 * visible band is redrawn.
 */
export function DitherBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<DitherRenderer | null>(null);
  const sizeRef = useRef({ width: 0, height: 0 });
  const fullRedraw = useRef(true);
  const [ready, setReady] = useState(false);
  const params = useFxParams();
  const { theme } = useTheme();

  // Create the renderer once.
  useEffect(() => {
    const canvas = canvasRef.current!;
    const renderer = DitherRenderer.create(canvas, { partial: true });
    rendererRef.current = renderer;
    if (!renderer) return;

    let cancelled = false;
    Promise.all([loadImage(LANDSCAPE_SRC), loadImage(LANDSCAPE_MASK_SRC)])
      .then(([image, maskSvg]) => {
        if (cancelled) return;
        // Rasterise the vertical fade mask; it is constant horizontally.
        const mask = document.createElement('canvas');
        mask.width = 16;
        mask.height = 670;
        mask.getContext('2d')!.drawImage(maskSvg, 0, 0, mask.width, mask.height);
        renderer.setLandscape({ image, mask, aspect: image.naturalWidth / image.naturalHeight });
        fullRedraw.current = true;
      })
      .catch((err) => console.warn('[dither] landscape failed to load', err));

    return () => {
      cancelled = true;
      renderer.dispose();
      rendererRef.current = null;
    };
  }, []);

  // Track the size of the page container (the canvas' offset parent).
  useEffect(() => {
    const host = canvasRef.current!.parentElement!;
    const measure = () => {
      sizeRef.current = { width: host.clientWidth, height: host.clientHeight };
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  // Theme colours: the first call applies instantly, later ones tween.
  useEffect(() => {
    rendererRef.current?.setColors(theme.fx.background, {
      tint: theme.fx.landscapeTint,
      mix: theme.fx.landscapeMix,
    });
  }, [theme]);

  useEffect(() => {
    rendererRef.current?.setParams(params.background.dither, params.background.gradient);
    fullRedraw.current = true;
  }, [params.background]);

  useFrameLoop((dt) => {
    const renderer = rendererRef.current;
    const canvas = canvasRef.current;
    const { width, height } = sizeRef.current;
    if (!renderer || !canvas || !width || !height) return;

    const css = renderer.resize(width, height);
    if (canvas.style.width !== `${css.width}px` || canvas.style.height !== `${css.height}px`) {
      canvas.style.width = `${css.width}px`;
      canvas.style.height = `${css.height}px`;
      fullRedraw.current = true;
    }

    const land = params.landscape;
    const scrollTop = canvas.getBoundingClientRect().top;
    const viewH = window.innerHeight;
    const margin = viewH * 0.5;
    const clip =
      fullRedraw.current || renderer.tweening
        ? undefined
        : { top: -scrollTop - margin, bottom: -scrollTop + viewH + margin };

    renderer.frame(
      dt,
      { width, height, norm: Math.max(window.innerWidth, viewH) },
      land.enabled ? { top: height - land.height, height: land.height } : undefined,
      clip,
    );
    fullRedraw.current = false;
    if (!ready) setReady(true);
  });

  return <canvas ref={canvasRef} className={styles.canvas} data-ready={ready} aria-hidden="true" />;
}
