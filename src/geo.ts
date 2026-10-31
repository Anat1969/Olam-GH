// חישובים גאוגרפיים טהורים למפה: ערים, קשתות על פני הכדור, ומרכז הכובד של הידע.
import { type Discovery, discoveries, resolvedLinks } from './data';

export type LonLat = [number, number];
const RAD = Math.PI / 180;
const toVec = ([lon, lat]: LonLat) => [Math.cos(lat * RAD) * Math.cos(lon * RAD), Math.cos(lat * RAD) * Math.sin(lon * RAD), Math.sin(lat * RAD)];
const toLonLat = ([x, y, z]: number[]): LonLat => [Math.atan2(y, x) / RAD, Math.atan2(z, Math.hypot(x, y)) / RAD];

/** מרחק במעגל גדול, בקילומטרים */
export function km(a: LonLat, b: LonLat) {
  const [x1, y1, z1] = toVec(a), [x2, y2, z2] = toVec(b);
  return 6371 * Math.acos(Math.min(1, Math.max(-1, x1 * x2 + y1 * y2 + z1 * z2)));
}

/** קשת במעגל גדול בין שתי נקודות, כדי שקו ייראה נכון על הגלובוס */
export function arc(a: LonLat, b: LonLat, n = 48): LonLat[] {
  const va = toVec(a), vb = toVec(b);
  const dot = Math.min(1, Math.max(-1, va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2]));
  const w = Math.acos(dot);
  if (w < 1e-6) return [a, b];
  const pts: LonLat[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const s1 = Math.sin((1 - t) * w) / Math.sin(w), s2 = Math.sin(t * w) / Math.sin(w);
    pts.push(toLonLat([0, 1, 2].map((k) => s1 * va[k] + s2 * vb[k])));
  }
  // רציפות באורך גאוגרפי, כדי שקו לא יקפוץ מעבר לקו התאריך
  for (let i = 1; i < pts.length; i++) {
    while (pts[i][0] - pts[i - 1][0] > 180) pts[i][0] -= 360;
    while (pts[i][0] - pts[i - 1][0] < -180) pts[i][0] += 360;
  }
  return pts;
}

/** ממוצע וקטורי של מיקומים על הכדור (לא ממוצע של מספרים, שנכשל ליד קו התאריך) */
export function centroid(points: LonLat[]): LonLat | null {
  if (!points.length) return null;
  const s = points.map(toVec).reduce((acc, v) => acc.map((x, i) => x + v[i]), [0, 0, 0]);
  return toLonLat(s);
}

export interface City {
  key: string; nameHe: string; nameFull: string; lonLat: LonLat;
  items: Discovery[]; confidence: 'documented' | 'interpretive';
}

/** הגילויים מקובצים לפי עיר. מוסדות באותה עיר נספרים יחד, והמיקום הוא הממוצע שלהם. */
export const cities: City[] = (() => {
  const m = new Map<string, Discovery[]>();
  for (const d of discoveries) {
    if (!d.place || d.place.lat === null || d.place.lon === null) continue;
    const k = d.place.city.nameFull;
    m.set(k, [...(m.get(k) || []), d]);
  }
  return [...m.entries()].map(([key, items]) => ({
    key,
    nameHe: items[0].place!.city.nameHe,
    nameFull: items[0].place!.city.nameFull,
    lonLat: centroid(items.map((d) => [d.place!.lon!, d.place!.lat!] as LonLat))!,
    items: items.sort((a, b) => a.yearFrom - b.yearFrom),
    confidence: items.every((d) => d.place!.confidence === 'documented') ? 'documented' : 'interpretive',
  }));
})();
export const cityOf = new Map(cities.flatMap((c) => c.items.map((d) => [d.id, c] as const)));
export const unplaced = discoveries.filter((d) => !cityOf.has(d.id));

/** מסלולי ידע: קשר מאומת ששני קצותיו בעלי מקום, בערים שונות */
export const routes = resolvedLinks
  .map((r) => ({ ...r, from: cityOf.get(r.a.d.id), to: cityOf.get(r.b.d.id) }))
  .filter((r): r is typeof r & { from: City; to: City } => !!r.from && !!r.to && r.from !== r.to)
  .map((r) => ({ ...r, path: arc(r.from.lonLat, r.to.lonLat), year: Math.max(r.a.d.yearFrom, r.b.d.yearFrom), km: Math.round(km(r.from.lonLat, r.to.lonLat)) }));
export const sameCityLinks = resolvedLinks.filter((r) => cityOf.get(r.a.d.id) && cityOf.get(r.a.d.id) === cityOf.get(r.b.d.id));

const placed = discoveries.filter((d) => cityOf.has(d.id));
/** מרכז הכובד של הגילויים הידועים בשנה נתונה */
export function centerAt(year: number) {
  const pts = placed.filter((d) => d.yearFrom <= year).map((d) => cityOf.get(d.id)!.lonLat);
  return centroid(pts);
}
/** שובל מרכז הכובד: נקודה אחרי כל גילוי, עד השנה הנתונה */
export function centerTrail(year: number): LonLat[] {
  const years = [...new Set(placed.map((d) => d.yearFrom))].filter((y) => y <= year).sort((a, b) => a - b);
  return years.map((y) => centerAt(y)!);
}
export function nearestCity(p: LonLat) {
  return cities.reduce((best, c) => (km(p, c.lonLat) < km(p, best.lonLat) ? c : best), cities[0]);
}
