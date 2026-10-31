// גלובוס MapLibre עם אריחי OpenStreetMap מעומעמים לגוון נייר.
// נטען בעצלות (dynamic import), כדי שדף הבית לא ישלם על ספריית המפה.
// ערים הן סמנים של HTML (עברית נכונה, כפתור אמיתי, מקלדת). מסלולים ושובל הם שכבות קו.
import { useEffect, useRef, useState } from 'react';
import maplibregl, { type GeoJSONSource, type Map as MLMap, type Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { City, LonLat } from '../geo';

export type RouteView = { id: string; path: LonLat[]; type: string; confidence: string; on: boolean };
export type CityView = { city: City; known: number; recent: boolean; on: boolean; domain: string };

const STYLE: maplibregl.StyleSpecification = {
  version: 8,
  projection: { type: 'globe' },
  sources: {
    osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, maxzoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>' },
  },
  layers: [
    { id: 'paper', type: 'background', paint: { 'background-color': '#F4F2EC' } },
    { id: 'osm', type: 'raster', source: 'osm', paint: { 'raster-saturation': -0.85, 'raster-contrast': -0.2, 'raster-brightness-min': 0.22, 'raster-opacity': 0.9 } },
  ],
  sky: { 'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 0.6, 5, 0] },
};

const fc = (features: GeoJSON.Feature[]): GeoJSON.FeatureCollection => ({ type: 'FeatureCollection', features });

export default function MapView({ cities, routes, trail, center, focus, onCity, onRoute, onFail }: {
  cities: CityView[]; routes: RouteView[]; trail: LonLat[]; center: LonLat | null; focus: LonLat | null;
  onCity: (key: string) => void; onRoute: (id: string) => void; onFail: () => void;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<MLMap>();
  const markers = useRef(new Map<string, Marker>());
  const centerMarker = useRef<Marker>();
  const [ready, setReady] = useState(false);
  const cb = useRef({ onCity, onRoute });
  cb.current = { onCity, onRoute };

  useEffect(() => {
    if (!el.current) return;
    let m: MLMap;
    try {
      m = new maplibregl.Map({
        container: el.current, style: STYLE, center: [22, 41], zoom: el.current.clientWidth > 700 ? 2.3 : 1.5, minZoom: 0.8, maxZoom: 9,
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
    zoomClass();
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left');
    m.on('error', (e) => { if (String(e.error?.message || '').includes('WebGL')) onFail(); });
    m.on('load', () => {
      m.addSource('routes', { type: 'geojson', data: fc([]) });
      m.addSource('trail', { type: 'geojson', data: fc([]) });
      m.addLayer({ id: 'trail', type: 'line', source: 'trail', paint: { 'line-color': '#17191C', 'line-width': 2, 'line-opacity': 0.55, 'line-dasharray': [1, 2] }, layout: { 'line-cap': 'round' } });
      m.addLayer({ id: 'routes-halo', type: 'line', source: 'routes', filter: ['==', ['get', 'on'], true], paint: { 'line-color': '#FFE45C', 'line-width': 12, 'line-opacity': 0.9 }, layout: { 'line-cap': 'round' } });
      const color: maplibregl.ExpressionSpecification = ['match', ['get', 'confidence'], 'interpretive', '#B85F16', '#2F7A55'];
      const width: maplibregl.ExpressionSpecification = ['case', ['get', 'on'], 4.5, ['==', ['get', 'type'], 'enabled'], 3.2, 2];
      m.addLayer({ id: 'routes-solid', type: 'line', source: 'routes', filter: ['in', ['get', 'type'], ['literal', ['influenced', 'enabled']]], paint: { 'line-color': color, 'line-width': width, 'line-opacity': 0.9 }, layout: { 'line-cap': 'round' } });
      m.addLayer({ id: 'routes-opposed', type: 'line', source: 'routes', filter: ['==', ['get', 'type'], 'opposed'], paint: { 'line-color': color, 'line-width': width, 'line-dasharray': [3, 2] } });
      m.addLayer({ id: 'routes-parallel', type: 'line', source: 'routes', filter: ['==', ['get', 'type'], 'parallel'], paint: { 'line-color': color, 'line-width': width, 'line-dasharray': [0.5, 2] }, layout: { 'line-cap': 'round' } });
      m.addLayer({ id: 'routes-hit', type: 'line', source: 'routes', paint: { 'line-color': '#000', 'line-width': 16, 'line-opacity': 0 } });
      m.on('click', 'routes-hit', (e) => { const id = e.features?.[0]?.properties?.id; if (id) cb.current.onRoute(String(id)); });
      m.on('mouseenter', 'routes-hit', () => { m.getCanvas().style.cursor = 'pointer'; });
      m.on('mouseleave', 'routes-hit', () => { m.getCanvas().style.cursor = ''; });
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
  }, [routes, trail, ready]);

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
        btn.innerHTML = '<span class="mc-sq"><bdi class="num mc-n"></bdi></span><span class="mc-name"></span>';
        btn.addEventListener('click', (e) => { e.stopPropagation(); cb.current.onCity(c.city.key); });
        mk = new maplibregl.Marker({ element: wrapEl, anchor: 'center' }).setLngLat(c.city.lonLat).addTo(m);
        markers.current.set(c.city.key, mk);
      }
      const btn = mk.getElement().firstElementChild as HTMLButtonElement;
      const size = 14 + Math.sqrt(c.known) * 8;
      btn.className = `map-city dom-${c.domain}${c.known > 1 ? ' is-big' : ''}${c.recent ? ' is-recent' : ''}${c.on ? ' is-on' : ''} conf-${c.city.confidence}`;
      btn.style.setProperty('--sq', `${size}px`);
      btn.setAttribute('aria-pressed', String(c.on));
      btn.setAttribute('aria-label', `${c.city.nameHe}, ${c.known} גילויים`);
      (btn.querySelector('.mc-n') as HTMLElement).textContent = String(c.known);
      (btn.querySelector('.mc-name') as HTMLElement).textContent = c.city.nameHe;
    }
    for (const [k, mk] of markers.current) if (!seen.has(k)) { mk.remove(); markers.current.delete(k); }
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
    if (m && focus) m.easeTo({ center: focus, zoom: Math.max(m.getZoom(), 3.2), duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 900 });
  }, [focus?.[0], focus?.[1]]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={el} className="map-canvas" role="region" aria-label="גלובוס הגילויים. הערים הן כפתורים." data-ready={ready} />;
}
