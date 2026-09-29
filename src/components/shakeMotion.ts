/**
 * Phone-shake detection shared by all polaroids. Emits an impulse (signed, roughly -1..1)
 * each time the device's sideways acceleration reverses direction hard enough.
 * iOS requires permission from a user gesture, so call `enableShakeMotion()` from one.
 */

type Listener = (impulse: number) => void;

const listeners = new Set<Listener>();
let attached = false;
let lastSign = 0;
let lastEmit = 0;

const THRESHOLD = 9; // m/s², sideways, gravity excluded

function onMotion(e: DeviceMotionEvent) {
  const ax = e.acceleration?.x ?? null;
  if (ax === null || Math.abs(ax) < THRESHOLD) return;
  const sign = Math.sign(ax);
  const now = performance.now();
  if (sign !== lastSign && now - lastEmit > 90) {
    lastSign = sign;
    lastEmit = now;
    const impulse = Math.max(-1, Math.min(1, ax / 25));
    listeners.forEach((l) => l(impulse));
  }
}

function attach() {
  if (attached || typeof window === 'undefined' || !('DeviceMotionEvent' in window)) return;
  window.addEventListener('devicemotion', onMotion);
  attached = true;
}

type PermissionedMotion = typeof DeviceMotionEvent & { requestPermission?: () => Promise<'granted' | 'denied'> };

/** Safe to call repeatedly; only prompts (iOS) once per page load. */
export async function enableShakeMotion() {
  if (attached || typeof window === 'undefined' || !('DeviceMotionEvent' in window)) return;
  const DME = DeviceMotionEvent as PermissionedMotion;
  if (typeof DME.requestPermission === 'function') {
    try {
      if ((await DME.requestPermission()) !== 'granted') return;
    } catch {
      return;
    }
  }
  attach();
}

export function onShake(listener: Listener) {
  // Browsers without a permission gate (Android) can listen straight away.
  const DME = typeof window !== 'undefined' && 'DeviceMotionEvent' in window ? (DeviceMotionEvent as PermissionedMotion) : null;
  if (DME && typeof DME.requestPermission !== 'function') attach();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
