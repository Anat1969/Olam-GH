// גלובוס קטן שמסתובב, עם מפת חום של הפעילות היחסית בכל עיר.
// סרגל זמן מהגילוי הראשון עד האחרון: הכתמים גדלים ככל שהזמן מתקדם. נטען בעצלות, כי מפת היבשות שוקלת.
import { useEffect, useMemo, useRef, useState } from 'react';
import { geoGraticule10, geoOrthographic, geoPath, geoDistance } from 'd3-geo';
import { feature } from 'topojson-client';
import land110 from 'world-atlas/land-110m.json';
import type { Topology, GeometryCollection } from 'topojson-specification';
import { discoveries, yearText } from '../data';
import YearSlider from '../ui/YearSlider';

const land = feature(land110 as unknown as Topology, (land110 as unknown as Topology).objects.land as GeometryCollection);
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function HeatGlobe() {
  const placed = useMemo(() => discoveries.filter((d) => d.place?.lat != null && d.place?.lon != null), []);
  const first = Math.min(...placed.map((d) => d.yearFrom));
  const last = Math.max(...placed.map((d) => d.yearFrom));
  const [year, setYear] = useState(last);
  const [playing, setPlaying] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const rot = useRef(-20);

  // ערים עד השנה שנבחרה: מספר הגילויים בכל עיר
  const spots = useMemo(() => {
    const m = new Map<string, { lon: number; lat: number; n: number; name: string }>();
    for (const d of placed) {
      if (d.yearFrom > year) continue;
      const k = d.place!.city.nameFull;
      const e = m.get(k) || { lon: d.place!.lon!, lat: d.place!.lat!, n: 0, name: d.place!.city.nameHe };
      e.n++; m.set(k, e);
    }
    return [...m.values()];
  }, [placed, year]);
  const max = Math.max(1, ...spots.map((s) => s.n));
  const total = spots.reduce((a, s) => a + s.n, 0);

  // ציור והסיבוב
  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const size = c.clientWidth, dpr = window.devicePixelRatio || 1;
    c.width = size * dpr; c.height = size * dpr;
    const ctx = c.getContext('2d')!;
    ctx.scale(dpr, dpr);
    const proj = geoOrthographic().scale(size / 2 - 4).translate([size / 2, size / 2]).clipAngle(90);
    const path = geoPath(proj, ctx);
    const css = getComputedStyle(document.documentElement);
    const ink = css.getPropertyValue('--ink').trim() || '#17191C';
    let raf = 0, last = performance.now();
    const draw = (now: number) => {
      if (!reduced()) rot.current += ((now - last) / 1000) * 8; // 8 מעלות בשנייה
      last = now;
      proj.rotate([rot.current, -18]);
      ctx.clearRect(0, 0, size, size);
      ctx.beginPath(); path({ type: 'Sphere' }); ctx.fillStyle = '#FBFAF6'; ctx.fill(); ctx.strokeStyle = 'rgba(23,25,28,.25)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.beginPath(); path(geoGraticule10()); ctx.strokeStyle = 'rgba(23,25,28,.06)'; ctx.stroke();
      ctx.beginPath(); path(land); ctx.fillStyle = '#E3E0D8'; ctx.fill();
      const center: [number, number] = [-rot.current, 18];
      for (const s of spots) {
        if (geoDistance([s.lon, s.lat], center) > Math.PI / 2 - 0.05) continue;
        const p = proj([s.lon, s.lat]);
        if (!p) continue;
        const k = s.n / max;
        const r = 5 + Math.sqrt(k) * size * 0.09;
        const g = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], r);
        g.addColorStop(0, `rgba(184,95,22,${0.55 + 0.4 * k})`);
        g.addColorStop(0.45, `rgba(255,196,60,${0.35 + 0.3 * k})`);
        g.addColorStop(1, 'rgba(255,228,92,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = ink;
      if (!reduced()) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [spots, max]);

  // הפעלה: מהגילוי הראשון עד האחרון ב-20 שניות
  useEffect(() => {
    if (!playing) return;
    let y = year >= last ? first : year;
    const id = window.setInterval(() => {
      y += Math.max(5, Math.round((last - first) / 160));
      if (y >= last) { y = last; setPlaying(false); }
      setYear(y);
    }, 120);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  return (
    <figure className="heat-globe" aria-label={`גלובוס חום: ${total} גילויים ב-${spots.length} ערים עד ${yearText(year)}`}>
      <canvas ref={canvas} className="hg-canvas" role="img" aria-hidden="true" />
      <figcaption className="hg-cap">
        <span><bdi className="num">{total}</bdi> גילויים ב-<bdi className="num">{spots.length}</bdi> ערים עד <bdi className="num">{yearText(year)}</bdi></span>
        <span className="muted small">כתם גדול וחם יותר: יותר גילויים בעיר, יחסית לעיר המובילה באותה שנה.</span>
      </figcaption>
      <div className="hg-controls">
        <YearSlider label="שנה" value={year} from={first} to={last} onChange={(y) => { setPlaying(false); setYear(y); }} />
        <button type="button" className="press btn btn-primary" aria-pressed={playing} onClick={() => setPlaying((x) => !x)}>{playing ? 'עצירה' : 'הפעלה'}</button>
      </div>
    </figure>
  );
}
