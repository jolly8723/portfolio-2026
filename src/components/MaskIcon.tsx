import type { CSSProperties } from 'react';

/**
 * Renders an SVG asset as a CSS mask so its colour comes from a (theme) token and
 * animates with theme transitions. The glyph shape is the asset itself.
 */
export function MaskIcon({ src, color, size = 16 }: { src: string; color: string; size?: number }) {
  const style: CSSProperties = {
    display: 'block',
    flex: 'none',
    width: size,
    height: size,
    backgroundColor: color,
    mask: `url("${src}") center / contain no-repeat`,
    WebkitMask: `url("${src}") center / contain no-repeat`,
  };
  return <span aria-hidden="true" style={style} />;
}
