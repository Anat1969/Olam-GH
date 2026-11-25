// בין השורות: מדדים מסדר שני, מחושבים בזמן אמת מהנתונים המאומתים.
// כאן אין עובדות כתובות: הכותרת נבנית מהתוצאה, כך שאם הנתונים משתנים, גם המסקנה משתנה.
import { activeDomains, discoveries, links, resolvedLinks, linkTypeName, yearText, type LinkType, type Discovery } from '../data';
import { cities, cityOf, centroid, nearestCity, type LonLat } from '../geo';
import { insightDefs, mechById, domName, type Level, type InsightDef } from './model';

export type Viz =
  | { type: 'matrix'; domains: { id: string; name: string }[]; counts: number[][] }
  | { type: 'bars'; rows: { label: string; value: number; note?: string }[]; unit?: string }
  | { type: 'path'; rows: { label: string; city: string; n: number }[] }
  | { type: 'stack'; keys: { key: string; label: string }[]; rows: { label: string; n: number; parts: number[] }[] };

export interface Insight extends InsightDef {
  headline: string; detail: string; level: Level; viz: Viz; examples: string[];
  preset: { m: string; t?: string };
}

const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); const n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : 0; };
const pct = (a: number, b: number) => (b ? Math.round((100 * a) / b) : 0);
const ERAS: { label: string; from: number; to: number }[] = [
  { label: 'עד 1500', from: -5000, to: 1499 },
  { label: '1500 עד 1799', from: 1500, to: 1799 },
  { label: 'המאה ה-19', from: 1800, to: 1899 },
  { label: 'מ-1900', from: 1900, to: 9999 },
];
const eraOf = (y: number) => ERAS.find((e) => y >= e.from && y <= e.to)!;

/** מטריצת קשרים בין תחומים: כמה קשרים מאומתים בכל צירוף */
export function domainMatrix() {
  const ids = activeDomains.map((d) => d.id);
  const idx = new Map(ids.map((id, i) => [id, i]));
  const counts = ids.map(() => ids.map(() => 0));
  for (const r of resolvedLinks) {
    const a = idx.get(r.a.d.domainId), b = idx.get(r.b.d.domainId);
    if (a === undefined || b === undefined || a === b) continue;
    counts[a][b]++; counts[b][a]++;
  }
  const size = new Map(ids.map((id) => [id, discoveries.filter((d) => d.domainId === id).length]));
  const empty: [string, string][] = [];
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) if (!counts[i][j]) empty.push([ids[i], ids[j]]);
  // הצירופים הריקים המפתיעים ביותר: שני תחומים גדולים בלי קשר אחד
  empty.sort((p, q) => size.get(q[0])! * size.get(q[1])! - size.get(p[0])! * size.get(p[1])!);
  return { ids, counts, empty, total: (ids.length * (ids.length - 1)) / 2 };
}

/** הקשרים של גילוי, ישירות או דרך הדמויות שלו */
export const degree = (() => {
  const m = new Map<string, number>();
  for (const r of resolvedLinks) for (const e of [r.a, r.b]) m.set(e.d.id, (m.get(e.d.id) || 0) + 1);
  return m;
})();

const EUROPE = (p: LonLat) => p[1] >= 35 && p[1] <= 72 && p[0] >= -25 && p[0] <= 45;

