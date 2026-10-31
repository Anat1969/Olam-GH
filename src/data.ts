// מקור אמת יחיד: data/*.json. הממשק מציג רק רשומות עם verified=true.
import fieldsJson from '../data/fields.json';
import personsJson from '../data/persons.json';
import discoveriesJson from '../data/discoveries.json';
import linksJson from '../data/links.json';
import sourcesJson from '../data/sources.json';
import reportJson from '../data/verification-report.json';

export type Confidence = 'documented' | 'interpretive' | 'hypothesis';
export type LinkType = 'influenced' | 'enabled' | 'opposed' | 'parallel';
/** quote: מילולי מהמקור (אנגלית). quoteHe: תרגום נאמן, מסומן בממשק כתרגום. האימות נעשה תמיד על המקור. */
export interface Evidence { sourceId: string; quote: string; quoteHe?: string }
export interface Place {
  wikipedia: string; wikidata?: string; nameHe: string | null; nameFull: string | null;
  lat: number | null; lon: number | null; confidence: Confidence; evidence: Evidence | null;
  city: { nameHe: string; nameFull: string };
  country?: { wikidata: string; nameHe: string | null; nameFull: string } | null;
}
export interface Person {
  id: string; wikipedia: string; wikidata?: string; nameHe: string; nameFull: string;
  birthYear: number | null; birthDate: string | null; birthApprox?: boolean;
  deathYear: number | null; deathDate: string | null; deathApprox?: boolean;
  calendar: 'julian' | 'gregorian' | null;
  birthPlace: { wikidata: string; nameHe: string | null; nameFull: string | null; lat: number | null; lon: number | null } | null;
  nameHeSource?: 'wikidata' | 'transliteration' | null;
  nameShort?: string;
  domains: string[]; imageUrl: string | null; imageLicense: string | null; imageCredit: string | null; imagePage?: string | null;
  sources: string[]; verified: boolean; verifiedAt: string | null;
}
export interface Discovery {
  id: string; title: string; yearFrom: number; yearTo: number; yearApprox: boolean; domainId: string; sub?: string; draftId?: string;
  personIds: string[]; place: Place | null; novelty?: string; contribution: string; confidence: Confidence;
  evidence: Evidence[]; sources: string[]; verified: boolean; verifiedAt: string | null;
}
export interface Link {
  id: string; fromId: string; toId: string; type: LinkType; confidence: Confidence;
  explanation: string; application?: string; evidence: Evidence[]; sources: string[]; verified: boolean; rejectedReason?: string;
}
export interface Source { id: string; title: string; url: string; accessedAt: string | null }
export interface Sub { id: string; nameHe: string }
export interface Domain { id: string; nameHe: string; nameFull: string; subs?: Sub[] }
export interface Family { id: string; nameHe: string; color: string; domains: Domain[] }

export const families = fieldsJson.families as Family[];
export const allPersons = personsJson.persons as unknown as Person[];
export const allDiscoveries = discoveriesJson.discoveries as unknown as Discovery[];
export const allLinks = linksJson.links as unknown as Link[];
export const sources = sourcesJson.sources as Source[];
export const report = reportJson as unknown as {
  date: string; summary: { persons: string; discoveries: string; links: string; images: number };
  places: { id: string; place: string; ok: boolean; confidence: Confidence }[];
};

export const persons = allPersons.filter((p) => p.verified);
export const discoveries = allDiscoveries.filter((d) => d.verified).sort((a, b) => a.yearFrom - b.yearFrom);
const shownIds = new Set([...persons.map((p) => p.id), ...discoveries.map((d) => d.id)]);
export const links = allLinks.filter((l) => l.verified && shownIds.has(l.fromId) && shownIds.has(l.toId));
export const rejected = {
  persons: allPersons.filter((p) => !p.verified),
  discoveries: allDiscoveries.filter((d) => !d.verified),
  links: allLinks.filter((l) => !l.verified),
};

export const personById = new Map(persons.map((p) => [p.id, p]));
export const discoveryById = new Map(discoveries.map((d) => [d.id, d]));
export const sourceById = new Map(sources.map((s) => [s.id, s]));
export const domainById = new Map(families.flatMap((f) => f.domains.map((d) => [d.id, { ...d, family: f }] as const)));

/** התחומים שיש בהם תוכן מאומת, לפי סדר המשפחות */
export const activeDomains = families.flatMap((f) => f.domains).filter((d) => discoveries.some((x) => x.domainId === d.id));

export const discoveriesOf = (personId: string) => discoveries.filter((d) => d.personIds.includes(personId));

/** קשרים שנוגעים בדמות: ישירות, או דרך אחד הגילויים שלה */
export function linksOf(personId: string) {
  const own = new Set([personId, ...discoveriesOf(personId).map((d) => d.id)]);
  return links.filter((l) => own.has(l.fromId) || own.has(l.toId)).map((l) => ({ link: l, outgoing: own.has(l.fromId), other: own.has(l.fromId) ? l.toId : l.fromId }));
}

export function nodeLabel(id: string) {
  const p = personById.get(id);
  if (p) return { name: p.nameHe, personId: p.id as string | undefined, year: null as number | null, discovery: undefined as Discovery | undefined };
  const d = discoveryById.get(id)!;
  return { name: d.title.split(':')[0], personId: d.personIds[0] as string | undefined, year: d.yearFrom, discovery: d };
}

