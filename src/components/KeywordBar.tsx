// חיפוש קבוע בסרגל הראשי, באותו מקום בכל הדפים.
// השדה כותב מילת מפתח גלובלית. מתחת לסרגל: כמה גילויים ודמויות נמצאו בכל תחום, ולחיצה על תחום פותחת את הרשימה שלו.
// הדף הפתוח (ציר, השוואה, מפה, גרף) מדגיש את מה שנמצא.
import DomainIcon from '../icons';
import { useEffect, useRef, useState } from 'react';
import { ANON, personById, yearText } from '../data';
import { href, go } from '../route';
import { setKeyword, useKeyword, useMatches } from '../search';
import SearchInput from './SearchInput';

export function KeywordField() {
  const kw = useKeyword();
  const [v, setV] = useState(kw);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { setV(kw); }, [kw]);
  useEffect(() => {
    const t = window.setTimeout(() => setKeyword(v.trim() ? v : ''), 200);
    return () => window.clearTimeout(t);
  }, [v]);
  // "/" מכל מקום מתמקד בשדה
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey || el.closest('input, textarea, select, [contenteditable="true"]')) return;
      e.preventDefault();
      input.current?.focus();
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);
  return (
    <form className="kw-field" role="search" onSubmit={(e) => { e.preventDefault(); setKeyword(v.trim() ? v : ''); }}>
      {/* האיקס תמיד נראה, באפור בהיר, כדי שיידעו שהוא קיים. Esc מאפס, ולחיצה בשדה מסמנת את הטקסט. */}
      <SearchInput ref={input} className="kw-box" value={v} label="חיפוש לפי מילת מפתח" placeholder="חיפוש: דמות, יצירה, מושג, עיר"
        onChange={(x) => { setV(x); if (!x) setKeyword(''); }} />
    </form>
  );
}

export function KeywordStrip({ page }: { page: string }) {
  const m = useMatches();
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => { setOpen(null); }, [m.q, page]);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(null); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open]);
  if (!m.active) return null;
  const nD = m.discoveries.size, nP = m.persons.size;
  const where: Record<string, string> = { timeline: 'מודגשים על הציר', compare: 'מודגשים בהשוואה', map: 'מודגשים במפה', graph: 'מודגשים בגרף' };
  const sel = m.byDomain.find((x) => x.domainId === open);
  return (
    <div className="kw-strip" role="region" aria-label="תוצאות החיפוש" aria-live="polite">
      <div className="kw-strip-in">
        <span className="kw-sum">
          {nD ? <><strong>״{m.q.trim()}״</strong>: <bdi className="num">{nD}</bdi> גילויים, <bdi className="num">{nP}</bdi> דמויות{where[page] ? <span className="muted">, {where[page]}</span> : null}</> : <>אין תוצאות ל<strong>״{m.q.trim()}״</strong></>}
        </span>
        <div className="kw-doms" role="group" aria-label="לפי תחום">
          {m.byDomain.map((x) => (
            <button key={x.domainId} type="button" className={`press chip chip-dom dom-${x.domainId}`} aria-expanded={open === x.domainId} aria-pressed={open === x.domainId}
              onClick={() => setOpen(open === x.domainId ? null : x.domainId)}>
              <DomainIcon id={x.domainId} />{x.nameHe} <bdi className="num">{x.discoveries.length}</bdi>
            </button>
          ))}
          {nD > 0 && <a className="press chip kw-all" href={href('search', { q: m.q.trim() })}>כל התוצאות</a>}
        </div>
      </div>
      {sel && (
        <div className="kw-panel" role="dialog" aria-label={`תוצאות ב${sel.nameHe}`}>
          <ul className="kw-list">
            {sel.discoveries.map((d) => {
              const people = d.personIds.map((id) => personById.get(id)).filter((p): p is NonNullable<typeof p> => !!p);
              const lead = people[0];
              return (
                <li key={d.id}>
                  <button type="button" className="press kw-item" data-id={d.id}
                    onClick={() => { setOpen(null); go('timeline', { d: d.domainId, y: String(d.yearTo), ...(lead ? { p: lead.id } : { w: d.id }) }); }}>
                    {lead?.imageUrl ? <img src={lead.imageUrl} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} /> : <DomainIcon id={d.domainId} />}
                    <span className="kw-item-text">
                      <span className="kw-item-name">{people.map((p) => p.nameHe).join(' ו') || ANON}</span>
                      <span className="kw-item-sub">{d.title.split(':')[0]} · <bdi className="num">{yearText(d.yearFrom)}</bdi></span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
