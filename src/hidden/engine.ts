// מנוע הגילוי: כל מנגנון הוא אופרטור שמופעל על יעד (תחום, או צומת במחברת) ומחזיר כרטיסי "גילוי אפשרי".
// המנוע לא ממציא עובדות: כל משפט בנוי מגילויים וקשרים מאומתים, וכל כרטיס מצביע על הראיות שממנו נגזר.
// השאלה וההשערה הן שלו, ומסומנות "גילוי אפשרי, מחייב אימות". אותו seed נותן אותה תוצאה.
import { activeDomains, discoveries, discoveryById, domainById, resolvedLinks, yearText, linkTypeName, type Discovery } from '../data';
import { cityOf } from '../geo';
import { degree, domainMatrix, simultaneousCandidates } from './metrics';
import { mechById, domName, plain, short, who } from './model';

export interface Target { domainId: string; focus: string[]; label: string; parent?: string }
export interface Card {
  key: string; mech: string; question: string; hypothesis: string; test: string;
  evidence: string[]; basis: string; domainId: string;
}
export interface RunResult { cards: Card[]; empty?: string }

const inDomain = (id: string) => discoveries.filter((d) => d.domainId === id);
const byDegree = (ds: Discovery[]) => [...ds].sort((a, b) => (degree.get(b.id) || 0) - (degree.get(a.id) || 0) || a.yearFrom - b.yearFrom);
const yr = (d: Discovery) => yearText(d.yearFrom);
/** "X, ולא Y" או "בלי Y": ה-Y הוא ההנחה שנשברה */
export function droppedAssumption(d: Discovery): string | null {
  const t = plain(d.novelty || '');
  const m = t.match(/(?:,\s*)?(?:ולא|בלי)\s+([^.,]+)/);
  return m ? m[1].trim() : null;
}
const subName = (domainId: string, sub?: string) => domainById.get(domainId)?.subs?.find((s) => s.id === sub)?.nameHe || '';
/** גילויי המיקוד של היעד: מהצומת במחברת אם יש, אחרת מהתחום */
function focusOf(t: Target): Discovery[] {
  const f = t.focus.map((id) => discoveryById.get(id)).filter((d): d is Discovery => !!d);
  return f.length ? f : byDegree(inDomain(t.domainId));
}
/** סיבוב דטרמיניסטי של רשימה לפי seed, ובחירת n ראשונים */
function rotate<T>(xs: T[], seed: number, n = 3): T[] {
  if (!xs.length) return [];
  const k = ((seed % xs.length) + xs.length) % xs.length;
  return [...xs.slice(k), ...xs.slice(0, k)].slice(0, n);
}

type Op = (t: Target, seed: number) => Omit<Card, 'key' | 'mech' | 'test' | 'domainId'>[] | string;