/** יצירה בלי יוצר ידוע: אין דמות, ולכן הקישור הוא לכרטיס היצירה (w) ולא לכרטיס דמות */
export const ANON = 'יוצר לא ידוע';
export const workParams = (d: Pick<Discovery, 'id' | 'domainId' | 'yearTo'>) => ({ d: d.domainId, y: String(d.yearTo), w: d.id });
export const linksOfDiscovery = (id: string) => links.filter((l) => l.fromId === id || l.toId === id).map((l) => ({ link: l, outgoing: l.fromId === id, other: l.fromId === id ? l.toId : l.fromId }));

export const linkVerb: Record<LinkType, [string, string]> = {
  influenced: ['השפיע על', 'הושפע מ'],
  enabled: ['אפשר את', 'התאפשר בזכות'],
  opposed: ['עורער על ידי', 'ערער על'], // from = הרעיון שעורער, to = מי שערער
  parallel: ['במקביל ל', 'במקביל ל'],
};
export const confidenceName: Record<Confidence, string> = { documented: 'מתועד', interpretive: 'פרשנות מקובלת', hypothesis: 'הנחה' };

/** שנה לתצוגה: מספר בלבד, ותווית לפני הספירה בנפרד (כדי שלא יתבלבל בכיוון) */
export const yearText = (y: number) => (y < 0 ? `${-y} לפנה״ס` : String(y));
export function rangeText(d: Pick<Discovery, 'yearFrom' | 'yearTo' | 'yearApprox'>) {
  const base = d.yearTo !== d.yearFrom ? `${yearText(d.yearFrom)}–${yearText(d.yearTo)}` : yearText(d.yearFrom);
  return d.yearApprox ? `בערך ${base}` : base;
}
export function lifeText(p: Person) {
  const b = p.birthYear === null ? null : (p.birthApprox ? 'בערך ' : '') + yearText(p.birthYear);
  const d = p.deathYear === null ? null : (p.deathApprox ? 'בערך ' : '') + yearText(p.deathYear);
  return [b, d].filter(Boolean).join(' – ') || 'שנים לא ידועות';
}

/** ערי הידע: כמה גילויים נוצרו בכל עיר */
export function citiesRanking() {
  const m = new Map<string, { nameHe: string; nameFull: string; count: number; ids: string[] }>();
  for (const d of discoveries) {
    if (!d.place) continue;
    const c = d.place.city;
    const e = m.get(c.nameFull) || { ...c, count: 0, ids: [] };
    e.count++; e.ids.push(d.id); m.set(c.nameFull, e);
  }
  return [...m.values()].sort((a, b) => b.count - a.count || a.nameHe.localeCompare(b.nameHe, 'he'));
}

// ---- שלב 2: קשרים על פני כמה תחומים ----
export interface End { id: string; d: Discovery; viaPerson: boolean }
/** קצה של קשר כגילוי: גילוי ישיר, או הגילוי של הדמות שהכי קרוב בזמן לקצה השני */
function endAsDiscovery(id: string, otherYear: number | null, domains?: Set<string>): End | null {
  const d = discoveryById.get(id);
  if (d) return domains && !domains.has(d.domainId) ? null : { id, d, viaPerson: false };
  const options = discoveries.filter((x) => x.personIds.includes(id) && (!domains || domains.has(x.domainId)));
  if (!options.length) return null;
  const best = otherYear === null ? options[0] : options.reduce((a, b) => (Math.abs(b.yearFrom - otherYear) < Math.abs(a.yearFrom - otherYear) ? b : a));
  return { id, d: best, viaPerson: true };
}
const yearOf = (id: string) => discoveryById.get(id)?.yearFrom ?? null;
export function resolveLink(l: Link, domains?: Set<string>) {
  const a = endAsDiscovery(l.fromId, yearOf(l.toId) ?? discoveries.find((x) => x.personIds.includes(l.toId))?.yearFrom ?? null, domains);
  const b = endAsDiscovery(l.toId, a ? a.d.yearFrom : yearOf(l.fromId), domains);
  if (!a || !b) return null;
  return { link: l, a, b, cross: a.d.domainId !== b.d.domainId };
}
export const resolvedLinks = links.map((l) => resolveLink(l)).filter((r): r is NonNullable<ReturnType<typeof resolveLink>> => !!r);
export const crossLinks = resolvedLinks.filter((r) => r.cross);
export const linkTypeName: Record<LinkType, string> = { influenced: 'השפעה', enabled: 'איפשור', opposed: 'ערעור', parallel: 'מקביל' };
export const endName = (e: End) => (e.viaPerson ? personById.get(e.id)!.nameHe : e.d.title.split(':')[0]);

/** שם קצר לתווית: בלי תואר שאחרי פסיק ("מלך מאלי") ובלי מספר סידורי ("ה-4", "הראשון"). בדרך כלל שם המשפחה. */
const ORDINAL = /^(ה-?\d+|ה-?[IVX]+|ה(ראשון|ראשונה|שני|שנייה|שלישי|רביעי|חמישי|שישי|גדול|קדוש|זקן|צעיר))$/;
/** nameShort בנתונים גובר: בשמות סיניים וקוריאניים שם המשפחה בא קודם */
export function shortName(nameHe: string, nameShort?: string) {
  if (nameShort) return nameShort;
  const words = nameHe.split(',')[0].trim().split(/\s+/);
  while (words.length > 1 && ORDINAL.test(words[words.length - 1])) words.pop();
  return words[words.length - 1];
}
