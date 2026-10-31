import { useSyncExternalStore } from 'react';
// חיפוש לפי מילת מפתח בכל העולם: דמויות, גילויים, תתי תחומים, ערים וארצות.
// עברית ולועזית יחד. מנרמלים ניקוד, גרש וגרשיים, מקף ואותיות לטיניות עם סימנים, כדי ש"קירי", "Curie" ו"קורי" לא ייפלו על כתיב.
import { discoveries, domainById, families, personById, persons, yearText, type Discovery, type Person } from './data';

const norm = (s: string) => s
  .normalize('NFD').replace(/[̀-ͯ]/g, '') // סימנים לטיניים: Kanō → Kano
  .replace(/[֑-ׇ]/g, '') // ניקוד וטעמים
  .replace(/[׳'`’ʼ]/g, "'").replace(/[״"“”]/g, '"')
  .replace(/[-־–—_.,:;()]/g, ' ')
  .toLowerCase().replace(/\s+/g, ' ').trim();

export type Hit =
  | { kind: 'person'; id: string; title: string; detail: string; person: Person; score: number }
  | { kind: 'discovery'; id: string; title: string; detail: string; d: Discovery; score: number }
  | { kind: 'sub'; id: string; title: string; detail: string; domainId: string; sub: string; count: number; score: number }
  | { kind: 'city'; id: string; title: string; detail: string; key: string; count: number; score: number };

type Entry = { hit: Hit; main: string; rest: string };

const domainName = (id: string) => domainById.get(id)?.nameHe || id;
const subName = (d: Discovery) => domainById.get(d.domainId)?.subs?.find((s) => s.id === d.sub)?.nameHe || '';

function build(): Entry[] {
  const out: Entry[] = [];
  for (const p of persons) {
    const ds = discoveries.filter((d) => d.personIds.includes(p.id));
    if (!ds.length) continue;
    const detail = [p.nameFull, [...new Set(ds.map((d) => domainName(d.domainId)))].join(', ')].filter(Boolean).join(' · ');
    out.push({ hit: { kind: 'person', id: p.id, title: p.nameHe, detail, person: p, score: 0 }, main: norm(`${p.nameHe} ${p.nameFull} ${p.wikipedia}`), rest: norm(ds.map((d) => `${d.title} ${subName(d)}`).join(' ')) });
  }
  for (const d of discoveries) {
    const who = d.personIds.map((id) => personById.get(id)?.nameHe).filter(Boolean).join(' ו') || 'יוצר לא ידוע';
    const detail = `${who} · ${yearText(d.yearFrom)} · ${domainName(d.domainId)}${d.sub ? ` / ${subName(d)}` : ''}`;
    const rest = [d.novelty, d.contribution, d.place?.nameHe, d.place?.nameFull, d.place?.city.nameHe, ...d.evidence.map((e) => e.quoteHe || ''), ...d.personIds.map((id) => `${personById.get(id)?.nameHe} ${personById.get(id)?.nameFull}`)].join(' ');
    out.push({ hit: { kind: 'discovery', id: d.id, title: d.title, detail, d, score: 0 }, main: norm(d.title), rest: norm(rest.replace(/\*\*|==/g, '')) });
  }
  for (const f of families) for (const dom of f.domains) for (const s of dom.subs || []) {
    const count = discoveries.filter((d) => d.domainId === dom.id && d.sub === s.id).length;
    out.push({ hit: { kind: 'sub', id: `${dom.id}/${s.id}`, title: s.nameHe, detail: `תת-תחום ב${dom.nameHe} · ${count} גילויים`, domainId: dom.id, sub: s.id, count, score: 0 }, main: norm(s.nameHe), rest: norm(`${dom.nameHe} ${dom.nameFull} ${f.nameHe}`) });
  }
  const cities = new Map<string, { he: string; en: string; country: string; count: number }>();
  for (const d of discoveries) {
    if (!d.place) continue;
    const k = d.place.city.nameFull;
    const c = cities.get(k) || { he: d.place.city.nameHe, en: k, country: d.place.country?.nameHe || '', count: 0 };
    c.count++; cities.set(k, c);
  }
  for (const [k, c] of cities) out.push({ hit: { kind: 'city', id: k, title: c.he, detail: `${c.en}${c.country ? ` · ${c.country}` : ''} · ${c.count} גילויים`, key: k, count: c.count, score: 0 }, main: norm(`${c.he} ${c.en}`), rest: norm(c.country) });
  return out;
}

let index: Entry[] | null = null;

