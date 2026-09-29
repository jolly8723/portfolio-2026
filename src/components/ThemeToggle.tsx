import type { CSSProperties } from 'react';
import { DitherFill } from '../fx/DitherFill';
import { useTheme, type ThemeMode } from '../theme/useTheme';
import { MaskIcon } from './MaskIcon';
import styles from './ThemeToggle.module.css';

const OPTIONS: { mode: ThemeMode; label: string; icon: string; activeIcon: string }[] = [
  { mode: 'light', label: 'Light theme', icon: '/assets/icons/sun.svg', activeIcon: '/assets/icons/sun-fill.svg' },
  { mode: 'dark', label: 'Dark theme', icon: '/assets/icons/moon.svg', activeIcon: '/assets/icons/moon-fill.svg' },
  { mode: 'system', label: 'Match system', icon: '/assets/icons/monitor.svg', activeIcon: '/assets/icons/monitor.svg' },
];

export function ThemeToggle() {
  const { mode, setMode } = useTheme();
  const index = Math.max(0, OPTIONS.findIndex((o) => o.mode === mode));

  return (
    <div
      className={styles.toggle}
      role="radiogroup"
      aria-label="Colour theme"
      style={{ '--index': index } as CSSProperties}
    >
      <DitherFill />
      <span className={styles.indicator} aria-hidden="true" />
      {OPTIONS.map((o) => {
        const active = o.mode === mode;
        return (
          <button
            key={o.mode}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={o.label}
            title={o.label}
            className={styles.option}
            data-active={active}
            onClick={() => setMode(o.mode)}
          >
            <span className={styles.glyph} data-variant="idle">
              <MaskIcon src={o.icon} color="var(--toggle-icon)" />
            </span>
            <span className={styles.glyph} data-variant="active">
              <MaskIcon src={o.activeIcon} color="var(--toggle-icon)" />
            </span>
          </button>
        );
      })}
    </div>
  );
}
