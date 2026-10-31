import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRevealOnChange } from '../ui/reveal';
import DomainIcon from '../icons';
import Timeline, { YEAR_MAX, YEAR_MIN, posScale } from '../components/Timeline';
import YearSlider from '../ui/YearSlider';
import PeriodPicker from '../ui/PeriodPicker';
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
  // גבול הידע: התקופה שנבחנת (f עד t). ברירת מחדל: כל הטווח.
  const from = params.f && Number.isFinite(Number(params.f)) ? Math.max(YEAR_MIN, Number(params.f)) : YEAR_MIN;
  const to = params.t && Number.isFinite(Number(params.t)) ? Math.min(YEAR_MAX, Number(params.t)) : YEAR_MAX;
  const items = useMemo(() => discoveries.filter((d) => d.domainId === domain && d.yearTo >= from && d.yearFrom <= to), [domain, from, to]);
  const win = useMemo(() => ({ f: params.f, t: params.t }), [params.f, params.t]);
  useRevealOnChange('.tl-card-wrap', [params.p, params.w, params.d, params.f, params.t]);
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
    let raf = 0; let last = performance.now();
    let pos = posScale(year >= to ? from : year);
    if (year >= to) setYear(from);
    const end = posScale(to), span = Math.max(1e-6, end - posScale(from));
    if (reduced()) {
      const id = window.setInterval(() => {
        setYear((y) => {
          const next = items.find((d) => d.yearFrom > y);
          if (!next) { setPlaying(false); return to; }
          return next.yearFrom;
        });
      }, 1200);
      return () => window.clearInterval(id);
    }
    // מהירות קבועה על המסך: כל החלון ב-24 שניות
    const step = (now: number) => {
      pos += ((now - last) / 24000) * span; last = now;
      if (pos >= end) { setYear(to); setPlaying(false); return; }
      setYear(Math.round(posScale.invert(pos)));
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
    replace('timeline', { ...win, ...(personId ? { d: dom, y: String(y), p: personId } : { d: dom, y: String(y), w: discoveryId }) });
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
  const close = useCallback(() => replace('timeline', { ...win, d: domain, y: String(year) }), [domain, year, win]);

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
              onClick={() => replace('timeline', { ...win, d: d.id, y: String(year) })}>
              <DomainIcon id={d.id} />{d.nameHe} <bdi className="num">{discoveries.filter((x) => x.domainId === d.id).length}</bdi>
            </button>
          ))}
        </div>
        <div className="tl-time">
          <YearSlider label="גבול הידע" value={Math.min(Math.max(year, from), to)} from={from} to={to} onChange={(y) => { setPlaying(false); setYear(y); }} />
          {/* התקופה לבחינה: הציר מתמקד בה. האיקס האפור מחזיר לכל הטווח. */}
          <PeriodPicker label="תקופה לבחינה" from={from} to={to}
            onChange={(f, t) => { setPlaying(false); const cur = Object.fromEntries(new URLSearchParams(window.location.hash.split('?')[1] || '')); const y = Math.min(Math.max(year, f ?? YEAR_MIN), t ?? YEAR_MAX); setYear(y); replace('timeline', { ...cur, f: f === undefined ? undefined : String(f), t: t === undefined ? undefined : String(t), y: String(y) }); }} />
        </div>
        <div className="seg" role="group" aria-label="תנועה בזמן">
          <button type="button" className="press btn" disabled={!prev} onClick={() => { setPlaying(false); prev && setYear(prev.yearFrom); }}>הגילוי הקודם</button>
          <button type="button" className="press btn btn-primary" aria-pressed={playing} onClick={() => setPlaying((p) => !p)}>{playing ? 'עצירה' : 'הפעלה'}</button>
          <button type="button" className="press btn" disabled={!next} onClick={() => { setPlaying(false); next && setYear(next.yearFrom); }}>הגילוי הבא</button>
        </div>
      </div>

      <section className="card tl-card-wrap" aria-label={`ציר הזמן של ${domainName}`}>
        <Timeline items={items} year={year} from={from} to={to} selectedPerson={person?.id || work?.id} onPick={pick} follow={playing} />
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
