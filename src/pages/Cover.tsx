// הכריכה: דף הכניסה, שאליו מובילים הלוגו ושם האפליקציה. פונה אל הרגש: מרגשת, ממתגת ומשותפת.
// המסגרת היא הרכיב המשותף <app-cover> (AppOfApp-GH/public/cover.js), אותה מסגרת בכל האפליקציות.
// הייחודיות של עולם נעלם היא האמנות: מפת הביוגרפיה של פריסטלי (1765), מונפשת.
// קו אנכי הוא גבול הידע. הוא נע על פני הזמן מימין לשמאל, ומאחוריו נחשפים חיי הדמויות.
// מימינו "מציאות מצויה", ומשמאלו "עולם נעלם" מתחת לזכוכית. זה ה-DNA של האפליקציה, בתנועה.
import { useEffect, useMemo, useRef } from 'react';
import { discoveries, persons, links, activeDomains, yearText, type Person } from '../data';
import { posScale, YEAR_MAX } from '../components/Timeline';
import { mechanisms } from '../hidden/model';

const W = 1000, H = 620, ROWS = 24, LOOP = 24000, HOLD = 2600;

/** שורות כמו במפה של פריסטלי: כל חיים הם קו, וקווים שלא חופפים חולקים שורה */
function useChart() {
  return useMemo(() => {
    const domainOf = new Map<string, string>();
    for (const d of discoveries) for (const p of d.personIds) if (!domainOf.has(p)) domainOf.set(p, d.domainId);
    const lives = persons
      .filter((p): p is Person & { birthYear: number; deathYear: number } => p.birthYear !== null && p.deathYear !== null && domainOf.has(p.id))
      .sort((a, b) => a.birthYear - b.birthYear);
    const rowEnd: number[] = Array(ROWS).fill(-1);
    const out: { id: string; s: number; e: number; row: number; dom: string }[] = [];
    for (const p of lives) {
      const s = posScale(p.birthYear), e = posScale(Math.min(p.deathYear, YEAR_MAX));
      const row = rowEnd.findIndex((end) => end + 0.012 < s);
      if (row < 0) continue;
      rowEnd[row] = e;
      out.push({ id: p.id, s, e: Math.max(e, s + 0.004), row, dom: domainOf.get(p.id)! });
    }
    const dots = discoveries.map((d) => ({ id: d.id, p: posScale(d.yearFrom), dom: d.domainId }));
    return { lines: out, dots };
  }, []);
}

const x = (p: number) => W * (1 - p); // ימין לשמאל: העבר מימין
const y = (row: number) => 34 + (row * (H - 68)) / (ROWS - 1);

export function CoverArt() {
  const { lines, dots } = useChart();
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const glass = el.querySelector<SVGRectElement>('.ca-glass')!;
    const edge = el.querySelector<SVGLineElement>('.ca-edge')!;
    const year = el.querySelector<HTMLElement>('.ca-year')!;
    const set = (t: number) => {
      el.style.setProperty('--t', String(t));
      const bx = x(t);
      glass.setAttribute('width', String(Math.max(0, bx)));
      edge.setAttribute('x1', String(bx)); edge.setAttribute('x2', String(bx));
      year.style.right = `${t * 100}%`;
      year.textContent = yearText(Math.round(posScale.invert(t)));
    };
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { set(0.74); return; }
    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const k = (now - t0) % (LOOP + HOLD);
      set(Math.min(1, k / LOOP));
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div className="cover-art" ref={host} slot="art" role="img"
      aria-label={`מפת הביוגרפיה, מונפשת: ${lines.length} חיים של דמויות על ציר זמן אחד. קו גבול הידע נע מהעבר להווה, וחושף אותם.`}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
        {Array.from({ length: 11 }, (_, i) => <line key={i} className="ca-grid" x1={i * 100} x2={i * 100} y1={0} y2={H} />)}
        {/* הרפאים: כל החיים כבר שם, אפורים מתחת לזכוכית. גבול הידע צובע אותם כשהוא עובר */}
        {lines.map((l) => <line key={`g-${l.id}`} className="ca-ghost" x1={x(l.s)} x2={x(l.e)} y1={y(l.row)} y2={y(l.row)} />)}
        {lines.map((l) => (
          <line key={l.id} className="ca-life" x1={x(l.s)} x2={x(l.e)} y1={y(l.row)} y2={y(l.row)} pathLength={1}
            style={{ stroke: `var(--${l.dom})`, ['--s' as string]: l.s, ['--len' as string]: l.e - l.s }} />
        ))}
        {dots.map((d) => (
          <circle key={d.id} className="ca-dot" cx={x(d.p)} cy={H - 10} r={3.2} style={{ fill: `var(--${d.dom})`, ['--p' as string]: d.p }} />
        ))}
        <rect className="ca-glass" x={0} y={0} height={H} width={W} />
        <line className="ca-edge" x1={W} x2={W} y1={0} y2={H} />
      </svg>
      <span className="ca-label ca-found">מציאות מצויה</span>
      <span className="ca-label ca-hidden">עולם נעלם</span>
      <span className="ca-year num" aria-hidden="true" />
    </div>
  );
}

export default function Cover() {
  const ref = useRef<HTMLElement & { config?: unknown }>(null);
  const config = useMemo(() => ({
    name: 'עולם נעלם',
    subtitle: 'ומציאות מצויה',
    kicker: ['עולם · העלם · נעלם', 'מציאות · מצא · מציאה'],
    haiku: ['קו הזמן נע', 'מימינו מה שנמצא', 'משמאל, הנעלם'],
    vision: '**רב הנסתר על הגלוי.** לראות את כל הגילויים של האדם כמפה אחת, ולמצוא בה את מה שעוד לא נמצא.',
    goal: `**ללמוד איך מגלים:** ${discoveries.length} גילויים ו-${links.length} קשרים מאומתים ב-${activeDomains.length} תחומים, ו-${mechanisms.length} מנגנוני גילוי שאפשר להפעיל מחדש.`,
    open: { label: 'פתיחה', href: '#/open' },
    share: { title: 'עולם נעלם ומציאות מצויה', text: 'רב הנסתר על הגלוי: אטלס של גילויים, ומעבדה לגילוי הבא.' },
    credit: 'בהשראת מפת הביוגרפיה של ג׳וזף פריסטלי (A Chart of Biography), 1765.',
    palette: { ink: '#17191C', paper: '#F4F2EC', accent: '#1F4E79', marker: '#FFE45C' },
    video: null,
  }), []);
  useEffect(() => {
    // מציבים את התוכן רק אחרי שהרכיב הוגדר, אחרת המאפיין נשמר על האלמנט ומסתיר את ה-setter
    let alive = true;
    customElements.whenDefined('app-cover').then(() => { if (alive && ref.current) ref.current.config = config; });
    return () => { alive = false; };
  }, [config]);
  return (
    <main className="page page-wide cover-page">
      <app-cover ref={ref}>
        <CoverArt />
      </app-cover>
    </main>
  );
}
