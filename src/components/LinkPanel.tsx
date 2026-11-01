// פאנל של קשר שנבחר: הכלל (ציטוט מהמקור), התובנה והיישום. משותף להשוואה ולמפה.
import Rich from './Rich';
import Editable from './Editable';
import Quote from './Quote';
import { go } from '../route';
import { ANON, type End, type Link, confidenceName, endName, linkTypeName, linkVerb, personById, workParams, yearText } from '../data';
import IconButton from '../ui/IconButton';

export type Resolved = { link: Link; a: End; b: End; cross: boolean };

export default function LinkPanel({ selected, pick, set }: { selected: Resolved; pick: (personId: string) => void; set: (p: Record<string, string | undefined>) => void }) {
  // קצה בלי יוצר ידוע פותח את כרטיס היצירה בציר הזמן
  const who = (e: End) => (e.viaPerson ? personById.get(e.id)?.nameHe : e.d.personIds.map((id) => personById.get(id)?.nameHe).filter(Boolean).join(' ו')) || ANON;
  const openEnd = (e: End) => { const pid = e.viaPerson ? e.id : e.d.personIds[0]; if (pid) pick(pid); else go('timeline', workParams(e.d)); };
  return (
    <section className="link-panel rise" aria-label="הקשר שנבחר">
              {/* בן מי למי, בגדול ובהשחרה: מי, הפועל, ומי. מתחת לכל שם: היצירה והשנה. */}
              <div className="link-head">
                <span className="label">{linkTypeName[selected.link.type]} · {selected.cross ? 'חוצה תחום' : 'בתוך התחום'} · <span className={`conf conf-${selected.link.confidence}`}>{confidenceName[selected.link.confidence]}</span></span>
                <IconButton icon="close" label="ניקוי הבחירה" onClick={() => set({ l: undefined })} />
              </div>
              <h2 className="link-who">
                <button type="button" className="press link-end" onClick={() => openEnd(selected.a)}>
                  <span className="link-end-name">{who(selected.a)}</span>
                  <span className="link-end-work">{endName(selected.a)} · <bdi className="num">{yearText(selected.a.d.yearFrom)}</bdi></span>
                </button>
                <span className="link-verb">{linkVerb[selected.link.type][0]}</span>
                <button type="button" className="press link-end" onClick={() => openEnd(selected.b)}>
                  <span className="link-end-name">{who(selected.b)}</span>
                  <span className="link-end-work">{endName(selected.b)} · <bdi className="num">{yearText(selected.b.d.yearFrom)}</bdi></span>
                </button>
              </h2>
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
