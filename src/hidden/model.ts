// שכבת "הנעלם": מנגנוני הגילוי, תובנות מסדר שני ושאלות פתוחות.
// הטקסט ב-data/ הוא מסגור. כל עובדה מגיעה מגילוי או קשר מאומת, או מציטוט חיצוני שנבדק מילה במילה (npm run verify:hidden).
import mechJson from '../../data/mechanisms.json';
import openJson from '../../data/open-questions.json';
import insightJson from '../../data/insights.json';
import { discoveryById, links, personById, domainById, type Discovery, type Link } from '../data';

export interface ExtEvidence { quote: string; quoteHe: string }
export interface External {
  id: string; title: string; year: number | null; text: string; domains: string[];
  source: { title: string; url: string }; evidence: ExtEvidence[]; verified: boolean; verifiedAt: string | null;
}
export interface Mechanism {
  id: string; name: string; short: string; family: string; understanding: string; steps: string[]; test: string;
  examples: string[]; counter: { ids: string[]; text: string }; external: External[];
}
export interface OpenQuestion {
  id: string; domains: string[]; question: string; text: string; source: { title: string; url: string };
  evidence: ExtEvidence[]; mechanisms: string[]; verified: boolean;
}
export interface InsightDef { id: string; mechanism: string; lead: string; understanding: string; caveat: string }

/** רק דוגמאות חיצוניות ושאלות שהציטוט שלהן נמצא במקור */
export const mechanisms = (mechJson.mechanisms as unknown as Mechanism[]).map((m) => ({ ...m, external: m.external.filter((x) => x.verified) }));
export const mechById = new Map(mechanisms.map((m) => [m.id, m]));
export const openQuestions = (openJson.questions as unknown as OpenQuestion[]).filter((q) => q.verified);
export const insightDefs = insightJson.insights as unknown as InsightDef[];

const linkById = new Map(links.map((l) => [l.id, l]));
export type Ref = { kind: 'discovery'; id: string; d: Discovery } | { kind: 'link'; id: string; l: Link };
/** מזהה של גילוי או קשר, אחרי סינון למאומתים בלבד */
export function ref(id: string): Ref | null {
  const d = discoveryById.get(id);
  if (d) return { kind: 'discovery', id, d };
  const l = linkById.get(id);
  return l ? { kind: 'link', id, l } : null;
}
export const nameOf = (id: string) => personById.get(id)?.nameHe || discoveryById.get(id)?.title.split(':')[0] || id;
export const domName = (id: string) => domainById.get(id)?.nameHe || id;
/** טקסט בלי סימוני הדגשה, לשימוש בתוך משפט חדש */
export const plain = (s = '') => s.replace(/\*\*|==/g, '');
export const who = (d: Discovery) => d.personIds.map((p) => personById.get(p)?.nameHe).filter(Boolean).join(' ו') || 'יוצר לא ידוע';
export const short = (d: Discovery) => d.title.split(':')[0];

/** רמות הידע בשכבה: שלוש של האטלס, ורביעית חדשה, גילוי אפשרי שעוד מחייב אימות */
export type Level = 'documented' | 'interpretive' | 'hypothesis' | 'possible';
export const levelName: Record<Level, string> = { documented: 'ידע מבוסס', interpretive: 'פרשנות', hypothesis: 'השערה', possible: 'גילוי אפשרי' };