// התאמה בתחילת מילה, כולל אותיות השימוש בעברית (ה, ו, ב, כ, ל, מ, ש, עד שלוש): "אור" מוצא "האור" ו"באור", לא "תאוריה".
const PREFIX = /^[והבכלמש]{1,3}/;
function wordHit(text: string, t: string) {
  // מילה קצרה (עד 3 אותיות) חייבת להיות מילה שלמה, אחרת "אור" תופס "אורך" ו"אורגני". מ-4 אותיות מספיקה תחילת מילה.
  const ok = (w: string) => (t.length <= 3 ? w === t : w.startsWith(t));
  for (const w of text.split(' ')) {
    if (ok(w)) return true;
    const m = w.match(PREFIX);
    if (m) for (let k = 1; k <= m[0].length; k++) if (ok(w.slice(k))) return true;
  }
  return false;
}
const KIND_W = { person: 3, discovery: 2, sub: 2.5, city: 2 } as const;

/** כל מילה בשאילתה חייבת להופיע. התאמה בתחילת השם שווה יותר מהתאמה בטקסט. */
export function search(q: string, limit = 60): Hit[] {
  const tokens = norm(q).split(' ').filter((t) => t.length > 0);
  if (!tokens.length) return [];
  index ||= build();
  const res: Hit[] = [];
  for (const e of index) {
    let score = 0;
    let all = true;
    for (const t of tokens) {
      const words = e.main.split(' ');
      if (words.some((w) => w === t)) score += 10;
      else if (words.some((w) => w.startsWith(t))) score += 7;
      else if (wordHit(e.main, t)) score += 5;
      else if (wordHit(e.rest, t)) score += 1;
      else { all = false; break; }
    }
    if (all) res.push({ ...e.hit, score: score * KIND_W[e.hit.kind] } as Hit);
  }
  return res.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, 'he')).slice(0, limit);
}

/** מיקום ההתאמה בכותרת, להדגשה במרקר */
export function markRange(text: string, q: string): [number, number] | null {
  const t = norm(q).split(' ').filter(Boolean).sort((a, b) => b.length - a.length)[0];
  if (!t) return null;
  // הנרמול שומר על אורך התווים ברוב המקרים (חוץ מניקוד); מחפשים ברצף פשוט
  const i = norm(text).indexOf(t);
  return i < 0 || norm(text).length !== text.length ? null : [i, i + t.length];
}

// ---------------------------------------------------------------------------
// מילת מפתח גלובלית: שדה אחד בסרגל, וכל דף מדגיש את מה שמתאים לה.
// נשמרת ב-sessionStorage, כדי שמעבר בין ציר, מפה וגרף ישאיר אותה.

const KW_KEY = 'olam.keyword';
let kw = (() => { try { return sessionStorage.getItem(KW_KEY) || ''; } catch { return ''; } })();
const kwSubs = new Set<() => void>();
export function setKeyword(q: string) {
  if (q === kw) return;
  kw = q;
  try { if (q) sessionStorage.setItem(KW_KEY, q); else sessionStorage.removeItem(KW_KEY); } catch { /* מצב פרטי */ }
  cache = null;
  kwSubs.forEach((f) => f());
}
export const useKeyword = () => useSyncExternalStore((f) => { kwSubs.add(f); return () => kwSubs.delete(f); }, () => kw);

export type Matches = {
  q: string; active: boolean;
  discoveries: Set<string>; persons: Set<string>; cities: Set<string>;
  byDomain: { domainId: string; nameHe: string; persons: Set<string>; discoveries: Discovery[] }[];
};
let cache: Matches | null = null;

/** מה מתאים למילה: גילוי שמתאים ישירות, כל הגילויים של דמות שמתאימה, של תת-תחום שמתאים ושל עיר שמתאימה */
export function matchesOf(q: string): Matches {
  if (cache && cache.q === q) return cache;
  const hits = q.trim() ? search(q, Infinity) : [];
  const ds = new Set<string>();
  for (const h of hits) {
    if (h.kind === 'discovery') ds.add(h.id);
    else if (h.kind === 'person') discoveries.filter((d) => d.personIds.includes(h.id)).forEach((d) => ds.add(d.id));
    else if (h.kind === 'sub') discoveries.filter((d) => d.domainId === h.domainId && d.sub === h.sub).forEach((d) => ds.add(d.id));
    else if (h.kind === 'city') discoveries.filter((d) => d.place?.city.nameFull === h.key).forEach((d) => ds.add(d.id));
  }
  const list = discoveries.filter((d) => ds.has(d.id));
  const persons = new Set(list.flatMap((d) => d.personIds));
  const cities = new Set(list.filter((d) => d.place).map((d) => d.place!.city.nameFull));
  const byDomain = families.flatMap((f) => f.domains).map((dom) => {
    const xs = list.filter((d) => d.domainId === dom.id);
    return { domainId: dom.id, nameHe: dom.nameHe, persons: new Set(xs.flatMap((d) => d.personIds)), discoveries: xs };
  }).filter((x) => x.discoveries.length > 0).sort((a, b) => b.discoveries.length - a.discoveries.length);
  cache = { q, active: !!q.trim(), discoveries: ds, persons, cities, byDomain };
  return cache;
}
export const useMatches = () => matchesOf(useKeyword());
