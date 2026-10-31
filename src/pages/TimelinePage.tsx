import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Timeline, { YEAR_MAX, YEAR_MIN, posScale, xScale } from '../components/Timeline';
import PersonCard from '../components/PersonCard';
import Rich from '../components/Rich';
import { activeDomains, discoveries, domainById, personById, yearText } from '../data';
import { replace } from '../route';

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const DEFAULT_YEAR = 1700;

export default function TimelinePage({ params }: { params: Record<string, string> }) {
  const domain = activeDomains.some((d) => d.id === params.d) ? params.d : 'physics';
  const urlYear = Number(params.y);
  const [year, setYear] = useState(Number.isFinite(urlYear) && params.y ? Math.min(Math.max(urlYear, YEAR_MIN), YEAR_MAX) : DEFAULT_YEAR);
  const [playing, setPlaying] = useState(false);
  const person = params.p ? personById.get(params.p) : undefined;
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
  const pick = (personId: string, discoveryId?: string) => {
    setPlaying(false);
    const d = discoveryId ? items.find((x) => x.id === discoveryId) : undefined;
    const y = d && d.yearFrom > year ? d.yearFrom : year;
    setYear(y);
    replace('timeline', { d: domain, y: String(y), p: personId });
  };
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
              {d.nameHe} <bdi className="num">{discoveries.filter((x) => x.domainId === d.id).length}</bdi>
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
        <Timeline items={items} year={year} selectedPerson={person?.id} onPick={pick} follow={playing} />
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
              <div key={s.id} className={`sub-col${xs.length ? '' : ' is-empty'}`} data-sub={s.id}>
                <h3 className="sub-title">{s.nameHe} <bdi className="num muted">{xs.length}</bdi></h3>
                {xs.length ? (
                  <ul className="sub-people">
                    {xs.map((d) => (
                      <li key={d.id}>
                        <button type="button" className="press sub-person" aria-pressed={!!person && d.personIds.includes(person.id)} onClick={() => pick(d.personIds[0], d.id)}>
                          <span className="sub-name">{d.personIds.map((id) => personById.get(id)?.nameHe).filter(Boolean).join(' ו')}</span>
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

      {person && <PersonCard person={person} onClose={close} onOpen={(id) => pick(id)} />}
    </main>
  );
}
