import { useEffect, useRef, type CSSProperties, type KeyboardEvent, type PointerEvent, type RefObject } from 'react';
import { enableShakeMotion, onShake } from './shakeMotion';
import styles from './Polaroid.module.css';

interface PolaroidProps {
  src: string;
  alt: string;
  /** Resting rotation in degrees. */
  rotate: number;
  /** Stagger index for the entry animation. */
  index: number;
  style?: CSSProperties;
}

/** How much rapid back-and-forth travel (px) fully develops a photo. */
const TRAVEL_TO_DEVELOP = 2400;

/*
 * "Rapid" shake gate. A stroke (the travel between two direction reversals) only counts
 * when it is quicker than MAX_STROKE_MS and at least MIN_STROKE_PX long, and only once
 * the shake has built up rhythm: each rapid stroke adds 1 to an energy meter that drains
 * at ENERGY_DECAY per second, and strokes develop the photo only while energy ≥ ENERGY_GATE.
 * Slow or lazy wiggles never reach the gate, so nothing develops.
 */
const MAX_STROKE_MS = 190;
const MIN_STROKE_PX = 40;
const ENERGY_DECAY = 3;
const ENERGY_GATE = 2;
/** Max drag distance from rest, px. */
const MAX_X = 150;
const MAX_Y = 60;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Spring + develop simulation for one polaroid. Writes CSS variables on `el` each frame
 * (--dx, --dy, --tilt, --develop) and stops its rAF loop once everything settles.
 */
function createShakeSim(elRef: RefObject<HTMLElement | null>) {
  const s = {
    dragging: false,
    targetX: 0,
    targetY: 0,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    tilt: 0,
    develop: 0, // target, 0..1
    shown: 0, // eased display value
    running: false,
    raf: 0,
    lastT: 0,
  };

  const write = () => {
    const el = elRef.current;
    if (!el) return;
    el.style.setProperty('--dx', `${s.x.toFixed(2)}px`);
    el.style.setProperty('--dy', `${s.y.toFixed(2)}px`);
    el.style.setProperty('--tilt', `${s.tilt.toFixed(2)}deg`);
    el.style.setProperty('--develop', s.shown.toFixed(4));
    el.dataset.developed = String(s.shown > 0.995);
  };

  const step = (t: number) => {
    const dt = Math.min(0.033, (t - (s.lastT || t)) / 1000) || 1 / 60;
    s.lastT = t;

    // Spring toward the pointer while held, back to rest (with a little overshoot) when released.
    const tx = s.dragging ? s.targetX : 0;
    const ty = s.dragging ? s.targetY : 0;
    const k = s.dragging ? 900 : 260;
    const damping = s.dragging ? 48 : 16;
    s.vx += ((tx - s.x) * k - s.vx * damping) * dt;
    s.vy += ((ty - s.y) * k - s.vy * damping) * dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;

    // Lean into the motion like a print swung by its corner.
    const lean = clamp(s.vx * 0.022, -14, 14);
    s.tilt += (lean - s.tilt) * Math.min(1, dt * 14);

    s.shown += (s.develop - s.shown) * Math.min(1, dt * 3.2);
    write();

    const settled =
      !s.dragging &&
      Math.abs(s.x) < 0.1 &&
      Math.abs(s.y) < 0.1 &&
      Math.abs(s.vx) < 0.5 &&
      Math.abs(s.vy) < 0.5 &&
      Math.abs(s.tilt) < 0.05 &&
      Math.abs(s.develop - s.shown) < 0.001;
    if (settled) {
      s.x = s.y = s.vx = s.vy = s.tilt = 0;
      s.shown = s.develop;
      write();
      s.running = false;
      s.lastT = 0;
      return;
    }
    s.raf = requestAnimationFrame(step);
  };

  const kick = () => {
    if (s.running) return;
    s.running = true;
    s.raf = requestAnimationFrame(step);
  };

  return {
    state: s,
    write,
    kick,
    addTravel(px: number) {
      s.develop = clamp(s.develop + px / TRAVEL_TO_DEVELOP, 0, 1);
      kick();
    },
    impulse(vx: number) {
      s.vx += vx;
      kick();
    },
    grab(targetX: number, targetY: number) {
      s.dragging = true;
      s.targetX = targetX;
      s.targetY = targetY;
      kick();
    },
    moveTo(targetX: number, targetY: number) {
      s.targetX = clamp(targetX, -MAX_X, MAX_X);
      s.targetY = clamp(targetY, -MAX_Y, MAX_Y);
    },
    release() {
      s.dragging = false;
      kick();
    },
    stop() {
      cancelAnimationFrame(s.raf);
      s.running = false;
      s.lastT = 0;
    },
  };
}

