// הגילוי הבא: שאלות פתוחות מתועדות, החורים שהמנוע מדרג, וההשערות מהמחברת.
// שלוש רמות מופרדות: שאלה פתוחה (ידע מבוסס שהיא פתוחה), חור במטריצה (עובדה על האטלס), והשערה (גילוי אפשרי).
import Rich from '../../components/Rich';
import DomainIcon from '../../icons';
import { href } from '../../route';
import { domainMatrix } from '../../hidden/metrics';
import { openQuestions, mechById, domName } from '../../hidden/model';
import { useNotebook, verdictName } from '../../hidden/notebook';
import { ExtQuote, LevelTag, Evidence } from './parts';

export default function Next() {
  const notes = useNotebook();
  const { empty } = domainMatrix();
  return (
    <div className="next">
      <section aria-label="שאלות פתוחות">
        <h3 className="section-title">שאלות שהאנושות עוד לא פתרה <LevelTag level="documented" /></h3>
        <div className="hd-grid">
          {openQuestions.map((q) => (
            <article key={q.id} className="hd-card glass" data-open={q.id}>
              <header className="hd-head">
                <span className="dom-tags">{q.domains.length ? q.domains.map((d) => <span key={d}><DomainIcon id={d} />{domName(d)}</span>) : <span className="label">כללי</span>}</span>
              </header>
              <h3 className="hd-title">{q.question}</h3>
              <p><Rich>{q.text}</Rich></p>
              <ExtQuote ev={q.evidence[0]} source={q.source} />
              <div className="dom-row">
                <span className="label">לנסות במעבדה:</span>
                {q.mechanisms.map((m) => <a key={m} className="press chip" href={href('hidden', { v: 'lab', m, t: q.domains[0] })}>{mechById.get(m)?.name}</a>)}
              </div>
            </article>
          ))}
        </div>
      </section>
      <section aria-label="חורים באטלס">
        <h3 className="section-title">הצירופים הריקים המפתיעים ביותר <LevelTag level="documented" /></h3>
        <p className="muted small">שני תחומים גדולים, בלי אף קשר מתועד ביניהם. אולי חור בידע, ואולי רק בנתונים.</p>
        <ol className="gaps">
          {empty.slice(0, 8).map(([a, b]) => (
            <li key={a + b}>
              <span><DomainIcon id={a} />{domName(a)}</span><span className="gap-x" aria-hidden="true">·</span><span><DomainIcon id={b} />{domName(b)}</span>
              <a className="press btn btn-quiet" href={href('hidden', { v: 'lab', m: 'transfer', t: b })}>לחפש גשר</a>
            </li>
          ))}
        </ol>
      </section>
      <section aria-label="ההשערות שלי">
        <h3 className="section-title">ההשערות שלי <LevelTag level="possible" /></h3>
        {notes.length === 0
          ? <p className="muted small">עוד אין השערות. במעבדה, "שמירה במחברת" או "המשך מכאן" מוסיפים אותן לכאן.</p>
          : (
            <ul className="hyps">
              {[...notes].reverse().map((n) => (
                <li key={n.id} data-hyp={n.id}>
                  <a href={href('hidden', { v: 'lab', n: n.id, t: n.domainId, m: n.mech })}><strong>{n.question}</strong></a>
                  <span className="muted small">{mechById.get(n.mech)?.name} · {domName(n.domainId)}{n.result ? ` · ${verdictName[n.result.verdict]}` : ' · טרם נבחנה'}</span>
                  {n.insight && <p className="small">{n.insight}</p>}
                  <Evidence ids={n.evidence.slice(0, 3)} />
                </li>
              ))}
            </ul>
          )}
      </section>
    </div>
  );
}
