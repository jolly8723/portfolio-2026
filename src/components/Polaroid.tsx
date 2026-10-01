import { useEffect, useRef, type CSSProperties, type KeyboardEvent, type PointerEvent, type RefObject } from 'react';
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

/** How much rapid back-and-forth travel (px) fully develops a photo (mouse/pen). */
const TRAVEL_TO_DEVELOP = 2400;
/** How many taps fully develop a photo (touch). */
const TAPS_TO_DEVELOP = 7;
/** A touch counts as a tap if it moves less than this and lifts within TAP_MS. */
const TAP_SLOP_PX = 10;
const TAP_MS = 400;

/*
 * "Rapid" shake gate (mouse/pen). A stroke (the travel between two direction reversals)
 * only counts when it is quicker than MAX_STROKE_MS and at least MIN_STROKE_PX long, and
 * only once the shake has built up rhythm: each rapid stroke adds 1 to an energy meter that
 * drains at ENERGY_DECAY per second, and strokes develop the photo only while energy ≥
 * ENERGY_GATE. Slow or lazy wiggles never reach the gate, so nothing develops.
 */
const MAX_STROKE_MS = 190;
const MIN_STROKE_PX = 40;
const ENERGY_DECAY = 3;
const ENERGY_GATE = 2;
/** Max drag distance from rest, px. */
const MAX_X = 150;
const MAX_Y = 60;

/** Scale spring: the "pop" when a photo finishes developing, and the press on each tap. */
const SCALE_K = 420;
const SCALE_DAMPING = 13;
const POP_VELOCITY = 0.95; // peaks around +4%
const TAP_PRESS_VELOCITY = -0.45; // brief ~2% dip

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Spring + develop simulation for one polaroid. Writes CSS variables on `el` each frame
 * (--dx, --dy, --tilt, --pop, --develop) and stops its rAF loop once everything settles.
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
    scale: 1,
    vs: 0,
    develop: 0, // target, 0..1
    shown: 0, // eased display value
    popped: false,
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
    el.style.setProperty('--pop', s.scale.toFixed(4));
    el.style.setProperty('--develop', s.shown.toFixed(4));
    el.dataset.developed = String(s.popped);
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

    // Fully developed: one springy pop.
    if (!s.popped && s.shown > 0.995) {
      s.popped = true;
      if (!reducedMotion()) s.vs += POP_VELOCITY;
    }
    s.vs += ((1 - s.scale) * SCALE_K - s.vs * SCALE_DAMPING) * dt;
    s.scale += s.vs * dt;

    write();

    const settled =
      !s.dragging &&
      Math.abs(s.x) < 0.1 &&
      Math.abs(s.y) < 0.1 &&
      Math.abs(s.vx) < 0.5 &&
      Math.abs(s.vy) < 0.5 &&
      Math.abs(s.tilt) < 0.05 &&
      Math.abs(s.scale - 1) < 0.0005 &&
      Math.abs(s.vs) < 0.005 &&
      Math.abs(s.develop - s.shown) < 0.001;
    if (settled) {
      s.x = s.y = s.vx = s.vy = s.tilt = s.vs = 0;
      s.scale = 1;
      s.shown = s.develop;
      if (s.develop >= 1) s.popped = true;
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
    /** One tap: a step of development plus a small alternating wobble and press. */
    tap() {
      s.develop = clamp(s.develop + 1 / TAPS_TO_DEVELOP, 0, 1);
      s.vx += (s.vx > 0 ? -1 : 1) * 380;
      if (!s.popped) s.vs += TAP_PRESS_VELOCITY;
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
 * A polaroid that develops as you play with it:
 *  - mouse/pen: grab and shake it rapidly sideways (slow wiggles don't count);
 *  - touch: tap it repeatedly (swipes still scroll the page);
 *  - keyboard: Enter/Space.
 * When fully developed it gives one springy scale pop. React renders once; motion is
 * written straight to CSS variables.
 */
export function Polaroid({ src, alt, rotate, index, style }: PolaroidProps) {
  const slotRef = useRef<HTMLDivElement>(null);
  const simRef = useRef<ShakeSim | null>(null);
  const touch = useRef({ pointerId: -1, x: 0, y: 0, t: 0 });
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
    return () => {
      sim.stop();
      simRef.current = null;
    };
  }, []);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const sim = simRef.current;
    if (!sim || e.button !== 0) return;

    if (e.pointerType === 'touch') {
      // Taps only; no capture, so a swipe that starts here still scrolls.
      touch.current = { pointerId: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp };
      return;
    }

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

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const sim = simRef.current;
    if (!sim) return;

    if (e.pointerType === 'touch') {
      const t = touch.current;
      if (e.pointerId !== t.pointerId) return;
      t.pointerId = -1;
      const moved = Math.hypot(e.clientX - t.x, e.clientY - t.y);
      if (moved <= TAP_SLOP_PX && e.timeStamp - t.t <= TAP_MS) sim.tap();
      return;
    }

    endDrag(e);
  };

  const endDrag = (e: PointerEvent<HTMLDivElement>) => {
    const sim = simRef.current;
    if (!sim) return;
    if (e.pointerType === 'touch') {
      touch.current.pointerId = -1; // e.g. the browser took over to scroll
      return;
    }
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
    sim.tap();
  };

  return (
    <div
      ref={slotRef}
      className={styles.slot}
      data-reveal=""
      style={{ ...style, '--i': index, '--rotate': `${rotate}deg` } as CSSProperties}
      role="button"
      tabIndex={0}
      aria-label={`Polaroid photo, tap or shake to develop: ${alt}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
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
