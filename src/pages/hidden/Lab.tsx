// מעבדת הנסתר: בוחרים מנגנון ויעד, והמנוע מחזיר שאלות והשערות שנגזרו מהאטלס.
// כל כרטיס אפשר לשמור, לבחון, ולהמשיך ממנו: הצומת שנשמר הופך ליעד של המנגנון הבא. זו הלולאה הרקורסיבית.
import { useMemo, useState } from 'react';
import Rich from '../../components/Rich';
import DomainIcon from '../../icons';
import IconButton from '../../ui/IconButton';
import { activeDomains } from '../../data';
import { replace } from '../../route';
import { useCloud, saveHypothesis } from '../../cloud';
import { run, defaultDomain, type Card, type Target } from '../../hidden/engine';
import { mechanisms, mechById, domName } from '../../hidden/model';
import { addNote, chainOf, childrenOf, noteById, removeNote, stageOf, STAGES, updateNote, useNotebook, verdictName, type Note, type Verdict } from '../../hidden/notebook';
import { buildPrompt, claudeUrl } from '../../hidden/prompt';
import { Evidence, LevelTag } from './parts';

type P = Record<string, string>;
const set = (params: P, patch: Record<string, string | undefined>) => replace('hidden', { ...params, v: 'lab', ...patch });

function Ladder({ stage }: { stage: number }) {
  return (
    <ol className="ladder" aria-label={`שלב ${stage} מתוך ${STAGES.length}`}>
      {STAGES.map((s, i) => <li key={s} className={i < stage ? 'is-done' : ''}>{s}</li>)}
    </ol>
  );
}

function CardView({ card, params, saved, chain }: { card: Card; params: P; saved: Note | null; chain: Note[] }) {
  const [copied, setCopied] = useState(false);
  const prompt = buildPrompt(card, chain);
  const parent = params.n || null;
  const next = mechanisms[(mechanisms.findIndex((m) => m.id === card.mech) + 1) % mechanisms.length].id;
  return (
    <article className="lab-card" data-card={card.key}>
      <header className="hd-head"><LevelTag level="possible" /><span className="label">{card.basis}</span></header>
      <h3 className="lab-q">{card.question}</h3>
      <p className="lab-h"><span className="label">השערה</span> {card.hypothesis}</p>
      <Evidence ids={card.evidence} />
      <p className="lab-test"><span className="label">איך בוחנים</span> {card.test}</p>
      <div className="lab-actions">
        <button type="button" className="press btn btn-quiet" data-act="save" disabled={!!saved} onClick={() => addNote(card, parent)}>{saved ? 'נשמר במחברת' : 'שמירה במחברת'}</button>
        <button type="button" className="press btn btn-primary btn-quiet" data-act="continue" onClick={() => { const n = addNote(card, parent); set(params, { n: n.id, m: next, s: undefined, t: card.domainId }); }}>המשך מכאן</button>
        <a className="press btn btn-quiet" data-act="claude" href={claudeUrl(prompt)} target="_blank" rel="noreferrer"
          onClick={() => { navigator.clipboard?.writeText(prompt).then(() => setCopied(true), () => {}); }}>
          {copied ? 'הפרומפט הועתק, ונפתח ב-Claude' : 'לבחון עם Claude'}
        </a>
      </div>
    </article>
  );
}

function NoteEditor({ note }: { note: Note }) {
  const cloud = useCloud();
  const [msg, setMsg] = useState('');
  const r = note.result || { verdict: 'open' as Verdict, note: '', url: '' };
  return (
    <div className="note-edit" data-note={note.id}>
      <Ladder stage={stageOf(note)} />
      <p className="note-q"><strong>{note.question}</strong></p>
      <p className="muted small">{note.hypothesis}</p>
      <fieldset className="verdict">
        <legend className="label">בחינה: ההשערה</legend>
        {(Object.keys(verdictName) as Verdict[]).map((v) => (
          <button key={v} type="button" className="press chip" aria-pressed={note.result?.verdict === v} data-verdict={v}
            onClick={() => updateNote(note.id, { result: { ...r, verdict: v } })}>{verdictName[v]}</button>
        ))}
      </fieldset>
      <label className="field"><span className="label">מה נמצא, ומאיפה</span>
        <textarea rows={2} value={r.note} onChange={(e) => updateNote(note.id, { result: { ...r, note: e.target.value } })} placeholder="משפט אחד על מה שהבחינה הראתה" />
      </label>
      <label className="field"><span className="label">קישור למקור</span>
        <input type="url" dir="ltr" value={r.url} onChange={(e) => updateNote(note.id, { result: { ...r, url: e.target.value } })} placeholder="https://" />
      </label>
      <label className="field"><span className="label">תובנה חדשה</span>
        <textarea rows={2} value={note.insight || ''} data-field="insight" onChange={(e) => updateNote(note.id, { insight: e.target.value })} placeholder="מה למדתי, ומה השאלה הבאה" />
      </label>
      <div className="lab-actions">
        <IconButton icon="close" label="מחיקת הצומת וההמשכים שלו" onClick={() => removeNote(note.id)} />
        {cloud.admin && <button type="button" className="press btn btn-quiet" onClick={() => saveHypothesis(note).then(() => setMsg('נשמר בענן כהשערה, לא מאומת.'), (e) => setMsg(e.message))}>שמירה בענן</button>}
        {msg && <span className="small muted" role="status">{msg}</span>}
      </div>
    </div>
  );
}

