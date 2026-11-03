// מפיק את public/creations.json מתוך הנתונים של האפליקציה (תקן "יצירות", AppOfApp-GH/docs/creations-standard.md).
// הרצה: node tools/creations.mjs
// כל עובדה, ציטוט ומקור נלקחים מ-data/ (גילויים, קשרים, חיתוכים ומקורות מאומתים). בקוד כתובים רק המסגור:
// שם החדר, תוויות, וההייקו (שכבה יוצרת שמנסחת מחדש עובדה שכבר יש לה מקור).
// תמונות: workImage של הגילוי (ויקישיתוף, עם רישיון). חסרה תמונה מקומית? היא יורדת ל-public/creations/img.
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const read = (f) => JSON.parse(fs.readFileSync(path.join('data', f), 'utf8'));
const DISC = Object.fromEntries(read('discoveries.json').discoveries.filter((d) => d.verified).map((d) => [d.id, d]));
const LINK = Object.fromEntries(read('links.json').links.filter((l) => l.verified).map((l) => [l.id, l]));
const CUT = Object.fromEntries(read('cuts.json').cuts.map((c) => [c.id, c]));
const SRC = Object.fromEntries(read('sources.json').sources.map((s) => [s.id, s]));
const PERS = Object.fromEntries(read('persons.json').persons.map((p) => [p.id, p]));

const must = (map, id, kind) => { if (!map[id]) throw new Error(`${kind} לא נמצא או לא מאומת: ${id}`); return map[id]; };
const d = (id) => must(DISC, id, 'גילוי');
const l = (id) => must(LINK, id, 'קשר');
const year = (x) => (x.yearFrom < 0 ? `${-x.yearFrom} לפנה״ס` : x.yearFrom === x.yearTo || !x.yearTo ? String(x.yearFrom) : `${x.yearFrom}–${x.yearTo}`);
const who = (x) => x.personIds.map((p) => PERS[p]?.nameHe).filter(Boolean).join(' ו');
const where = (x) => x.place?.city?.nameHe || x.place?.nameHe || '';
// "==שורה.== הסבר" בקשר: השורה היא כותרת התובנה, והשאר הוא ההסבר
const split = (expl) => { const m = expl.match(/^==(.+?)==\s*(.*)$/s); return m ? [m[1], m[2]] : [expl, '']; };
const cite = (ev) => `${SRC[ev.sourceId]?.title || ev.sourceId} · תרגום מהמקור`;
const quoteOf = (ev, whoName) => ({ style: 'quote', quote: ev.quoteHe, who: whoName, cite: cite(ev) });

// תמונה: עותק מקומי של workImage (רוחב 1280 כשאפשר), עם קרדיט ורישיון
const IMG_DIR = 'public/creations/img';
const needImg = [];
const image = (id) => {
  const w = d(id).workImage;
  if (!w?.url || !w.license) return {};
  const file = `${id}.jpg`;
  needImg.push({ file, url: w.url });
  return { image: `creations/img/${file}`, credit: `${w.article} · ${w.credit}, ${w.license}. ויקישיתוף` };
};

const T = (id, zone, title, sub, creations, kicker) => ({ id, zone, title, sub, room: `olam-${id}`, creations: creations.map((c, i) => ({ id: c.id || c.style, kicker: c.kicker || kicker, ...c })) });

const topics = [];

// 1. ידע: המהפכה המדעית (חיתוך מוכן בגרף)
{
  const c = CUT.revolution, ids = ['d-1543-copernicus-revolutionibus', 'd-1609-kepler-orbits', 'd-1610-galileo-sidereus', 'd-1687-newton-principia'];
  const g = d('d-1610-galileo-sidereus'), n = d('d-1687-newton-principia');
  topics.push(T('revolution', 'ידע', c.title, c.lead, [
    { style: 'poster', title: g.title, text: g.novelty, ...image(g.id), pos: 'center 30%' },
    { style: 'insight', title: '150 שנה שבהן השמים הפכו לחוק', text: `ארבעה ספרים, ${year(d(ids[0]))} עד ${year(n)}: ==מתצפית אל חוק אחד.==` },
    quoteOf(l('l-4').evidence[0], 'גלילאו וקופרניקוס'),
    { style: 'haiku', lines: ['שמש במרכז', 'אליפסה של מאדים', 'תפוח שנופל'], text: 'מה ההייקו מאיר: **ארבעה ספרים** הפכו את השמים ל**חוק אחד**.' },
    { style: 'essay', title: 'ארבעה ספרים ששינו את השמים', text: c.lead, ...image(n.id), body: ids.map((x) => `**${year(d(x))}, ${where(d(x))}.** ${d(x).contribution}`) },
    { style: 'post', title: c.title, text: [...ids.map((x) => `${year(d(x))}: ${d(x).novelty}`), 'מתצפית לחוק.'].join('\n'), tags: ['עולם_נעלם', 'מהפכה_מדעית', 'תולדות_המדע'] },
  ], 'המהפכה המדעית'));
}

