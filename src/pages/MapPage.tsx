// שלב 3: מפה. אותם גילויים לפי מקום, ומחוון זמן שמזיז את הנקודות בזמן אמת.
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Rich from '../components/Rich';
import LinkPanel from '../components/LinkPanel';
import PersonCard from '../components/PersonCard';
import PlacePanel from '../components/PlacePanel';
import { YEAR_MAX, YEAR_MIN, posScale } from '../components/Timeline';
import { activeDomains, confidenceName, endName, linkTypeName, personById, rangeText, yearText, ANON, workParams } from '../data';
import { arc, centerAt, centerTrail, cities, countries, countryByName, km, nearestCity, routes, sameCityLinks, unplaced } from '../geo';
import { href, replace } from '../route';

const domainName = (id: string) => activeDomains.find((d) => d.id === id)?.nameHe || id;

const MapView = lazy(() => import('../components/MapView'));
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const DEFAULT_YEAR = 1700;

export default function MapPage({ params }: { params: Record<string, string> }) {
  const year = params.y && Number.isFinite(Number(params.y)) ? Math.min(Math.max(Number(params.y), YEAR_MIN), YEAR_MAX) : DEFAULT_YEAR;
  const domains = new Set((params.d || activeDomains.map((d) => d.id).join(',')).split(','));
  const showRoutes = params.r !== '0';
  const showTrail = params.g !== '0';
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
  const near = center ? nearestCity(center) : null;
  const nearKm = center && near ? Math.round(km(center, near.lonLat) / 10) * 10 : 0;
  const pick = (personId: string) => set({ p: personId });

  // מסע: הגילויים של תחום אחד לפי סדר כרונולוגי, תחנה אחרי תחנה
  // t=all: מסע חוצה תחומים, כל הגילויים שיש להם מקום, לפי סדר כרונולוגי
  const tourAll = params.t === 'all';
  const tourDomain = tourAll ? { id: 'all', nameHe: 'כל התחומים' } : activeDomains.find((d) => d.id === params.t);
  const stops = useMemo(() => (tourDomain
    ? cities.flatMap((c) => c.items.filter((d) => tourDomain.id === 'all' ? activeDomains.some((a) => a.id === d.domainId) : d.domainId === tourDomain.id).map((d) => ({ d, city: c }))).sort((a, b) => a.d.yearFrom - b.d.yearFrom || a.d.id.localeCompare(b.d.id))
    : []), [tourDomain?.id]); // eslint-disable-line react-hooks/exhaustive-deps
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
        ? `מסע ב${tourDomain.nameHe}${tourAll && stop ? ` (${domainName(stop.d.domainId)})` : ''}: תחנה ${si + 1} מתוך ${stops.length}, ${stop.city.nameHe}.`
        : `בשנת ${yearText(year)}: ${knownCount} גילויים ב-${visible.length} ערים.`}</Rich></h1>
      <p className="page-sub lines">
        {!tourDomain && center && near && <span><Rich>{`**מרכז הכובד** של הידע: ${nearKm < 60 ? 'ב' : `כ-${nearKm} ק״מ מ`}${near.nameHe}. ==הוא נודד עם הזמן==, והקו המקווקו הוא המסלול שלו.`}</Rich></span>}
        <span>לחיצה על עיר או על שם של ארץ מציגה את כל הדמויות שלה. <strong>מסע</strong> עובר על תחום אחד לפי הסדר.</span>
      </p>

      <div className="map-controls card glass">
        <div className="seg map-domains" role="group" aria-label="תחומים">
          {activeDomains.map((d) => {
            const on = domains.has(d.id);
            return (
              <button key={d.id} type="button" className={`press chip chip-dom dom-${d.id}`} aria-pressed={on} disabled={on && domains.size === 1}
                onClick={() => set({ d: activeDomains.map((a) => a.id).filter((a) => (a === d.id ? !on : domains.has(a))).join(',') })}>{d.nameHe}</button>
            );
          })}
          <button type="button" className="press chip" aria-pressed={showRoutes} onClick={() => set({ r: showRoutes ? '0' : undefined })}>מסלולי ידע <bdi className="num">{shownRoutes.length}</bdi></button>
          <button type="button" className="press chip" aria-pressed={showTrail} onClick={() => set({ g: showTrail ? '0' : undefined })}>שובל מרכז הכובד</button>
        </div>
        <div className="seg tour-seg" role="group" aria-label="מסע לפי סדר כרונולוגי">
          <span className="label">מסע</span>
          <button type="button" className="press chip chip-all" aria-pressed={tourAll}
            onClick={() => { setTouring(false); set(tourAll ? { t: undefined, s: undefined } : { t: 'all', s: '0', c: undefined, k: undefined }); }}>כל התחומים</button>
          {activeDomains.map((d) => (
            <button key={d.id} type="button" className={`press chip chip-dom dom-${d.id}`} aria-pressed={tourDomain?.id === d.id}
              onClick={() => { setTouring(false); set(tourDomain?.id === d.id ? { t: undefined, s: undefined } : { t: d.id, s: '0', c: undefined, k: undefined }); }}>{d.nameHe}</button>
          ))}
        </div>
        <label className="slider">
          <span className="label">שנה</span>
          <input type="range" dir="rtl" min={0} max={1000} value={Math.round(posScale(year) * 1000)} aria-label="מחוון זמן" aria-valuetext={yearText(year)}
            onChange={(e) => { setPlaying(false); setYear(posScale.invert(Number(e.target.value) / 1000)); }} />
          <bdi className="num map-year">{yearText(year)}</bdi>
        </label>
        <div className="seg">
          <button type="button" className="press btn btn-primary" aria-pressed={playing} onClick={() => setPlaying((p) => !p)}>{playing ? 'עצירה' : 'הפעלה'}</button>
        </div>
      </div>

      <div className="map-layout">
        <section className="card map-card-wrap" aria-label="מפת הגילויים">
          {failed ? (
            <div className="map-fail tone tone-problem">
              <h4>המפה לא נטענה בדפדפן הזה.</h4>
              <p>הדפדפן לא תומך ב-WebGL. כל המידע מופיע ברשימת הערים שליד המפה.</p>
            </div>
          ) : (
            <Suspense fallback={<div className="map-loading">טוען את הגלובוס…</div>}>
              <MapView
                cities={tourDomain
                  ? tourCities.map((t) => ({ city: t.city, known: t.nums.length, recent: false, on: !!stop && stop.city.key === t.city.key, domain: tourAll ? t.domain : tourDomain.id, badge: tourAll ? (stop && stop.city.key === t.city.key ? String(si + 1) : undefined) : t.nums.join('·') }))
                  : visible.map((v) => ({ city: v.city, known: v.known, recent: v.recent, on: v.on || (!!country && v.city.country?.key === country.key), domain: v.domain }))}
                routes={showRoutes && !tourDomain ? shownRoutes.map((r) => ({ id: r.link.id, path: r.path, type: r.link.type, confidence: r.link.confidence, on: r.link.id === params.l })) : []}
                trail={tourDomain ? [] : trail} tour={tourPath} center={tourDomain ? null : center}
                focus={tourDomain && stop ? stop.city.lonLat : sel ? sel.city.lonLat : country ? country.lonLat : null}
                focusZoom={tourDomain ? 3.4 : country ? 2.8 : 3.2}
                onCity={(k) => (tourDomain ? set({ s: String(tourAll ? seen.map((x) => x.city.key).lastIndexOf(k) : stops.findIndex((x) => x.city.key === k)) }) : set({ c: k === params.c ? undefined : k, k: undefined }))}
                onRoute={(id) => set({ l: id === params.l ? undefined : id })}
                onCountry={(name) => { const c = countryByName(name); if (c && !tourDomain) set({ k: c.key, c: undefined }); }}
                onFail={() => setFailed(true)} />
            </Suspense>
          )}
          {tourDomain && stop && (() => {
            const p = personById.get(stop.d.personIds[0]);
            return (
              <div className="tour-card card glass rise" key={stop.d.id} role="region" aria-label="תחנה במסע">
                <div className="tour-top">
                  <span className="tour-num"><bdi className="num">{si + 1}</bdi>/<bdi className="num">{stops.length}</bdi></span>
                  <span className="label">{tourAll ? domainName(stop.d.domainId) : tourDomain.nameHe} · {stop.city.nameHe}{stop.city.country ? `, ${stop.city.country.nameHe}` : ''}</span>
                </div>
                <div className="tour-body">
                  {p?.imageUrl && <img className="tour-face" src={p.imageUrl} alt={p.nameHe} />}
                  <div>
                    <div className="tour-year"><Rich>{rangeText(stop.d)}</Rich></div>
                    <h3 className="tour-title">{stop.d.title}</h3>
                    <div className="tour-who">{stop.d.personIds.map((id) => personById.get(id)?.nameHe).filter(Boolean).join(' ו') || ANON}</div>
                    {stop.d.novelty && <Rich as="p" className="tour-text">{stop.d.novelty}</Rich>}
                  </div>
                </div>
                <div className="seg">
                  <button type="button" className="press btn" disabled={si === 0} onClick={() => { setTouring(false); set({ s: String(si - 1) }); }}>הקודמת</button>
                  <button type="button" className="press btn btn-primary" aria-pressed={touring} onClick={() => setTouring((x) => !x)}>{touring ? 'עצירה' : 'הפעלה'}</button>
                  <button type="button" className="press btn" disabled={si >= stops.length - 1} onClick={() => { setTouring(false); set({ s: String(si + 1) }); }}>הבאה</button>
                  {p ? <button type="button" className="press btn btn-quiet" onClick={() => pick(p.id)}>כרטיס הדמות</button> : <a className="press btn btn-quiet" href={href('timeline', workParams(stop.d))}>כרטיס היצירה</a>}
                  <button type="button" className="press btn btn-quiet" onClick={() => { setTouring(false); set({ t: undefined, s: undefined }); }}>סיום המסע</button>
                </div>
              </div>
            );
          })()}
          <ul className="legend" aria-label="מקרא">
          {activeDomains.map((d) => <li key={d.id}><span className={`lg-sq dom-${d.id}`} />{d.nameHe}</li>)}
            <li><span className="lg-sq dom-mixed" />כמה תחומים</li>
            <li><span className="lg-sq lg-big" />גודל: מספר הגילויים בעיר</li>
            <li><span className="lg-sq lg-badge">3</span>מספר: סדר התחנה במסע</li>
            <li><span className="lg-sq lg-recent" />גילוי ב-<bdi className="num">30</bdi> השנים האחרונות</li>
            <li><span className="lg-line line-influenced" />מסלול ידע מתועד</li>
            <li><span className="lg-line lg-orange" />פרשנות מקובלת</li>
            <li><span className="lg-trail" />שובל מרכז הכובד, מחושב</li>
          </ul>
        </section>

        <aside className="map-side" aria-label="ערים">
          {tourDomain ? (
            <div className="card city-panel">
              <h2 className="city-title">המסע ב{tourDomain.nameHe}</h2>
              <p className="muted small">כל התחנות לפי הסדר הכרונולוגי. לחיצה על תחנה מעבירה אליה.</p>
              <ol className="tour-list" ref={tourList}>
                {stops.map((st, i) => (
                  <li key={st.d.id}>
                    <button type="button" className="press city-row" aria-pressed={i === si} onClick={() => { setTouring(false); set({ s: String(i) }); }}>
                      <span className="tour-n"><bdi className="num">{i + 1}</bdi></span>
                      <span>{tourAll && <i className={`tour-dot dom-${st.d.domainId}`} aria-label={domainName(st.d.domainId)} />}{st.d.title.split(':')[0]} <span className="muted">{st.city.nameHe}</span></span>
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
          ) : (
            <div className="card city-panel">
              <h2 className="city-title">ארצות הידע</h2>
              <p className="muted small">לפי מספר הגילויים בתחומים שנבחרו. לחיצה פותחת את כל הדמויות של הארץ.</p>
              <ol className="city-rank country-rank">
                {countries.map((c) => ({ c, n: c.cities.reduce((s2, x) => s2 + x.items.filter((d) => domains.has(d.domainId)).length, 0) }))
                  .filter((x) => x.n > 0).sort((a2, b2) => b2.n - a2.n || a2.c.nameHe.localeCompare(b2.c.nameHe, 'he')).map(({ c, n }) => (
                    <li key={c.key}>
                      <button type="button" className="press city-row" onClick={() => set({ k: c.key })}>
                        <span className="lg-sq dom-mixed" />
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

      {person && <PersonCard person={person} onClose={() => set({ p: undefined })} onOpen={(id) => set({ p: id })} />}
    </main>
  );
}
