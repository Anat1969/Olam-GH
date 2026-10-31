// גילוי חדש כטיוטה, מתוך כפתור הלוגו. הטיוטה נשמרת בענן ולא מוצגת לציבור.
// הממשק בודק מיד את שני התנאים של סקריפט האימות: הציטוט מופיע במאמר, והשנה מופיעה בציטוט.
import { useEffect, useRef, useState } from 'react';
import { checkQuote, loadDrafts, saveDraft, yearTokens, type Draft } from '../cloud';
import { allDiscoveries, families } from '../data';

const EMPTY: Draft = { title: '', domainId: '', yearFrom: 0, yearTo: 0, person: '', article: '', quote: '', place: '', novelty: '', contribution: '' };
const imported = new Set(allDiscoveries.map((d) => (d as unknown as { draftId?: string }).draftId).filter(Boolean));

export default function DraftDialog({ onClose }: { onClose: () => void }) {
  const [d, setD] = useState<Draft>(EMPTY);
  const [yearTo, setYearTo] = useState('');
  const [quoteFound, setQuoteFound] = useState<boolean | null | 'checking'>(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [list, setList] = useState<{ id: string; data: Draft }[]>([]);
  const first = useRef<HTMLInputElement>(null);
  useEffect(() => {
    first.current?.focus();
    loadDrafts().then(setList).catch(() => setList([]));
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);

  const f = <K extends keyof Draft>(k: K) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const v = e.target.value;
    setD((x) => ({ ...x, [k]: k === 'yearFrom' ? Number(v) : v }));
    if (k === 'article' || k === 'quote') setQuoteFound(null);
  };
  const to = yearTo === '' ? d.yearFrom : Number(yearTo);
  const yearInQuote = !!d.quote && [...yearTokens(d.yearFrom), ...yearTokens(to)].some((t) => d.quote.includes(t));

  const check = async () => {
    if (!d.article || !d.quote) return null;
    setQuoteFound('checking');
    const r = await checkQuote(d.article, d.quote);
    setQuoteFound(r);
    return r;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(''); setMsg('');
    if (to < d.yearFrom) { setErr('שנת הסיום לפני שנת ההתחלה.'); return; }
    setBusy(true);
    try {
      const found = quoteFound === 'checking' || quoteFound === null ? await check() : quoteFound;
      const draft: Draft = { ...d, yearTo: to, check: { quoteFound: found, yearInQuote } };
      await saveDraft(draft);
      setMsg('הטיוטה נשמרה. היא תיכנס לאתר אחרי npm run drafts ו-npm run verify.');
      setD(EMPTY); setYearTo(''); setQuoteFound(null);
      setList(await loadDrafts().catch(() => []));
    } catch (x) { setErr((x as Error).message); } finally { setBusy(false); }
  };

  // null אחרי בדיקה = אין רשת לוויקיפדיה; הסקריפט יבדוק בכל מקרה
  const qState = quoteFound === 'checking' ? 'בודק…' : quoteFound === true ? 'הציטוט נמצא במאמר' : quoteFound === false ? 'הציטוט לא נמצא במאמר' : 'הציטוט ייבדק מול המאמר';
  return (
    <div className="dialog-back" onClick={onClose}>
      <form className="dialog dialog-wide card rise" dir="rtl" role="dialog" aria-label="גילוי חדש" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2 className="city-title">גילוי חדש, כטיוטה</h2>
        <p className="muted small lines">
          <span>הטיוטה <strong>לא מוצגת לציבור</strong>. היא נכנסת לאתר רק אחרי שהסקריפט מאמת את הציטוט מול המקור.</span>
          <span>המקור הוא מאמר בוויקיפדיה האנגלית. הציטוט מועתק ממנו מילה במילה, ובו השנה.</span>
        </p>
        <div className="draft-grid">
          <label className="search"><span className="label">כותרת</span><input ref={first} className="field" value={d.title} onChange={f('title')} required /></label>
          <label className="search"><span className="label">תחום</span>
            <select className="field" value={d.domainId} onChange={f('domainId')} required>
              <option value="">בחירה</option>
              {families.map((fam) => <optgroup key={fam.id} label={fam.nameHe}>{fam.domains.map((x) => <option key={x.id} value={x.id}>{x.nameHe}</option>)}</optgroup>)}
            </select>
          </label>
          <label className="search"><span className="label">שנה (לפנה״ס במינוס)</span><input className="field num" type="number" dir="ltr" value={d.yearFrom || ''} onChange={f('yearFrom')} required /></label>
          <label className="search"><span className="label">עד שנה (אם יש טווח)</span><input className="field num" type="number" dir="ltr" value={yearTo} onChange={(e) => setYearTo(e.target.value)} /></label>
          <label className="search"><span className="label">דמות: שם המאמר בוויקיפדיה</span><input className="field" dir="ltr" placeholder="Marie Curie" value={d.person} onChange={f('person')} required /></label>
          <label className="search"><span className="label">מקום: שם המאמר (רשות)</span><input className="field" dir="ltr" placeholder="Paris" value={d.place} onChange={f('place')} /></label>
          <label className="search span-2"><span className="label">מאמר המקור</span><input className="field" dir="ltr" placeholder="Radium" value={d.article} onChange={f('article')} onBlur={check} required /></label>
          <label className="search span-2"><span className="label">ציטוט מילולי מהמאמר</span><textarea className="field" dir="ltr" rows={3} value={d.quote} onChange={f('quote')} onBlur={check} required /></label>
        </div>
        <ul className="draft-checks" aria-live="polite">
          <li className={quoteFound === true ? 'ok' : quoteFound === false ? 'bad' : ''} data-check="quote">{qState}</li>
          <li className={d.quote ? (yearInQuote ? 'ok' : 'bad') : ''} data-check="year">{d.quote ? (yearInQuote ? 'השנה מופיעה בציטוט' : 'השנה לא מופיעה בציטוט') : 'השנה צריכה להופיע בציטוט'}</li>
        </ul>
        <label className="search"><span className="label">החידוש: מה היה ייחודי</span><textarea className="field" rows={2} value={d.novelty} onChange={f('novelty')} required /></label>
        <label className="search"><span className="label">התרומה: מה זה שינה</span><textarea className="field" rows={2} value={d.contribution} onChange={f('contribution')} required /></label>
        {err && <p className="tone tone-problem" role="alert">{err}</p>}
        {msg && <p className="tone edit-msg" role="status">{msg}</p>}
        <div className="seg">
          <button type="submit" className="press btn btn-primary" disabled={busy}>{busy ? 'שומרת…' : 'שמירת טיוטה'}</button>
          <button type="button" className="press btn" onClick={onClose}>סגירה</button>
        </div>
        {list.length > 0 && (
          <section aria-label="טיוטות">
            <h3 className="label">טיוטות בענן</h3>
            <ul className="draft-list">
              {list.map((r) => (
                <li key={r.id} data-id={r.id}>
                  <span>{r.data.title} <bdi className="num muted">{r.data.yearFrom < 0 ? `${-r.data.yearFrom} לפנה״ס` : r.data.yearFrom}</bdi></span>
                  <span className={`draft-state ${imported.has(r.id) ? 'ok' : ''}`}>{imported.has(r.id) ? 'נקלטה' : r.data.check?.quoteFound && r.data.check?.yearInQuote ? 'ממתינה לאימות' : 'צריכה תיקון'}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </form>
    </div>
  );
}
