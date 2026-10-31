#!/usr/bin/env node
// מושך טיוטות של גילויים חדשים (נוצרו בממשק, verified=false) מ-Supabase אל data/*.json.
// הטיוטה נכנסת עם verified=false, ו-npm run verify מחליט אם היא עוברת. בלי אימות, היא לא מוצגת.
// usage: OLAM_IMPORT_TOKEN=... npm run drafts   (האסימון נוצר ב-SQL בטבלת olam_import_tokens, 30 דקות)
import fs from 'node:fs';
import path from 'node:path';
import { SUPABASE_URL, SUPABASE_KEY } from './supabase-config.mjs';

const token = process.env.OLAM_IMPORT_TOKEN;
if (!token) { console.error('חסר OLAM_IMPORT_TOKEN'); process.exit(1); }
const DATA = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', 'data');
const read = (f) => JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'));
const write = (f, o) => fs.writeFileSync(path.join(DATA, f), JSON.stringify(o, null, 2) + '\n');

const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/olam_drafts`, {
  method: 'POST',
  headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ p_token: token }),
});
if (!res.ok) { console.error('נכשל', res.status, await res.text()); process.exit(1); }
const drafts = await res.json();

const P = read('persons.json'), X = read('discoveries.json'), S = read('sources.json');
const slug = (t) => t.toLowerCase().normalize('NFD').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '');
const src = (t) => {
  const id = 's-wp-' + slug(t);
  if (!S.sources.some((s) => s.id === id)) S.sources.push({ id, title: `${t}, Wikipedia`, url: 'https://en.wikipedia.org/wiki/' + encodeURIComponent(t.replace(/ /g, '_')), accessedAt: null });
  return id;
};
const done = new Set(X.discoveries.map((d) => d.draftId).filter(Boolean));
let added = 0;
for (const { id: draftId, data: d } of drafts) {
  if (done.has(draftId)) continue;
  let person = P.persons.find((p) => p.wikipedia === d.person);
  if (!person) {
    const base = 'p-' + slug(d.person.split(' ').slice(-1)[0]);
    const pid = P.persons.some((p) => p.id === base) ? `${base}-${slug(d.person.split(' ')[0])}` : base;
    person = { id: pid, wikipedia: d.person, nameHe: null, nameFull: null, birthYear: null, birthDate: null, deathYear: null, deathDate: null, calendar: null, birthPlace: null, domains: [d.domainId], imageUrl: null, imageLicense: null, imageCredit: null, sources: [src(d.person)], verified: false, verifiedAt: null };
    P.persons.push(person);
  } else if (!person.domains.includes(d.domainId)) person.domains.push(d.domainId);
  const y = d.yearFrom < 0 ? `bce${-d.yearFrom}` : String(d.yearFrom);
  let id = `d-${y}-${slug(d.article).slice(0, 24)}`;
  if (X.discoveries.some((x) => x.id === id)) id += '-2';
  const ev = { sourceId: src(d.article), quote: d.quote };
  X.discoveries.push({
    id, draftId, title: d.title, yearFrom: d.yearFrom, yearTo: d.yearTo ?? d.yearFrom, yearApprox: false, domainId: d.domainId, personIds: [person.id],
    place: d.place ? { wikipedia: d.place, nameHe: d.place, nameFull: null, lat: null, lon: null, confidence: 'interpretive', evidence: null, city: { nameHe: d.place, nameFull: d.place } } : null,
    novelty: d.novelty, contribution: d.contribution, confidence: 'documented', evidence: [ev], sources: [ev.sourceId], verified: false, verifiedAt: null,
  });
  added++;
  console.log(`נוספה טיוטה ${draftId} → ${id}`);
}
write('persons.json', P); write('discoveries.json', X); write('sources.json', S);
console.log(`${added} טיוטות חדשות מתוך ${drafts.length}. עכשיו: npm run verify`);
