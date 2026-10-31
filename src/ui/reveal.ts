// "לא רואה את השינוי כי צריך לגלול": כשפעולה משנה את התצוגה הראשית והיא מחוץ למסך,
// גוללים אליה. אם היא כבר גלויה, לא זזים. כלל אחד לכל הדפים.
import { useEffect, useRef } from 'react';

export function reveal(selector: string) {
  requestAnimationFrame(() => {
    const el = document.querySelector(selector) as HTMLElement | null;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const top = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--topbar-h')) || 53;
    const visible = Math.min(r.bottom, innerHeight) - Math.max(r.top, top);
    if (visible >= Math.min(r.height, innerHeight - top) * 0.45) return;
    el.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  });
}

/** גלילה לתצוגה כשאחד הערכים משתנה (לא בטעינה הראשונה) */
export function useRevealOnChange(selector: string, deps: unknown[]) {
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    reveal(selector);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
