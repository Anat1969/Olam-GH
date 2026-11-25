// ארבעה תוצרים, ארבעה מנגנוני חשיבה. המקור: Claude-GH, .claude/skills/anat-outputs/SKILL.md.
// לא תבניות עיצוב: כל סוג עושה עבודה מחשבתית אחרת, והעיצוב נגזר ממנה.
import outputsJson from '../../data/outputs.json';
import { discoveryById, links } from '../data';
import { mechanisms, openQuestions } from '../hidden/model';

export type Kind = 'story' | 'paper' | 'essay' | 'creation';
export type Level = 'fact' | 'interpretation' | 'hypothesis' | 'imagination';
export interface Block { level: Level; text: string; refs?: string[]; h?: string }
export interface Output {
  id: string; kind: Kind; chain: string; title: string; lead: string; derivedFrom: string | null; form?: string;
  blocks: Block[]; question: string; certainty?: 'established' | 'likely' | 'open'; transition: { to: Kind; why: string };
}
export interface KindDef {
  id: Kind; name: string; verb: string; mechanism: string; purpose: string; reader: string;
  process: string[]; structure: string[]; quality: string[]; prompt: string;
}

export const KINDS: KindDef[] = [
  {
    id: 'story', name: 'כתבה', verb: 'מספרת', mechanism: 'תחקיר', purpose: 'להנגיש ידע בסיפור שמעורר סקרנות.', reader: 'קוראת סקרנית, 5 דקות',
    process: ['בוחרים רגע אחד: גילוי, דמות או אירוע', 'אוספים עובדות מאומתות: מי, מה, מתי, איפה', 'בונים הקשר היסטורי ותרבותי', 'מחפשים פרט מפתיע', 'בודקים כל עובדה מול מקור'],
    structure: ['פתיחה בסצנה', 'השאלה שהיא מעוררת', '3 עד 5 פרקים לפי זמן', 'ההקשר', 'תובנה בשורה', 'שאלה פתוחה', 'מקורות'],
    quality: ['כל פרק נשען על עובדה עם מקור', 'יש סצנה, דמות, זמן ומקום', 'פרשנות מסומנת כפרשנות', 'מסתיימת בשאלה אמיתית'],
    prompt: 'כתוב כתבה בעברית. המנגנון: תחקיר שמספר סיפור. אסוף רק עובדות שיש להן מקור, וסדר אותן לפי זמן ומקום. מבנה: פתיחה בסצנה, השאלה שהיא מעוררת, 3 עד 5 פרקים לפי זמן, הקשר היסטורי ותרבותי, תובנה בשורה אחת, ושאלה פתוחה שהכתבה לא עונה עליה. סמן כל משפט שנושא טענה: [עובדה] עם מקור, [פרשנות], [השערה]. אורך: כ-5 דקות קריאה.',
  },
  {
    id: 'paper', name: 'מאמר', verb: 'מכריע', mechanism: 'ניתוח', purpose: 'לענות על שאלה ולומר כמה אפשר לסמוך על התשובה.', reader: 'קוראת חוקרת, 7 עד 10 דקות',
    process: ['מנסחים שאלה אחת או טענה שאפשר להפריך', 'אוספים מקורות, גם סותרים', 'משווים מה כל מקור אומר', 'מבקרים: הטיה, מדגם, תקופה', 'בוחנים סתירות', 'מכריעים עם מד ודאות'],
    structure: ['השאלה', 'למה היא חשובה', 'השיטה', 'הראיות', 'השוואה וביקורת', 'הסתירות', 'מסקנה ומד ודאות', 'גבולות ומה לא ידוע', 'מקורות'],
    quality: ['השאלה ניתנת לבדיקה', 'יש מקור שסותר או מסייג', 'המסקנה לא חזקה מהראיות', 'נאמר מה לא הוכח'],
    prompt: 'כתוב מאמר בעברית. המנגנון: ניתוח. אסוף מקורות, גם סותרים. השווה ביניהם, בקר כל אחד (הטיה, מדגם, תקופה), ובחן את הסתירות. מבנה: השאלה במשפט אחד, למה היא חשובה, השיטה, הראיות, השוואה וביקורת, הסתירות, מסקנה עם מד ודאות (מבוסס, סביר, לא מוכרע), גבולות המסקנה ומה עוד לא ידוע. סמן כל טענה: [עובדה] עם מקור, [פרשנות] עם מי מפרש, [השערה] עם איך בודקים. אל תכתוב מסקנה חזקה יותר מהראיות.',
  },
  {
    id: 'essay', name: 'מסה', verb: 'שואלת', mechanism: 'חקירה רעיונית', purpose: 'להעלות שאלה חדשה, טובה מזו שהתחילה.', reader: 'קוראת חושבת, 5 עד 8 דקות',
    process: ['בוחרים הנחת יסוד מקובלת', 'מחפשים את הדפוס בתחום רחוק', 'מניחים מקרים זה ליד זה', 'מערערים: מה אם ההפך?', 'לא סוגרים: מנסחים שאלה חדשה'],
    structure: ['הנחה', 'סדק', 'מסע בין תחומים', 'ערעור', 'שאלה חדשה', 'מה עובדה ומה מחשבה', 'מקורות'],
    quality: ['לפחות שני תחומים רחוקים', 'מנגנון משותף, לא רק דמיון', 'השאלה בסוף חדשה', 'אין מסקנה סגורה'],
    prompt: 'כתוב מסה בעברית. המנגנון: חקירה רעיונית פתוחה. מצא את אותו דפוס בשניים או שלושה תחומים רחוקים (למשל עיר, מוזיקה, גוף, משפט), זהה את המנגנון המשותף, וערער על הנחת היסוד. מבנה: הנחה, סדק, מסע בין התחומים, ערעור, שאלה חדשה במשפט אחד, ופסקה שמפרידה בין עובדה למחשבה. סמן: [עובדה] עם מקור, [פרשנות], [השערה]. אל תסגור במסקנה.',
  },
  {
    id: 'creation', name: 'יצירה', verb: 'ממציאה', mechanism: 'דמיון מבוסס', purpose: 'ליצור רעיון, עולם אפשרי, ניסוי מחשבתי או משמעות חדשה.', reader: 'במבט אחד, עד 2 דקות',
    process: ['בוחרים עובדה או מנגנון מאומת', 'משנים כלל אחד: "מה אם..."', 'בונים את העולם שנובע מהשינוי', 'בוחרים צורה', 'מצמידים את הבסיס עם מקור'],
    structure: ['הבסיס עם מקור', 'המהלך', 'היצירה, מסומנת כדמיון', 'מה היא מאירה', 'לאן זה מוביל'],
    quality: ['נקלטת במבט או בדקה', 'הבסיס אמיתי ומקושר', 'הדמיון עקבי עם הכלל שהשתנה', 'אין בלבול בין מה שקרה למה שהומצא'],
    prompt: 'צור יצירה בעברית. המנגנון: דמיון מבוסס. שנה כלל אחד ("מה אם..."), ובנה ממנו בעקביות עולם אפשרי, ניסוי מחשבתי או משמעות חדשה. מבנה: הבסיס עם מקור, המהלך במשפט אחד, היצירה (מסומנת [דמיון]), מה היא מאירה (פרשנות), ולאן זה יכול להוביל (השערה שאפשר לבדוק). אל תציג שום דבר שהומצא כעובדה.',
  },
];
export const kindById = new Map(KINDS.map((k) => [k.id, k]));
export const levelName: Record<Level, string> = { fact: 'עובדה', interpretation: 'פרשנות', hypothesis: 'השערה', imagination: 'דמיון' };
export const certaintyName = { established: 'מבוסס', likely: 'סביר', open: 'לא מוכרע' } as const;

