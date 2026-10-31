// כרטיס דמות: תמונה עם רישיון, שנים ולוח שנה, גילויים עם ציטוט מהמקור, קשרים ומקורות.
import { useEffect, useRef } from 'react';
import Rich from './Rich';
import Editable from './Editable';
import Quote from './Quote';
import WorkImage from './WorkImage';
import CardNav, { type Nav } from './CardNav';
import {
  type Person, confidenceName, discoveriesOf, domainById, lifeText, linkVerb, linksOf, nodeLabel, personById, rangeText, sourceById,
} from '../data';

function SourceLink({ id }: { id: string }) {
  const s = sourceById.get(id);
  if (!s) return null;
  return <a className="src-link" href={s.url} target="_blank" rel="noreferrer" dir="ltr">{s.title}</a>;
}

export default function PersonCard({ person, onClose, onOpen, nav }: { person: Person; onClose: () => void; onOpen: (personId: string | undefined, discoveryId?: string) => void; nav?: Nav }) {
  const ref = useRef<HTMLElement>(null);
  const finds = discoveriesOf(person.id);
  const rel = linksOf(person.id);
  const allSources = [...new Set([...person.sources, ...finds.flatMap((d) => d.sources)])];

  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeRef.current(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => { ref.current?.focus({ preventScroll: true }); ref.current?.scrollTo({ top: 0 }); }, [person.id]);

  return (
    <aside className="person rise" ref={ref} tabIndex={-1} aria-label={`כרטיס דמות: ${person.nameHe}`}>
      <div className="person-head">
        <div className="crumbs">ציר הזמן / כרטיס דמות</div>
        <button type="button" className="press btn btn-quiet" onClick={onClose}>סגירה</button>
      </div>
      <CardNav nav={nav} />
      <div className="person-hero">
        <figure className="person-face">
          {person.imageUrl ? <img src={person.imageUrl} alt={person.nameHe} loading="lazy" /> : <div className="face-empty" />}
          {person.imageUrl && (
            <figcaption className="label">
              תמונה: <a href={person.imagePage || '#'} target="_blank" rel="noreferrer" dir="ltr">{(person.imageCredit || 'Wikimedia Commons').length > 48 ? (person.imageCredit || '').slice(0, 46) + '…' : (person.imageCredit || 'Wikimedia Commons')}</a>
              <br />רישיון: <span dir="ltr">{person.imageLicense}</span>
            </figcaption>
          )}
        </figure>
        <div>
          <h2 className="person-name">{person.nameHe}</h2>
          <div className="person-full" dir="ltr">{person.nameFull}</div>
          {person.nameHeSource === 'transliteration' && <div className="label">השם בעברית: תעתיק, כי אין שם עברי בוויקינתונים</div>}
          <dl className="facts">
            <div><dt className="label">שנים</dt><dd><Rich>{lifeText(person)}</Rich></dd></div>
            {person.calendar === 'julian' && <div><dt className="label">לוח שנה</dt><dd>התאריכים לפי <strong>הלוח היוליאני</strong></dd></div>}
            {person.birthPlace && (
              <div><dt className="label">מקום לידה</dt><dd>{person.birthPlace.nameHe || person.birthPlace.nameFull} <span className="muted" dir="ltr">{person.birthPlace.nameHe ? person.birthPlace.nameFull : ''}</span></dd></div>
            )}
            <div><dt className="label">תחומים</dt><dd>{person.domains.map((d) => domainById.get(d)?.nameHe).join(', ')}</dd></div>
          </dl>
        </div>
      </div>

      <h3 className="section-title">גילויים</h3>
      {finds.map((d) => (
        <article key={d.id} className="find">
          <div className="find-top">
            <span className="find-year"><Rich>{rangeText(d)}</Rich></span>
            <span className={`chip-tag tag-${d.domainId}`}>{domainById.get(d.domainId)?.nameHe}</span>
            {d.sub && <span className="chip-sub">{domainById.get(d.domainId)?.subs?.find((x) => x.id === d.sub)?.nameHe}</span>}
          </div>
          <h4 className="find-title"><Editable kind="discovery" id={d.id} field="title" value={d.title} rich={false} /></h4>
          <WorkImage d={d} />
          {d.novelty ? (
            <dl className="find-nc" aria-label="החידוש והתרומה">
              <div><dt className="label">החידוש</dt><dd><Editable kind="discovery" id={d.id} field="novelty" value={d.novelty} /></dd></div>
              <div><dt className="label">התרומה</dt><dd><Editable kind="discovery" id={d.id} field="contribution" value={d.contribution} /></dd></div>
            </dl>
          ) : <Editable as="p" className="find-text" kind="discovery" id={d.id} field="contribution" value={d.contribution} />}
          {d.personIds.length > 1 && (
            <p className="find-with">יחד עם {d.personIds.filter((id) => id !== person.id).map((id) => (
              <button key={id} type="button" className="press chip" onClick={() => onOpen(id)}>{personById.get(id)?.nameHe}</button>
            ))}</p>
          )}
          {d.place && (
            <p className="find-place">
              <span className="label">מקום פעילות</span> {d.place.nameHe} <span className="muted" dir="ltr">{d.place.nameFull}</span>{' '}
              <span className={`conf conf-${d.place.confidence}`}>{confidenceName[d.place.confidence]}</span>
            </p>
          )}
          {d.evidence.map((ev, i) => <Quote key={i} ev={ev} edge={`conf-edge-${d.confidence}`} />)}
        </article>
      ))}

      {rel.length > 0 && (
        <>
          <h3 className="section-title">קשרים</h3>
          {rel.map(({ link, outgoing, other }) => {
            const o = nodeLabel(other);
            return (
              <article key={link.id} className={`rel conf-edge-${link.confidence}`}>
                <div className="rel-top">
                  <span className="label">{linkVerb[link.type][outgoing ? 0 : 1]}</span>
                  <button type="button" className="press chip" onClick={() => onOpen(o.personId, o.discovery?.id)}>
                    {o.name}{o.year !== null ? ` · ${o.year < 0 ? `${-o.year} לפנה״ס` : o.year}` : ''}
                  </button>
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
        {allSources.map((id) => (
          <li key={id}><SourceLink id={id} /> <span className="label">נבדק {sourceById.get(id)?.accessedAt}</span></li>
        ))}
      </ul>
    </aside>
  );
}