export default function Lab({ params }: { params: P }) {
  const notes = useNotebook();
  const m = mechById.has(params.m) ? params.m : 'axiom-break';
  const parent = noteById(params.n);
  const t = activeDomains.some((d) => d.id === params.t) ? params.t : parent?.domainId || defaultDomain;
  const seed = Number(params.s) || 0;
  const target: Target = parent ? { domainId: t, focus: parent.evidence, label: parent.question, parent: parent.id } : { domainId: t, focus: [], label: domName(t) };
  const result = useMemo(() => run(m, target, seed), [m, t, seed, parent?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const chain = parent ? chainOf(parent.id) : [];
  const roots = notes.filter((n) => !n.parent);
  const depth = (id: string): number => 1 + Math.max(0, ...childrenOf(id).map((c) => depth(c.id)));
  const mech = mechById.get(m)!;

  return (
    <div className="lab">
      <section className="lab-main">
        <div className="lab-controls glass">
          <div className="seg" role="group" aria-label="מנגנון">
            <span className="label">מנגנון</span>
            {mechanisms.map((x) => <button key={x.id} type="button" className="press chip" aria-pressed={x.id === m} data-m={x.id} onClick={() => set(params, { m: x.id, s: undefined })}>{x.name}</button>)}
          </div>
          <div className="seg" role="group" aria-label="תחום יעד">
            <span className="label">יעד</span>
            {activeDomains.map((d) => <button key={d.id} type="button" className="press chip" aria-pressed={d.id === t} data-t={d.id} title={d.nameHe} onClick={() => set(params, { t: d.id, s: undefined })}><DomainIcon id={d.id} />{d.nameHe}</button>)}
          </div>
        </div>
        <div className="lab-brief">
          <p><strong>{mech.name}</strong>: <Rich>{mech.understanding}</Rich></p>
          {parent && (
            <p className="lab-from" data-from={parent.id}>
              <span className="label">ממשיכים מ</span> {parent.question}
              <IconButton icon="close" label="להתחיל מתחום, בלי צומת" onClick={() => set(params, { n: undefined })} />
            </p>
          )}
          <IconButton icon="reset" label="ערבוב: כרטיסים אחרים מאותו מנגנון" onClick={() => set(params, { s: String(seed + 1) })} />
        </div>
        {result.empty
          ? <p className="lab-empty" role="status">אין חומר להפעלה: {result.empty} נסי תחום אחר או מנגנון אחר.</p>
          : <div className="lab-cards">{result.cards.map((c) => <CardView key={c.key} card={c} params={params} chain={chain} saved={notes.find((n) => n.key === c.key && n.parent === (params.n || null)) || null} />)}</div>}
      </section>
      <aside className="lab-side glass" aria-label="מחברת המחקר">
        <h3 className="section-title">מחברת המחקר</h3>
        {parent ? (
          <>
            <ol className="chain">{chain.map((n, i) => <li key={n.id} className={n.id === parent.id ? 'is-cur' : ''}><button type="button" className="linkish" onClick={() => set(params, { n: n.id, t: n.domainId })}><bdi className="num">{i + 1}</bdi> {mechById.get(n.mech)?.name}: {n.question}</button></li>)}</ol>
            <NoteEditor note={parent} />
          </>
        ) : <p className="muted small">שמרי כרטיס, או לחצי "המשך מכאן". כל צומת שנשמר הופך ליעד של המנגנון הבא.</p>}
        {roots.length > 0 && (
          <>
            <h4 className="label">שרשראות</h4>
            <ul className="roots">
              {roots.map((r) => <li key={r.id}><button type="button" className="linkish" onClick={() => set(params, { n: r.id, t: r.domainId })}>{r.question}</button> <span className="muted small"><bdi className="num">{depth(r.id)}</bdi> שלבים</span></li>)}
            </ul>
          </>
        )}
      </aside>
    </div>
  );
}
