// גלובוס MapLibre עם אריחי OpenStreetMap מעומעמים לגוון נייר.
// נטען בעצלות (dynamic import), כדי שדף הבית לא ישלם על ספריית המפה.
// ערים הן סמנים של HTML (עברית נכונה, כפתור אמיתי, מקלדת). מסלולים ושובל הם שכבות קו.
import { useEffect, useRef, useState } from 'react';
import maplibregl, { type GeoJSONSource, type Map as MLMap, type Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { City, LonLat } from '../geo';
import { iconSvg } from '../icons';

export type RouteView = { id: string; path: LonLat[]; type: string; confidence: string; on: boolean };
export type CityView = { city: City; known: number; recent: boolean; on: boolean; domain: string; badge?: string; kw?: boolean };

// OpenFreeMap: אריחים וקטוריים חינמיים על נתוני OpenStreetMap, בלי מפתח ובלי מגבלת שימוש, מתאים לתערוכה ולקהל רחב.
const STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';

const fc = (features: GeoJSON.Feature[]): GeoJSON.FeatureCollection => ({ type: 'FeatureCollection', features });

export default function MapView({ cities, routes, trail, trailMarks = [], tour = [], center, focus, focusZoom = 3.2, showConf = false, onCity, onRoute, onCountry, onFail }: {
  cities: CityView[]; routes: RouteView[]; trail: LonLat[]; trailMarks?: { p: LonLat; label: string; kind: 'start' | 'mid' | 'end' }[]; tour?: LonLat[][]; center: LonLat | null; focus: LonLat | null; focusZoom?: number; showConf?: boolean;
  onCity: (key: string) => void; onRoute: (id: string) => void; onCountry?: (name: string) => void; onFail: () => void;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<MLMap>();
  const markers = useRef(new Map<string, Marker>());
  const centerMarker = useRef<Marker>();
  const lastSig = useRef('');
  const trailMarkers = useRef<Marker[]>([]);
  const [ready, setReady] = useState(false);
  const cb = useRef({ onCity, onRoute, onCountry });
  // שמות ערים שעולים זה על זה: נשאר השם של העיר הגדולה (או הנבחרת). השאר מופיעים בריחוף.
  const declutter = useRef(() => {});
  declutter.current = () => {
    const btns = [...markers.current.values()].map((mk) => mk.getElement().firstElementChild as HTMLButtonElement);
    btns.sort((a, b) => Number(b.classList.contains('is-on')) - Number(a.classList.contains('is-on')) || Number(b.classList.contains('is-kw')) - Number(a.classList.contains('is-kw')) || parseFloat(b.style.getPropertyValue('--sq')) - parseFloat(a.style.getPropertyValue('--sq')));
    const kept: DOMRect[] = [];
    for (const b of btns) {
      b.classList.remove('label-quiet');
      const r = (b.querySelector('.mc-name') as HTMLElement).getBoundingClientRect();
      const sq = (b.querySelector('.mc-sq') as HTMLElement).getBoundingClientRect();
      const hit = (o: DOMRect) => r.left < o.right && r.right > o.left && r.top < o.bottom && r.bottom > o.top;
      if (r.width && kept.some(hit)) b.classList.add('label-quiet');
      else kept.push(r);
      kept.push(sq);
    }
  };
  cb.current = { onCity, onRoute, onCountry };

  useEffect(() => {
    if (!el.current) return;
    let m: MLMap;
    try {
      m = new maplibregl.Map({
        container: el.current, style: STYLE_URL, center: [22, 41], zoom: el.current.clientWidth > 700 ? 2.3 : 1.5, minZoom: 0.8, maxZoom: 9,
        attributionControl: { compact: true }, cooperativeGestures: false, dragRotate: false, pitchWithRotate: false,
      });
    } catch {
      onFail();
      return;
    }
    map.current = m;
    m.touchZoomRotate.disableRotation();
    const zoomClass = () => { if (el.current) el.current.dataset.z = m.getZoom() < 3.4 ? 'low' : 'high'; };
    m.on('zoom', zoomClass);
    m.on('moveend', () => declutter.current());
    zoomClass();
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left');
    m.on('error', (e) => { if (String(e.error?.message || '').includes('WebGL')) onFail(); });
    // גלובוס, ורקע בגוון נייר לפי ה-DNA
    m.on('style.load', () => {
      m.setProjection({ type: 'globe' });
      if (m.getLayer('background')) m.setPaintProperty('background', 'background-color', '#F4F2EC');
      // מפת בסיס שקטה: בלי כבישים, אתרים ויישובים קטנים. ארצות וערים גדולות בגוון נייר, קטן ושקוף.
      for (const layer of m.getStyle().layers || []) {
        if (layer.type !== 'symbol') continue;
        const id = layer.id.toLowerCase();
        const isCountry = id.includes('country');
        const isBigCity = id.includes('city') && !id.includes('town') && !id.includes('village');
        if (!isCountry && !isBigCity) { m.setLayoutProperty(layer.id, 'visibility', 'none'); continue; }
        m.setPaintProperty(layer.id, 'text-color', isCountry ? '#9C998F' : '#AFACA4');
        m.setPaintProperty(layer.id, 'text-halo-color', '#F4F2EC');
        m.setPaintProperty(layer.id, 'text-halo-width', 1);
        m.setPaintProperty(layer.id, 'text-opacity', isCountry ? 0.8 : 0.6);
        m.setLayoutProperty(layer.id, 'text-size', isCountry ? 11 : 10);
        if (isCountry) m.setLayoutProperty(layer.id, 'text-transform', 'none');
      }
    });
    m.on('load', () => {
      m.addSource('routes', { type: 'geojson', data: fc([]), lineMetrics: true });
      m.addSource('trail', { type: 'geojson', data: fc([]), lineMetrics: true });
      m.addSource('tour', { type: 'geojson', data: fc([]) });
      m.addLayer({ id: 'tour', type: 'line', source: 'tour', paint: { 'line-color': '#17191C', 'line-width': 2.2, 'line-opacity': 0.75, 'line-dasharray': [2, 1.5] }, layout: { 'line-cap': 'round' } });
      // שובל מרכז הכובד: מבהיר (ההתחלה) לכהה (היום), כדי שיובן הכיוון
      m.addLayer({ id: 'trail', type: 'line', source: 'trail', paint: { 'line-width': 3, 'line-gradient': ['interpolate', ['linear'], ['line-progress'], 0, 'rgba(23,25,28,0.12)', 0.5, 'rgba(23,25,28,0.45)', 1, 'rgba(23,25,28,0.95)'] }, layout: { 'line-cap': 'round' } });
      m.addLayer({ id: 'routes-halo', type: 'line', source: 'routes', filter: ['==', ['get', 'on'], true], paint: { 'line-color': '#FFE45C', 'line-width': 12, 'line-opacity': 0.9 }, layout: { 'line-cap': 'round' } });
      const color: maplibregl.ExpressionSpecification = ['match', ['get', 'confidence'], 'interpretive', '#B85F16', '#2F7A55'];
      const width: maplibregl.ExpressionSpecification = ['case', ['get', 'on'], 4.5, ['==', ['get', 'type'], 'enabled'], 3.2, 2];
      // מסלול ידע: מבהיר במקור לכהה במקום שהושפע, כדי שיובן לאן הידע זרם
      const grad = (rgb: string): maplibregl.ExpressionSpecification => ['interpolate', ['linear'], ['line-progress'], 0, `rgba(${rgb},0.18)`, 1, `rgba(${rgb},1)`];
      m.addLayer({ id: 'routes-solid', type: 'line', source: 'routes', filter: ['all', ['in', ['get', 'type'], ['literal', ['influenced', 'enabled']]], ['!=', ['get', 'confidence'], 'interpretive']], paint: { 'line-gradient': grad('47,122,85'), 'line-width': width }, layout: { 'line-cap': 'round' } });
      m.addLayer({ id: 'routes-solid-i', type: 'line', source: 'routes', filter: ['all', ['in', ['get', 'type'], ['literal', ['influenced', 'enabled']]], ['==', ['get', 'confidence'], 'interpretive']], paint: { 'line-gradient': grad('184,95,22'), 'line-width': width }, layout: { 'line-cap': 'round' } });
      m.addLayer({ id: 'routes-opposed', type: 'line', source: 'routes', filter: ['==', ['get', 'type'], 'opposed'], paint: { 'line-color': color, 'line-width': width, 'line-dasharray': [3, 2] } });
      m.addLayer({ id: 'routes-parallel', type: 'line', source: 'routes', filter: ['==', ['get', 'type'], 'parallel'], paint: { 'line-color': color, 'line-width': width, 'line-dasharray': [0.5, 2] }, layout: { 'line-cap': 'round' } });
      m.addLayer({ id: 'routes-hit', type: 'line', source: 'routes', paint: { 'line-color': '#000', 'line-width': 16, 'line-opacity': 0 } });
      m.on('click', 'routes-hit', (e) => { const id = e.features?.[0]?.properties?.id; if (id) cb.current.onRoute(String(id)); });
      m.on('mouseenter', 'routes-hit', () => { m.getCanvas().style.cursor = 'pointer'; });
      m.on('mouseleave', 'routes-hit', () => { m.getCanvas().style.cursor = ''; });
      // לחיצה על שם של ארץ במפת הבסיס פותחת את הארץ
      m.on('click', (e) => {
        const layers = (m.getStyle().layers || []).filter((l) => l.type === 'symbol' && l.id.toLowerCase().includes('country') && m.getLayoutProperty(l.id, 'visibility') !== 'none').map((l) => l.id);
        const f = m.queryRenderedFeatures([[e.point.x - 6, e.point.y - 6], [e.point.x + 6, e.point.y + 6]], { layers })[0];
        const name = f?.properties?.['name:en'] || f?.properties?.name_en || f?.properties?.name;
        if (name && cb.current.onCountry) cb.current.onCountry(String(name));
      });
      setReady(true);
    });
    return () => { m.remove(); map.current = undefined; markers.current.clear(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // מסלולים ושובל מרכז הכובד
  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    (m.getSource('routes') as GeoJSONSource).setData(fc(routes.map((r) => ({ type: 'Feature', properties: { id: r.id, type: r.type, confidence: r.confidence, on: r.on }, geometry: { type: 'LineString', coordinates: r.path } }))));
    (m.getSource('trail') as GeoJSONSource).setData(fc(trail.length > 1 ? [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: trail } }] : []));
    (m.getSource('tour') as GeoJSONSource).setData(fc(tour.filter((p) => p.length > 1).map((p) => ({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: p } }))));
  }, [routes, trail, tour, ready]);

  // ערים: סמן מרובע לכל עיר, גודל לפי מספר הגילויים הידועים
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const seen = new Set<string>();
    for (const c of cities) {
      seen.add(c.city.key);
      let mk = markers.current.get(c.city.key);
      if (!mk) {
        // עטיפה: ל-MapLibre יש מחלקות מיקום משלו על האלמנט של הסמן, ולכן הכפתור שלנו בפנים
        const wrapEl = document.createElement('div');
        const btn = document.createElement('button');
        wrapEl.appendChild(btn);
        btn.type = 'button';
        btn.dir = 'rtl';
        btn.dataset.city = c.city.key;
        btn.innerHTML = '<span class="mc-sq"><span class="mc-ico"></span><bdi class="num mc-n"></bdi></span><span class="mc-name"></span>';
        btn.addEventListener('click', (e) => { e.stopPropagation(); cb.current.onCity(c.city.key); });
        mk = new maplibregl.Marker({ element: wrapEl, anchor: 'center' }).setLngLat(c.city.lonLat).addTo(m);
        markers.current.set(c.city.key, mk);
        // עיר חדשה בידע: צומחת פנימה (בלי הבהוב של כל הסמנים)
        if (ready) { btn.classList.add('is-new'); window.setTimeout(() => btn.classList.remove('is-new'), 800); }
      }
      const btn = mk.getElement().firstElementChild as HTMLButtonElement;
      const size = 14 + Math.sqrt(c.known) * 8;
      const quiet = btn.classList.contains('label-quiet');
      btn.className = `${quiet ? 'label-quiet ' : ''}map-city dom-${c.domain}${c.known > 1 ? ' is-big' : ''}${c.recent ? ' is-recent' : ''}${c.on ? ' is-on' : ''}${c.badge ? ' has-badge' : ''}${c.kw === true ? ' is-kw' : c.kw === false ? ' is-kw-off' : ''} conf-${c.city.confidence}`;
      btn.style.setProperty('--sq', `${size}px`);
      btn.setAttribute('aria-pressed', String(c.on));
      btn.setAttribute('aria-label', `${c.city.nameHe}, ${c.known} גילויים`);
      // מספר מופיע רק במסע (סדר התחנות). בתצוגה הרגילה הגודל מספר את הכמות, לפי המקרא.
      (btn.querySelector('.mc-n') as HTMLElement).textContent = c.badge || '';
      (btn.querySelector('.mc-name') as HTMLElement).textContent = c.city.nameHe;
      // אייקון התחום בלבן בתוך הריבוע (רק כשהסמן גדול מספיק כדי שיהיה קריא)
      const ico = btn.querySelector('.mc-ico') as HTMLElement;
      if (ico.dataset.d !== c.domain) { ico.innerHTML = size >= 18 ? iconSvg(c.domain) : ''; ico.dataset.d = c.domain; }
    }
    for (const [k, mk] of markers.current) if (!seen.has(k)) { mk.remove(); markers.current.delete(k); }
    // מסדרים שמות מחדש רק כשקבוצת הערים או הגדלים השתנו, לא בכל שנה בהפעלה
    const sig = cities.map((c) => `${c.city.key}:${c.known}:${c.on ? 1 : 0}:${c.kw ? 1 : 0}`).join('|');
    if (sig === lastSig.current) return;
    lastSig.current = sig;
    const raf = requestAnimationFrame(() => declutter.current());
    return () => cancelAnimationFrame(raf);
  }, [cities]);

  // מרכז הכובד
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (!center) { centerMarker.current?.remove(); centerMarker.current = undefined; return; }
    if (!centerMarker.current) {
      const d = document.createElement('div');
      d.className = 'map-center';
      d.setAttribute('aria-hidden', 'true');
      d.innerHTML = '<i></i><span>מרכז הכובד</span>';
      centerMarker.current = new maplibregl.Marker({ element: d, anchor: 'center' }).setLngLat(center).addTo(m);
    } else centerMarker.current.setLngLat(center);
  }, [center]);

  useEffect(() => {
    const m = map.current;
    if (!m || !focus || !ready) return; // מחכים לטעינה: מעבר לפני שהסגנון נטען מתבטל
    m.easeTo({ center: focus, zoom: Math.max(m.getZoom(), focusZoom), duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1100 });
  }, [focus?.[0], focus?.[1], focusZoom, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  // סמני השובל: התחלה, אמצע, סוף, עם שנים
  useEffect(() => {
    const m = map.current;
    trailMarkers.current.forEach((mk) => mk.remove());
    trailMarkers.current = [];
    if (!m) return;
    for (const t of trailMarks) {
      const d = document.createElement('div');
      d.className = `trail-mark is-${t.kind}`;
      d.textContent = t.label;
      trailMarkers.current.push(new maplibregl.Marker({ element: d, anchor: 'bottom' }).setLngLat(t.p).addTo(m));
    }
  }, [trailMarks]);

  return <div ref={el} className={`map-canvas${showConf ? ' show-conf' : ''}`} role="region" aria-label="גלובוס הגילויים. הערים הן כפתורים." data-ready={ready} />;
}
