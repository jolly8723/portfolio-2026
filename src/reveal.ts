import { useEffect, type CSSProperties } from 'react';

/**
 * Text-entry animation. Spread `reveal(i)` onto an element; it fades/unblurs in when it
 * scrolls into view, staggered by `i` (index within its group). See index.css.
 */
export function reveal(i = 0) {
  return { 'data-reveal': '', style: { '--i': i } as CSSProperties };
}

/** Observes every [data-reveal] element on the page once and flags it visible on entry. */
export function useRevealObserver() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    );
    document.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}
