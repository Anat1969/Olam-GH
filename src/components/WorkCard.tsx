// כרטיס יצירה בלי יוצר ידוע (שיר עתיק, פסלים, מקדש): אותו מבנה כמו כרטיס דמות, אבל המרכז הוא היצירה.
// היוצר הלא ידוע מוצג במפורש: חור גלוי, לא שם מומצא.
import { useEffect, useRef } from 'react';
import Rich from './Rich';
import Editable from './Editable';
import Quote from './Quote';
import WorkImage from './WorkImage';
import CardNav, { type Nav } from './CardNav';
import { ANON, type Discovery, confidenceName, domainById, linkVerb, linksOfDiscovery, nodeLabel, rangeText, sourceById } from '../data';

export default function WorkCard({ d, onClose, onOpen, nav }: { d: Discovery; onClose: () => void; onOpen: (personId: string | undefined, discoveryId?: string) => void; nav?: Nav }) {
  const ref = useRef<HTMLElement>(null);
  const rel = linksOfDiscovery(d.id);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') closeRef.current(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);
  useEffect(() => { ref.current?.focus({ preventScroll: true }); ref.current?.scrollTo({ top: 0 }); }, [d.id]);
  const dom = domainById.get(d.domainId);
  return (
    <aside className="person work rise" ref={ref} tabIndex={-1} aria-label={`כרטיס יצירה: ${d.title}`}>
      <CardNav nav={nav} onClose={onClose} />
      <h2 className="person-name"><Editable kind="discovery" id={d.id} field="title" value={d.title} rich={false} /></h2>
      <WorkImage d={d} />
      <dl className="facts">
        <div><dt className="label">שנים</dt><dd><Rich>{rangeText(d)}</Rich></dd></div>
        <div><dt className="label">יוצר</dt><dd>{ANON} <span className="muted">· המקור לא מציין יוצר, ולכן לא ממציאים אחד</span></dd></div>
        <div><dt className="label">תחום</dt><dd>{dom?.nameHe}{d.sub ? ` / ${dom?.subs?.find((s) => s.id === d.sub)?.nameHe}` : ''}</dd></div>
        {d.place && <div><dt className="label">מקום</dt><dd>{d.place.nameHe} <span className="muted" dir="ltr">{d.place.nameFull}</span> <span className={`conf conf-${d.place.confidence}`}>{confidenceName[d.place.confidence]}</span></dd></div>}
      </dl>
      <article className="find">
        {d.novelty && (
          <dl className="find-nc" aria-label="החידוש והתרומה">
            <div><dt className="label">החידוש</dt><dd><Editable kind="discovery" id={d.id} field="novelty" value={d.novelty} /></dd></div>
            <div><dt className="label">התרומה</dt><dd><Editable kind="discovery" id={d.id} field="contribution" value={d.contribution} /></dd></div>
          </dl>
        )}
        {d.evidence.map((ev, i) => <Quote key={i} ev={ev} edge={`conf-edge-${d.confidence}`} />)}
      </article>
      {rel.length > 0 && (
        <>
          <h3 className="section-title">קשרים</h3>
          {rel.map(({ link, outgoing, other }) => {
            const o = nodeLabel(other);
            return (
              <article key={link.id} className={`rel conf-edge-${link.confidence}`}>
                <div className="rel-top">
                  <span className="label">{linkVerb[link.type][outgoing ? 0 : 1]}</span>
                  <button type="button" className="press chip" onClick={() => onOpen(o.personId, o.discovery?.id)}>{o.name}{o.year !== null ? ` · ${o.year < 0 ? `${-o.year} לפנה״ס` : o.year}` : ''}</button>
                  <span className={`conf conf-${link.confidence}`}>{confidenceName[link.confidence]}</span>
                </div>
                <Rich as="p" className="rel-text">{link.explanation}</Rich>
                {link.evidence.map((ev, i) => <Quote key={i} ev={ev} small />)}
              </article>
            );
          })}
        </>
      )}
      <h3 className="section-title">מקורות</h3>
      <ul className="src-list">
        {d.sources.map((id) => { const s = sourceById.get(id); return s ? <li key={id}><a className="src-link" href={s.url} target="_blank" rel="noreferrer" dir="ltr">{s.title}</a></li> : null; })}
      </ul>
    </aside>
  );
}
