// שלב 3: מפה. אותם גילויים לפי מקום, ומחוון זמן שמזיז את הנקודות בזמן אמת.
import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import Rich from '../components/Rich';
import LinkPanel from '../components/LinkPanel';
import PersonCard from '../components/PersonCard';
import { YEAR_MAX, YEAR_MIN, posScale } from '../components/Timeline';
import { activeDomains, confidenceName, endName, linkTypeName, personById, rangeText, yearText } from '../data';
import { centerAt, centerTrail, cities, km, nearestCity, routes, sameCityLinks, unplaced } from '../geo';
import { replace } from '../route';

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
  const ranking = [...visible].sort((a, b) => b.known - a.known || a.city.nameHe.localeCompare(b.city.nameHe, 'he'));

  return (
    <main className="page page-wide">
      <div className="crumbs"><a href="#/">בית</a> / מפה</div>
      <h1 className="page-title"><Rich>{`בשנת ${yearText(year)}: ${knownCount} גילויים ב-${visible.length} ערים.`}</Rich></h1>
      <p className="page-sub lines">
        {center && near && <span><Rich>{`**מרכז הכובד** של הידע: ${nearKm < 60 ? 'ב' : `כ-${nearKm} ק״מ מ`}${near.nameHe}. ==הוא נודד עם הזמן==, והקו המקווקו הוא המסלול שלו.`}</Rich></span>}
        <span>לחיצה על עיר מציגה את הגילויים שבה. לחיצה על קשת מציגה את הקשר.</span>
      </p>

      <div className="map-controls card glass">
        <div className="seg" role="group" aria-label="תחומים">
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
                cities={visible.map((v) => ({ city: v.city, known: v.known, recent: v.recent, on: v.on, domain: v.domain }))}
                routes={showRoutes ? shownRoutes.map((r) => ({ id: r.link.id, path: r.path, type: r.link.type, confidence: r.link.confidence, on: r.link.id === params.l })) : []}
                trail={trail} center={center} focus={sel ? sel.city.lonLat : null}
                onCity={(k) => set({ c: k === params.c ? undefined : k })} onRoute={(id) => set({ l: id === params.l ? undefined : id })} onFail={() => setFailed(true)} />
            </Suspense>
          )}
          <ul className="legend" aria-label="מקרא">
            <li><span className="lg-sq dom-physics" />פיזיקה</li>
            <li><span className="lg-sq dom-mathematics" />מתמטיקה</li>
            <li><span className="lg-sq dom-mixed" />שני התחומים</li>
            <li><span className="lg-sq lg-big" />גודל: מספר הגילויים</li>
            <li><span className="lg-sq lg-recent" />גילוי ב-<bdi className="num">30</bdi> השנים האחרונות</li>
            <li><span className="lg-line line-influenced" />מסלול ידע מתועד</li>
            <li><span className="lg-line lg-orange" />פרשנות מקובלת</li>
            <li><span className="lg-trail" />שובל מרכז הכובד, מחושב</li>
          </ul>
        </section>

        <aside className="map-side" aria-label="ערים">
          {sel ? (
            <div className="card city-panel rise">
              <div className="city-head">
                <h2 className="city-title">{sel.city.nameHe} <span className="muted" dir="ltr">{sel.city.nameFull}</span></h2>
                <button type="button" className="press btn btn-quiet" onClick={() => set({ c: undefined })}>חזרה לכל הערים</button>
              </div>
              <p className="muted small">מקום: <span className={`conf conf-${sel.city.confidence}`}>{confidenceName[sel.city.confidence]}</span></p>
              <ul className="city-items">
                {sel.items.map((d) => (
                  <li key={d.id} className={d.yearFrom <= year ? '' : 'is-hidden'}>
                    <span className="find-year"><Rich>{rangeText(d)}</Rich></span>
                    <strong>{d.title}</strong>
                    <span className="city-people">
                      {d.personIds.map((id) => <button key={id} type="button" className="press chip" onClick={() => pick(id)}>{personById.get(id)?.nameHe}</button>)}
                    </span>
                    {d.yearFrom > year && <span className="label">עוד נעלם בשנת {yearText(year)}</span>}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="card city-panel">
              <h2 className="city-title">ערי הידע בשנת {yearText(year)}</h2>
              {ranking.length === 0 ? <p className="muted">עוד אין גילויים בתחומים שנבחרו. הזיזו את המחוון קדימה.</p> : (
                <ol className="city-rank">
                  {ranking.map((v) => (
                    <li key={v.city.key}>
                      <button type="button" className="press city-row" onClick={() => set({ c: v.city.key })}>
                        <span className={`lg-sq dom-${v.domain}`} />
                        <span>{v.city.nameHe} <span className="muted" dir="ltr">{v.city.nameFull}</span></span>
                        <bdi className="num">{v.known}</bdi>
                      </button>
                    </li>
                  ))}
                </ol>
              )}
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
