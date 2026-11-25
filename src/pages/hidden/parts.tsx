// רכיבים משותפים לשכבת "הנעלם": ראיה (גילוי או קשר מאומת), תג רמת ידע, ציטוט חיצוני, וגרפיקה מחושבת.
import Rich from '../../components/Rich';
import DomainIcon from '../../icons';
import { href } from '../../route';
import { yearText } from '../../data';
import { ref, domName, levelName, short, type Level, type ExtEvidence } from '../../hidden/model';
import type { Viz } from '../../hidden/metrics';

/** קישור לראיה במקום שלה באטלס: גילוי לציר הזמן, קשר למסך ההשוואה */
export function EvidenceChip({ id }: { id: string }) {
  const r = ref(id);
  if (!r) return null;
  if (r.kind === 'discovery') {
    const d = r.d;
    const to = href('timeline', { d: d.domainId, y: String(d.yearTo), ...(d.personIds[0] ? { p: d.personIds[0] } : { w: d.id }) });
    return <a className="ev-chip" href={to} data-ev={id} title={d.title}><DomainIcon id={d.domainId} /><span>{short(d)}</span><bdi className="num">{yearText(d.yearFrom)}</bdi></a>;
  }
  const l = r.l;
  const head = (l.explanation.match(/^==(.+?)==/) || [, l.explanation])[1]!.replace(/\*\*/g, '');
  return <a className="ev-chip ev-link" href={href('compare', { l: l.id })} data-ev={id} title={head}><span className="ev-kind">קשר</span><span>{head}</span></a>;
}
export const Evidence = ({ ids }: { ids: string[] }) => (ids.length ? <div className="ev-row">{ids.map((id) => <EvidenceChip key={id} id={id} />)}</div> : null);

export const LevelTag = ({ level }: { level: Level }) => <span className={`lvl lvl-${level}`}>{levelName[level]}</span>;

export function ExtQuote({ ev, source }: { ev: ExtEvidence; source: { title: string; url: string } }) {
  return (
    <blockquote className="quote quote-small">
      <p className="quote-he" dir="rtl">"{ev.quoteHe}" <span className="label">תרגום</span></p>
      <span dir="ltr" lang="en" className="quote-orig">“{ev.quote}”</span>
      <footer><a className="src-link" href={source.url} target="_blank" rel="noreferrer" dir="ltr">{source.title}</a></footer>
    </blockquote>
  );
}

/** גרפיקה מחושבת לכל תובנה. קודם הגרפיקה, אחר כך ההסבר. */
export function VizView({ viz }: { viz: Viz }) {
  if (viz.type === 'matrix') {
    const max = Math.max(1, ...viz.counts.flat());
    return (
      <div className="mx" role="img" aria-label="מטריצת קשרים בין תחומים. תא ריק: אין קשר מתועד.">
        <div className="mx-grid" style={{ gridTemplateColumns: `repeat(${viz.domains.length}, 1fr)` }}>
          {viz.domains.map((a, i) => viz.domains.map((b, j) => {
            const n = viz.counts[i][j];
            if (i === j) return <span key={`${i}-${j}`} className="mx-cell mx-self" title={a.name}><DomainIcon id={a.id} /></span>;
            return <span key={`${i}-${j}`} className={`mx-cell${n ? '' : ' mx-empty'}`} title={`${a.name} ו${b.name}: ${n} קשרים`} style={n ? { opacity: 0.25 + 0.75 * (n / max) } : undefined} />;
          }))}
        </div>
        <p className="mx-key label"><span className="mx-cell" /> קשר מתועד <span className="mx-cell mx-empty" /> עוד לא חיפשנו</p>
      </div>
    );
  }
  if (viz.type === 'bars') {
    const max = Math.max(1, ...viz.rows.map((r) => Math.abs(r.value)));
    return (
      <ul className="hbars">
        {viz.rows.map((r) => (
          <li key={r.label}>
            <span className="hb-label">{r.label}</span>
            <span className="hb-track"><span className={`hb-bar${r.value < 0 ? ' hb-neg' : ''}`} style={{ width: `${(100 * Math.abs(r.value)) / max}%` }} /></span>
            <bdi className="num hb-v">{r.value}{viz.unit === '%' ? '%' : ''}</bdi>
            {r.note && <span className="hb-note muted">{r.note}</span>}
          </li>
        ))}
      </ul>
    );
  }
  if (viz.type === 'path') {
    return (
      <ol className="gpath">
        {viz.rows.map((r) => <li key={r.label}><span className="label">{r.label}</span><strong>{r.city}</strong><span className="muted small"><bdi className="num">{r.n}</bdi> גילויים</span></li>)}
      </ol>
    );
  }
  return (
    <div className="tstack">
      <div className="tstack-key">{viz.keys.map((k, i) => <span key={k.key}><i className={`ts-${i}`} />{k.label}</span>)}</div>
      {viz.rows.map((r) => (
        <div key={r.label} className="tstack-row">
          <span className="hb-label">{r.label}</span>
          <span className="tstack-bar">{r.parts.map((p, i) => <span key={i} className={`ts-${i}`} style={{ width: `${p}%` }} title={`${viz.keys[i].label}: ${p}%`} />)}</span>
          <bdi className="num hb-v">{r.n}</bdi>
        </div>
      ))}
    </div>
  );
}
export const domLabel = (id: string) => domName(id);
