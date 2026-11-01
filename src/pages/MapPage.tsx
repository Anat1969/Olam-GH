// שלב 3: מפה. אותם גילויים לפי מקום, ומחוון זמן שמזיז את הנקודות בזמן אמת.
import IconButton, { IconRow } from '../ui/IconButton';
import { useRevealOnChange } from '../ui/reveal';
import { useMatches } from '../search';
import DomainIcon from '../icons';
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Rich from '../components/Rich';
import LinkPanel from '../components/LinkPanel';
import PersonCard from '../components/PersonCard';
import PlacePanel from '../components/PlacePanel';
import WorkImage from '../components/WorkImage';
import PeoplePanel from '../components/PeoplePanel';
import DomainPicker from '../ui/DomainPicker';
import YearSlider from '../ui/YearSlider';
import { YEAR_MAX, YEAR_MIN, posScale } from '../components/Timeline';
import { activeDomains, confidenceName, discoveries, endName, linkTypeName, personById, rangeText, yearText, ANON, workParams, discoveryById } from '../data';
import { arc, centerAt, centerTrail, cities, countries, countryByName, km, nearestCity, routes, sameCityLinks, unplaced } from '../geo';
import { href, replace, go } from '../route';

const domainName = (id: string) => activeDomains.find((d) => d.id === id)?.nameHe || id;

const MapView = lazy(() => import('../components/MapView'));
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const DEFAULT_YEAR = 1700;

