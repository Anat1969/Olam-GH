// ציר זמן לתחום אחד, ב-D3 (סקאלה ושנתות) ו-React (ציור).
// הזמן זורם מימין לשמאל, כמו כיוון הקריאה. המחוון הוא גבול הידע:
// מימין לו "מציאות מצויה", משמאל לו שכבת זכוכית שמכסה את "העולם הנעלם".
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { scaleLinear } from 'd3-scale';
import { type Discovery, links, personById, yearText, discoveries as allShown } from '../data';

export const YEAR_MIN = -350;
export const YEAR_MAX = 1950;
const W = 2200;
const PAD = 56;
const AXIS_Y = 132;
const CARD_W = 140;
const CARD_H = 74;
const LANE_H = 86;
const GAP = 10;

// ציר דחוס: לפני 1500 כל מילימטר מכסה יותר שנים, כי שם יש פחות גילויים.
export const BREAKS = [YEAR_MIN, 1000, 1500, 1800, YEAR_MAX];
export const FRACS = [0, 0.1, 0.21, 0.52, 1];
/** מיקום 0..1 לאורך הציר, למחוון שמסונכרן עם הדחיסה */
export const posScale = scaleLinear<number, number>().domain(BREAKS).range(FRACS).clamp(true);
export const xScale = scaleLinear<number, number>()
  .domain(BREAKS)
  .range(FRACS.map((f) => W - PAD - f * (W - 2 * PAD)))
  .clamp(true);

const TICKS = [-300, -200, -100, 1, 200, 400, 600, 800, 1000, 1100, 1200, 1300, 1400, 1500, 1550, 1600, 1650, 1700, 1750, 1800, 1825, 1850, 1875, 1900, 1925, 1950];

type Item = { d: Discovery; x: number; lane: number; left: number };

function layout(items: Discovery[]): { placed: Item[]; lanes: number } {
  const laneEdge: number[] = []; // הקצה השמאלי של הכרטיס האחרון בכל נתיב
  const placed: Item[] = [];
  for (const d of items) {
    const x = xScale(d.yearFrom);
    const left = Math.min(Math.max(x - CARD_W / 2, 4), W - CARD_W - 4);
    let lane = laneEdge.findIndex((edge) => left + CARD_W + GAP <= edge);
    if (lane === -1) { lane = laneEdge.length; laneEdge.push(Infinity); }
    laneEdge[lane] = left;
    placed.push({ d, x, lane, left });
  }
  return { placed, lanes: laneEdge.length };
}

