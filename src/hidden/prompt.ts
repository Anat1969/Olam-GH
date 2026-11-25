// "שלח ל-Claude": פרומפט מוכן שמעביר את הכרטיס, הראיות ושרשרת המחקר, יחד עם כללי האמינות של האטלס.
// הבינה היא שותפה לבחינה, לא מקור: היא מתבקשת להפריד בין עובדה, פרשנות והשערה, ולתת מקור לכל עובדה.
import { discoveryById, links, yearText } from '../data';
import { mechById, domName, plain, who } from './model';
import type { Card } from './engine';
import { verdictName, type Note } from './notebook';

const linkById = new Map(links.map((l) => [l.id, l]));
function evidenceLine(id: string) {
  const d = discoveryById.get(id);
  if (d) return `- ${plain(d.title)} (${who(d)}, ${yearText(d.yearFrom)}, ${domName(d.domainId)}): ${plain(d.novelty || d.contribution)}`;
  const l = linkById.get(id);
  return l ? `- קשר ${l.id}: ${plain(l.explanation)}` : '';
}

export function buildPrompt(card: Card, chain: Note[] = []): string {
  const m = mechById.get(card.mech)!;
  const past = chain.filter((n) => n.key !== card.key).map((n, i) => `${i + 1}. ${n.question}\n   השערה: ${n.hypothesis}${n.result ? `\n   בחינה: ${verdictName[n.result.verdict]}. ${n.result.note}` : ''}${n.insight ? `\n   תובנה: ${n.insight}` : ''}`);
  return [
    'אני חוקרת באטלס "עולם נעלם ומציאות מצויה", שבו כל גילוי מאומת בציטוט מילולי מהמקור.',
    `המנגנון: ${m.name}. ${plain(m.understanding)}`,
    past.length ? `שרשרת המחקר עד כה:\n${past.join('\n')}` : '',
    `השאלה: ${card.question}`,
    `ההשערה (גילוי אפשרי, טרם נבדק): ${card.hypothesis}`,
    `הראיות מהאטלס:\n${card.evidence.map(evidenceLine).filter(Boolean).join('\n')}`,
    `דרך הבחינה המוצעת: ${m.test}`,
    'בקשה:',
    '1. בחן את ההשערה. הפרד בבירור בין עובדה מתועדת, פרשנות מקובלת והשערה.',
    '2. לכל עובדה תן מקור עם כותרת וקישור, ועדיף ציטוט מילולי. אם אין מקור, כתוב שאין.',
    '3. הבא דוגמה אחת שתומכת ודוגמה אחת שסותרת.',
    '4. הצע שאלה אחת חדשה, שנובעת מהבחינה, להמשך השרשרת.',
    'כתוב בעברית, בקצרה.',
  ].filter(Boolean).join('\n\n');
}
export const claudeUrl = (prompt: string) => `https://claude.ai/new?q=${encodeURIComponent(prompt)}`;
