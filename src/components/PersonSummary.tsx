// תקציר דמות בפורמט קבוע, זהה לכל הדמויות, כדי להשוות ביניהן ולראות את הייחודיות.
// הכול נגזר מהנתונים המאומתים: תחום ותת-תחום, תקופת פעילות, מקום, החידוש המרכזי, השפעה, ובני הזמן בתחום.
import Rich from './Rich';
import DomainIcon from '../icons';
import { type Person, discoveries, discoveriesOf, domainById, linksOf, personById, yearText } from '../data';

export default function PersonSummary({ person, onOpen }: { person: Person; onOpen: (id: string) => void }) {
  const ds = discoveriesOf(person.id);
  if (!ds.length) return null;
  const first = Math.min(...ds.map((d) => d.yearFrom)), last = Math.max(...ds.map((d) => d.yearTo));
  const doms = [...new Set(ds.map((d) => d.domainId))];
  const subs = [...new Set(ds.map((d) => domainById.get(d.domainId)?.subs?.find((s) => s.id === d.sub)?.nameHe).filter(Boolean))];
  const places = new Map<string, number>();
  ds.forEach((d) => { if (d.place) places.set(d.place.city.nameHe, (places.get(d.place.city.nameHe) || 0) + 1); });
  const place = [...places].sort((a, b) => b[1] - a[1])[0]?.[0];
  const rel = linksOf(person.id);
  const out = rel.filter((r) => r.outgoing).length, inn = rel.length - out;
  const lead = ds[0];
  // בני הזמן: דמויות אחרות באותו תחום, שפעלו עד 30 שנה לפני או אחרי
  const peers = [...new Set(discoveries.filter((d) => doms.includes(d.domainId) && !d.personIds.includes(person.id) && d.yearFrom >= first - 30 && d.yearFrom <= last + 30).flatMap((d) => d.personIds))]
    .map((id) => personById.get(id)).filter((p): p is Person => !!p).slice(0, 4);
  return (
    <section className="person-sum" aria-label="בקצרה">
      <h3 className="label">בקצרה</h3>
      <dl className="sum-grid">
        <div><dt>תחום</dt><dd>{doms.map((id) => <span key={id} className="sum-dom"><DomainIcon id={id} />{domainById.get(id)?.nameHe}</span>)}{subs.length > 0 && <span className="muted"> · {subs.join(', ')}</span>}</dd></div>
        <div><dt>פעילות</dt><dd><bdi className="num">{yearText(first)}</bdi>{last !== first && <> עד <bdi className="num">{yearText(last)}</bdi></>}</dd></div>
        <div><dt>מקום</dt><dd>{place || <span className="muted">לא מאומת</span>}</dd></div>
        <div><dt>השפעה</dt><dd>השפיע על <bdi className="num">{out}</bdi> · הושפע מ-<bdi className="num">{inn}</bdi></dd></div>
        <div className="sum-wide"><dt>החידוש</dt><dd><Rich>{lead.novelty || lead.contribution}</Rich></dd></div>
        {peers.length > 0 && (
          <div className="sum-wide"><dt>בני זמנו בתחום</dt><dd className="sum-peers">{peers.map((p) => <button key={p.id} type="button" className="press chip" onClick={() => onOpen(p.id)}>{p.nameHe}</button>)}</dd></div>
        )}
      </dl>
    </section>
  );
}
