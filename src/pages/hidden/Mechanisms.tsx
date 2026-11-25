// מנגנוני הגילוי: כרטיס לכל תבנית חשיבה. הבנה, צעדים, דוגמאות מהאטלס, דוגמה חיצונית מאומתת, דוגמה נגדית, והפעלה.
import Rich from '../../components/Rich';
import DomainIcon from '../../icons';
import { href } from '../../route';
import { activeDomains } from '../../data';
import { mechanisms, ref } from '../../hidden/model';
import { Evidence, ExtQuote, LevelTag } from './parts';

/** באילו תחומים המנגנון כבר מופיע באטלס, לפי הדוגמאות שלו (גילוי, או שני קצות קשר) */
function domainsOf(ids: string[]) {
  const s = new Set<string>();
  for (const id of ids) {
    const r = ref(id);
    if (r?.kind === 'discovery') s.add(r.d.domainId);
  }
  return s;
}

export default function Mechanisms({ open, onOpen }: { open: string | null; onOpen: (id: string | null) => void }) {
  return (
    <div className="mech-list">
      {mechanisms.map((m) => {
        const doms = domainsOf(m.examples);
        const absent = activeDomains.filter((d) => !doms.has(d.id));
        const isOpen = open === m.id;
        return (
          <article key={m.id} className={`mech glass${isOpen ? ' is-open' : ''}`} id={`m-${m.id}`} data-mech={m.id}>
            <button type="button" className="mech-head" aria-expanded={isOpen} onClick={() => onOpen(isOpen ? null : m.id)}>
              <span className="label">{m.family}</span>
              <strong className="mech-name">{m.name}</strong>
              <span className="mech-short">{m.short}</span>
            </button>
            {isOpen && (
              <div className="mech-body">
                <div className="layers">
                  <section>
                    <h4>הבנה <LevelTag level="interpretive" /></h4>
                    <p><Rich>{m.understanding}</Rich></p>
                    <ol className="steps">{m.steps.map((s) => <li key={s}>{s}</li>)}</ol>
                  </section>
                  <section>
                    <h4>הדגמה <LevelTag level="documented" /></h4>
                    <Evidence ids={m.examples} />
                    {m.external.map((x) => (
                      <div key={x.id} className="ext">
                        <p><strong>{x.title}</strong>. <Rich>{x.text}</Rich> <span className="label">מחוץ לאטלס</span></p>
                        <ExtQuote ev={x.evidence[0]} source={x.source} />
                      </div>
                    ))}
                    <p className="counter"><span className="label">דוגמה נגדית</span> <Rich>{m.counter.text}</Rich></p>
                    <Evidence ids={m.counter.ids} />
                  </section>
                  <section className="act">
                    <h4>הפעלה</h4>
                    {absent.length > 0 && <p className="muted small">עוד לא הודגם באטלס ב:</p>}
                    <div className="dom-row">
                      {(absent.length ? absent : activeDomains).slice(0, 15).map((d) => (
                        <a key={d.id} className="press chip" href={href('hidden', { v: 'lab', m: m.id, t: d.id })} title={`להפעיל על ${d.nameHe}`}><DomainIcon id={d.id} />{d.nameHe}</a>
                      ))}
                    </div>
                  </section>
                </div>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
