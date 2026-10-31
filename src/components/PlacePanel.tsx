// כל מה שקרה במקום אחד (עיר או ארץ), בהיררכיה: משפחת ידע, תחום, דמות, יצירות.
// הסדר: משפחות לפי fields.json, תחומים לפי מספר הגילויים, דמויות לפי השנה הראשונה.
import Rich from './Rich';
import DomainIcon from '../icons';
import { type Discovery, families, personById, rangeText, yearText, ANON } from '../data';

export default function PlacePanel({ title, subtitle, items, year, onPerson, children }: {
  title: string; subtitle?: string; items: Discovery[]; year: number; onPerson: (id: string) => void; children?: React.ReactNode;
}) {
  const people = new Set(items.flatMap((d) => d.personIds));
  const tree = families.map((f) => ({
    f,
    domains: f.domains.map((dm) => {
      const list = items.filter((d) => d.domainId === dm.id);
      const byPerson = new Map<string, Discovery[]>();
      // יצירה בלי יוצר ידוע נכנסת לקבוצה משלה (מפתח ריק), כדי שלא תיעלם מהמקום
      for (const d of list) for (const pid of d.personIds.length ? d.personIds : ['']) byPerson.set(pid, [...(byPerson.get(pid) || []), d]);
      const persons = [...byPerson.entries()].sort((a, b) => a[1][0].yearFrom - b[1][0].yearFrom);
      return { dm, count: list.length, persons };
    }).filter((x) => x.count > 0).sort((a, b) => b.count - a.count),
  })).filter((x) => x.domains.length > 0);

  return (
    <div className="card city-panel place-panel rise">
      <div className="city-head">
        <h2 className="city-title">{title} {subtitle && <span className="muted" dir="ltr">{subtitle}</span>}</h2>
      </div>
      <Rich as="p" className="pp-sum">{`**${items.length}** גילויים, **${people.size}** דמויות, **${tree.reduce((s, t) => s + t.domains.length, 0)}** תחומים.`}</Rich>
      {children}
      {tree.map(({ f, domains }) => (
        <section key={f.id} className="pp-family" style={{ '--fam': f.color } as React.CSSProperties}>
          <h3 className="pp-fam-title">{f.nameHe}</h3>
          {domains.map(({ dm, count, persons }) => (
            <div key={dm.id} className="pp-domain">
              <h4 className="pp-dom-title"><DomainIcon id={dm.id} />{dm.nameHe} <bdi className="num">{count}</bdi></h4>
              <ul className="pp-people">
                {persons.map(([pid, works]) => {
                  const p = personById.get(pid);
                  if (!p && pid) return null;
                  return (
                    <li key={pid || 'anon'}>
                      {p ? (
                        <button type="button" className="press pp-person" onClick={() => onPerson(pid)}>
                          <span className="pp-face">{p.imageUrl ? <img src={p.imageUrl} alt="" loading="lazy" /> : null}</span>
                          <span className="pp-name">{p.nameHe}</span>
                        </button>
                      ) : <span className="pp-person pp-anon"><span className="pp-face" /><span className="pp-name">{ANON}</span></span>}
                      <ul className="pp-works">
                        {works.map((d) => (
                          <li key={d.id} data-id={d.id} className={`pp-work${d.yearFrom > year ? ' is-hidden' : ''}`}>
                            <span className="find-year"><Rich>{rangeText(d)}</Rich></span> {d.title}
                            {d.yearFrom > year && <span className="label"> · עוד נעלם בשנת {yearText(year)}</span>}
                          </li>
                        ))}
                      </ul>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