// 2. ידע: מהמזרח למערב
{
  const c = CUT['east-west'], al = d('d-1011-alhazen-optics'), kh = d('d-820-khwarizmi-algebra'), eu = d('d-bce300-euclid-elements');
  const [l5t, l5x] = split(l('l-5').explanation);
  topics.push(T('east-west', 'ידע', c.title, c.lead, [
    { style: 'veil', title: al.title, text: al.contribution, ...image(al.id), pos: 'center 20%' },
    quoteOf(al.evidence[0], 'אבן אל-היית׳ם, קהיר'),
    { style: 'gradient', title: l5t, text: l5x },
    { style: 'haiku', lines: ['קרן מאלכסנדריה', 'נכנסת לעין בקהיר', 'ונוחתת בפראג'], text: 'מה ההייקו מאיר: מ**אלכסנדריה** דרך **קהיר** אל **פראג**, ידע שעבר בין ערים ושפות.' },
    { style: 'post', title: c.title, text: [`${where(eu)}: ${eu.novelty}`, `${where(kh)}, ${year(kh)}: ${kh.novelty}`, `${where(al)}, ${year(al)}: ${al.novelty}`, l('l-5').application].join('\n'), tags: ['עולם_נעלם', 'בגדאד', 'קהיר'] },
  ], 'מהמזרח למערב'));
}

// 3. הבנה: מקפלר לניוטון, איך ולמה
{
  const k = d('d-1619-kepler-third'), n = d('d-1687-newton-principia'), L = l('l-1');
  const [t, x] = split(L.explanation);
  topics.push(T('kepler-newton', 'הבנה', 'מקפלר לניוטון: איך ולמה', t, [
    { style: 'fromto', title: 'מתיאור אל הסבר', fromLabel: `קפלר, ${year(k)}`, toLabel: `ניוטון, ${year(n)}`, from: k.novelty, to: n.novelty, text: L.application },
    { style: 'insight', title: t, text: x },
    quoteOf(L.evidence[0], 'ניוטון וקפלר'),
    { style: 'poster', title: n.title, text: n.contribution, ...image(n.id), pos: 'center 25%' },
    { style: 'haiku', lines: ['קפלר שואל איך', 'ניוטון עונה למה', 'הירח לא נופל'], text: 'מה ההייקו מאיר: **תיאור** מדויק הוא תנאי ל**הסבר**.' },
  ], 'קשר מסוג השפעה'));
}

// 4. הבנה: הפרספקטיבה, מאדריכל לצייר
{
  const c = CUT.perspective, b = d('d-1436-brunelleschi-dome'), m = d('d-1425-masaccio-trinity'), L = l('l-76'), V = l('l-73');
  const [t, x] = split(L.explanation);
  topics.push(T('perspective', 'הבנה', c.title, c.lead, [
    { style: 'poster', title: m.title, text: m.novelty, ...image(m.id), pos: 'center 35%' },
    { style: 'fromto', title: t, fromLabel: 'ברונלסקי, אדריכל', toLabel: `מזאצ׳ו, ${year(m)}`, from: b.contribution.replace(/^הוא גם /, '**ברונלסקי** '), to: m.novelty, text: L.application },
    { style: 'insight', title: split(V.explanation)[0], text: split(V.explanation)[1] },
    quoteOf(L.evidence[0], 'ברונלסקי ומזאצ׳ו'),
    { style: 'essay', title: 'מהכיפה אל הקיר', text: c.lead, ...image(b.id), body: [b.novelty + ' ' + b.contribution, m.novelty + ' ' + m.contribution, x, V.application] },
  ], 'הפרספקטיבה'));
}

