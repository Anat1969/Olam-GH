// פאנל של קשר שנבחר: הכלל (ציטוט מהמקור), התובנה והיישום. משותף להשוואה ולמפה.
import Rich from './Rich';
import { type End, type Link, confidenceName, endName, linkTypeName, sourceById } from '../data';

export type Resolved = { link: Link; a: End; b: End; cross: boolean };

export default function LinkPanel({ selected, pick, set }: { selected: Resolved; pick: (personId: string) => void; set: (p: Record<string, string | undefined>) => void }) {
  return (
    <section className="link-panel rise" aria-label="הקשר שנבחר">
              <div className="link-head">
                <span className="label">{linkTypeName[selected.link.type]} · {selected.cross ? 'חוצה תחום' : 'בתוך התחום'}</span>
                <h2 className="link-title">
                  <button type="button" className="press chip" onClick={() => pick(selected.a.viaPerson ? selected.a.id : selected.a.d.personIds[0])}>{endName(selected.a)}</button>
                  <span className="link-arrow" aria-hidden="true">←</span>
                  <button type="button" className="press chip" onClick={() => pick(selected.b.viaPerson ? selected.b.id : selected.b.d.personIds[0])}>{endName(selected.b)}</button>
                </h2>
                <span className={`conf conf-${selected.link.confidence}`}>{confidenceName[selected.link.confidence]}</span>
                <button type="button" className="press btn btn-quiet" onClick={() => set({ l: undefined })}>ניקוי בחירה</button>
              </div>
              <div className="grid-3">
                <div className="tone tone-neutral">
                  <h4>הכלל: למה הם קשורים</h4>
                  {selected.link.evidence.map((ev, i) => (
                    <blockquote key={i} className="quote quote-small">
                      <span dir="ltr" lang="en">“{/^[a-z(]/.test(ev.quote) ? '…' : ''}{ev.quote}”</span>
                      <footer><a className="src-link" href={sourceById.get(ev.sourceId)?.url} target="_blank" rel="noreferrer" dir="ltr">{sourceById.get(ev.sourceId)?.title}</a></footer>
                    </blockquote>
                  ))}
                </div>
                <div className="tone tone-insight"><h4>התובנה: מה זה אומר</h4><Rich as="p">{selected.link.explanation}</Rich></div>
                <div className="tone tone-solution"><h4>היישום: מה עושים עם זה</h4><Rich as="p">{selected.link.application || 'עדיין לא נוסח יישום לקשר הזה.'}</Rich></div>
              </div>
            </section>
  );
}
