// הדמויות של התחומים שנבחרו: מי הם, ואז מתי, איפה ובאיזה תת-תחום, כמפתחות מיון.
// לחיצה על דמות פותחת את הכרטיס שלה ומסמנת את העיר שלה במפה.
import { useState } from 'react';
import DomainIcon from '../icons';
import { ANON, type Discovery, domainById, personById, yearText } from '../data';

type Sort = 'time' | 'place' | 'sub';
const SORTS: [Sort, string][] = [['time', 'לפי זמן'], ['place', 'לפי מקום'], ['sub', 'לפי תת-תחום']];
const era = (y: number) => (y < 0 ? 'העת העתיקה' : y < 500 ? 'עד 500' : y < 1500 ? '500 עד 1500' : y < 1800 ? '1500 עד 1800' : y < 1900 ? 'המאה ה-19' : y < 1950 ? '1900 עד 1950' : y < 2000 ? '1950 עד 2000' : 'מאז 2000');

export default function PeoplePanel({ title, items, year, onPick }: {
  title: string; items: Discovery[]; year: number; onPick: (d: Discovery) => void;
}) {
  const [sort, setSort] = useState<Sort>('time');
  const list = [...items].sort((a, b) => a.yearFrom - b.yearFrom);
  const key = (d: Discovery) => sort === 'time' ? era(d.yearFrom)
    : sort === 'place' ? (d.place ? `${d.place.country?.nameHe || ''}${d.place.country ? ' · ' : ''}${d.place.city.nameHe}` : 'בלי מקום מאומת')
    : `${domainById.get(d.domainId)?.nameHe} · ${domainById.get(d.domainId)?.subs?.find((s) => s.id === d.sub)?.nameHe || 'בלי תת-תחום'}`;
  const groups = new Map<string, Discovery[]>();
  for (const d of list) groups.set(key(d), [...(groups.get(key(d)) || []), d]);
  const ordered = sort === 'time' ? [...groups] : [...groups].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0], 'he'));
  const people = new Set(items.flatMap((d) => d.personIds)).size;

  return (
    <div className="card city-panel people-panel">
      <h2 className="city-title">{title}</h2>
      <p className="muted small"><bdi className="num">{people}</bdi> דמויות, <bdi className="num">{items.length}</bdi> גילויים. לחיצה על דמות פותחת את הכרטיס שלה ומסמנת את העיר.</p>
      <div className="seg people-sort" role="group" aria-label="מיון">
        {SORTS.map(([id, label]) => <button key={id} type="button" className="press chip" aria-pressed={sort === id} onClick={() => setSort(id)}>{label}</button>)}
      </div>
      <div className="people-groups">
        {ordered.map(([g, ds]) => (
          <section key={g} className="people-group">
            <h3 className="people-group-title">{g} <span className="muted">· <bdi className="num">{ds.length}</bdi></span></h3>
            <ul className="people-list">
              {ds.map((d) => {
                const ps = d.personIds.map((id) => personById.get(id)).filter((p): p is NonNullable<typeof p> => !!p);
                const face = ps[0]?.imageUrl || d.workImage?.url;
                return (
                  <li key={d.id}>
                    <button type="button" className={`press people-row${d.yearFrom > year ? ' is-later' : ''}`} data-id={d.id} onClick={() => onPick(d)}>
                      <span className="people-face">{face ? <img src={face} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} /> : <DomainIcon id={d.domainId} />}</span>
                      <span className="people-text">
                        <span className="people-name">{ps.map((p) => p.nameHe).join(' ו') || ANON}</span>
                        <span className="people-sub">{d.title.split(':')[0]} · <bdi className="num">{yearText(d.yearFrom)}</bdi>{d.place ? ` · ${d.place.city.nameHe}` : ''}</span>
                      </span>
                      <DomainIcon id={d.domainId} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