// 5. הבנה: אקסיומת המקבילים, 2,000 שנה
{
  const e = d('d-bce300-euclid-elements'), lo = d('d-1829-lobachevsky-geometry'), L = l('l-12');
  const [t, x] = split(L.explanation);
  topics.push(T('parallels', 'הבנה', 'מה קורה כשמוותרים על אקסיומה', t, [
    { style: 'gradient', title: t, text: x },
    { style: 'fromto', title: 'ממקביל אחד ליותר מאחד', fromLabel: `אוקלידס, ${year(e)}`, toLabel: `לובצ׳בסקי, ${year(lo)}`, from: e.novelty, to: lo.novelty, text: L.application },
    quoteOf(L.evidence[0], 'על אקסיומת המקבילים'),
    { style: 'veil', title: lo.title, text: lo.contribution, ...image(lo.id) },
    { style: 'haiku', lines: ['שני קווים ישרים', 'אלפיים שנה במקביל', 'על כדור נפגשים'], text: 'מה ההייקו מאיר: **ויתור** על הנחה אחת פותח **גאומטריה** חדשה.' },
  ], 'קשר מסוג התנגדות'));
}

// 6. יישום: מהבאוהאוס לעיר הלבנה (דוגמה עירונית)
{
  const c = CUT.bauhaus, g = d('d-1925-geddes-telaviv'), ba = d('d-1925-bauhaus-dessau'), L = l('l-81');
  const [t, x] = split(L.explanation);
  topics.push(T('white-city', 'יישום', c.title, L.application, [
    { style: 'poster', title: g.title, text: g.novelty, ...image(g.id) },
    { style: 'fromto', title: t, fromLabel: `גדס, ${year(g)}`, toLabel: 'הבאוהאוס, דסאו', from: g.contribution, to: ba.novelty, text: x },
    { style: 'insight', title: 'ללכת בעיר עם שתי מפות', text: L.application },
    quoteOf(L.evidence[0], 'העיר הלבנה, תל אביב'),
    { style: 'post', title: 'מחר בבוקר בתל אביב', text: [g.novelty, ba.novelty, x, L.application].join('\n'), ...image(ba.id), tags: ['עולם_נעלם', 'העיר_הלבנה', 'באוהאוס'] },
    { style: 'haiku', lines: ['גן בלב הבלוק', 'קיר לבן וזכוכית', 'בוקר בתל אביב'], text: 'מה ההייקו מאיר: **תוכנית** של עיר ו**בניין** של בית ספר נפגשו ברחוב אחד.' },
  ], 'יישום בעיר'));
}

// 7. יישום: מתצפית לכלי, המטוטלת
{
  const h = d('d-1656-huygens-pendulum'), L = l('l-6'), V = l('l-62');
  const [t, x] = split(L.explanation);
  topics.push(T('pendulum', 'יישום', 'מתצפית לכלי: המטוטלת', t, [
    { style: 'veil', title: h.title, text: h.contribution, ...image(h.id) },
    { style: 'insight', title: t, text: x },
    { style: 'gradient', title: split(V.explanation)[0], text: V.application },
    quoteOf(h.evidence[0], 'הויגנס, האג'),
    { style: 'post', title: 'ניסוי של חמש דקות', text: [L.application, h.novelty, h.contribution, V.application].join('\n'), tags: ['עולם_נעלם', 'מטוטלת', 'ניסוי_בבית'] },
  ], 'יישום בבית'));
}

// 8. יישום: שינוי פרדיגמה, גם בעיר
{
  const pt = d('d-150-ptolemy-almagest'), co = d('d-1543-copernicus-revolutionibus'), ku = d('d-1962-kuhn-revolutions'), L = l('l-145'), K = l('l-52');
  const [t, x] = split(L.explanation);
  topics.push(T('paradigm', 'יישום', 'איך מחליפים תאוריה שלטת', L.application, [
    { style: 'fromto', title: 'מארץ במרכז אל שמש במרכז', fromLabel: `תלמי, ${year(pt)}`, toLabel: `קופרניקוס, ${year(co)}`, from: pt.novelty, to: co.novelty, text: L.application },
    { style: 'insight', title: split(K.explanation)[0], text: K.application },
    { style: 'gradient', title: t, text: x },
    quoteOf(K.evidence[0], 'תומאס קון'),
    { style: 'post', title: 'שינוי פרדיגמה', text: [pt.contribution, co.novelty, ku.novelty, K.application].join('\n'), ...image(co.id), tags: ['עולם_נעלם', 'פרדיגמה', 'קון'] },
    { style: 'haiku', lines: ['ארץ במרכז', 'אלף ומאתיים שנה', 'עד שספר זז'], text: 'מה ההייקו מאיר: תאוריה שלטת מתחלפת רק ב**מודל שלם**.' },
  ], 'יישום בחשיבה'));
}

