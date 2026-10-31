// שלב 4: גרף דמויות. צומת = דמות, קו = קשר מאומת בין הגילויים או הדמויות שלהן.
import cutsJson from '../data/cuts.json';
import { type Confidence, type LinkType, type Person, discoveries, persons, resolvedLinks } from './data';
import { cityOf } from './geo';

export interface Edge {
  key: string; linkId: string; source: string; target: string; type: LinkType; confidence: Confidence;
  cross: boolean; years: [number, number]; domains: [string, string];
}
export interface Cut { id: string; title: string; lead: string; params: Record<string, string> }
export const cuts = cutsJson.cuts as unknown as Cut[];

/** כל קשר מתורגם לקווים בין דמויות. גילוי עם שתי דמויות (פסקל ופרמה) נותן קו לכל אחת. */
export const allEdges: Edge[] = resolvedLinks.flatMap((r) => {
  const from = r.a.viaPerson ? [r.a.id] : r.a.d.personIds;
  const to = r.b.viaPerson ? [r.b.id] : r.b.d.personIds;
  return from.flatMap((s) => to.filter((t) => t !== s).map((t) => ({
    key: `${r.link.id}:${s}:${t}`, linkId: r.link.id, source: s, target: t, type: r.link.type, confidence: r.link.confidence,
    cross: r.cross, years: [r.a.d.yearFrom, r.b.d.yearFrom] as [number, number], domains: [r.a.d.domainId, r.b.d.domainId] as [string, string],
  })));
});

export interface Filters {
  domains: Set<string>; from: number; to: number; city?: string;
  hiddenTypes: Set<string>; hiddenConf: Set<string>; crossOnly: boolean; hideIsolated: boolean;
}

export interface GNode { id: string; person: Person; year: number; domain: string; degree: number; context: boolean }

/** מסננים: דמות נכללת אם יש לה גילוי בתחום ובתקופה (ובעיר, אם נבחרה). קו נכלל אם שני הקצוות שלו עומדים בתנאים. */
export function applyFilters(f: Filters) {
  const inScope = (d: (typeof discoveries)[number]) => f.domains.has(d.domainId) && d.yearFrom >= f.from && d.yearFrom <= f.to;
  const core = new Set<string>();
  for (const d of discoveries) {
    if (!inScope(d)) continue;
    if (f.city && cityOf.get(d.id)?.key !== f.city) continue;
    d.personIds.forEach((p) => core.add(p));
  }
  const edges = allEdges.filter((e) =>
    !f.hiddenTypes.has(e.type) && !f.hiddenConf.has(e.confidence) && (!f.crossOnly || e.cross) &&
    e.domains.every((d) => f.domains.has(d)) && e.years.every((y) => y >= f.from && y <= f.to) &&
    (f.city ? core.has(e.source) || core.has(e.target) : core.has(e.source) && core.has(e.target)));
  // בעיר שנבחרה מצרפים גם את השכנים, כהקשר
  const ids = new Set(core);
  edges.forEach((e) => { ids.add(e.source); ids.add(e.target); });
  const degree = new Map<string, number>();
  edges.forEach((e) => { degree.set(e.source, (degree.get(e.source) || 0) + 1); degree.set(e.target, (degree.get(e.target) || 0) + 1); });
  const nodes: GNode[] = persons.filter((p) => ids.has(p.id)).map((p) => {
    const own = discoveries.filter((d) => d.personIds.includes(p.id) && f.domains.has(d.domainId));
    const any = own.length ? own : discoveries.filter((d) => d.personIds.includes(p.id));
    const doms = new Set(any.map((d) => d.domainId));
    return { id: p.id, person: p, year: any[0]?.yearFrom ?? p.birthYear ?? 0, domain: doms.size > 1 ? 'mixed' : [...doms][0], degree: degree.get(p.id) || 0, context: !core.has(p.id) };
  }).filter((n) => !(f.hideIsolated && n.degree === 0));
  return { nodes, edges };
}