/** שעון זמן במסע: סופר את השנים מהתחנה הקודמת לתחנה הנוכחית, כדי שיורגש שהזמן עובר */
function TourClock({ year }: { year: number }) {
  const [shown, setShown] = useState(year);
  const from = useRef(year);
  useEffect(() => {
    const a = from.current, b = year;
    from.current = year;
    if (a === b || reduced()) { setShown(b); return; }
    const t0 = performance.now(), dur = Math.min(1600, 300 + Math.abs(b - a) * 4);
    let raf = 0;
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / dur);
      setShown(Math.round(a + (b - a) * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [year]);
  return (
    <div className="tour-clock" role="timer" aria-live="off" aria-label={`השנה במסע: ${yearText(year)}`}>
      <span className="label">שעון הזמן</span>
      <bdi className="num tour-clock-y">{Math.abs(shown)}</bdi>{shown < 0 && <span className="tour-clock-bc">לפנה״ס</span>}
    </div>
  );
}

export default function MapPage({ params }: { params: Record<string, string> }) {
  const kwm = useMatches();
  const kwOf = (key: string): boolean | undefined => (kwm.active ? kwm.cities.has(key) : undefined);
  const year = params.y && Number.isFinite(Number(params.y)) ? Math.min(Math.max(Number(params.y), YEAR_MIN), YEAR_MAX) : DEFAULT_YEAR;
  // בחירת תחומים: בלי d = כל התחומים. מסע ישן (t=<תחום>) נקרא כבחירה של התחום הזה.
  const legacyT = params.t && params.t !== '1' && params.t !== 'all' ? params.t : undefined;
  const allOn = !params.d && !legacyT;
  const domains = new Set(allOn ? activeDomains.map((d) => d.id) : (params.d || legacyT!).split(','));
  const domainsLabel = allOn ? 'כל התחומים' : activeDomains.filter((d) => domains.has(d.id)).map((d) => d.nameHe).join(', ');
  // מצבי תצוגה כבויים כברירת מחדל: נדלקים רק כשבוחרים בהם
  const showRoutes = params.r === '1';
  const showTrail = params.g === '1';
  const person = params.p ? personById.get(params.p) : undefined;
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);

  const set = useCallback((patch: Record<string, string | undefined>) => {
    const cur = Object.fromEntries(new URLSearchParams(window.location.hash.split('?')[1] || ''));
    replace('map', { ...cur, ...patch });
  }, []);
  const setYear = useCallback((y: number) => set({ y: String(Math.round(y)) }), [set]);

  // הפעלה: הזמן מתקדם במהירות קבועה לאורך הציר הדחוס. בהפחתת תנועה: קפיצה מגילוי לגילוי.
  useEffect(() => {
    if (!playing) return;
    const years = [...new Set(cities.flatMap((c) => c.items.map((d) => d.yearFrom)))].sort((a, b) => a - b);
    let y = year >= YEAR_MAX ? YEAR_MIN : year;
    if (reduced()) {
      const id = window.setInterval(() => {
        const next = years.find((v) => v > y);
        if (next === undefined) { setPlaying(false); setYear(YEAR_MAX); return; }
        y = next; setYear(y);
      }, 1200);
      return () => window.clearInterval(id);
    }
    let pos = posScale(y), last = performance.now(), raf = 0, acc = 0;
    const step = (now: number) => {
      pos += (now - last) / 30000; acc += now - last; last = now;
      if (pos >= 1) { setYear(YEAR_MAX); setPlaying(false); return; }
      if (acc > 90) { acc = 0; setYear(posScale.invert(pos)); }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  const view = useMemo(() => cities.map((c) => {
    const items = c.items.filter((d) => domains.has(d.domainId));
    const known = items.filter((d) => d.yearFrom <= year);
    const doms = new Set(known.map((d) => d.domainId));
    return {
      city: c, items, knownItems: known, known: known.length,
      recent: known.some((d) => year - d.yearFrom <= 30),
      on: params.c === c.key,
      domain: doms.size > 1 ? 'mixed' : [...doms][0] || 'none',
    };
  }), [year, params.d, params.c]); // eslint-disable-line react-hooks/exhaustive-deps
  const visible = view.filter((v) => v.known > 0);
  const knownCount = visible.reduce((s, v) => s + v.known, 0);
  const shownRoutes = routes.filter((r) => r.year <= year && domains.has(r.a.d.domainId) && domains.has(r.b.d.domainId));
  const selected = shownRoutes.find((r) => r.link.id === params.l) || routes.find((r) => r.link.id === params.l);
  const sel = view.find((v) => v.on);
  const center = centerAt(year);
  const trail = useMemo(() => (showTrail ? centerTrail(year) : []), [year, showTrail]);
  // שובל: התחלה, אמצע וסוף, עם השנים, כדי שיובן מאיפה לאן מרכז הכובד נדד
  const trailMarks = useMemo(() => {
    if (!showTrail || trail.length < 2) return [];
    const ys = [...new Set(cities.flatMap((c) => c.items.map((d) => d.yearFrom)))].filter((y) => y <= year).sort((a, b) => a - b);
    const mid = Math.floor(trail.length / 2);
    return [
      { p: trail[0], label: `התחלה · ${yearText(ys[0])}`, kind: 'start' as const },
      { p: trail[mid], label: yearText(ys[mid]), kind: 'mid' as const },
      { p: trail[trail.length - 1], label: `היום במפה · ${yearText(ys[ys.length - 1])}`, kind: 'end' as const },
    ];
  }, [trail, showTrail, year]);
  const showConf = params.v === '1';
  // שרשרת הידע של המסלול שנבחר: מי לפני (מה אפשר אותו) ומי אחרי (מה הוא אפשר), ממוספרת מהראשון בזמן
  const chain = useMemo(() => {
    const sel0 = routes.find((r) => r.link.id === params.l);
    if (!sel0) return [];
    const got = new Map([[sel0.link.id, sel0]]);
    let front = [sel0];
    for (let i = 0; i < 6 && front.length; i++) { front = routes.filter((r) => !got.has(r.link.id) && front.some((f) => r.b.d.id === f.a.d.id)); front.forEach((r) => got.set(r.link.id, r)); }
    front = [sel0];
    for (let i = 0; i < 6 && front.length; i++) { front = routes.filter((r) => !got.has(r.link.id) && front.some((f) => r.a.d.id === f.b.d.id)); front.forEach((r) => got.set(r.link.id, r)); }
    return [...got.values()].sort((a, b) => a.a.d.yearFrom - b.a.d.yearFrom || a.b.d.yearFrom - b.b.d.yearFrom);
  }, [params.l]);
  const chainIds = new Set(chain.map((r) => r.link.id));
  // מספר לכל עיר בשרשרת לפי הסדר בזמן
  const chainBadge = useMemo(() => {
    const m = new Map<string, number>();
    let n = 0;
    for (const r of chain) for (const c of [r.from, r.to]) if (c && !m.has(c.key)) m.set(c.key, ++n);
    return m;
  }, [chain]);
  const near = center ? nearestCity(center) : null;
  const nearKm = center && near ? Math.round(km(center, near.lonLat) / 10) * 10 : 0;
  const pick = (personId: string) => set({ p: personId });
  const focusCity = params.f ? cities.find((c) => c.key === params.f) : undefined;
  useRevealOnChange('.map-card-wrap', [params.c, params.k, params.f, params.l, params.d, params.t, params.s]);

  // מסע: הגילויים של התחומים שנבחרו, לפי סדר כרונולוגי, תחנה אחרי תחנה. כשנבחר יותר מתחום אחד: רק מה שעברנו מוצג, והמספר רק על העיר הנוכחית.
  const tourOn = !!params.t;
  const tourAll = domains.size > 1;
  const tourDomain = tourOn ? { id: allOn ? 'all' : [...domains].join(','), nameHe: domainsLabel } : undefined;
  const stops = useMemo(() => (tourOn
    ? cities.flatMap((c) => c.items.filter((d) => domains.has(d.domainId)).map((d) => ({ d, city: c }))).sort((a, b) => a.d.yearFrom - b.d.yearFrom || a.d.id.localeCompare(b.d.id))
    : []), [tourOn, params.d, legacyT]); // eslint-disable-line react-hooks/exhaustive-deps
  const si = Math.min(Math.max(Number(params.s) || 0, 0), Math.max(stops.length - 1, 0));
  const stop = stops[si];
  const [touring, setTouring] = useState(false);
  // הרשימה בצד נגללת לתחנה הנוכחית (בתוך המיכל בלבד, בלי להזיז את הדף)
  const tourList = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const ol = tourList.current;
    const li = ol?.children[si] as HTMLElement | undefined;
    if (ol && li && (li.offsetTop < ol.scrollTop || li.offsetTop + li.offsetHeight > ol.scrollTop + ol.clientHeight)) ol.scrollTop = li.offsetTop - ol.clientHeight / 2;
  }, [si, tourDomain?.id]);
  useEffect(() => {
    if (!touring || !tourDomain) return;
    const id = window.setInterval(() => {
      const cur = Number(new URLSearchParams(window.location.hash.split('?')[1] || '').get('s')) || 0;
      if (cur >= stops.length - 1) { setTouring(false); return; }
      set({ s: String(cur + 1) });
    }, 4200);
    return () => window.clearInterval(id);
  }, [touring, tourDomain, stops.length, set]);
  // במסע המחוון זז עם התחנות: השנה בכתובת היא שנת התחנה
  useEffect(() => {
    if (tourOn && stop && params.y !== String(stop.d.yearFrom)) set({ y: String(stop.d.yearFrom) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourOn, stop?.d.id]);
  // בכל התחומים יש מאות תחנות: מציגים רק את מה שכבר עברנו, והמספר רק על העיר הנוכחית
  const seen = tourAll ? stops.slice(0, si + 1) : stops;
  const tourCities = useMemo(() => {
    const m = new Map<string, { city: (typeof cities)[number]; nums: number[]; domain: string }>();
    seen.forEach((st, i) => { const e = m.get(st.city.key) || { city: st.city, nums: [], domain: st.d.domainId }; e.nums.push(i + 1); e.domain = st.d.domainId; m.set(st.city.key, e); });
    return [...m.values()];
  }, [seen]);
  // בכל התחומים הקו מראה רק את 12 הצעדים האחרונים, כדי שהמסלול יישאר קריא
  const pathStops = tourAll ? seen.slice(-12) : seen;
  const tourPath = useMemo(() => pathStops.slice(1).map((st, i) => arc(pathStops[i].city.lonLat, st.city.lonLat, 24)), [pathStops]);
  const country = !tourDomain && params.k ? countries.find((c) => c.key === params.k) : undefined;
  const countryItems = country ? country.cities.flatMap((c) => c.items.filter((d) => domains.has(d.domainId))).sort((a, b) => a.yearFrom - b.yearFrom) : [];

  return (
    <main className="page page-wide">
      <div className="crumbs"><a href="#/">בית</a> / מפה</div>
      <h1 className="page-title"><Rich>{tourDomain && stop
        ? `מסע בזמן, ${tourDomain.nameHe}: תחנה ${si + 1} מתוך ${stops.length}, ${stop.city.nameHe}, ${yearText(stop.d.yearFrom)}.`
        : `בשנת ${yearText(year)}: ${knownCount} גילויים ב-${visible.length} ערים.`}</Rich></h1>
      <p className="page-sub lines">
        {!tourDomain && center && near && <span><Rich>{`**מרכז הכובד** של הידע: ${nearKm < 60 ? 'ב' : `כ-${nearKm} ק״מ מ`}${near.nameHe}. ==הוא נודד עם הזמן==, והקו המקווקו הוא המסלול שלו.`}</Rich></span>}
        <span>בחירת תחום מציגה את <strong>הדמויות</strong> שלו. לחיצה על עיר או על ארץ מציגה את כל מה שקרה בה. <strong>מסע בזמן</strong> עובר על התחומים שנבחרו לפי הסדר.</span>
      </p>

      {kwm.active && (() => {
        // תוצאות חיפוש שעוד "נעלמות" בשנה שנבחרה לא מופיעות במפה. אומרים זאת, ומציעים לקפוץ להיום.
        const later = [...kwm.cities].filter((k) => !visible.some((v) => v.city.key === k)).length;
        return later > 0 ? (
          <p className="kw-note" role="status">
            {later === 1 ? 'עיר אחת מהחיפוש עוד נעלמת' : <><bdi className="num">{later}</bdi> ערים מהחיפוש עוד נעלמות</>} בשנת {yearText(year)}.{' '}
            <button type="button" className="press btn btn-quiet" onClick={() => set({ y: String(YEAR_MAX) })}>הצגה עד היום</button>
          </p>
        ) : null;
      })()}
      <div className="map-controls card glass">
        {/* שורה אחת של תחומים, אותו בורר בכל המסכים */}
        <DomainPicker className="map-domains" counts={false} selected={allOn ? null : [...domains]}
          onChange={(next) => set({ d: next ? next.join(',') : undefined, t: params.t ? '1' : undefined, s: params.t ? '0' : undefined, c: undefined, k: undefined, f: undefined })} />
        <div className="seg map-modes" role="group" aria-label="תצוגה">
          <button type="button" className="press chip chip-tour" aria-pressed={tourOn}
            onClick={() => { setTouring(false); set(tourOn ? { t: undefined, s: undefined } : { t: '1', s: '0', c: undefined, k: undefined, f: undefined }); }}>מסע בזמן{tourOn ? '' : `: ${domainsLabel}`}</button>
          <button type="button" className="press chip" aria-pressed={showRoutes} onClick={() => set({ r: showRoutes ? undefined : '1' })}>מסלולי ידע <bdi className="num">{shownRoutes.length}</bdi></button>
          <button type="button" className="press chip" aria-pressed={showTrail} onClick={() => set({ g: showTrail ? undefined : '1' })}>שובל מרכז הכובד</button>
          <button type="button" className="press chip" aria-pressed={showConf} onClick={() => set({ v: showConf ? undefined : '1' })}>רמת ביטחון של המקום</button>
        </div>
        {/* כל מצב תצוגה מוסבר במשפט אחד, כדי שיהיה ברור מה הוא עושה לפני שבוחרים בו */}
        <p className="mode-help">
          <strong>מסע בזמן</strong>: עובר תחנה אחרי תחנה על הגילויים של התחומים שנבחרו, לפי הסדר. <strong>מסלולי ידע</strong>: קו בין שתי ערים כשגילוי באחת השפיע על גילוי בשנייה, מבהיר (המקור) לכהה (מי שהושפע). בחירת מסלול מציגה את <strong>השרשרת</strong> כולה, ממוספרת מהראשון. <strong>שובל מרכז הכובד</strong>: הדרך שעשה מרכז הכובד של הידע, מההתחלה (בהיר) ועד השנה שבמחוון (כהה). <strong>רמת ביטחון</strong>: מסגרת ירוקה למקום מתועד, כתומה לפרשנות.
        </p>
        <YearSlider value={year} onChange={(y) => { setPlaying(false); setYear(y); }} />
        <IconRow label="הפעלת הזמן">
          <IconButton icon={playing ? 'pause' : 'play'} label={playing ? 'עצירה' : 'הפעלת הזמן'} className="is-primary" pressed={playing} onClick={() => setPlaying((p) => !p)} />
        </IconRow>
      </div>

      <div className="map-layout">
        <section className="card map-card-wrap" aria-label="מפת הגילויים">
          {!tourDomain && <div className={`map-clock${playing ? ' is-playing' : ''}`} aria-live="off"><bdi className="num">{yearText(year)}</bdi></div>}
          {failed ? (
            <div className="map-fail tone tone-problem">
              <h4>המפה לא נטענה בדפדפן הזה.</h4>
              <p>הדפדפן לא תומך ב-WebGL. כל המידע מופיע ברשימת הערים שליד המפה.</p>
            </div>
          ) : (
            <Suspense fallback={<div className="map-loading">טוען את הגלובוס…</div>}>
              <MapView
                cities={tourDomain
                  ? tourCities.map((t) => ({ city: t.city, known: t.nums.length, recent: false, on: !!stop && stop.city.key === t.city.key, kw: kwOf(t.city.key), domain: tourAll ? t.domain : [...domains][0], badge: tourAll ? (stop && stop.city.key === t.city.key ? String(si + 1) : undefined) : t.nums.join('·') }))
                  : visible.map((v) => ({ city: v.city, known: v.known, recent: v.recent, on: v.on || v.city.key === params.f || (!!country && v.city.country?.key === country.key), kw: kwOf(v.city.key), domain: v.domain, badge: chainBadge.has(v.city.key) ? String(chainBadge.get(v.city.key)) : undefined }))}
                routes={!tourDomain && (showRoutes || chain.length) ? (chain.length ? chain : shownRoutes).map((r) => ({ id: r.link.id, path: r.path, type: r.link.type, confidence: r.link.confidence, on: chainIds.has(r.link.id) })) : []}
                trail={tourDomain ? [] : trail} trailMarks={tourDomain ? [] : trailMarks} showConf={showConf} tour={tourPath} center={tourDomain ? null : center}
                focus={tourDomain && stop ? stop.city.lonLat : sel ? sel.city.lonLat : country ? country.lonLat : focusCity ? focusCity.lonLat : null}
                focusZoom={tourDomain ? 3.4 : country ? 2.8 : 3.2}
                onCity={(k) => (tourDomain ? set({ s: String(tourAll ? seen.map((x) => x.city.key).lastIndexOf(k) : stops.findIndex((x) => x.city.key === k)) }) : set({ c: k === params.c ? undefined : k, k: undefined }))}
                onRoute={(id) => set({ l: id === params.l ? undefined : id })}
                onCountry={(name) => { const c = countryByName(name); if (c && !tourDomain) set({ k: c.key, c: undefined }); }}
                onFail={() => setFailed(true)} />
            </Suspense>
          )}
          <ul className="legend" aria-label="מקרא">
          {activeDomains.map((d) => <li key={d.id}><DomainIcon id={d.id} />{d.nameHe}</li>)}
            <li><DomainIcon id="mixed" />כמה תחומים</li>
            <li><span className="lg-sq lg-big" />גודל: מספר הגילויים בעיר</li>
            <li><span className="lg-sq lg-badge">3</span>מספר: סדר התחנה במסע</li>
            <li><span className="lg-sq lg-recent" />גילוי ב-<bdi className="num">30</bdi> השנים האחרונות</li>
            <li><span className="lg-line line-influenced lg-grad" />מסלול ידע מתועד: בהיר במקור, כהה במקום שהושפע</li>
            <li><span className="lg-line lg-orange" />פרשנות מקובלת</li>
            <li><span className="lg-trail lg-grad-ink" />שובל מרכז הכובד: מההתחלה (בהיר) עד השנה שבמחוון (כהה)</li>
          </ul>
        </section>

        <aside className="map-side" aria-label="ערים">
          {/* כרטיס התחנה יושב בטור שבצד ולא מעל המפה, כדי שלא יסתיר אותה */}
          {tourDomain && stop && (() => {
            const p = personById.get(stop.d.personIds[0]);
            return (
              <div className="tour-card card glass rise" key={stop.d.id} role="region" aria-label="תחנה במסע">
                <TourClock year={stop.d.yearFrom} />
                <div className="tour-top">
                  <span className="tour-num"><bdi className="num">{si + 1}</bdi>/<bdi className="num">{stops.length}</bdi></span>
                  <span className="label">{domainName(stop.d.domainId)} · {stop.city.nameHe}{stop.city.country ? `, ${stop.city.country.nameHe}` : ''}</span>
                </div>
                <div className="tour-body">
                  {p?.imageUrl && <img className="tour-face" src={p.imageUrl} alt={p.nameHe} />}
                  <div>
                    <div className="tour-year"><Rich>{rangeText(stop.d)}</Rich></div>
                    <h3 className="tour-title">{stop.d.title}</h3>
                    <div className="tour-who">{stop.d.personIds.map((id) => personById.get(id)?.nameHe).filter(Boolean).join(' ו') || ANON}</div>
                    {stop.d.novelty && <Rich as="p" className="tour-text">{stop.d.novelty}</Rich>}
                    <WorkImage d={stop.d} small />
                  </div>
                </div>
                <IconRow label="תפעול המסע" className="tour-ctl">
                  <IconButton icon="prev" label="התחנה הקודמת" disabled={si === 0} onClick={() => { setTouring(false); set({ s: String(si - 1) }); }} />
                  <IconButton icon={touring ? 'pause' : 'play'} label={touring ? 'עצירה' : 'הפעלת המסע'} className="is-primary" pressed={touring} onClick={() => setTouring((x) => !x)} />
                  <IconButton icon="next" label="התחנה הבאה" disabled={si >= stops.length - 1} onClick={() => { setTouring(false); set({ s: String(si + 1) }); }} />
                  {p ? <IconButton icon="card" label="כרטיס הדמות" onClick={() => pick(p.id)} /> : <IconButton icon="work" label="כרטיס היצירה" onClick={() => go('timeline', workParams(stop.d))} />}
                  <IconButton icon="stop" label="סיום המסע" onClick={() => { setTouring(false); set({ t: undefined, s: undefined }); }} />
                </IconRow>
              </div>
            );
          })()}
          {tourDomain ? (
            <div className="card city-panel">
              <h2 className="city-title">המסע ב{tourDomain.nameHe}</h2>
              <p className="muted small">כל התחנות לפי הסדר הכרונולוגי. לחיצה על תחנה מעבירה אליה.</p>
              <ol className="tour-list" ref={tourList}>
                {stops.map((st, i) => (
                  <li key={st.d.id}>
                    <button type="button" className="press city-row" aria-pressed={i === si} onClick={() => { setTouring(false); set({ s: String(i) }); }}>
                      <span className="tour-n"><bdi className="num">{i + 1}</bdi></span>
                      <span>{tourAll && <DomainIcon id={st.d.domainId} label={domainName(st.d.domainId)} />}{st.d.title.split(':')[0]} <span className="muted">{st.city.nameHe}</span></span>
                      <span className="tour-y" data-year={st.d.yearFrom}><bdi className="num">{Math.abs(st.d.yearFrom)}</bdi>{st.d.yearFrom < 0 ? ' לפנה״ס' : ''}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          ) : sel ? (
            <PlacePanel title={sel.city.nameHe} subtitle={sel.city.nameFull} items={sel.items} year={year} onPerson={pick}>
              <div className="seg">
                {sel.city.country && <button type="button" className="press chip" onClick={() => set({ k: sel.city.country!.key, c: undefined })}>כל {sel.city.country.nameHe}</button>}
                <button type="button" className="press chip" onClick={() => set({ c: undefined })}>חזרה לכל הארצות</button>
              </div>
            </PlacePanel>
          ) : country ? (
            <PlacePanel title={country.nameHe} subtitle={country.nameFull} items={countryItems} year={year} onPerson={pick}>
              <div className="seg pp-cities" aria-label="ערים">
                {country.cities.map((c) => <button key={c.key} type="button" className="press chip" onClick={() => set({ c: c.key, k: undefined })}>{c.nameHe} <bdi className="num">{c.items.filter((d) => domains.has(d.domainId)).length}</bdi></button>)}
                <button type="button" className="press chip" onClick={() => set({ k: undefined })}>חזרה לכל הארצות</button>
              </div>
            </PlacePanel>
          ) : !allOn ? (
            <PeoplePanel title={`הדמויות ב${domainsLabel}`} year={year}
              items={discoveries.filter((d) => domains.has(d.domainId))}
              onPick={(d) => (d.personIds[0] ? set({ p: d.personIds[0], f: d.place?.city.nameFull }) : go('timeline', workParams(d)))} />
          ) : (
            <div className="card city-panel">
              <h2 className="city-title">ארצות הידע</h2>
              <p className="muted small">לפי מספר הגילויים בתחומים שנבחרו. לחיצה פותחת את כל הדמויות של הארץ.</p>
              <ol className="city-rank country-rank">
                {countries.map((c) => ({ c, n: c.cities.reduce((s2, x) => s2 + x.items.filter((d) => domains.has(d.domainId)).length, 0) }))
                  .filter((x) => x.n > 0).sort((a2, b2) => b2.n - a2.n || a2.c.nameHe.localeCompare(b2.c.nameHe, 'he')).map(({ c, n }) => (
                    <li key={c.key}>
                      <button type="button" className="press city-row" onClick={() => set({ k: c.key })}>
                        {/* אייקון התחום המוביל בארץ, בצבע שלו */}
                        <DomainIcon id={(() => { const m = new Map<string, number>(); c.cities.forEach((x) => x.items.forEach((d) => { if (domains.has(d.domainId)) m.set(d.domainId, (m.get(d.domainId) || 0) + 1); })); return [...m].sort((a2, b2) => b2[1] - a2[1])[0]?.[0] || 'mixed'; })()} />
                        <span>{c.nameHe} <span className="muted" dir="ltr">{c.nameFull}</span></span>
                        <bdi className="num">{n}</bdi>
                      </button>
                    </li>
                  ))}
              </ol>
              {unplaced.length > 0 && <p className="muted small">בלי מקום פעילות מאומת, ולכן לא על המפה: {unplaced.map((d) => d.title.split(':')[0]).join(', ')}.</p>}
            </div>
          )}
        </aside>
      </div>

      {selected ? <LinkPanel selected={selected} pick={pick} set={set} /> : null}
      {chain.length > 1 && (
        <section className="card" aria-label="שרשרת הידע">
          <h2 className="city-title">שרשרת הידע <span className="muted">· <bdi className="num">{chain.length}</bdi> מסלולים</span></h2>
          <p className="muted small">מהראשון בזמן ועד האחרון. המספרים זהים למספרים על הערים במפה.</p>
          <ol className="chain">
            {chain.map((r) => (
              <li key={r.link.id} className={r.link.id === params.l ? 'is-sel' : ''}>
                <span className="ch-n">{chainBadge.get(r.from?.key || '') ?? '·'}</span>
                <button type="button" className="press link-item" onClick={() => set({ l: r.link.id })}>
                  <span className="link-names"><strong>{r.from?.nameHe}</strong> ← <strong>{r.to?.nameHe}</strong>: {endName(r.a)} ← {endName(r.b)}</span>
                </button>
                <span className="label">{linkTypeName[r.link.type]}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <h2 className="section-title">מסלולי ידע עד שנת {yearText(year)} <bdi className="num">{shownRoutes.length}</bdi></h2>
      {shownRoutes.length === 0 ? <p className="muted">עוד אין מסלולים. מסלול מופיע כששני הגילויים שהוא מחבר כבר ידועים.</p> : (
        <ul className="link-list">
          {[...shownRoutes].sort((a, b) => b.km - a.km).map((r) => (
            <li key={r.link.id}>
              <button type="button" className="press link-item" aria-pressed={params.l === r.link.id} onClick={() => set({ l: r.link.id })}>
                <span className={`lg-line line-${r.link.type}`} />
                <span className="link-names">{r.from.nameHe} <span aria-hidden="true">←</span> {r.to.nameHe}: {endName(r.a)} <span aria-hidden="true">←</span> {endName(r.b)}</span>
                <span className="label"><bdi className="num">{r.km.toLocaleString('en')}</bdi> ק״מ · {linkTypeName[r.link.type]}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {sameCityLinks.length > 0 && <p className="muted small"><bdi className="num">{sameCityLinks.length}</bdi> קשרים נוספים מחברים גילויים באותה עיר, ולכן אין להם קשת. הם מופיעים במסך ההשוואה.</p>}

      {person && <PersonCard person={person} onClose={() => set({ p: undefined })} onOpen={(id, did) => (id ? set({ p: id }) : did ? go('timeline', workParams(discoveryById.get(did)!)) : undefined)} />}
    </main>
  );
}