function compute(def: InsightDef): Omit<Insight, keyof InsightDef> {
  switch (def.id) {
    case 'matrix': {
      const { ids, counts, empty, total } = domainMatrix();
      const [a, b] = empty[0] || [ids[0], ids[1]];
      return {
        headline: `**${empty.length}** מתוך **${total}** צירופי תחומים עוד בלי קשר אחד`,
        detail: `הריק המפתיע ביותר: **${domName(a)}** ו**${domName(b)}**, שני תחומים גדולים בלי גשר מתועד ביניהם.`,
        level: 'documented', viz: { type: 'matrix', domains: ids.map((id) => ({ id, name: domName(id) })), counts },
        examples: [], preset: { m: 'transfer', t: b },
      };
    }
    case 'lag': {
      const by = ERAS.map((e) => ({ e, lags: [] as number[] }));
      for (const r of resolvedLinks) {
        if (r.link.type === 'parallel') continue;
        const lag = r.b.d.yearFrom - r.a.d.yearFrom;
        if (lag <= 0) continue;
        by.find((x) => x.e === eraOf(r.a.d.yearFrom))!.lags.push(lag);
      }
      const rows = by.filter((x) => x.lags.length >= 3).map((x) => ({ label: x.e.label, value: Math.round(median(x.lags)), note: `${x.lags.length} קשרים` }));
      const first = rows[0], last = rows[rows.length - 1];
      const shorter = last.value < first.value;
      const lagLinks = resolvedLinks.filter((r) => r.link.type !== 'parallel' && r.b.d.yearFrom - r.a.d.yearFrom > 0).sort((p, q) => (q.b.d.yearFrom - q.a.d.yearFrom) - (p.b.d.yearFrom - p.a.d.yearFrom));
      return {
        headline: shorter ? `הדרך מגילוי להשפעה התקצרה מ-**${first.value}** ל-**${last.value}** שנה` : `הדרך מגילוי להשפעה לא התקצרה: **${first.value}** מול **${last.value}** שנה`,
        detail: `חציון הפער בין שנת המקור לשנת ההשפעה, לפי תקופת המקור. הפער הארוך ביותר באטלס: **${lagLinks[0].b.d.yearFrom - lagLinks[0].a.d.yearFrom}** שנה.`,
        level: 'interpretive', viz: { type: 'bars', rows, unit: 'שנה' },
        examples: lagLinks.slice(0, 3).map((r) => r.link.id), preset: { m: 'how-to-why' },
      };
    }
    case 'gravity': {
      const rows: { label: string; city: string; n: number }[] = [];
      for (const e of ERAS) {
        const pts = discoveries.filter((d) => cityOf.has(d.id) && eraOf(d.yearFrom) === e).map((d) => cityOf.get(d.id)!.lonLat);
        const c = centroid(pts);
        if (c && pts.length >= 3) rows.push({ label: e.label, city: nearestCity(c).nameHe, n: pts.length });
      }
      return {
        headline: `מרכז הכובד של הידע נדד מ**${rows[0].city}** אל **${rows[rows.length - 1].city}**`,
        detail: 'העיר שליד הממוצע הווקטורי של מקומות הגילוי, בכל תקופה. לא בהכרח עיר של גילוי, אלא מרכז המשקל.',
        level: 'interpretive', viz: { type: 'path', rows }, examples: [], preset: { m: 'city-reactor' },
      };
    }
    case 'negation': {
      const neg = (d: Discovery) => /(ולא|בלי)\s/.test(d.novelty || '');
      const rows = activeDomains.map((dm) => {
        const all = discoveries.filter((d) => d.domainId === dm.id && d.novelty);
        return { label: dm.nameHe, value: pct(all.filter(neg).length, all.length), note: `${all.filter(neg).length} מתוך ${all.length}` };
      }).sort((a, b) => b.value - a.value);
      const hits = discoveries.filter(neg);
      return {
        headline: `**${hits.length}** חידושים מנוסחים כשלילה של מה שהיה לפניהם`,
        detail: `הכי הרבה ב**${rows[0].label}** (${rows[0].note}). כל שלילה כזו היא הנחה שנשברה, והמנוע הופך אותה לשאלה בתחום אחר.`,
        level: 'documented', viz: { type: 'bars', rows: rows.slice(0, 8), unit: '%' },
        examples: hits.sort((a, b) => (degree.get(b.id) || 0) - (degree.get(a.id) || 0)).slice(0, 4).map((d) => d.id), preset: { m: 'axiom-break' },
      };
    }
    case 'multiples': {
      const par = links.filter((l) => l.type === 'parallel');
      const cands = simultaneousCandidates();
      const rows = activeDomains.map((dm) => ({ label: dm.nameHe, value: cands.filter(([a]) => a.domainId === dm.id).length })).filter((r) => r.value).sort((a, b) => b.value - a.value);
      return {
        headline: `**${par.length}** זוגות מקבילים מתועדים, ועוד **${cands.length}** מועמדים שהמנוע מצא`,
        detail: 'מועמד: אותו תחום ותת-תחום, עד 12 שנה זה מזה, בערים שונות, בלי דמות משותפת ובלי קשר מתועד.',
        level: 'hypothesis', viz: { type: 'bars', rows: rows.slice(0, 8), unit: 'זוגות' },
        examples: par.slice(0, 4).map((l) => l.id), preset: { m: 'simultaneous', t: rows[0]?.label ? activeDomains.find((d) => d.nameHe === rows[0].label)?.id : undefined },
      };
    }
    case 'instrument': {
      const ins = (mechById.get('instrument')?.examples || []).map((id) => discoveries.find((d) => d.id === id)).filter((d): d is Discovery => !!d);
      const rows = ins.map((d) => {
        const same = discoveries.filter((x) => x.domainId === d.domainId && x.id !== d.id);
        const before = same.filter((x) => x.yearFrom >= d.yearFrom - 100 && x.yearFrom < d.yearFrom).length;
        const after = same.filter((x) => x.yearFrom > d.yearFrom && x.yearFrom <= d.yearFrom + 100).length;
        return { d, before, after };
      });
      const B = rows.reduce((s, r) => s + r.before, 0), A = rows.reduce((s, r) => s + r.after, 0);
      return {
        headline: `אחרי **${rows.length}** מכשירים: **${A}** גילויים במאה שאחרי, מול **${B}** במאה שלפני`,
        detail: rows.filter((r) => r.d.yearFrom < 1950).length < rows.length ? 'במכשירים מהמאה ה-21 המאה שאחרי עוד לא עברה, ולכן הם מקטינים את ה"אחרי".' : '',
        level: 'hypothesis', viz: { type: 'bars', rows: rows.map((r) => ({ label: `${r.d.title.split(':')[0]}, ${yearText(r.d.yearFrom)}`, value: r.after - r.before, note: `${r.before} ← ${r.after}` })), unit: 'הפרש' },
        examples: ins.slice(0, 4).map((d) => d.id), preset: { m: 'instrument' },
      };
    }
    case 'deadends': {
      const lonely = discoveries.filter((d) => !degree.get(d.id));
      const rows = activeDomains.map((dm) => {
        const all = discoveries.filter((d) => d.domainId === dm.id);
        const n = all.filter((d) => !degree.get(d.id)).length;
        return { label: dm.nameHe, value: pct(n, all.length), note: `${n} מתוך ${all.length}` };
      }).sort((a, b) => b.value - a.value);
      const top = activeDomains.find((d) => d.nameHe === rows[0].label)!.id;
      return {
        headline: `**${pct(lonely.length, discoveries.length)}%** מהגילויים עוד לא מחוברים לאף גילוי אחר`,
        detail: `הכי הרבה ב**${rows[0].label}** (${rows[0].note}). כל אחד מהם הוא נקודת פתיחה במעבדה.`,
        level: 'documented', viz: { type: 'bars', rows: rows.slice(0, 8), unit: '%' },
        examples: lonely.slice(0, 4).map((d) => d.id), preset: { m: 'how-to-why', t: top },
      };
    }
    case 'europe': {
      const placed = discoveries.filter((d) => cityOf.has(d.id));
      const eu = placed.filter((d) => EUROPE(cityOf.get(d.id)!.lonLat));
      const rows = ERAS.map((e) => {
        const all = placed.filter((d) => eraOf(d.yearFrom) === e);
        return { label: e.label, value: pct(all.filter((d) => EUROPE(cityOf.get(d.id)!.lonLat)).length, all.length), note: `${all.length} גילויים` };
      });
      return {
        headline: `**${pct(eu.length, placed.length)}%** מהגילויים עם מקום נמצאים באירופה`,
        detail: 'ההטיה משתנה עם הזמן. כשחור במפה מופיע מחוץ לאירופה, כדאי לשאול קודם אם הוא חור במקורות.',
        level: 'interpretive', viz: { type: 'bars', rows, unit: '%' }, examples: [], preset: { m: 'hole' },
      };
    }
    case 'types': {
      const keys = (['influenced', 'enabled', 'opposed', 'parallel'] as LinkType[]).map((k) => ({ key: k, label: linkTypeName[k] }));
      const rows = ERAS.map((e) => {
        const ls = resolvedLinks.filter((r) => eraOf(Math.max(r.a.d.yearFrom, r.b.d.yearFrom)) === e);
        return { label: e.label, n: ls.length, parts: keys.map((k) => pct(ls.filter((r) => r.link.type === k.key).length, ls.length)) };
      }).filter((r) => r.n);
      const oi = keys.findIndex((k) => k.key === 'opposed');
      const peak = [...rows].sort((a, b) => b.parts[oi] - a.parts[oi])[0];
      return {
        headline: `הערעור הכי נפוץ בתקופה **${peak.label}**: **${peak.parts[oi]}%** מהקשרים`,
        detail: 'התקופה נקבעת לפי השנה המאוחרת בקשר, כלומר לפי הרגע שבו הקשר נוצר.',
        level: 'interpretive', viz: { type: 'stack', keys, rows }, examples: [], preset: { m: 'coexist' },
      };
    }
    case 'singletons': {
      const one = cities.filter((c) => c.items.length === 1);
      const rows = [...cities].sort((a, b) => b.items.length - a.items.length).slice(0, 8).map((c) => ({ label: c.nameHe, value: c.items.length }));
      return {
        headline: `**${one.length}** מתוך **${cities.length}** ערים מופיעות בגילוי אחד בלבד`,
        detail: `ומנגד, ב**${rows[0].label}** לבדה **${rows[0].value}** גילויים. הידע מרוכז, אבל גם מפוזר.`,
        level: 'documented', viz: { type: 'bars', rows, unit: 'גילויים' }, examples: one.slice(0, 4).map((c) => c.items[0].id), preset: { m: 'city-reactor' },
      };
    }
  }
  throw new Error(`מדד לא מוכר: ${def.id}`);
}

