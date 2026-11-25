// ארבעה תוצרים: כתבה, מאמר, מסה ויצירה. ארבעה מנגנוני חשיבה, ולא ארבע תבניות.
// שלוש שרשראות, וכל אחת עוברת בין הסוגים: כתבה מעלה שאלה, מאמר מזהה סתירה, מסה מולידה יצירה.
// כל פסקה מסומנת ברמת ידע, וכל עובדה מצביעה על מקור מאומת באטלס.
import { useState } from 'react';
import Rich from '../../components/Rich';
import { replace } from '../../route';
import { claudeUrl } from '../../hidden/prompt';
import { EvidenceChip } from '../hidden/parts';
import { KINDS, kindById, levelName, certaintyName, outputs, outputById, childrenOf, refKind, externalRef, buildOutputPrompt, type Output, type Kind } from '../../outputs/kinds';

const CHAINS: [string, string][] = [['instrument', 'המכשיר והשאלה'], ['axiom', 'האקסיומה'], ['multiple', 'הגילוי הכפול']];
const set = (patch: Record<string, string | undefined>) => {
  const cur = Object.fromEntries(new URLSearchParams(window.location.hash.split('?')[1] || ''));
  replace('creations', { ...cur, v: 'outputs', ...patch });
};

function Ref({ id }: { id: string }) {
  const k = refKind(id);
  if (k === 'discovery' || k === 'link') return <EvidenceChip id={id} />;
  const x = k === 'external' ? externalRef(id) : null;
  return x ? <a className="ev-chip ev-link" href={x.source.url} target="_blank" rel="noreferrer" data-ev={id}><span className="ev-kind">מקור</span><span>{x.title}</span></a> : null;
}

function OutputView({ o }: { o: Output }) {
  const k = kindById.get(o.kind)!;
  const from = o.derivedFrom ? outputById.get(o.derivedFrom) : null;
  const kids = childrenOf(o.id);
  const next = kindById.get(o.transition.to)!;
  const [copied, setCopied] = useState(false);
  const prompt = buildOutputPrompt(o.transition.to, { from: o });
  return (
    <article className={`out-doc out-${o.kind}`} data-output={o.id}>
      {/* פס סוגה: מה זה, המנגנון, למי, ממה התפתח */}
      <header className="genre-band">
        <span className={`genre genre-${o.kind}`}>{k.name}</span>
        <span><span className="label">מנגנון</span> {k.mechanism}</span>
        <span><span className="label">למי</span> {k.reader}</span>
        {o.form && <span><span className="label">צורה</span> {o.form}</span>}
        {from && <span><span className="label">התפתח מ</span> <button type="button" className="linkish" onClick={() => set({ o: from.id })}>{kindById.get(from.kind)!.name}: {from.title}</button></span>}
      </header>
      <h2 className="out-title">{o.title}</h2>
      <p className="out-lead">{o.lead}</p>
      {o.certainty && (
        <div className={`certainty c-${o.certainty}`} role="img" aria-label={`מד ודאות: ${certaintyName[o.certainty]}`}>
          <span className="label">מד ודאות</span>
          <span className="c-track">{(['open', 'likely', 'established'] as const).map((c) => <i key={c} className={c === o.certainty ? 'on' : ''} />)}</span>
          <strong>{certaintyName[o.certainty]}</strong>
        </div>
      )}
      <div className="out-body">
        {o.blocks.map((b, i) => (
          <section key={i} className={`blk blk-${b.level}`} data-level={b.level}>
            {b.h && <h3 className="blk-h">{b.h}</h3>}
            <p><span className={`lv lv-${b.level}`}>{levelName[b.level]}</span> <Rich>{b.text}</Rich></p>
            {b.refs && <div className="ev-row">{b.refs.map((r) => <Ref key={r} id={r} />)}</div>}
          </section>
        ))}
      </div>
      <p className="out-question"><span className="label">השאלה שנשארת</span> <strong>{o.question}</strong></p>
      <footer className="out-next">
        {kids.map((c) => (
          <button key={c.id} type="button" className="press btn btn-quiet" onClick={() => set({ o: c.id })} data-child={c.id}>
            התפתח אל {kindById.get(c.kind)!.name}: {c.title}
          </button>
        ))}
        <a className="press btn btn-primary btn-quiet" href={claudeUrl(prompt)} target="_blank" rel="noreferrer" data-transform={o.transition.to}
          onClick={() => { navigator.clipboard?.writeText(prompt).then(() => setCopied(true), () => {}); }}>
          {copied ? 'הפרומפט הועתק' : `להפוך ל${next.name} עם Claude`}
        </a>
        <span className="muted small">{o.transition.why}</span>
      </footer>
      <details className="out-quality">
        <summary>מדדי האיכות של {k.name}</summary>
        <ul>{k.quality.map((q) => <li key={q}>{q}</li>)}</ul>
      </details>
    </article>
  );
}

