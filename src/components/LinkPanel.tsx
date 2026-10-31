// פאנל של קשר שנבחר: הכלל (ציטוט מהמקור), התובנה והיישום. משותף להשוואה ולמפה.
import Rich from './Rich';
import Editable from './Editable';
import Quote from './Quote';
import { go } from '../route';
import { type End, type Link, confidenceName, endName, linkTypeName, workParams } from '../data';

export type Resolved = { link: Link; a: End; b: End; cross: boolean };

export default function LinkPanel({ selected, pick, set }: { selected: Resolved; pick: (personId: string) => void; set: (p: Record<string, string | undefined>) => void }) {
  // קצה בלי יוצר ידוע פותח את כרטיס היצירה בציר הזמן
  const openEnd = (e: End) => { const pid = e.viaPerson ? e.id : e.d.personIds[0]; if (pid) pick(pid); else go('timeline', workParams(e.d)); };
  return (
    <section className="link-panel rise" aria-label="הקשר שנבחר">
              <div className="link-head">
                <span className="label">{linkTypeName[selected.link.type]} · {selected.cross ? 'חוצה תחום' : 'בתוך התחום'}</span>
                <h2 className="link-title">
                  <button type="button" className="press chip" onClick={() => openEnd(selected.a)}>{endName(selected.a)}</button>
                  <span className="link-arrow" aria-hidden="true">←</span>
                  <button type="button" className="press chip" onClick={() => openEnd(selected.b)}>{endName(selected.b)}</button>
                </h2>
                <span className={`conf conf-${selected.link.confidence}`}>{confidenceName[selected.link.confidence]}</span>
                <button type="button" className="press btn btn-quiet" onClick={() => set({ l: undefined })}>ניקוי בחירה</button>
              </div>
              <div className="grid-3">
                <div className="tone tone-neutral">
                  <h4>הכלל: למה הם קשורים</h4>
                  {selected.link.evidence.map((ev, i) => <Quote key={i} ev={ev} small />)}
                </div>
                <div className="tone tone-insight"><h4>התובנה: מה זה אומר</h4><Editable as="p" kind="link" id={selected.link.id} field="explanation" value={selected.link.explanation} /></div>
                <div className="tone tone-solution"><h4>היישום: מה עושים עם זה</h4><Editable as="p" kind="link" id={selected.link.id} field="application" value={selected.link.application || 'עדיין לא נוסח יישום לקשר הזה.'} /></div>
              </div>
            </section>
  );
}
