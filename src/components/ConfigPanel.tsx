import { useEffect, useState } from 'react';
import { ALGORITHM_LABELS, DITHER_ALGORITHMS, fxStore, useFxParams, type FxParams } from '../fx/params';
import styles from './ConfigPanel.module.css';

type Path = string[];

type Control =
  | { kind: 'range'; label: string; path: Path; min: number; max: number; step: number; unit?: string }
  | { kind: 'select'; label: string; path: Path; options: { value: string; label: string }[] }
  | { kind: 'toggle'; label: string; path: Path }
  | { kind: 'color'; label: string; path: Path };

interface Group {
  title: string;
  open?: boolean;
  controls: Control[];
}

const ditherControls = (root: string): Control[] => [
  {
    kind: 'select',
    label: 'Pattern',
    path: [root, 'dither', 'algorithm'],
    options: DITHER_ALGORITHMS.map((a) => ({ value: a, label: ALGORITHM_LABELS[a] })),
  },
  { kind: 'range', label: 'Cell size', path: [root, 'dither', 'pixelSize'], min: 1, max: 8, step: 1, unit: 'px' },
  { kind: 'range', label: 'Levels', path: [root, 'dither', 'levels'], min: 2, max: 16, step: 1 },
  { kind: 'range', label: 'Contrast', path: [root, 'dither', 'contrast'], min: 0.5, max: 2, step: 0.01 },
  { kind: 'range', label: 'Brightness', path: [root, 'dither', 'brightness'], min: 0, max: 2, step: 0.01 },
  { kind: 'toggle', label: 'Mono', path: [root, 'dither', 'mono'] },
  { kind: 'color', label: 'Mono colour', path: [root, 'dither', 'monoColor'] },
];

const gradientControls = (root: string): Control[] => [
  { kind: 'range', label: 'Speed', path: [root, 'gradient', 'speed'], min: 0, max: 3, step: 0.01 },
  { kind: 'range', label: 'Scale', path: [root, 'gradient', 'scale'], min: 0.1, max: 8, step: 0.01 },
  { kind: 'range', label: 'Warp', path: [root, 'gradient', 'warp'], min: 0, max: 3, step: 0.01 },
  { kind: 'range', label: 'Organic', path: [root, 'gradient', 'organic'], min: 0, max: 1, step: 0.01 },
  { kind: 'range', label: 'Spread', path: [root, 'gradient', 'spread'], min: 0.5, max: 5, step: 0.01 },
  { kind: 'range', label: 'Angle', path: [root, 'gradient', 'angle'], min: 0, max: 360, step: 1, unit: '°' },
];

const GROUPS: Group[] = [
  { title: 'Background · dither', open: true, controls: ditherControls('background') },
  { title: 'Background · gradient', open: true, controls: gradientControls('background') },
  {
    title: 'Landscape',
    controls: [
      { kind: 'toggle', label: 'Show', path: ['landscape', 'enabled'] },
      { kind: 'range', label: 'Height', path: ['landscape', 'height'], min: 200, max: 1400, step: 1, unit: 'px' },
    ],
  },
  {
    title: 'Glass panel',
    open: true,
    controls: [
      { kind: 'toggle', label: 'Show glass', path: ['glass', 'enabled'] },
      { kind: 'range', label: 'Blur', path: ['glass', 'blur'], min: 0, max: 80, step: 0.5, unit: 'px' },
      { kind: 'range', label: 'Saturate', path: ['glass', 'saturate'], min: 0.5, max: 2, step: 0.01 },
      { kind: 'range', label: 'Tint', path: ['glass', 'tint'], min: 0, max: 0.6, step: 0.005 },
      { kind: 'range', label: 'Grain', path: ['glass', 'noise'], min: 0, max: 1, step: 0.01 },
      { kind: 'range', label: 'Grain size', path: ['glass', 'noiseScale'], min: 0.2, max: 3, step: 0.01 },
    ],
  },
  {
    title: 'Surfaces',
    open: true,
    controls: [
      { kind: 'range', label: 'Blur', path: ['surfaces', 'blur'], min: 0, max: 30, step: 0.5, unit: 'px' },
      { kind: 'range', label: 'Saturate', path: ['surfaces', 'saturate'], min: 0.5, max: 2, step: 0.01 },
    ],
  },
  { title: 'Accent fill · dither', controls: ditherControls('accent') },
  { title: 'Accent fill · gradient', controls: gradientControls('accent') },
];

function get(params: FxParams, path: Path): unknown {
  return path.reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], params);
}

function format(v: number, step: number) {
  return step >= 1 ? String(v) : v.toFixed(step >= 0.1 ? 1 : 2);
}

function ControlRow({ control, params }: { control: Control; params: FxParams }) {
  const value = get(params, control.path);
  const set = (v: unknown) => fxStore.update(control.path, v);
  const id = control.path.join('-');

  switch (control.kind) {
    case 'range':
      return (
        <label className={styles.row} htmlFor={id}>
          <span className={styles.label}>
            {control.label}
            <span className={styles.value}>
              {format(value as number, control.step)}
              {control.unit}
            </span>
          </span>
          <input
            id={id}
            type="range"
            min={control.min}
            max={control.max}
            step={control.step}
            value={value as number}
            onChange={(e) => set(Number(e.target.value))}
          />
        </label>
      );
    case 'select':
      return (
        <label className={`${styles.row} ${styles.inline}`} htmlFor={id}>
          <span className={styles.label}>{control.label}</span>
          <select id={id} value={value as string} onChange={(e) => set(e.target.value)}>
            {control.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      );
    case 'toggle':
      return (
        <label className={`${styles.row} ${styles.inline}`} htmlFor={id}>
          <span className={styles.label}>{control.label}</span>
          <input id={id} type="checkbox" checked={value as boolean} onChange={(e) => set(e.target.checked)} />
        </label>
      );
    case 'color':
      return (
        <label className={`${styles.row} ${styles.inline}`} htmlFor={id}>
          <span className={styles.label}>{control.label}</span>
          <input id={id} type="color" value={value as string} onChange={(e) => set(e.target.value)} />
        </label>
      );
  }
}

/** ⌘/ (or Ctrl+/) toggles a live editor for the dither, gradient and glass parameters. */
export function ConfigPanel() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const params = useFxParams();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(params, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <aside className={styles.panel} data-open={open} aria-hidden={!open} inert={!open} aria-label="Visual settings">
      <header className={styles.head}>
        <p>Visual settings</p>
        <kbd className={styles.kbd}>⌘ /</kbd>
      </header>
      <div className={styles.scroll}>
        {GROUPS.map((g) => (
          <details key={g.title} className={styles.group} open={g.open}>
            <summary>{g.title}</summary>
            <div className={styles.controls}>
              {g.controls.map((c) => (
                <ControlRow key={c.path.join('.')} control={c} params={params} />
              ))}
            </div>
          </details>
        ))}
      </div>
      <footer className={styles.foot}>
        <button type="button" onClick={() => fxStore.reset()}>
          Reset
        </button>
        <button type="button" onClick={copy}>
          {copied ? 'Copied' : 'Copy JSON'}
        </button>
      </footer>
    </aside>
  );
}
