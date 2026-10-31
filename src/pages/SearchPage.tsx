// חיפוש לפי מילת מפתח: שדה אחד, תוצאות מקובצות (דמויות, גילויים, תתי תחומים, ערים), וכל תוצאה מובילה למקום שלה באפליקציה.
import { useEffect, useMemo, useRef, useState } from 'react';
import { discoveries } from '../data';
import { href, replace } from '../route';
import { markRange, search, type Hit } from '../search';

const GROUPS: [Hit['kind'], string][] = [['person', 'דמויות'], ['discovery', 'גילויים ויצירות'], ['sub', 'תתי תחומים'], ['city', 'ערים']];
const EXAMPLES = ['קירי', 'אסלאם', 'Kyoto', 'אבחון', 'בלט', 'קוונטים', 'וינה', 'Bach'];

function linkOf(h: Hit) {
  if (h.kind === 'person') {
    const d = discoveries.find((x) => x.personIds.includes(h.id))!;
    return href('timeline', { d: d.domainId, y: String(Math.max(d.yearFrom, d.yearTo)), p: h.id });
  }
  if (h.kind === 'discovery') {
    const d = h.d;
    return href('timeline', { d: d.domainId, y: String(d.yearTo), ...(d.personIds[0] ? { p: d.personIds[0] } : { w: d.id }) });
  }
  if (h.kind === 'sub') return href('timeline', { d: h.domainId, y: '2025', sub: h.sub });
  return href('map', { c: h.key, y: '2025' });
}

function Marked({ text, q }: { text: string; q: string }) {
  const r = markRange(text, q);
  if (!r) return <>{text}</>;
  return <>{text.slice(0, r[0])}<mark className="insight">{text.slice(r[0], r[1])}</mark>{text.slice(r[1])}</>;
}

export default function SearchPage({ params }: { params: Record<string, string> }) {
  const [q, setQ] = useState(params.q || '');
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { input.current?.focus(); }, []);
  // ניווט חיצוני (חזרה אחורה, קישור) מעדכן את השדה
  useEffect(() => { if ((params.q || '') !== q) setQ(params.q || ''); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.q]);
  useEffect(() => {
    const t = window.setTimeout(() => { if ((params.q || '') !== q) replace('search', { q: q || undefined }); }, 250);
    return () => window.clearTimeout(t);
  }, [q, params.q]);
  const hits = useMemo(() => search(q), [q]);
  const groups = GROUPS.map(([k, name]) => [k, name, hits.filter((h) => h.kind === k)] as const).filter(([, , xs]) => xs.length);

  return (
    <main className="page">
      <div className="crumbs"><a href="#/">בית</a> / חיפוש</div>
      <h1 className="page-title" aria-live="polite">{q.trim() ? (hits.length ? `${hits.length} תוצאות ל״${q.trim()}״.` : `אין תוצאות ל״${q.trim()}״.`) : 'חיפוש לפי מילת מפתח.'}</h1>
      <p className="page-sub lines">
        <span>שם של דמות, יצירה, תת-תחום, עיר או מושג, <strong>בעברית או בלועזית</strong>.</span>
        <span>החיפוש עובר גם על החידוש, התרומה והציטוטים המתורגמים.</span>
      </p>
      <label className="search search-big">
        <span className="label">מילת מפתח</span>
        <input ref={input} className="field" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="למשל: קירי, אסלאם, Kyoto" aria-describedby="search-help" />
      </label>
      {!q.trim() && (
        <div className="seg" id="search-help" aria-label="דוגמאות">
          {EXAMPLES.map((x) => <button key={x} type="button" className="press chip" onClick={() => setQ(x)}>{x}</button>)}
        </div>
      )}
      {groups.map(([k, name, xs]) => (
        <section key={k} className="search-group" aria-label={name}>
          <h2 className="section-title">{name} <bdi className="num muted">{xs.length}</bdi></h2>
          <ul className="search-list">
            {xs.map((h) => (
              <li key={h.kind + h.id}>
                <a className={`press search-hit kind-${h.kind}`} href={linkOf(h)} data-kind={h.kind} data-id={h.id}>
                  {h.kind === 'person' && h.person.imageUrl ? <img src={h.person.imageUrl} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} /> : h.kind === 'discovery' ? <i className={`lg-sq dom-${h.d.domainId}`} aria-hidden="true" /> : null}
                  <span className="search-text">
                    <span className="search-title"><Marked text={h.title} q={q} /></span>
                    <span className="search-detail">{h.detail}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
