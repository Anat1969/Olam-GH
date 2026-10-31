// ציטוט מהמקור: התרגום לעברית קודם (מסומן כתרגום), והמקור המילולי באנגלית מתחתיו. האימות נעשה על המקור.
import type { Evidence } from '../data';
import { sourceById } from '../data';

export default function Quote({ ev, small = false, edge = '' }: { ev: Evidence; small?: boolean; edge?: string }) {
  const s = sourceById.get(ev.sourceId);
  const lead = /^[a-z(]/.test(ev.quote) ? '…' : '';
  return (
    <blockquote className={`quote${small ? ' quote-small' : ''}${edge ? ` ${edge}` : ''}`}>
      {ev.quoteHe && <p className="quote-he" dir="rtl">"{lead}{ev.quoteHe}" <span className="label">תרגום</span></p>}
      <span dir="ltr" lang="en" className={ev.quoteHe ? 'quote-orig' : undefined}>“{lead}{ev.quote}”</span>
      {s && <footer><a className="src-link" href={s.url} target="_blank" rel="noreferrer" dir="ltr">{s.title}</a></footer>}
    </blockquote>
  );
}
