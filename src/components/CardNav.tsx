// מעבר בין דמויות באותו נושא: הקודם והבא לפי סדר הזמן, עם המקום ברצף. חצים במקלדת לפי כיוון הקריאה (ימינה = הקודם).
import { useEffect } from 'react';

export type Nav = { pos: number; total: number; label: string; onPrev?: () => void; onNext?: () => void };

export default function CardNav({ nav }: { nav?: Nav }) {
  useEffect(() => {
    if (!nav) return;
    const k = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, select, [contenteditable="true"], .tl-scroll')) return;
      if (e.key === 'ArrowRight' && nav.onPrev) { e.preventDefault(); nav.onPrev(); }
      if (e.key === 'ArrowLeft' && nav.onNext) { e.preventDefault(); nav.onNext(); }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [nav]);
  if (!nav) return null;
  return (
    <div className="card-nav" role="group" aria-label="מעבר בין דמויות">
      <button type="button" className="press btn" disabled={!nav.onPrev} onClick={nav.onPrev}>הקודם</button>
      <span className="card-nav-pos"><bdi className="num">{nav.pos}</bdi> מתוך <bdi className="num">{nav.total}</bdi> {nav.label}</span>
      <button type="button" className="press btn" disabled={!nav.onNext} onClick={nav.onNext}>הבא</button>
    </div>
  );
}