export default function Outputs({ params }: { params: Record<string, string> }) {
  const kind = (KINDS.some((k) => k.id === params.k) ? params.k : null) as Kind | null;
  const sel = outputById.get(params.o || '') || null;
  const shown = kind ? KINDS.filter((k) => k.id === kind) : KINDS;
  return (
    <section className="outputs" aria-label="ארבעה תוצרים">
      <p className="page-sub lines">
        <span><strong>כתבה, מאמר, מסה ויצירה</strong> הם ארבעה מנגנוני חשיבה, ולא ארבע תבניות עיצוב.</span>
        <span>כל שורה היא שרשרת: הכתבה מעלה שאלה, המאמר מזהה סתירה, המסה מולידה יצירה. כל פסקה מסומנת: <span className="lv lv-fact">עובדה</span> <span className="lv lv-interpretation">פרשנות</span> <span className="lv lv-hypothesis">השערה</span> <span className="lv lv-imagination">דמיון</span>.</span>
      </p>
      <div className="seg kinds-pick" role="group" aria-label="סוג תוצר">
        <button type="button" className="press chip" aria-pressed={!kind} onClick={() => set({ k: undefined })}>כל הסוגים</button>
        {KINDS.map((k) => <button key={k.id} type="button" className="press chip" aria-pressed={kind === k.id} data-kind={k.id} onClick={() => set({ k: k.id })}>{k.name} <span className="muted">{k.mechanism}</span></button>)}
      </div>
      {kind && (() => {
        const k = kindById.get(kind)!;
        return (
          <div className="kind-def glass" data-kind-def={k.id}>
            <h3><span className={`genre genre-${k.id}`}>{k.name}</span> {k.verb}. {k.purpose}</h3>
            <div className="kd-cols">
              <div><h4 className="label">תהליך המחקר</h4><ol>{k.process.map((x) => <li key={x}>{x}</li>)}</ol></div>
              <div><h4 className="label">מבנה הכתיבה</h4><ol>{k.structure.map((x) => <li key={x}>{x}</li>)}</ol></div>
              <div><h4 className="label">מדדי איכות</h4><ul>{k.quality.map((x) => <li key={x}>{x}</li>)}</ul></div>
            </div>
            <a className="press btn btn-quiet" href={claudeUrl(buildOutputPrompt(k.id, { text: '<הנושא והחומר מהאטלס>' }))} target="_blank" rel="noreferrer">הפרומפט הייעודי ל{k.name}, ב-Claude</a>
          </div>
        );
      })()}
      <div className="chains">
        <div className="chain-head" aria-hidden="true" style={{ ['--n' as string]: shown.length }}><span />{shown.map((k) => <span key={k.id} className={`genre genre-${k.id}`}>{k.name}</span>)}</div>
        {CHAINS.map(([id, name]) => (
          <div key={id} className="chain-row" data-chain={id} style={{ ['--n' as string]: shown.length }}>
            <span className="chain-name label">{name}</span>
            {shown.map((k) => {
              const o = outputs.find((x) => x.chain === id && x.kind === k.id);
              if (!o) return <span key={k.id} />;
              return (
                <button key={o.id} type="button" className={`press out-card out-${o.kind}${sel?.id === o.id ? ' is-on' : ''}`} aria-pressed={sel?.id === o.id} data-card={o.id} onClick={() => set({ o: sel?.id === o.id ? undefined : o.id })}>
                  <span className={`genre genre-${o.kind}`}>{k.name}</span>
                  <strong>{o.title}</strong>
                  <span className="muted small">{o.lead}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
      {sel ? <OutputView o={sel} /> : <p className="muted small">בחרי תוצר כדי לקרוא אותו, לראות ממה התפתח, ולהפוך אותו לסוג הבא.</p>}
    </section>
  );
}