let cache: Insight[] | null = null;
export function insights(): Insight[] {
  if (!cache) cache = insightDefs.map((def) => ({ ...def, ...compute(def) }));
  return cache;
}

/** זוגות שעשויים להיות גילוי כפול: אותו תחום ותת-תחום, עד 12 שנה, ערים שונות, בלי דמות משותפת ובלי קשר */
export function simultaneousCandidates(): [Discovery, Discovery][] {
  const linked = new Set(resolvedLinks.flatMap((r) => [`${r.a.d.id}|${r.b.d.id}`, `${r.b.d.id}|${r.a.d.id}`]));
  const out: [Discovery, Discovery][] = [];
  for (let i = 0; i < discoveries.length; i++) for (let j = i + 1; j < discoveries.length; j++) {
    const a = discoveries[i], b = discoveries[j];
    if (b.yearFrom - a.yearFrom > 12) continue;
    if (a.domainId !== b.domainId || !a.sub || a.sub !== b.sub) continue;
    if (a.personIds.some((p) => b.personIds.includes(p))) continue;
    const ca = cityOf.get(a.id), cb = cityOf.get(b.id);
    if (!ca || !cb || ca === cb || linked.has(`${a.id}|${b.id}`)) continue;
    out.push([a, b]);
  }
  return out;
}
