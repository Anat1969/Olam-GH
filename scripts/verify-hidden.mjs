#!/usr/bin/env node
// אימות שכבת "הנעלם": דוגמאות חיצוניות של מנגנונים ושאלות פתוחות.
// רשומה מקבלת verified=true רק כשכל ציטוט נמצא מילה במילה במאמר המקור (אחרי נרמול רווחים),
// וכשיש לה שנה, השנה מופיעה באחד הציטוטים. כמו npm run verify, רק לשכבה החדשה.
// בנוסף: כל מזהה דוגמה במנגנון חייב להיות גילוי או קשר מאומת.
// הרצה: npm run verify:hidden   (רשת, עם מטמון ב-.cache)   או   -- --offline
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DATA = path.join(ROOT, 'data');
const CACHE = path.join(ROOT, '.cache');
const OFFLINE = process.argv.includes('--offline');
const UA = 'OlamGH-verifier/1.0 (https://github.com/Anat1969/olam-gh)';
const TODAY = new Date().toISOString().slice(0, 10);
const read = (f) => JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'));
const write = (f, o) => fs.writeFileSync(path.join(DATA, f), JSON.stringify(o, null, 2) + '\n');
const norm = (s) => s.replace(/\s+/g, ' ').trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function article(title) {
  const file = path.join(CACHE, ('wp-' + title).replace(/[^\w.-]+/g, '_') + '.json');
  let j = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
  if (!j && !OFFLINE) {
    const url = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts|pageprops&ppprop=wikibase_item&explaintext=1&format=json&redirects=1&titles=${encodeURIComponent(title)}`;
    for (let i = 0; i < 4 && !j; i++) {
      const r = await fetch(url, { headers: { 'User-Agent': UA } });
      if (r.ok) { j = await r.json(); fs.mkdirSync(CACHE, { recursive: true }); fs.writeFileSync(file, JSON.stringify(j)); await sleep(300); }
      else await sleep(1000 * 2 ** i);
    }
  }
  const page = j && Object.values(j.query.pages)[0];
  return page && page.missing === undefined ? norm(page.extract || '') : null;
}
const titleOf = (url) => decodeURIComponent(url.split('/wiki/')[1]).replace(/_/g, ' ');

async function check(rec) {
  const text = await article(titleOf(rec.source.url));
  if (text === null) return { ok: false, why: 'המאמר לא נטען' };
  const miss = rec.evidence.filter((e) => !text.includes(norm(e.quote)));
  if (miss.length) return { ok: false, why: `ציטוט לא נמצא: ${miss[0].quote.slice(0, 60)}` };
  if (rec.year && !rec.evidence.some((e) => e.quote.includes(String(rec.year)))) return { ok: false, why: `השנה ${rec.year} לא בציטוט` };
  if (rec.evidence.some((e) => !e.quoteHe)) return { ok: false, why: 'חסר תרגום' };
  return { ok: true };
}

const disc = new Set(read('discoveries.json').discoveries.filter((d) => d.verified).map((d) => d.id));
const links = new Set(read('links.json').links.filter((l) => l.verified).map((l) => l.id));
const mech = read('mechanisms.json');
const open = read('open-questions.json');
let bad = 0, ok = 0;
const mechIds = new Set(mech.mechanisms.map((m) => m.id));
for (const m of mech.mechanisms) {
  for (const id of [...m.examples, ...m.counter.ids]) if (!disc.has(id) && !links.has(id)) { console.log(`מנגנון ${m.id}: מזהה לא מאומת ${id}`); bad++; }
  for (const x of m.external) {
    const r = await check(x);
    x.verified = r.ok; x.verifiedAt = r.ok ? (x.verifiedAt || TODAY) : null;
    console.log(`${r.ok ? 'מאומת' : 'נכשל '} ${m.id}/${x.id}${r.ok ? '' : `: ${r.why}`}`); r.ok ? ok++ : bad++;
  }
}
for (const q of open.questions) {
  for (const id of q.mechanisms) if (!mechIds.has(id)) { console.log(`שאלה ${q.id}: מנגנון לא קיים ${id}`); bad++; }
  const r = await check(q);
  q.verified = r.ok; q.verifiedAt = r.ok ? (q.verifiedAt || TODAY) : null;
  console.log(`${r.ok ? 'מאומת' : 'נכשל '} ${q.id}${r.ok ? '' : `: ${r.why}`}`); r.ok ? ok++ : bad++;
}
write('mechanisms.json', mech);
write('open-questions.json', open);
console.log(`\n${ok} מאומתים, ${bad} בעיות`);
process.exit(bad ? 1 : 0);
