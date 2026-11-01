// שורת התפעול של כרטיס (דמות או יצירה): הקודם, המקום ברצף, הבא, ואיקס לסגירה. אייקונים קומפקטיים בפינה.
// חצים במקלדת לפי כיוון הקריאה (ימינה = הקודם), Esc סוגר.
import { useEffect } from 'react';
import IconButton, { IconRow } from '../ui/IconButton';

export type Nav = { pos: number; total: number; label: string; onPrev?: () => void; onNext?: () => void };

export default function CardNav({ nav, onClose }: { nav?: Nav; onClose: () => void }) {
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
  return (
    <div className="card-nav">
      {nav ? (
        <IconRow label="מעבר בין דמויות">
          <IconButton icon="prev" label="הקודם" disabled={!nav.onPrev} onClick={nav.onPrev} />
          <span className="icon-row-pos"><bdi className="num">{nav.pos}</bdi>/<bdi className="num">{nav.total}</bdi> {nav.label}</span>
          <IconButton icon="next" label="הבא" disabled={!nav.onNext} onClick={nav.onNext} />
        </IconRow>
      ) : <span />}
      <IconButton icon="close" label="סגירה" onClick={onClose} />
    </div>
  );
}
