// שלב 4: גרף קשרים ותצוגות חיתוך.
// דמויות הן צמתים מרובעים עם דיוקן. המיקום האופקי קבוע לפי הזמן (מימין לשמאל), והאנכי נקבע בכוחות (d3-force).
import { useRevealOnChange } from '../ui/reveal';
import { useMatches } from '../search';
import DomainIcon from '../icons';
import DomainPicker from '../ui/DomainPicker';
import Picker from '../ui/Picker';
import PeriodPicker from '../ui/PeriodPicker';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { forceCollide, forceLink, forceSimulation, forceX, forceY, type SimulationNodeDatum } from 'd3-force';
import { select } from 'd3-selection';
import { zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from 'd3-zoom';
import Rich from '../components/Rich';
import LinkPanel from '../components/LinkPanel';
import PersonCard from '../components/PersonCard';
import { YEAR_MAX, YEAR_MIN, posScale } from '../components/Timeline';
import { type LinkType, activeDomains, confidenceName, linkTypeName, personById, resolvedLinks, yearText, shortName, workParams, discoveryById } from '../data';
import { cities } from '../geo';
import { type Edge, type GNode, applyFilters, cuts } from '../graph';
import { href, replace, go } from '../route';

const TYPES: LinkType[] = ['influenced', 'enabled', 'opposed', 'parallel'];
const KEY = 'olam.views';
type Saved = { name: string; hash: string; savedAt: string };
type SimNode = SimulationNodeDatum & GNode & { r: number };

const readSaved = (): Saved[] => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };
const writeSaved = (v: Saved[]) => { try { localStorage.setItem(KEY, JSON.stringify(v)); return true; } catch { return false; } };

