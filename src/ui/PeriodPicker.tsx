// בחירת תקופה לבחינה, "מ־" ו"עד", עם ברירת מחדל (כל הטווח) ואיקס אפור לאיפוס.
// אפשר להקליד "500 לפנה״ס", "-500" או "1600". אחיד בציר, בהשוואה ובגרף.
import { useEffect, useState } from 'react';
import { YEAR_MAX, YEAR_MIN } from '../components/Timeline';
import { yearText } from '../data';

export function parseYear(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const n = Number((t.match(/-?\d+/) || [''])[0]);
  if (!Number.isFinite(n) || !/\d/.test(t)) return null;
  const bc = /לפנה|לפני|BC|BCE/i.test(t) || t.startsWith('-');
  return bc ? -Math.abs(n) : n;
}

export default function PeriodPicker({ from, to, onChange, label = 'תקופה' }: {
  from: number; to: number; onChange: (from: number | undefined, to: number | undefined) => void; label?: string;
}) {
  const [a, setA] = useState(from === YEAR_MIN ? '' : yearText(from));
  const [b, setB] = useState(to === YEAR_MAX ? '' : yearText(to));
  useEffect(() => { setA(from === YEAR_MIN ? '' : yearText(from)); }, [from]);
  useEffect(() => { setB(to === YEAR_MAX ? '' : yearText(to)); }, [to]);
  const commit = (sa: string, sb: string) => {
    let f = parseYear(sa), t = parseYear(sb);
    if (f !== null) f = Math.max(YEAR_MIN, Math.min(f, YEAR_MAX - 1));
    if (t !== null) t = Math.min(YEAR_MAX, Math.max(t, YEAR_MIN + 1));
    if (f !== null && t !== null && f >= t) [f, t] = [t, f];
    onChange(f === null || f === YEAR_MIN ? undefined : f, t === null || t === YEAR_MAX ? undefined : t);
  };
  const isDefault = from === YEAR_MIN && to === YEAR_MAX;
  return (
    <form className="period" role="group" aria-label={label} onSubmit={(e) => { e.preventDefault(); commit(a, b); }}>
      <span className="label">{label}</span>
      <label className="period-f"><span className="period-l">מ־</span>
        <input className="clearable-input" value={a} placeholder={yearText(YEAR_MIN)} onChange={(e) => setA(e.target.value)} onBlur={() => commit(a, b)} onFocus={(e) => e.currentTarget.select()} aria-label={`${label}: משנה`} />
      </label>
      <label className="period-f"><span className="period-l">עד</span>
        <input className="clearable-input" value={b} placeholder={yearText(YEAR_MAX)} onChange={(e) => setB(e.target.value)} onBlur={() => commit(a, b)} onFocus={(e) => e.currentTarget.select()} aria-label={`${label}: עד שנה`} />
      </label>
      {/* איקס אפור, תמיד גלוי: חזרה לכל הטווח */}
      <button type="button" className="clearable-x period-x" aria-label={`איפוס: ${label}`} disabled={isDefault} onClick={() => { setA(''); setB(''); onChange(undefined, undefined); }}>×</button>
      <button type="submit" hidden>החלה</button>
    </form>
  );
}