const OPS: Record<string, Op> = {
  'axiom-break': (t, seed) => {
    const donors = byDegree(discoveries.filter((d) => droppedAssumption(d) && d.domainId !== t.domainId));
    const own = focusOf(t).filter((d) => d.novelty).slice(0, 12);
    if (!own.length) return 'אין בתחום גילויים עם חידוש מנוסח.';
    return rotate(own, seed).map((d, i) => {
      const donor = rotate(donors, seed + i * 7, 1)[0];
      const y = droppedAssumption(donor)!;
      return {
        question: `איזו הנחה שקופה מחזיקה את "${short(d)}", ומה יקרה אם נוותר עליה?`,
        hypothesis: `ב${domName(donor.domainId)} ויתרו פעם על "${y}" (${short(donor)}, ${yr(donor)}). השערה: גם החידוש "${plain(d.novelty)}" נשען על הנחה שאפשר להפוך, והיפוך שלה ב${domName(d.domainId)} יפתח מודל חדש.`,
        evidence: [donor.id, d.id], basis: `ההנחה שנשברה: "${y}"`,
      };
    });
  },
  'how-to-why': (t, seed) => {
    const all = focusOf(t);
    const open = all.filter((d) => !resolvedLinks.some((r) => r.a.d.id === d.id && r.b.d.yearFrom > d.yearFrom));
    const pick = rotate(open.length ? open : all, seed);
    if (!pick.length) return 'אין גילויים בתחום.';
    return pick.map((d) => ({
      question: `"${short(d)}" תיאר מה קורה. מי שאל, או ישאל, למה?`,
      hypothesis: `באטלס אין ל${short(d)} (${who(d)}, ${yr(d)}) המשך מאוחר שמסביר אותו. או שההסבר קיים ועוד לא נרשם, וזה חור בנתונים, או שה"למה" עדיין פתוח, וזה חור בידע.`,
      evidence: [d.id, 'l-1'], basis: open.includes(d) ? 'גילוי בלי קשר יוצא, כמו קפלר לפני ניוטון' : 'גילוי מרכזי בתחום',
    }));
  },
  transfer: (t, seed) => {
    const { ids, counts } = domainMatrix();
    const ti = ids.indexOf(t.domainId);
    const donors = ids.filter((id, i) => i !== ti && ti >= 0 && !counts[ti][i]);
    const pool = donors.length ? donors : ids.filter((id) => id !== t.domainId);
    const target = focusOf(t)[0];
    return rotate(pool, seed).map((dom) => {
      const src = byDegree(inDomain(dom))[0];
      return {
        question: `איך נראה "${short(src)}" כשמעבירים אותו אל ${domName(t.domainId)}?`,
        hypothesis: `${donors.includes(dom) ? `בין ${domName(dom)} ל${domName(t.domainId)} אין עדיין אף קשר מתועד באטלס. ` : ''}המבנה של ${short(src)}: "${plain(src.novelty || src.contribution)}". השערה: יש לו מקבילה ב${domName(t.domainId)}${target ? `, אולי סביב ${short(target)}` : ''}, שעוד לא זוהתה או לא נרשמה.`,
        evidence: [src.id, ...(target ? [target.id] : [])], basis: donors.includes(dom) ? 'צירוף תחומים ריק במטריצה' : 'העברה מתחום שכבר מחובר',
      };
    });
  },
  instrument: (t, seed) => {
    const ins = (mechById.get('instrument')!.examples).map((id) => discoveryById.get(id)).filter((d): d is Discovery => !!d);
    const dom = domainById.get(t.domainId);
    const thin = (dom?.subs || []).map((s) => ({ s, n: inDomain(t.domainId).filter((d) => d.sub === s.id).length })).sort((a, b) => a.n - b.n);
    return rotate(ins, seed).map((m, i) => {
      const s = thin[i % Math.max(1, thin.length)];
      return {
        question: `מה ה"${short(m)}" של ${domName(t.domainId)}: איזה כלי יראה את מה שהיה שם תמיד?`,
        hypothesis: `${short(m)} (${yr(m)}) הרחיב חוש והראה עולם שלם. השערה: ב${domName(t.domainId)}${s ? `, ובמיוחד ב${s.s.nameHe} (${s.n} גילויים באטלס)` : ''}, יש תופעה שלא נראית רק כי עוד אין כלי שמודד אותה.`,
        evidence: [m.id], basis: 'מכשיר שהרחיב חוש בתחום אחר',
      };
    });
  },
  'measure-to-product': (t, seed) => {
    const ex = (mechById.get('measure-to-product')!.examples).map((id) => discoveryById.get(id)).filter((d): d is Discovery => !!d);
    const own = focusOf(t);
    return rotate(ex, seed).map((m, i) => {
      const d = own[i % Math.max(1, own.length)];
      return {
        question: `מה ${domName(t.domainId)} מודד היום, ומה המדידה הזאת כבר משנה?`,
        hypothesis: `${short(m)} (${yr(m)}) התחיל כמדידה והפך לכלי שמשנה את מה שהוא מודד. השערה: ${d ? `גם סביב "${short(d)}" ` : ''}יש ב${domName(t.domainId)} כלי מדידה שהפך למוצר, וכדאי לבדוק מה הוא משנה בתופעה עצמה.`,
        evidence: [m.id, ...(d ? [d.id] : [])], basis: 'מדידה שהפכה למוצר בתחום אחר',
      };
    });
  },
  'body-instrument': (t, seed) => {
    const ex = (mechById.get('body-instrument')!.examples).map((id) => discoveryById.get(id)).filter((d): d is Discovery => !!d);
    return rotate(focusOf(t), seed).map((d, i) => {
      const m = rotate(ex, seed + i, 1)[0];
      return {
        question: `מה "${short(d)}" מגלה על הצופה, ולא רק על העולם?`,
        hypothesis: `${short(m)} (${yr(m)}) גילה חוק של הראייה או של הגוף, לא רק של העולם. השערה: ${short(d)} (${who(d)}, ${yr(d)}) תלוי גם בחוש, בגוף או בנקודת המבט של מי שגילה אותו, ושינוי שלהם ישנה את התוצאה.`,
        evidence: [m.id, d.id], basis: 'האדם כמכשיר מדידה',
      };
    });
  },
  coexist: (t, seed) => {
    const ids = new Set(t.focus);
    const opp = resolvedLinks.filter((r) => r.link.type === 'opposed' || r.link.type === 'parallel');
    const mine = opp.filter((r) => ids.size ? ids.has(r.a.d.id) || ids.has(r.b.d.id) || ids.has(r.link.id) : r.a.d.domainId === t.domainId || r.b.d.domainId === t.domainId);
    const pool = mine.length ? mine : opp.filter((r) => r.link.type === 'opposed');
    return rotate(pool, seed).map((r) => ({
      question: `האם "${short(r.a.d)}" ו"${short(r.b.d)}" נכונים שניהם, כל אחד בתנאי אחר?`,
      hypothesis: `הקשר ביניהם מתועד כ${linkTypeName[r.link.type]}: "${plain(r.link.explanation.split('==')[1] || r.link.explanation)}". השערה: יש תנאי שבו הראשון נכון ותנאי שבו השני נכון, ומסגרת אחת יכולה להכיל את שניהם.${mine.length ? '' : ` (אין סתירה מתועדת ב${domName(t.domainId)}, וזו דוגמה מתחום אחר.)`}`,
      evidence: [r.link.id, r.a.d.id, r.b.d.id], basis: `קשר מסוג ${linkTypeName[r.link.type]}`,
    }));
  },
  'alternative-reality': (t, seed) => rotate(focusOf(t), seed).map((d) => ({
    question: `איך נראה עולם שלם שבו "${plain(d.novelty || d.title)}" לא נכון?`,
    hypothesis: `כמו לובצ׳בסקי, שבנה גאומטריה שלמה על היפוך של אקסיומה אחת, אפשר לבנות ${domName(d.domainId)} חלופית שבה ${short(d)} (${yr(d)}) מתהפך. השערה: העולם הזה עקבי, ולפחות אחת מההשלכות שלו פוגשת תופעה אמיתית.`,
    evidence: ['d-1829-lobachevsky-geometry', d.id], basis: 'היפוך של גילוי מרכזי לעולם שלם',
  })),
  unification: (t, seed) => {
    const ds = inDomain(t.domainId);
    const subs = [...new Set(ds.map((d) => d.sub).filter(Boolean))] as string[];
    const linked = (a: string, b: string) => resolvedLinks.some((r) => (r.a.d.sub === a && r.b.d.sub === b) || (r.a.d.sub === b && r.b.d.sub === a));
    const pairs: [string, string][] = [];
    for (let i = 0; i < subs.length; i++) for (let j = i + 1; j < subs.length; j++) if (!linked(subs[i], subs[j])) pairs.push([subs[i], subs[j]]);
    if (!pairs.length) return `כל תתי התחומים ב${domName(t.domainId)} כבר מחוברים זה לזה באטלס.`;
    return rotate(pairs, seed).map(([a, b]) => {
      const da = byDegree(ds.filter((d) => d.sub === a))[0], db = byDegree(ds.filter((d) => d.sub === b))[0];
      return {
        question: `מה המושג האחד שמשותף ל${subName(t.domainId, a)} ול${subName(t.domainId, b)}?`,
        hypothesis: `באטלס אין אף קשר בין ${subName(t.domainId, a)} ל${subName(t.domainId, b)}. כמו האנרגיה של הלמהולץ, שאיחדה תופעות שנראו נפרדות, השערה: יש מושג אחד שמופיע ב"${short(da)}" וב"${short(db)}" בשמות שונים.`,
        evidence: [da.id, db.id, 'd-1847-helmholtz-energy'], basis: 'שני תתי תחום בלי גשר',
      };
    });
  },
  'city-reactor': (t, seed) => {
    const linked = new Set(resolvedLinks.flatMap((r) => [`${r.a.d.id}|${r.b.d.id}`, `${r.b.d.id}|${r.a.d.id}`]));
    const pairs: [Discovery, Discovery][] = [];
    for (const a of focusOf(t)) {
      const c = cityOf.get(a.id);
      if (!c) continue;
      for (const b of c.items) if (b.domainId !== a.domainId && Math.abs(b.yearFrom - a.yearFrom) <= 25 && !linked.has(`${a.id}|${b.id}`)) pairs.push([a, b]);
    }
    if (!pairs.length) return `אין ב${domName(t.domainId)} גילוי שחלק עיר ודור עם גילוי מתחום אחר.`;
    return rotate(pairs, seed).map(([a, b]) => ({
      question: `האם ${who(a)} ו${who(b)} נפגשו ב${cityOf.get(a.id)!.nameHe}?`,
      hypothesis: `${short(a)} (${domName(a.domainId)}, ${yr(a)}) ו${short(b)} (${domName(b.domainId)}, ${yr(b)}) נוצרו באותה עיר ובאותו דור, ואין ביניהם קשר באטלס. השערה: היה ביניהם מגע, או סביבה משותפת שהזינה את שניהם.`,
      evidence: [a.id, b.id], basis: `עיר משותפת: ${cityOf.get(a.id)!.nameHe}`,
    }));
  },
  limit: (t, seed) => rotate(focusOf(t), seed).map((d, i) => {
    const m = rotate(['d-1931-godel-incompleteness', 'd-1936-turing-machine', 'd-1921-wittgenstein-tractatus'], seed + i, 1)[0];
    const md = discoveryById.get(m)!;
    return {
      question: `מה ${domName(d.domainId)} לא יכול לדעת, באופן עקרוני, על "${short(d)}"?`,
      hypothesis: `${short(md)} (${yr(md)}) הוכיח גבול, ולא רק נכשל. השערה: ל${short(d)} יש גבול עקרוני דומה, שאלה שהתחום לא יכול להכריע בכלים שלו, וניסוח מדויק שלה הוא עצמו גילוי.`,
      evidence: [m, d.id], basis: 'גבול מוכח בתחום אחר',
    };
  }),
  simultaneous: (t, seed) => {
    const ids = new Set(t.focus);
    const all = simultaneousCandidates();
    const mine = all.filter(([a, b]) => (ids.size ? ids.has(a.id) || ids.has(b.id) : a.domainId === t.domainId));
    if (!mine.length) return `לא נמצאו ב${domName(t.domainId)} שני גילויים באותו תת-תחום, בשנים קרובות ובערים שונות.`;
    return rotate(mine, seed).map(([a, b]) => ({
      question: `האם "${short(a)}" ו"${short(b)}" הם גילוי כפול?`,
      hypothesis: `${who(a)} ב${cityOf.get(a.id)!.nameHe} (${yr(a)}) ו${who(b)} ב${cityOf.get(b.id)!.nameHe} (${yr(b)}), באותו תת-תחום, ${subName(a.domainId, a.sub)}, בלי קשר מתועד. השערה: הם עונים על אותה שאלה, כי התקופה הבשילה אותה.`,
      evidence: [a.id, b.id, 'l-42'], basis: 'שנים קרובות, ערים שונות, אותו תת-תחום',
    }));
  },
  serendipity: (t, seed) => {
    const ex = (mechById.get('serendipity')!.examples).map((id) => discoveryById.get(id)).filter((d): d is Discovery => !!d);
    return rotate(focusOf(t), seed).map((d, i) => {
      const m = rotate(ex, seed + i, 1)[0];
      return {
        question: `איזו "תקלה" סביב "${short(d)}" מחכה שמישהו יבחין בה?`,
        hypothesis: `${short(m)} (${yr(m)}) התחיל בתוצאה לא צפויה שמישהו לא זרק. השערה: גם ב${domName(d.domainId)}, ליד ${short(d)}, יש חריגה שתועדה כ"כישלון" ושווה לחזור עליה בכוונה.`,
        evidence: [m.id, d.id], basis: 'תקלה שהפכה לגילוי',
      };
    });
  },
  hole: (t, seed) => {
    const ds = inDomain(t.domainId).filter((d) => d.yearFrom >= -800);
    const gaps: { a: Discovery; b: Discovery; n: number }[] = [];
    for (let i = 1; i < ds.length; i++) gaps.push({ a: ds[i - 1], b: ds[i], n: ds[i].yearFrom - ds[i - 1].yearFrom });
    gaps.sort((p, q) => q.n - p.n);
    if (!gaps.length) return 'אין מספיק גילויים בתחום כדי למצוא חור.';
    return rotate(gaps.slice(0, 6), seed).map((g) => ({
      question: `מה קרה ב${domName(t.domainId)} בין ${yr(g.a)} ל-${yr(g.b)}?`,
      hypothesis: `באטלס אין אף גילוי ב${domName(t.domainId)} במשך ${g.n} שנה, בין ${short(g.a)} ל${short(g.b)}. או שזה חור בנתונים, כי המקורות באנגלית רואים בעיקר את אירופה, או תקופה שבה הידע עבר בעל פה ולא תועד.`,
      evidence: [g.a.id, g.b.id], basis: `חור של ${g.n} שנה בשכבה`,
    }));
  },
};

/** הפעלת מנגנון על יעד. seed מסובב את הבחירה, כך ש"ערבב" נותן כרטיסים אחרים */
export function run(mechId: string, target: Target, seed = 0): RunResult {
  const op = OPS[mechId], m = mechById.get(mechId);
  if (!op || !m) return { cards: [], empty: 'מנגנון לא מוכר.' };
  const out = op(target, seed);
  if (typeof out === 'string') return { cards: [], empty: out };
  return {
    cards: out.map((c, i) => ({ ...c, key: `${mechId}:${target.domainId}:${target.parent || ''}:${seed}:${i}`, mech: mechId, test: m.test, domainId: target.domainId })),
  };
}
export const operatorIds = Object.keys(OPS);
export const domainTarget = (id: string): Target => ({ domainId: id, focus: [], label: domName(id) });
export const defaultDomain = activeDomains[0]?.id || 'physics';