type ShakeSim = ReturnType<typeof createShakeSim>;

/**
 * A polaroid you grab and shake sideways to develop. Only strokes that end in a direction
 * reversal count, so dragging it somewhere doesn't develop it — shaking does.
 * Keyboard: Enter/Space shakes. On phones, shaking the device develops on-screen polaroids
 * too (see shakeMotion.ts). React renders once; motion is written straight to CSS variables.
 */
export function Polaroid({ src, alt, rotate, index, style }: PolaroidProps) {
  const slotRef = useRef<HTMLDivElement>(null);
  const simRef = useRef<ShakeSim | null>(null);
  const drag = useRef({
    pointerId: -1,
    startX: 0,
    startY: 0,
    lastX: 0,
    dir: 0,
    segment: 0,
    strokeStart: 0,
    energy: 0,
    energyT: 0,
  });

  useEffect(() => {
    const sim = createShakeSim(slotRef);
    simRef.current = sim;
    sim.write();
    const off = onShake((impulse) => {
      const r = slotRef.current?.getBoundingClientRect();
      if (!r || r.bottom < 0 || r.top > window.innerHeight) return;
      sim.impulse(impulse * 900);
      sim.addTravel(Math.abs(impulse) * 140);
    });
    return () => {
      off();
      sim.stop();
      simRef.current = null;
    };
  }, []);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const sim = simRef.current;
    if (!sim) return;
    if (e.button !== 0) return;
    if (e.pointerType === 'touch') void enableShakeMotion();
    const { x, y } = sim.state;
    drag.current = {
      pointerId: e.pointerId,
      startX: e.clientX - x,
      startY: e.clientY - y,
      lastX: e.clientX,
      dir: 0,
      segment: 0,
      strokeStart: e.timeStamp,
      energy: 0,
      energyT: e.timeStamp,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    slotRef.current!.dataset.dragging = 'true';
    sim.grab(x, y);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const sim = simRef.current;
    if (!sim) return;
    const d = drag.current;
    if (!sim.state.dragging || e.pointerId !== d.pointerId) return;
    sim.moveTo(e.clientX - d.startX, e.clientY - d.startY);

    const dx = e.clientX - d.lastX;
    d.lastX = e.clientX;
    if (Math.abs(dx) < 0.5) return;
    const dir = Math.sign(dx);
    if (d.dir !== 0 && dir !== d.dir) {
      // Direction reversed: judge the stroke that just ended.
      const now = e.timeStamp;
      d.energy = Math.max(0, d.energy - ((now - d.energyT) / 1000) * ENERGY_DECAY);
      d.energyT = now;
      const rapid = now - d.strokeStart <= MAX_STROKE_MS && d.segment >= MIN_STROKE_PX;
      if (rapid) {
        d.energy += 1;
        if (d.energy >= ENERGY_GATE) sim.addTravel(d.segment);
      } else {
        d.energy = 0;
      }
      d.segment = 0;
      d.strokeStart = now;
    }
    d.dir = dir;
    d.segment += Math.abs(dx);
  };

  const endDrag = (e: PointerEvent<HTMLDivElement>) => {
    const sim = simRef.current;
    if (!sim) return;
    const d = drag.current;
    if (!sim.state.dragging || e.pointerId !== d.pointerId) return;
    delete slotRef.current!.dataset.dragging;
    sim.release();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const sim = simRef.current;
    if (!sim) return;
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    sim.impulse((sim.state.vx >= 0 ? -1 : 1) * 700);
    sim.addTravel(260);
  };

  return (
    <div
      ref={slotRef}
      className={styles.slot}
      data-reveal=""
      style={{ ...style, '--i': index, '--rotate': `${rotate}deg` } as CSSProperties}
      role="button"
      tabIndex={0}
      aria-label={`Polaroid photo, shake to develop: ${alt}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={onKeyDown}
    >
      <div className={styles.card}>
        <div className={styles.photo}>
          <img src={src} alt={alt} draggable={false} loading="lazy" decoding="async" />
          <span className={styles.chemistry} aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