export default function Timeline({ items, year, selectedPerson, onPick, follow }: {
  items: Discovery[]; year: number; selectedPerson?: string; onPick: (personId: string, discoveryId: string) => void; follow: boolean;
}) {
  const { placed, lanes } = useMemo(() => layout(items), [items]);
  const H = AXIS_Y + 34 + lanes * LANE_H + 12;
  const cx = xScale(year);
  const scroller = useRef<HTMLDivElement>(null);

  // שומרים את המחוון בתוך התצוגה כשהוא זז
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el || !follow) return;
    const view = el.clientWidth;
    if (cx < el.scrollLeft + 80 || cx > el.scrollLeft + view - 80) el.scrollLeft = cx - view / 2;
  }, [cx, follow]);
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = cx - el.clientWidth / 2;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  // קשרים של הדמות הנבחרת, כקשתות מעל הציר
  const arcs = useMemo(() => {
    if (!selectedPerson) return [];
    const pos = new Map(placed.map((p) => [p.d.id, p.x]));
    const firstOf = (pid: string) => placed.find((p) => p.d.personIds.includes(pid))?.x;
    const at = (id: string) => pos.get(id) ?? (id.startsWith('p-') ? firstOf(id) : undefined);
    const mine = new Set([selectedPerson, ...allShown.filter((d) => d.personIds.includes(selectedPerson)).map((d) => d.id)]);
    return links
      .filter((l) => mine.has(l.fromId) || mine.has(l.toId))
      .map((l) => ({ l, a: at(l.fromId), b: at(l.toId) }))
      .filter((r): r is { l: typeof r.l; a: number; b: number } => r.a !== undefined && r.b !== undefined && r.a !== r.b);
  }, [selectedPerson, placed]);

  return (
    <div className="tl-scroll" ref={scroller} tabIndex={0} aria-label="ציר הזמן. אפשר לגלול לצדדים.">
      <div className="tl-canvas" style={{ width: W, height: H }}>
        <svg className="tl-svg" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
          <defs>
            <pattern id="compressed" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="8" stroke="var(--rule)" strokeWidth="3" />
            </pattern>
          </defs>
          {/* קטעי ציר דחוסים */}
          <rect x={xScale(1500)} y={AXIS_Y - 6} width={xScale(YEAR_MIN) - xScale(1500)} height={12} fill="url(#compressed)" />
          {/* שנתות */}
          {TICKS.map((t) => (
            <g key={t} transform={`translate(${xScale(t)},0)`}>
              <line y1={AXIS_Y - 6} y2={AXIS_Y + 6} stroke="var(--ink-mute)" />
              <text className="tl-tick" y={AXIS_Y - 14} textAnchor="middle">{t < 0 ? -t : t}</text>
              {t < 0 && <text className="tl-tick-sub" y={AXIS_Y - 28} textAnchor="middle">לפנה״ס</text>}
            </g>
          ))}
          <line x1={PAD - 20} x2={W - PAD + 20} y1={AXIS_Y} y2={AXIS_Y} stroke="var(--ink)" strokeWidth="1.5" />
          {/* קשתות קשר */}
          {arcs.map(({ l, a, b }) => {
            const mid = (a + b) / 2;
            const h = Math.min(96, 26 + Math.abs(a - b) / 5);
            return (
              <path key={l.id} className={`tl-arc tl-arc-${l.type}`} d={`M${a},${AXIS_Y} Q${mid},${AXIS_Y - h * 2} ${b},${AXIS_Y}`} />
            );
          })}
          {/* מחברים בין נקודה לכרטיס */}
          {placed.map((p) => (
            <line key={p.d.id} className={p.d.yearFrom <= year ? 'tl-stem' : 'tl-stem is-hidden'}
              x1={p.x} x2={Math.min(Math.max(p.x, p.left + 10), p.left + CARD_W - 10)} y1={AXIS_Y} y2={AXIS_Y + 34 + p.lane * LANE_H} />
          ))}
          {placed.map((p) => (
            <g key={p.d.id} className={p.d.yearFrom <= year ? 'tl-dot' : 'tl-dot is-hidden'}>
              {p.d.yearTo !== p.d.yearFrom && (
                <line x1={xScale(p.d.yearFrom)} x2={xScale(p.d.yearTo)} y1={AXIS_Y} y2={AXIS_Y} className="tl-range" />
              )}
              <circle cx={p.x} cy={AXIS_Y} r={7} className={`tl-dot-${p.d.domainId}`} />
            </g>
          ))}
          {/* שכבת הזכוכית: העולם הנעלם */}
          <rect className="tl-veil" x={0} y={0} width={Math.max(cx, 0)} height={H} />
          <text className="tl-zone" x={Math.max(cx - 16, 140)} y={24} textAnchor="end">עולם נעלם</text>
          <text className="tl-zone tl-zone-known" x={Math.min(cx + 16, W - 140)} y={24} textAnchor="start">מציאות מצויה</text>
          <line className="tl-cursor" x1={cx} x2={cx} y1={34} y2={H - 4} />
        </svg>
        <div className="tl-cursor-label" style={{ left: cx }}><bdi className="num">{year < 0 ? -year : year}</bdi>{year < 0 && <span> לפנה״ס</span>}</div>
        {placed.map((p) => {
          const people = p.d.personIds.map((id) => personById.get(id)!).filter(Boolean);
          const lead = people[0];
          const known = p.d.yearFrom <= year;
          const on = !!selectedPerson && p.d.personIds.includes(selectedPerson);
          return (
            <button key={p.d.id} type="button" dir="rtl" data-id={p.d.id}
              className={`press tl-card${known ? '' : ' is-hidden'}`} aria-pressed={on}
              style={{ left: p.left, top: AXIS_Y + 34 + p.lane * LANE_H, width: CARD_W, height: CARD_H }}
              onClick={() => onPick(lead.id, p.d.id)}
              aria-label={`${people.map((x) => x.nameHe).join(' ו')}, ${yearText(p.d.yearFrom)}: ${p.d.title}`}>
              <span className="tl-face">{lead.imageUrl ? <img src={lead.imageUrl} alt="" loading="lazy" decoding="async" /> : null}</span>
              <span className="tl-text">
                <span className="tl-name">{people.map((x) => x.nameHe.split(' ').slice(-1)[0]).join(' ו')}</span>
                <span className="tl-year"><bdi className="num">{p.d.yearFrom < 0 ? -p.d.yearFrom : p.d.yearFrom}</bdi>{p.d.yearFrom < 0 ? ' לפנה״ס' : ''}</span>
                <span className="tl-title">{p.d.title.split(':')[0]}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
