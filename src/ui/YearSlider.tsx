// סרגל שנה אחיד לכל האפליקציה: השנים רצות לאורכו (שנתות עם שנים), והשנה הנוכחית צפה מעל הידית.
// הסרגל דחוס כמו הציר (posScale), כדי שהעת העתיקה לא תבלע אותו.
import { useEffect, useRef, useState } from 'react';
import { posScale, YEAR_MAX, YEAR_MIN } from '../components/Timeline';
import { yearText } from '../data';

const MARKS = [-2500, -1000, 0, 1000, 1500, 1700, 1800, 1900, 1950, 2000];

export default function YearSlider({ value, onChange, from = YEAR_MIN, to = YEAR_MAX, label = 'שנה' }: {
  value: number; onChange: (y: number) => void; from?: number; to?: number; label?: string;
}) {
  const a = posScale(from), b = posScale(to);
  const pos = (y: number) => (posScale(y) - a) / Math.max(1e-6, b - a); // 0..1 מימין לשמאל
  // השנתות מסוננות לפי הרוחב האמיתי בפיקסלים (46 לפחות ביניהן ומהקצוות), כדי שלא יעלו זו על זו בסרגל צר
  const track = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(600);
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth || 600));
    ro.observe(el); setW(el.clientWidth || 600);
    return () => ro.disconnect();
  }, []);
  const gap = 46 / Math.max(1, w);
  // הקצוות: לפי אורך התווית בפועל ("2670 לפנה״ס" ארוכה בהרבה מ-"2025")
  const endGap = (y: number) => (Math.max(46, yearText(y).length * 7 + 18)) / Math.max(1, w);
  const marks: number[] = [];
  for (const m of MARKS.filter((x) => x > from && x < to)) {
    const pm = pos(m);
    if (pm < endGap(from) || pm > 1 - endGap(to)) continue;
    if (marks.length && pm - pos(marks[marks.length - 1]) < gap) continue;
    marks.push(m);
  }
  return (
    <div className="year-slider">
      <span className="label">{label}</span>
      <div className="ys-track" ref={track}>
        <output className="ys-now" style={{ insetInlineStart: `${pos(value) * 100}%` }}>{yearText(value)}</output>
        <input type="range" dir="rtl" min={0} max={1000} step={1} value={Math.round(pos(value) * 1000)} aria-label={label} aria-valuetext={yearText(value)}
          onChange={(e) => onChange(Math.round(posScale.invert(a + (Number(e.target.value) / 1000) * (b - a))))} />
        <div className="ys-marks" aria-hidden="true">
          <span style={{ insetInlineStart: '0%' }}>{yearText(from)}</span>
          {marks.map((m) => <span key={m} style={{ insetInlineStart: `${pos(m) * 100}%` }}>{m === 0 ? '1' : yearText(m)}</span>)}
          <span style={{ insetInlineStart: '100%' }}>{yearText(to)}</span>
        </div>
      </div>
    </div>
  );
}