export const outputs = outputsJson.outputs as unknown as Output[];
export const outputById = new Map(outputs.map((o) => [o.id, o]));
export const childrenOf = (id: string) => outputs.filter((o) => o.derivedFrom === id);

/** מקור של עובדה: גילוי או קשר מאומת, דוגמה חיצונית מאומתת או שאלה פתוחה מאומתת */
const linkIds = new Set(links.map((l) => l.id));
const extById = new Map(mechanisms.flatMap((m) => m.external.map((x) => [x.id, x] as const)));
const openById = new Map(openQuestions.map((q) => [q.id, q]));
export function refKind(id: string): 'discovery' | 'link' | 'external' | 'open' | null {
  if (discoveryById.has(id)) return 'discovery';
  if (linkIds.has(id)) return 'link';
  if (extById.has(id)) return 'external';
  if (openById.has(id)) return 'open';
  return null;
}
export const externalRef = (id: string) => extById.get(id) || null;

/** פרומפט ל-Claude: הסוג, המנגנון, והחומר שממנו כותבים (תוצר קודם, או טקסט חופשי עם ראיות) */
export function buildOutputPrompt(kind: Kind, material: { from?: Output; text?: string; evidence?: string[] }) {
  const k = kindById.get(kind)!;
  const parts = [k.prompt];
  if (material.from) {
    const f = material.from;
    parts.push(`התוצר הזה מתפתח מ${kindById.get(f.kind)!.name}: "${f.title}". השאלה שהיא השאירה: ${f.question}`);
    parts.push(`החומר מהתוצר הקודם, עם רמות הידע שלו:\n${f.blocks.map((b) => `- [${levelName[b.level]}] ${b.text.replace(/\*\*|==/g, '')}`).join('\n')}`);
    parts.push('שמור על המקורות של התוצר הקודם, וציין בראש התוצר החדש ממה הוא התפתח.');
  }
  if (material.text) parts.push(`החומר:\n${material.text}`);
  if (material.evidence?.length) parts.push(`מזהי הראיות באטלס "עולם נעלם": ${material.evidence.join(', ')}`);
  parts.push('כתוב בעברית. הפרד בבירור בין עובדה מבוססת, פרשנות, השערה ודמיון.');
  return parts.join('\n\n');
}
