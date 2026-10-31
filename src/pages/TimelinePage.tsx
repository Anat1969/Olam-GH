import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DomainIcon from '../icons';
import Timeline, { YEAR_MAX, YEAR_MIN, posScale, xScale } from '../components/Timeline';
import PersonCard from '../components/PersonCard';
import WorkCard from '../components/WorkCard';
import type { Nav } from '../components/CardNav';
import { useMatches } from '../search';
import Rich from '../components/Rich';
import { ANON, activeDomains, discoveries, discoveryById, domainById, personById, yearText } from '../data';
import { replace } from '../route';

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const DEFAULT_YEAR = 1700;

export default function TimelinePage({ params }: { params: Record<string, string> }) {
  const domain = activeDomains.some((d) => d.id === params.d) ? params.d : 'physics';
  const urlYear = Number(params.y);
  const [year, setYear] = useState(Number.isFinite(urlYear) && params.y ? Math.min(Math.max(urlYear, YEAR_MIN), YEAR_MAX) : DEFAULT_YEAR);
  const [playing, setPlaying] = useState(false);
  const person = params.p ? personById.get(params.p) : undefined;
  const work = !person && params.w ? discoveryById.get(params.w) : undefined;
  const items = useMemo(() => discoveries.filter((d) => d.domainId === domain), [domain]);
  const known = items.filter((d) => d.yearFrom <= year).length;
  const domainName = activeDomains.find((d) => d.id === domain)!.nameHe;

  // ניווט חיצוני (קישור, חזרה אחורה) מעדכן את השנה
  useEffect(() => {
    const y = Number(params.y);
    if (params.y && Number.isFinite(y) && y !== year) { setPlaying(false); setYear(Math.min(Math.max(y, YEAR_MIN), YEAR_MAX)); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.y]);

  // המחוון כותב לכתובת אחרי שהתנועה נרגעת
  const t = useRef<number>();
  useEffect(() => {
    window.clearTimeout(t.current);
    t.current = window.setTimeout(() => {
      // קוראים את הכתובת ברגע הכתיבה, כדי לא לדרוס דמות שנבחרה בינתיים
      const cur = Object.fromEntries(new URLSearchParams(window.location.hash.split('?')[1] || ''));
      if (cur.y !== String(year)) replace('timeline', { ...cur, y: String(year) });
    }, 250);
    return () => window.clearTimeout(t.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  // הפעלה: הזזה איטית במהירות קבועה על המסך. בהפחתת תנועה: קפיצה מגילוי לגילוי.
  useEffect(() => {
    if (!playing) return;
    let raf = 0; let last = performance.now(); let px = xScale(year === YEAR_MAX ? YEAR_MIN : year);
    if (year === YEAR_MAX) setYear(YEAR_MIN);
    if (reduced()) {
      const id = window.setInterval(() => {
        setYear((y) => {
          const next = items.find((d) => d.yearFrom > y);
          if (!next) { setPlaying(false); return YEAR_MAX; }
          return next.yearFrom;
        });
      }, 1200);
      return () => window.clearInterval(id);
    }
    const step = (now: number) => {
      px -= (now - last) * 0.09; last = now;
      const y = Math.round(xScale.invert(px));
      if (y >= YEAR_MAX || px <= xScale(YEAR_MAX)) { setYear(YEAR_MAX); setPlaying(false); return; }
      setYear(y);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, items]);

  const prev = [...items].reverse().find((d) => d.yearFrom < year);
  const next = items.find((d) => d.yearFrom > year);
  // דמות פותחת כרטיס דמות. יצירה בלי יוצר ידוע פותחת כרטיס יצירה, גם אם היא בתחום אחר.
  const pick = (personId?: string, discoveryId?: string) => {
    setPlaying(false);
    const d = discoveryId ? discoveryById.get(discoveryId) : undefined;
    const dom = !personId && d ? d.domainId : domain;
    const y = d && d.yearFrom > year ? d.yearFrom : year;
    setYear(y);
    replace('timeline', personId ? { d: dom, y: String(y), p: personId } : { d: dom, y: String(y), w: discoveryId });
  };
  // הגעה מחיפוש לתת-תחום: גוללים אליו ומסמנים אותו
  useEffect(() => {
    if (!params.sub) return;
    const el = document.querySelector(`.sub-col[data-sub="${params.sub}"]`);
    el?.scrollIntoView({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' });
  }, [params.sub, domain]);
  // קדימה ואחורה בין הדמויות של הנושא שנבחר, לפי הזמן. כשיש מילת מפתח והדמות בתוצאות, הרצף הוא תוצאות החיפוש בתחום.
  const kw = useMatches();
  const nav = useMemo((): Nav | undefined => {
    if (!person && !work) return undefined;
    const has = (d: (typeof items)[number]) => (person ? d.personIds.includes(person.id) : d.id === work!.id);
    const inKw = kw.active && items.some((d) => has(d) && kw.discoveries.has(d.id));
    const seq = inKw ? items.filter((d) => kw.discoveries.has(d.id)) : items;
    const idx = seq.reduce((best, d, i) => (has(d) && (best < 0 || Math.abs(d.yearFrom - year) < Math.abs(seq[best].yearFrom - year)) ? i : best), -1);
    if (idx < 0) return undefined;
    const open = (d: (typeof items)[number]) => () => pick(d.personIds[0], d.id);
    const prev = [...seq.slice(0, idx)].reverse().find((d) => !has(d));
    const next = seq.slice(idx + 1).find((d) => !has(d));
    return { pos: idx + 1, total: seq.length, label: inKw ? `בתוצאות החיפוש ב${domainName}` : `ב${domainName}`, onPrev: prev && open(prev), onNext: next && open(next) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [person?.id, work?.id, items, kw, year]);
  const close = useCallback(() => replace('timeline', { d: domain, y: String(year) }), [domain, year]);

  return (
    <main className="page page-wide">
      <div className="crumbs"><a href="#/">בית</a> / ציר הזמן / {domainName}</div>
      <h1 className="page-title" aria-live="polite">
        <Rich>{`בשנת ${yearText(year)} ידועים ${known} מתוך ${items.length} גילויים.`}</Rich>
      </h1>
      <p className="page-sub lines">
        <span>המחוון הוא <strong>גבול הידע</strong>: מימינו <strong>מציאות מצויה</strong>, משמאלו <strong>עולם נעלם</strong>.</span>
        <span>לחיצה על כרטיס פותחת את הדמות, את הציטוט מהמקור ואת הקשרים שלה.</span>
      </p>

      <div className="tl-controls card glass">
        <div className="seg" role="group" aria-label="תחום">
          {activeDomains.map((d) => (
            <button key={d.id} type="button" className="press chip" aria-pressed={d.id === domain}
              onClick={() => replace('timeline', { d: d.id, y: String(year) })}>
              <DomainIcon id={d.id} />{d.nameHe} <bdi className="num">{discoveries.filter((x) => x.domainId === d.id).length}</bdi>
            </button>
          ))}
        </div>
        <label className="slider">
          <span className="label">שנה</span>
          <input type="range" dir="rtl" min={0} max={1000} step={1} value={Math.round(posScale(year) * 1000)} aria-label="מחוון זמן"
            aria-valuetext={yearText(year)} onChange={(e) => { setPlaying(false); setYear(Math.round(posScale.invert(Number(e.target.value) / 1000))); }} />
        </label>
        <div className="seg" role="group" aria-label="תנועה בזמן">
          <button type="button" className="press btn" disabled={!prev} onClick={() => { setPlaying(false); prev && setYear(prev.yearFrom); }}>הגילוי הקודם</button>
          <button type="button" className="press btn btn-primary" aria-pressed={playing} onClick={() => setPlaying((p) => !p)}>{playing ? 'עצירה' : 'הפעלה'}</button>
          <button type="button" className="press btn" disabled={!next} onClick={() => { setPlaying(false); next && setYear(next.yearFrom); }}>הגילוי הבא</button>
        </div>
      </div>

      <section className="card tl-card-wrap" aria-label={`ציר הזמן של ${domainName}`}>
        <Timeline items={items} year={year} selectedPerson={person?.id || work?.id} onPick={pick} follow={playing} />
        <ul className="legend" aria-label="מקרא">
          <li><span className={`lg-dot tl-dot-${domain}`} />גילוי שכבר ידוע בשנה שנבחרה</li>
          <li><span className="lg-dot lg-hidden" />גילוי שעוד נעלם, מתחת לזכוכית</li>
          <li><span className="lg-arc" />קשר מתועד של הדמות שנבחרה</li>
          <li><span className="lg-arc lg-arc-opposed" />קשר של ערעור</li>
          <li><span className="lg-hatch" />ציר דחוס: לפני <bdi className="num">1500</bdi> כל שנתה מכסה יותר שנים</li>
        </ul>
      </section>

      <section className="card subs-wrap" aria-label={`תתי התחומים של ${domainName}`}>
        <h2 className="section-title">תתי התחומים של {domainName}</h2>
        <p className="muted small">כל תת-תחום והדמויות שלו לפי סדר הזמן. לחיצה על דמות מדגישה את השנה שלה על הציר. תת-תחום ריק הוא חור שעדיין לא מולא, ולא סימן שאין בו גילויים.</p>
        <div className="subs-grid">
          {(domainById.get(domain)?.subs || []).map((s) => {
            const xs = items.filter((d) => d.sub === s.id);
            return (
              <div key={s.id} className={`sub-col${xs.length ? '' : ' is-empty'}${params.sub === s.id ? ' is-target' : ''}`} data-sub={s.id}>
                <h3 className="sub-title">{s.nameHe} <bdi className="num muted">{xs.length}</bdi></h3>
                {xs.length ? (
                  <ul className="sub-people">
                    {xs.map((d) => (
                      <li key={d.id}>
                        <button type="button" className="press sub-person" aria-pressed={(!!person && d.personIds.includes(person.id)) || work?.id === d.id} onClick={() => pick(d.personIds[0], d.id)}>
                          <span className="sub-name">{d.personIds.map((id) => personById.get(id)?.nameHe).filter(Boolean).join(' ו') || `${d.title.split(':')[0]} (${ANON})`}</span>
                          <bdi className="num sub-year">{yearText(d.yearFrom)}</bdi>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : <p className="muted small">עדיין אין גילויים מאומתים</p>}
              </div>
            );
          })}
        </div>
      </section>

      {person && <PersonCard person={person} onClose={close} onOpen={(id, did) => pick(id, did)} nav={nav} />}
      {work && <WorkCard d={work} onClose={close} onOpen={(id, did) => pick(id, did)} nav={nav} />}
    </main>
  );
}