export default function GraphPage({ params }: { params: Record<string, string> }) {
  const kw = useMatches();
  useRevealOnChange('.graph-wrap', [params.n, params.l, params.d, params.f, params.t, params.c, params.k, params.x, params.h]);
  const domains = new Set((params.d || activeDomains.map((d) => d.id).join(',')).split(',').filter(Boolean));
  const from = params.f ? Number(params.f) : YEAR_MIN;
  const to = params.t ? Number(params.t) : YEAR_MAX;
  const filters = {
    domains, from, to, city: params.c || undefined,
    hiddenTypes: new Set((params.h || '').split(',').filter(Boolean)),
    hiddenConf: new Set((params.k || '').split(',').filter(Boolean)),
    crossOnly: params.x === '1', hideIsolated: params.i === '1',
  };
  const fkey = ['d', 'f', 't', 'c', 'h', 'k', 'x', 'i'].map((k) => params[k] || '').join('|');
  const { nodes, edges } = useMemo(() => applyFilters(filters), [fkey]); // eslint-disable-line react-hooks/exhaustive-deps
  const focus = params.n;
  const person = params.p ? personById.get(params.p) : undefined;
  const selected = resolvedLinks.find((r) => r.link.id === params.l);

  const set = useCallback((patch: Record<string, string | undefined>) => {
    const cur = Object.fromEntries(new URLSearchParams(window.location.hash.split('?')[1] || ''));
    replace('graph', { ...cur, ...patch });
  }, []);

  // רוחב המיכל
  const wrap = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(1100);
  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(Math.max(320, Math.round(el.clientWidth))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const mobile = W < 640;
  const H = mobile ? 520 : 600;
  const PAD = mobile ? 30 : 48;

  // פריסה: x לפי זמן (בתוך חלון התקופה), y בכוחות. מחושב מראש, בלי ריצוד על המסך.
  const layout = useMemo(() => {
    const a = posScale(Math.max(from, YEAR_MIN)), b = posScale(Math.min(to, YEAR_MAX));
    const xOf = (y: number) => W - PAD - ((posScale(y) - a) / Math.max(0.0001, b - a)) * (W - 2 * PAD);
    const sim: SimNode[] = nodes.map((n) => ({ ...n, r: (mobile ? 13 : 16) + Math.sqrt(n.degree) * (mobile ? 4 : 6), x: xOf(n.year), y: H / 2 }));
    const links = edges.map((e) => ({ source: e.source, target: e.target }));
    const s = forceSimulation(sim)
      .force('x', forceX<SimNode>((d) => xOf(d.year)).strength(0.9))
      .force('y', forceY<SimNode>(H / 2).strength(0.05))
      .force('link', forceLink<SimNode, { source: string; target: string }>(links).id((d) => d.id).strength(0.04))
      .force('collide', forceCollide<SimNode>((d) => d.r + (mobile ? 10 : 16)).strength(0.9))
      .stop();
    for (let i = 0; i < 260; i++) s.tick();
    // פס תחתון שמור לשנתות, כדי ששם של דמות לא יעלה על שנה
    sim.forEach((d) => { d.y = Math.min(H - d.r - 44, Math.max(d.r + 8, d.y!)); });
    return new Map(sim.map((d) => [d.id, d]));
  }, [nodes, edges, W, H, PAD, mobile, from, to]);

  // זום וגרירה: תנועה, לא פריסה מחדש
  const zb = useRef<ZoomBehavior<SVGSVGElement, unknown>>();
  const svg = useRef<SVGSVGElement>(null);
  const [t, setT] = useState<ZoomTransform>(zoomIdentity);
  useEffect(() => {
    if (!svg.current) return;
    const z = zoom<SVGSVGElement, unknown>().scaleExtent([0.6, 4])
      .filter((e: Event) => (e.type === 'wheel' ? (e as WheelEvent).ctrlKey || (e as WheelEvent).metaKey : e.type.startsWith('touch') ? (e as TouchEvent).touches.length > 1 : !(e as MouseEvent).button && !(e.target as Element).closest('.g-node, .g-hit')))
      .on('zoom', (e) => setT(e.transform));
    zb.current = z;
    const sel = select(svg.current).call(z).on('dblclick.zoom', null);
    sel.call(z.transform, zoomIdentity);
    return () => { sel.on('.zoom', null); };
  }, [fkey, W]);

  // מוקד: הדמות שנבחרה ושכניה
  const neighbors = useMemo(() => {
    if (!focus) return null;
    const s = new Set([focus]);
    edges.forEach((e) => { if (e.source === focus) s.add(e.target); if (e.target === focus) s.add(e.source); });
    return s;
  }, [focus, edges]);

  // שמות שעולים זה על זה: נשאר השם של הצומת החשוב יותר (מוקד, שכן, יותר קשרים). השאר מופיעים בריחוף ובמוקד.
  const quiet = useMemo(() => {
    const rank = (id: string, deg: number) => (id === focus ? 1e6 : neighbors?.has(id) ? 1e5 : 0) + deg;
    const boxes: [number, number, number, number][] = [];
    const out = new Set<string>();
    // תג מספר הקשרים של כל צומת תופס מקום גם הוא
    const degBox = new Map<string, [number, number, number, number]>();
    for (const n of nodes) { const p = layout.get(n.id); if (p && n.degree > 0) degBox.set(n.id, [p.x! + p.r - 16, p.y! - p.r, p.x! + p.r, p.y! - p.r + 13]); }
    for (const n of [...nodes].sort((a, b) => rank(b.id, b.degree) - rank(a.id, a.degree))) {
      const p = layout.get(n.id);
      if (!p) continue;
      const w = shortName(n.person.nameHe, n.person.nameShort).length * 7 + 6;
      const b: [number, number, number, number] = [p.x! - w / 2, p.y! + p.r + 3, p.x! + w / 2, p.y! + p.r + 18];
      const hit = (o: [number, number, number, number]) => b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1];
      if (boxes.some(hit) || [...degBox].some(([id, o]) => id !== n.id && hit(o))) out.add(n.id);
      else boxes.push(b);
    }
    return out;
  }, [nodes, layout, focus, neighbors]);

  const top = [...nodes].sort((a, b) => b.degree - a.degree)[0];
  const isolated = nodes.filter((n) => n.degree === 0).length;
  const crossN = edges.filter((e) => e.cross).length;
  const title = !nodes.length ? 'אין דמויות שעונות על המסננים.'
    : top && top.degree > 0 ? `הצומת המרכזי: ${top.person.nameHe}, עם ${top.degree} קשרים.` : `${nodes.length} דמויות, בלי קשרים ביניהן.`;
  const activeCut = cuts.find((c) => Object.entries(c.params).every(([k, v]) => params[k] === v) && ['d', 'f', 't', 'c', 'h', 'k', 'x'].every((k) => k in c.params || !params[k]));

  // תצוגות שמורות, ב-localStorage, עם חיווי "נשמר"
  const [saved, setSaved] = useState<Saved[]>(readSaved);
  const [name, setName] = useState('');
  const [status, setStatus] = useState('');
  // שם ברירת מחדל לתצוגה שנשמרה בלי שם: נגזר מהמסננים (תחומים, תקופה, עיר, דמות במוקד)
  const autoName = () => {
    const parts = [params.d ? params.d.split(',').map((id) => activeDomains.find((d) => d.id === id)?.nameHe).filter(Boolean).join(', ') : 'כל התחומים'];
    if (params.f || params.t) parts.push(`${yearText(from)} עד ${yearText(to)}`);
    if (params.c) parts.push(params.c);
    if (params.n) parts.push(personById.get(params.n)?.nameHe || '');
    return parts.filter(Boolean).join(' · ');
  };
  const save = () => {
    const clean = Object.fromEntries(Object.entries(params).filter(([k]) => !['p', 'l'].includes(k)));
    const hash = href('graph', clean);
    const next = [{ name: name.trim() || autoName(), hash, savedAt: new Date().toISOString().slice(0, 10) }, ...saved.filter((s) => s.hash !== hash)].slice(0, 12);
    setSaved(next);
    setStatus(writeSaved(next) ? 'נשמר' : 'לא נשמר: הדפדפן חוסם אחסון מקומי');
    setName('');
  };
  const remove = (hash: string) => { const next = saved.filter((s) => s.hash !== hash); setSaved(next); writeSaved(next); setStatus('נמחק'); };

  const edgePath = (e: Edge) => {
    const a = layout.get(e.source)!, b = layout.get(e.target)!;
    const mx = (a.x! + b.x!) / 2, my = (a.y! + b.y!) / 2 - Math.min(80, Math.abs(a.x! - b.x!) / 6);
    return `M${a.x},${a.y} Q${mx},${my} ${b.x},${b.y}`;
  };
  const dim = (id: string) => !!neighbors && !neighbors.has(id);
  const ticksRaw = [-2500, -1500, -500, 1, 500, 1000, 1500, 1600, 1700, 1800, 1850, 1900, 1950, 2000].filter((y) => y >= from && y <= to);
  const a0 = posScale(Math.max(from, YEAR_MIN)), b0 = posScale(Math.min(to, YEAR_MAX));
  const tx = (y: number) => W - PAD - ((posScale(y) - a0) / Math.max(0.0001, b0 - a0)) * (W - 2 * PAD);
  // שנתות קרובות מדי עולות זו על זו: שומרים רק שנתה במרחק 44 פיקסל מהקודמת
  const ticks: number[] = [];
  for (const y of ticksRaw) if (!ticks.length || Math.abs(tx(y) - tx(ticks[ticks.length - 1])) >= 44) ticks.push(y);

  return (
    <main className="page page-wide">
      <div className="crumbs"><a href="#/">בית</a> / גרף קשרים</div>
      <h1 className="page-title"><Rich>{title}</Rich></h1>
      <p className="page-sub lines">
        <span><Rich>{`בתצוגה: **${nodes.length}** דמויות, **${edges.length}** קווים, ו-**${crossN}** מהם חוצים בין תחומים.`}</Rich></span>
        <span>מימין לשמאל: <strong>הזמן</strong>. גודל הריבוע: <strong>מספר הקשרים</strong>. לחיצה על דמות מדגישה את השכנים שלה.</span>
      </p>

      <section className="cuts" aria-label="חיתוכים מוכנים">
        {cuts.map((c) => (
          <button key={c.id} type="button" className="press cut" aria-pressed={activeCut?.id === c.id}
            onClick={() => replace('graph', activeCut?.id === c.id ? {} : c.params)}>
            <strong>{c.title}</strong>
            <Rich as="span" className="cut-lead">{c.lead}</Rich>
          </button>
        ))}
      </section>

      <div className="graph-controls card glass">
        <div className="gc-row">
          <span className="label">תחום</span>
          <DomainPicker counts={false} selected={params.d ? [...domains] : null} onChange={(next) => set({ d: next ? next.join(',') : undefined })} />
        </div>
        <div className="gc-row">
          <span className="label">תקופה</span>
          <PeriodPicker label="תקופה" from={from} to={to} onChange={(f, t) => set({ f: f === undefined ? undefined : String(f), t: t === undefined ? undefined : String(t) })} />
        </div>
        <div className="gc-row">
          <span className="label">עיר</span>
          <select className="field" value={params.c || ''} aria-label="עיר" onChange={(e) => set({ c: e.target.value || undefined })}>
            <option value="">כל הערים</option>
            {[...cities].sort((a, b) => a.nameHe.localeCompare(b.nameHe, 'he')).map((c) => <option key={c.key} value={c.key}>{c.nameHe} ({c.items.length})</option>)}
          </select>
        </div>
        <div className="gc-row">
          <span className="label">סוג קשר</span>
          <Picker label="סוג קשר" allLabel="כל הקשרים" selected={filters.hiddenTypes.size ? TYPES.filter((ty) => !filters.hiddenTypes.has(ty)) : null}
            onChange={(next) => set({ h: next ? TYPES.filter((ty) => !next.includes(ty)).join(',') || undefined : undefined })}
            options={TYPES.map((ty) => ({ id: ty, title: linkTypeName[ty], className: `chip-line line-${ty}`, label: linkTypeName[ty] }))} />
        </div>
        <div className="gc-row">
          <span className="label">ביטחון</span>
          <div className="seg">
            <Picker label="ביטחון" allLabel="כל רמות הביטחון" selected={filters.hiddenConf.size ? (['documented', 'interpretive'] as const).filter((c) => !filters.hiddenConf.has(c)) : null}
              onChange={(next) => set({ k: next ? (['documented', 'interpretive'] as const).filter((c) => !next.includes(c)).join(',') || undefined : undefined })}
              options={(['documented', 'interpretive'] as const).map((c) => ({ id: c, title: confidenceName[c], className: `conf-chip conf-chip-${c}`, label: confidenceName[c] }))} />
            <button type="button" className="press chip" aria-pressed={filters.crossOnly} onClick={() => set({ x: filters.crossOnly ? undefined : '1' })}>רק חוצי תחום</button>
            <button type="button" className="press chip" aria-pressed={filters.hideIsolated} onClick={() => set({ i: filters.hideIsolated ? undefined : '1' })}>בלי דמויות בודדות</button>
            <button type="button" className="press chip" onClick={() => replace('graph', {})}>איפוס</button>
          </div>
        </div>
      </div>

      <section className="card graph-wrap" aria-label="גרף הקשרים">
        <div ref={wrap} className="graph-plot">
          {nodes.length === 0 ? (
            <div className="graph-empty tone tone-neutral"><h4>אין דמויות שעונות על המסננים.</h4><p>הרחיבו את התקופה, בחרו עיר אחרת או לחצו על "איפוס".</p></div>
          ) : (
            <svg ref={svg} className="graph-svg" width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
              <defs>
                {nodes.map((n) => <clipPath key={n.id} id={`clip-${n.id}`}><rect x={-layout.get(n.id)!.r} y={-layout.get(n.id)!.r} width={layout.get(n.id)!.r * 2} height={layout.get(n.id)!.r * 2} /></clipPath>)}
              </defs>
              <g transform={t.toString()}>
                {ticks.map((y) => (
                  <g key={y} className="g-tick">
                    <line x1={tx(y)} x2={tx(y)} y1={14} y2={H - 6} />
                    <text x={tx(y)} y={H - 8} textAnchor="middle">{y < 0 ? `${-y} לפנה״ס` : y}</text>
                  </g>
                ))}
                {edges.map((e) => {
                  const on = selected?.link.id === e.linkId;
                  const off = (neighbors && !(neighbors.has(e.source) && neighbors.has(e.target) && (e.source === focus || e.target === focus))) || (selected && !on);
                  const d = edgePath(e);
                  return (
                    <g key={e.key} className={`g-edge lk-${e.type} lk-${e.confidence}${on ? ' is-on' : ''}${off ? ' is-dim' : ''}`}>
                      {on && <path d={d} className="lk-halo" />}
                      <path d={d} className="lk-line" />
                      <path d={d} className="g-hit" data-link={e.linkId} role="button" tabIndex={0} aria-label={`קשר: ${personById.get(e.source)?.nameHe} ${linkTypeName[e.type]} ${personById.get(e.target)?.nameHe}`}
                        onClick={() => set({ l: on ? undefined : e.linkId })}
                        onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); set({ l: on ? undefined : e.linkId }); } }} />
                    </g>
                  );
                })}
                {nodes.map((n) => {
                  const p = layout.get(n.id)!;
                  const s = p.r * 2;
                  return (
                    <g key={n.id} className={`g-node dom-${n.domain}${focus === n.id ? ' is-focus' : ''}${dim(n.id) ? ' is-dim' : ''}${n.context ? ' is-context' : ''}${n.degree === 0 ? ' is-alone' : ''}${kw.active ? (kw.persons.has(n.id) ? ' is-kw' : ' is-kw-off') : ''}`}
                      transform={`translate(${p.x},${p.y})`} data-person={n.id} role="button" tabIndex={0}
                      aria-label={`${n.person.nameHe}, ${n.degree} קשרים`} aria-pressed={focus === n.id}
                      onClick={() => set({ n: focus === n.id ? undefined : n.id })}
                      onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); set({ n: focus === n.id ? undefined : n.id }); } }}>
                      <rect className="g-sq" x={-p.r - 3} y={-p.r - 3} width={s + 6} height={s + 6} />
                      {n.person.imageUrl
                        ? <image href={n.person.imageUrl} x={-p.r} y={-p.r} width={s} height={s} preserveAspectRatio="xMidYMid meet" clipPath={`url(#clip-${n.id})`} />
                        : <rect x={-p.r} y={-p.r} width={s} height={s} className="g-noimg" />}
                      <text className={`g-label${quiet.has(n.id) ? ' is-quiet' : ''}`} y={p.r + 15} textAnchor="middle">{shortName(n.person.nameHe, n.person.nameShort)}</text>
                      {n.degree > 0 && <text className={`g-deg${quiet.has(n.id) ? ' is-quiet' : ''}`} x={p.r - 2} y={-p.r + 11} textAnchor="end">{n.degree}</text>}
                    </g>
                  );
                })}
              </g>
            </svg>
          )}
        </div>
        <ul className="legend" aria-label="מקרא">
          {activeDomains.map((d) => <li key={d.id}><DomainIcon id={d.id} />{d.nameHe}</li>)}
          <li><DomainIcon id="mixed" />כמה תחומים</li>
          <li><span className="lg-line line-influenced" />השפעה</li>
          <li><span className="lg-line line-enabled" />איפשור</li>
          <li><span className="lg-line line-opposed" />ערעור</li>
          <li><span className="lg-line line-parallel" />מקביל</li>
          <li><span className="lg-line lg-orange" />פרשנות מקובלת</li>
          {isolated > 0 && <li><span className="lg-sq lg-alone" />בלי קשר מתועד עדיין: <bdi className="num">{isolated}</bdi></li>}
          {!!params.c && <li><span className="lg-sq lg-context" />שכן מחוץ לעיר, כהקשר</li>}
        </ul>
      </section>

      {focus && personById.get(focus) && (
        <div className="focus-bar tone tone-neutral rise">
          <Rich>{`**${personById.get(focus)!.nameHe}**: ${edges.filter((e) => e.source === focus || e.target === focus).length} קשרים בתצוגה.`}</Rich>
          <button type="button" className="press btn btn-quiet" onClick={() => set({ p: focus })}>כרטיס הדמות</button>
          <button type="button" className="press btn btn-quiet" onClick={() => set({ n: undefined })}>ביטול ההדגשה</button>
        </div>
      )}
      {selected && <LinkPanel selected={selected} pick={(id) => set({ p: id })} set={set} />}

      <div className="grid-2 graph-lower">
        <section>
          <h2 className="section-title">הדמויות לפי מספר קשרים</h2>
          <ol className="node-list">
            {[...nodes].sort((a, b) => b.degree - a.degree || a.year - b.year).map((n) => (
              <li key={n.id}>
                <button type="button" className="press city-row" aria-pressed={focus === n.id} onClick={() => set({ n: focus === n.id ? undefined : n.id })}>
                  <DomainIcon id={n.domain} />
                  <span>{n.person.nameHe} <span className="muted" dir="ltr">{n.person.nameFull}</span></span>
                  <bdi className="num">{n.degree}</bdi>
                </button>
              </li>
            ))}
          </ol>
        </section>
        <section>
          <h2 className="section-title">התצוגות שלי</h2>
          <div className="save-row">
            <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder={autoName()} aria-label="שם לתצוגה"
              onKeyDown={(e) => { if (e.key === 'Enter') save(); }} />
            <button type="button" className="press btn btn-primary" onClick={save}>שמירת התצוגה</button>
          </div>
          <p className="save-status label" aria-live="polite">{status}</p>
          {saved.length === 0 ? <p className="muted small">עוד אין תצוגות שמורות. כל תצוגה נשמרת בדפדפן הזה, וכתובתה כוללת את כל המסננים.</p> : (
            <ul className="saved-list">
              {saved.map((s) => (
                <li key={s.hash}>
                  <a className="press saved-item" href={s.hash}><strong>{s.name}</strong><span className="label">{s.savedAt}</span></a>
                  <button type="button" className="press chip" onClick={() => remove(s.hash)} aria-label={`מחיקת ${s.name}`}>מחיקה</button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {person && <PersonCard person={person} onClose={() => set({ p: undefined })} onOpen={(id, did) => (id ? set({ p: id }) : did ? go('timeline', workParams(discoveryById.get(did)!)) : undefined)} />}
    </main>
  );
}