// בדיקות התקן: חדרים, עיצובים לא חוזרים, הייקו של שלוש שורות, פוסט עד 6 שורות
for (const t of topics) {
  const st = t.creations.map((c) => c.style);
  if (new Set(st).size !== st.length) throw new Error(`עיצוב חוזר בחדר ${t.id}`);
  if (st.length < 4 || st.length > 6) throw new Error(`בחדר ${t.id} ${st.length} יצירות`);
  for (const c of t.creations) {
    if (c.style === 'haiku' && c.lines.length !== 3) throw new Error(`הייקו לא בשלוש שורות: ${t.id}`);
    if (c.style === 'post' && c.text.split('\n').length > 6) throw new Error(`פוסט ארוך: ${t.id}`);
    if (c.style === 'quote' && !c.quote) throw new Error(`ציטוט חסר: ${t.id}`);
    if ('image' in c && !c.image) delete c.image;
  }
}
const zones = new Set(topics.map((t) => t.zone));
if (topics.length < 6 || zones.size < 3) throw new Error('צריך 6 חדרים לפחות ושלושה שלבים');

// שומרים את קובצי ה-JPG מהריצה הקודמת
const out = 'public/creations.json';
const prev = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf8')) : null;
for (const t of topics) {
  const pt = prev?.topics?.find((x) => x.id === t.id);
  for (const c of t.creations) { const pc = pt?.creations?.find((x) => x.id === c.id); if (pc?.png && fs.existsSync(path.join('public', pc.png))) c.png = pc.png; }
}

// תמונות: הורדה חד פעמית מוויקישיתוף (עם User-Agent, אחרת 429)
fs.mkdirSync(IMG_DIR, { recursive: true });
for (const { file, url } of needImg) {
  const dest = path.join(IMG_DIR, file);
  if (fs.existsSync(dest)) continue;
  const big = url.replace(/\/(\d+)px-/, '/1280px-');
  let ok = false;
  for (const u of big !== url ? [big, url] : [url]) {
    const r = await fetch(u, { headers: { 'User-Agent': 'Olam-GH creations (https://github.com/Anat1969/Olam-GH)' } });
    if (r.ok) { fs.writeFileSync(dest, Buffer.from(await r.arrayBuffer())); ok = true; break; }
  }
  // מקטינים ל-1000 פיקסלים לכל היותר וממירים ל-JPEG (ImageMagick, כשקיים), כדי שהחבילה תישאר קלה
  if (ok) try { execFileSync('mogrify', ['-format', 'jpg', '-resize', '1000x1400>', '-quality', '80', '-strip', dest]); } catch { console.warn('ImageMagick חסר, התמונה נשמרה בגודל המקורי:', file); }
  if (!ok) console.warn('תמונה לא ירדה:', url);
}

const data = {
  app: {
    id: 'olam', name: 'עולם נעלם ומציאות מצויה', url: 'https://olam-gh.vercel.app', repo: 'Anat1969/Olam-GH',
    palette: {
      a: '#1F4E79', b: '#B85F16', c: '#8A8984', s: '#2F7A55', accent: '#2F7A55', marker: '#FFE45C',
      ink: '#17191C', paper: '#FFFFFF', paper2: '#F4F2EC', 'b-wash': '#FBEBDD', 's-wash': '#E3F1EA',
      serif: '"IBM Plex Sans Hebrew", system-ui, sans-serif',
    },
  },
  topics,
};
fs.writeFileSync(out, JSON.stringify(data, null, 2) + '\n');
console.log(`${topics.length} חדרים, ${topics.reduce((n, t) => n + t.creations.length, 0)} יצירות, ${needImg.length} תמונות`);
