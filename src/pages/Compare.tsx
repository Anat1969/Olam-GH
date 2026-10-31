// שלב 2: השוואה בין תחומים. כמה שורות על ציר זמן אחד, זום מסונכרן ב-D3, וקשרים שנבחרים בלחיצה.
// השורה הראשונה מציגה כרטיסים מעל הציר, והאחרות מתחתיו, כך שבין הצירים נשאר "שדה הקשרים".
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { scaleLinear } from 'd3-scale';
import { select } from 'd3-selection';
import { zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from 'd3-zoom';
import Rich from '../components/Rich';
import PersonCard from '../components/PersonCard';
import LinkPanel from '../components/LinkPanel';
import { BREAKS, FRACS, YEAR_MAX, YEAR_MIN, posScale } from '../components/Timeline';
import {
  type Discovery, type LinkType, activeDomains, discoveries, endName, linkTypeName, personById,
  resolveLink, links as allLinks, yearText,
} from '../data';
import { replace } from '../route';

const PAD = 28;
const CARD_H = 52;
const LANE = 58;
const LANES = 3;
const ROW_CARDS = LANES * LANE + 14;
const GAP = 168; // שדה הקשרים בין הצירים
const TOP = 30;
const TYPES: LinkType[] = ['influenced', 'enabled', 'opposed', 'parallel'];
const ERAS: [string, number, number][] = [['כל הציר', YEAR_MIN, YEAR_MAX], ['עד 1100', -400, 1100], ['1500–1750', 1500, 1750], ['1750–1970', 1750, YEAR_MAX]];

type Placed = { d: Discovery; x: number; lane: number; left: number; pin: boolean; off: boolean };

function place(items: Discovery[], x: (y: number) => number, W: number, cw: number): Placed[] {
  const edge: number[] = [];
  return items.map((d) => {
    const px = x(d.yearFrom);
    if (px < -4 || px > W + 4) return { d, x: px, lane: -1, left: px, pin: false, off: true }; // מחוץ לחלון הזום
    const left = Math.min(Math.max(px - cw / 2, 2), W - cw - 2);
    let lane = edge.findIndex((e) => left + cw + 6 <= e);
    if (lane === -1 && edge.length < LANES) { lane = edge.length; edge.push(Infinity); }
    if (lane === -1) return { d, x: px, lane: -1, left, pin: true, off: false };
    edge[lane] = left;
    return { d, x: px, lane, left, pin: false, off: false };
  });
}

export default function Compare({ params }: { params: Record<string, string> }) {
  const domainIds = (params.d || activeDomains.map((d) => d.id).join(',')).split(',').filter((id) => activeDomains.some((d) => d.id === id));
  const rows = domainIds.length ? domainIds : activeDomains.map((d) => d.id);
  const rowSet = useMemo(() => new Set(rows), [rows.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps
  const year = Number.isFinite(Number(params.y)) && params.y ? Number(params.y) : YEAR_MAX;
  const hiddenTypes = new Set((params.h || '').split(',').filter(Boolean));
  const crossOnly = params.x === '1';
  const selectedId = params.l;
  const person = params.p ? personById.get(params.p) : undefined;

  const set = useCallback((patch: Record<string, string | undefined>) => {
    const cur = Object.fromEntries(new URLSearchParams(window.location.hash.split('?')[1] || ''));
    replace('compare', { ...cur, ...patch });
  }, []);

  // רוחב אמיתי של המיכל: אין גלילה אופקית, יש זום
  const wrap = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(1200);
  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(Math.max(320, Math.round(el.clientWidth))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const mobile = W < 640;
  const cw = mobile ? 96 : 128;
  const base = useMemo(() => scaleLinear<number, number>().domain(BREAKS).range(FRACS.map((f) => W - PAD - f * (W - 2 * PAD))), [W]);
  const [t, setT] = useState<ZoomTransform>(zoomIdentity);
  const x = useMemo(() => t.rescaleX(base), [t, base]);
  // שורה 0: כרטיסים מעל הציר. כל שורה אחרת: מתחת לציר, ולכן בין הציר שלה לבא אחריו יש מקום לכרטיסים
  const axisY = (i: number) => TOP + ROW_CARDS + GAP * i + ROW_CARDS * Math.max(0, i - 1);
  const H = axisY(rows.length - 1) + (rows.length > 1 ? ROW_CARDS : 20) + 12;

  // זום: גרירה מזיזה, צביטה או Ctrl+גלגלת מגדילים. גלגלת רגילה ממשיכה לגלול את הדף.
  const zb = useRef<ZoomBehavior<HTMLDivElement, unknown>>();
  const windowToTransform = useCallback((from: number, to: number) => {
    const a = base(from), b = base(to);
    const k = Math.min(60, Math.max(1, (W - 2 * PAD) / Math.max(1, a - b)));
    return zoomIdentity.translate(PAD - k * b, 0).scale(k);
  }, [base, W]);
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const z = zoom<HTMLDivElement, unknown>()
      .scaleExtent([1, 60])
      .extent([[0, 0], [W, H]])
      .translateExtent([[0, 0], [W, H]])
      .filter((e: Event) => {
        if (e.type === 'wheel') return (e as WheelEvent).ctrlKey || (e as WheelEvent).metaKey;
        if (e.type.startsWith('touch')) return (e as TouchEvent).touches.length > 1;
        if ((e.target as HTMLElement).closest('button')) return false;
        return !(e as MouseEvent).button;
      })
      .on('zoom', (e) => setT(e.transform))
      .on('end', (e) => {
        if (!e.sourceEvent) return;
        const sx = e.transform.rescaleX(base);
        set({ f: String(Math.round(sx.invert(W - PAD))), t: String(Math.round(sx.invert(PAD))) });
      });
    zb.current = z;
    const sel = select(el).call(z).on('dblclick.zoom', null);
    const f = Number(params.f), to = Number(params.t);
    sel.call(z.transform, params.f && params.t && to > f ? windowToTransform(f, to) : zoomIdentity);
    return () => { sel.on('.zoom', null); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [W, H]);
  // ניווט חיצוני (קישור, חזרה אחורה) מעדכן את חלון הזום
  useEffect(() => {
    const f = Number(params.f), to = Number(params.t);
    if (!wrap.current || !zb.current) return;
    const sx = t.rescaleX(base);
    const cf = sx.invert(W - PAD), ct = sx.invert(PAD);
    if (params.f && params.t && to > f) {
      if (Math.abs(cf - f) > 2 || Math.abs(ct - to) > 2) select(wrap.current).call(zb.current.transform, windowToTransform(f, to));
    } else if (!params.f && !params.t && t.k !== 1) select(wrap.current).call(zb.current.transform, zoomIdentity);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.f, params.t]);
  const goWindow = (from: number, to: number) => {
    if (!wrap.current || !zb.current) return;
    select(wrap.current).call(zb.current.transform, windowToTransform(from, to));
    set({ f: from === YEAR_MIN && to === YEAR_MAX ? undefined : String(from), t: from === YEAR_MIN && to === YEAR_MAX ? undefined : String(to) });
  };
  const zoomBy = (k: number) => {
    if (!wrap.current || !zb.current) return;
    select(wrap.current).call(zb.current.scaleBy, k, [W / 2, 0]);
    const sx = t.scale(k).rescaleX(base);
    set({ f: String(Math.round(sx.invert(W - PAD))), t: String(Math.round(sx.invert(PAD))) });
  };
  const viewFrom = Math.round(x.invert(W - PAD));
  const viewTo = Math.round(x.invert(PAD));

  // מיקום כרטיסים בכל שורה, לפי הזום הנוכחי
  const placed = useMemo(() => rows.map((id) => place(discoveries.filter((d) => d.domainId === id), x, W, cw)), [rows.join(','), x, W, cw]); // eslint-disable-line react-hooks/exhaustive-deps
  const pos = useMemo(() => {
    const m = new Map<string, { x: number; row: number }>();
    placed.forEach((list, row) => list.forEach((p) => m.set(p.d.id, { x: p.x, row })));
    return m;
  }, [placed]);

  // קשרים בתצוגה
  const all = useMemo(() => allLinks.map((l) => resolveLink(l, rowSet)).filter((r): r is NonNullable<ReturnType<typeof resolveLink>> => !!r), [rowSet]);
  const shown = all.filter((r) => !hiddenTypes.has(r.link.type) && (!crossOnly || r.cross));
  const selected = all.find((r) => r.link.id === selectedId);
  const crossCount = all.filter((r) => r.cross).length;
  const ends = new Set(selected ? [selected.a.d.id, selected.b.d.id] : []);

  const path = (ax: number, ar: number, bx: number, br: number) => {
    const ay = axisY(ar), by = axisY(br);
    if (ar === br) {
      const dir = ar === 0 ? 1 : -1; // השורה הראשונה מקשתת למטה, האחרות למעלה: תמיד לתוך שדה הקשרים
      const h = Math.min(GAP - 20, 22 + Math.abs(ax - bx) / 4) * dir;
      return `M${ax},${ay} C${ax},${ay + h} ${bx},${by + h} ${bx},${by}`;
    }
    const my = (ay + by) / 2;
    return `M${ax},${ay} C${ax},${my} ${bx},${my} ${bx},${by}`;
  };

  const cx = x(Math.min(Math.max(year, YEAR_MIN), YEAR_MAX));
  // שנתות: מועמדות עגולות, ומסננים כך שלא יהיו צפופות מ-56 פיקסלים
  const ticks = useMemo(() => {
    const cand = [-2500, -2000, -1500, -1000, -500, -300, -200, -100, 1, 200, 400, 600, 800, 1000, 1100, 1200, 1300, 1400, 1500, 1550, 1600, 1650, 1700, 1750, 1800, 1825, 1850, 1875, 1900, 1925, 1950];
    const fine = viewTo - viewFrom < 160 ? x.ticks(mobile ? 4 : 8).filter((v) => Number.isInteger(v)) : [];
    const out: number[] = [];
    for (const v of [...new Set([...cand, ...fine])].sort((a, b) => b - a)) {
      const px = x(v);
      if (v < YEAR_MIN || v > YEAR_MAX || px < 8 || px > W - 8) continue;
      if (out.every((o) => Math.abs(x(o) - px) >= (mobile ? 48 : 56))) out.push(v);
    }
    return out;
  }, [x, W, mobile, viewFrom, viewTo]);
  const pick = (personId: string) => set({ p: personId });
  const rowName = (id: string) => activeDomains.find((d) => d.id === id)!.nameHe;
  const title = rows.length > 1
    ? (rows.length === 2 ? `${crossCount} קשרים חוצים בין ${rows.map(rowName).join(' ל')}.` : `${crossCount} קשרים חוצים בין ${rows.length} תחומים.`)
    : `${all.length} קשרים בתוך ${rowName(rows[0])}.`;

  return (
    <main className="page page-wide">
      <div className="crumbs"><a href="#/">בית</a> / השוואה בין תחומים</div>
      <h1 className="page-title"><Rich>{title}</Rich></h1>
      <p className="page-sub lines">
        <span>הזום <strong>מסונכרן</strong> בכל השורות: גרירה מזיזה, צביטה או <strong>Ctrl וגלגלת</strong> מגדילים.</span>
        <span>לחיצה על קשר מציגה את <strong>הכלל</strong>, <strong>התובנה</strong> ו<strong>היישום</strong>.</span>
      </p>

      <div className="cmp-controls card glass">
        <div className="seg" role="group" aria-label="תחומים">
          {activeDomains.map((d) => {
            const on = rows.includes(d.id);
            return (
              <button key={d.id} type="button" className="press chip" aria-pressed={on} disabled={on && rows.length === 1}
                onClick={() => set({ d: (on ? rows.filter((r) => r !== d.id) : activeDomains.map((a) => a.id).filter((a) => a === d.id || rows.includes(a))).join(','), l: undefined })}>
                {d.nameHe} <bdi className="num">{discoveries.filter((x) => x.domainId === d.id).length}</bdi>
              </button>
            );
          })}
        </div>
        <div className="seg" role="group" aria-label="תקופה">
          {ERAS.map(([label, a, b]) => (
            <button key={label} type="button" className="press chip" aria-pressed={Math.abs(viewFrom - a) < 8 && Math.abs(viewTo - b) < 8} onClick={() => goWindow(a, b)}>{label}</button>
          ))}
          <button type="button" className="press chip" onClick={() => zoomBy(1.6)}>הגדלה</button>
          <button type="button" className="press chip" disabled={t.k <= 1.001} onClick={() => zoomBy(1 / 1.6)}>הקטנה</button>
        </div>
        <div className="seg" role="group" aria-label="סוג קשר">
          {TYPES.map((ty) => {
            const n = all.filter((r) => r.link.type === ty).length;
            const on = !hiddenTypes.has(ty);
            return (
              <button key={ty} type="button" className={`press chip chip-line line-${ty}`} aria-pressed={on} disabled={!n}
                onClick={() => { const h = new Set(hiddenTypes); on ? h.add(ty) : h.delete(ty); set({ h: [...h].join(',') || undefined }); }}>
                {linkTypeName[ty]} <bdi className="num">{n}</bdi>
              </button>
            );
          })}
          {rows.length > 1 && (
            <button type="button" className="press chip" aria-pressed={crossOnly} onClick={() => set({ x: crossOnly ? undefined : '1' })}>רק חוצי תחום</button>
          )}
        </div>
        <label className="slider">
          <span className="label">גבול הידע</span>
          <input type="range" dir="rtl" min={0} max={1000} value={Math.round(posScale(year) * 1000)} aria-label="גבול הידע" aria-valuetext={yearText(year)}
            onChange={(e) => { const y = Math.round(posScale.invert(Number(e.target.value) / 1000)); set({ y: y >= YEAR_MAX ? undefined : String(y) }); }} />
        </label>
      </div>

      <section className="card cmp-wrap" aria-label="השוואה בין תחומים">
        <div className="cmp-view label">מוצג: <bdi className="num">{yearText(Math.max(viewFrom, YEAR_MIN))}</bdi> עד <bdi className="num">{yearText(Math.min(viewTo, YEAR_MAX))}</bdi></div>
        <div className="cmp-plot" ref={wrap} style={{ height: H }}>
          <svg className="cmp-svg" width={W} height={H} aria-hidden="true">
            <defs>
              {(['documented', 'interpretive'] as const).map((c) => (
                <marker key={c} id={`arrow-${c}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M0,0 L10,5 L0,10 z" className={`arrow-${c}`} />
                </marker>
              ))}
            </defs>
            {rows.map((id, i) => (
              <g key={id}>
                <rect className={`cmp-band band-${id}`} x={0} y={i === 0 ? axisY(0) - 6 : axisY(i) - 6} width={W} height={12} />
                <line x1={0} x2={W} y1={axisY(i)} y2={axisY(i)} className={`cmp-axis axis-${id}`} />
                {ticks.map((v) => (
                  <text key={v} className="tl-tick" x={x(v)} y={axisY(i) + (i === 0 ? -10 : 22)} textAnchor="middle">{v < 0 ? -v : v}</text>
                ))}
              </g>
            ))}
            {year < YEAR_MAX && <rect className="tl-veil" x={0} y={0} width={Math.max(0, Math.min(cx, W))} height={H} />}
          </svg>

          {rows.map((id, i) => (
            <div key={id} className={`cmp-rowname row-${id}`} style={{ top: i === 0 ? 4 : axisY(i) + ROW_CARDS - 18 }}>
              {rowName(id)}
            </div>
          ))}

          {placed.map((list, row) => list.filter((p) => !p.off).map((p) => {
            const people = p.d.personIds.map((id) => personById.get(id)!);
            const known = p.d.yearFrom <= year;
            const cls = `${known ? '' : ' is-hidden'}${ends.has(p.d.id) ? ' is-end' : ''}${selected && !ends.has(p.d.id) ? ' is-dim' : ''}`;
            const label = `${people.map((x) => x.nameHe).join(' ו')}, ${yearText(p.d.yearFrom)}: ${p.d.title}`;
            if (p.pin) {
              const top = row === 0 ? axisY(0) - 22 : axisY(row) + 10;
              return <button key={p.d.id} type="button" data-id={p.d.id} className={`press cmp-pin pin-${p.d.domainId}${cls}`} style={{ left: p.x - 6, top }} title={label} aria-label={label} onClick={() => pick(people[0].id)} />;
            }
            const top = row === 0 ? axisY(0) - 14 - CARD_H - p.lane * LANE : axisY(row) + 14 + p.lane * LANE;
            return (
              <button key={p.d.id} type="button" dir="rtl" data-id={p.d.id} className={`press cmp-card${cls}`} aria-pressed={person ? p.d.personIds.includes(person.id) : false}
                style={{ left: p.left, top, width: cw, height: CARD_H }} aria-label={label} onClick={() => pick(people[0].id)}>
                <span className="cmp-face">{people[0].imageUrl ? <img src={people[0].imageUrl} alt="" loading="lazy" /> : null}</span>
                <span className="cmp-text">
                  <span className="tl-name">{people.map((x) => x.nameHe.split(' ').slice(-1)[0]).join(' ו')}</span>
                  <span className="tl-year"><bdi className="num">{p.d.yearFrom < 0 ? -p.d.yearFrom : p.d.yearFrom}</bdi>{p.d.yearFrom < 0 ? ' לפנה״ס' : ''}</span>
                </span>
                <i className="cmp-stem" style={{ left: Math.min(Math.max(p.x - p.left, 6), cw - 6), [row === 0 ? 'top' : 'bottom']: CARD_H, height: row === 0 ? 14 + p.lane * LANE : 14 + p.lane * LANE } as React.CSSProperties} />
              </button>
            );
          }))}

          {/* שכבת הקשרים: מעל הכרטיסים, ולחיצה רק על הקו עצמו */}
          <svg className="cmp-links" width={W} height={H}>
            {shown.map((r) => {
              const A = pos.get(r.a.d.id), B = pos.get(r.b.d.id);
              if (!A || !B) return null;
              const d = path(A.x, A.row, B.x, B.row);
              const on = selected?.link.id === r.link.id;
              return (
                <g key={r.link.id} className={`lk lk-${r.link.type} lk-${r.link.confidence}${on ? ' is-on' : ''}${selected && !on ? ' is-dim' : ''}`}>
                  {on && <path d={d} className="lk-halo" />}
                  <path d={d} className="lk-line" markerEnd={`url(#arrow-${r.link.confidence === 'interpretive' ? 'interpretive' : 'documented'})`} />
                  <path d={d} className="lk-hit" data-link={r.link.id} role="button" tabIndex={0}
                    aria-label={`קשר: ${endName(r.a)} ${linkTypeName[r.link.type]} ${endName(r.b)}`}
                    onClick={() => set({ l: on ? undefined : r.link.id })}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); set({ l: on ? undefined : r.link.id }); } }} />
                  {(r.a.viaPerson || r.b.viaPerson) && [r.a, r.b].filter((e) => e.viaPerson).map((e) => {
                    const P = pos.get(e.d.id)!;
                    return <circle key={e.id} cx={P.x} cy={axisY(P.row)} r={8} className="lk-person" />;
                  })}
                </g>
              );
            })}
            {placed.map((list, row) => list.filter((p) => !p.off).map((p) => (
              <circle key={p.d.id} cx={p.x} cy={axisY(row)} r={5} className={`cmp-dot tl-dot-${p.d.domainId}${p.d.yearFrom <= year ? '' : ' is-hidden'}`} />
            )))}
          </svg>
        </div>
        <ul className="legend" aria-label="מקרא">
          <li><span className="lg-line line-influenced" />השפעה</li>
          <li><span className="lg-line line-enabled" />איפשור, קו עבה</li>
          <li><span className="lg-line line-opposed" />ערעור</li>
          <li><span className="lg-line line-parallel" />מקביל</li>
          <li><span className="conf conf-documented">מתועד</span><span className="conf conf-interpretive">פרשנות מקובלת</span>צבע הקו</li>
          <li><span className="lg-ring" />הקצה הוא דמות, מוצג בגילוי הקרוב בזמן</li>
          <li><span className="lg-pin" />גילוי בלי מקום לכרטיס: הגדילו את הזום</li>
        </ul>
      </section>

      {selected ? (
        <LinkPanel selected={selected} pick={pick} set={set} />
      ) : (
        <p className="link-empty tone tone-neutral">בחרו קשר על הציר או ברשימה, כדי לראות את הכלל, התובנה והיישום שלו.</p>
      )}

      <h2 className="section-title">כל הקשרים בתצוגה <bdi className="num">{shown.length}</bdi></h2>
      {shown.length === 0 ? <p className="muted">אין קשרים שמתאימים לסינון. הפעילו סוג קשר או בטלו את "רק חוצי תחום".</p> : (
        <ul className="link-list">
          {[...shown].sort((a, b) => Number(b.cross) - Number(a.cross) || a.a.d.yearFrom - b.a.d.yearFrom).map((r) => (
            <li key={r.link.id}>
              <button type="button" className="press link-item" aria-pressed={selected?.link.id === r.link.id} onClick={() => set({ l: r.link.id })}>
                <span className={`lg-line line-${r.link.type}`} />
                <span className="link-names">{endName(r.a)} <span aria-hidden="true">←</span> {endName(r.b)}</span>
                <span className="label">{linkTypeName[r.link.type]}{r.cross ? ' · חוצה תחום' : ''}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {person && <PersonCard person={person} onClose={() => set({ p: undefined })} onOpen={(id) => set({ p: id })} />}
    </main>
  );
}
