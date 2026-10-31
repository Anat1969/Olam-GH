#!/usr/bin/env node
// Verifies every record in data/ against its sources, and fills sourced fields.
//
// How a record earns verified=true:
//   discovery: every evidence quote is found verbatim in its source article (whitespace-normalised),
//              and at least one quote contains a year of the range (yearFrom or yearTo; "N BC"/"N BCE" for negative years).
//   place:     its own evidence quote is found; coordinates and names come from Wikidata.
//   link:      both ends exist, and every evidence quote is found. A link without evidence stays false.
//   person:    resolved to a Wikidata item with a Hebrew label and at least one dated life event.
//              Dates, calendar (Julian/Gregorian), birthplace and image come only from Wikidata/Commons.
//              An image is kept only when Commons states its licence.
//
// Usage: npm run verify            (network; caches articles in .cache/)
//        npm run verify -- --offline (re-check using the cache only)
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DATA = path.join(ROOT, 'data');
const CACHE = path.join(ROOT, '.cache');
const OFFLINE = process.argv.includes('--offline');
const UA = 'OlamGH-verifier/1.0 (https://github.com/Anat1969/olam-gh)';
const TODAY = new Date().toISOString().slice(0, 10);
const JULIAN = 'http://www.wikidata.org/entity/Q1985786';

const read = (f) => JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'));
const write = (f, o) => fs.writeFileSync(path.join(DATA, f), JSON.stringify(o, null, 2) + '\n');
const norm = (s) => s.replace(/\s+/g, ' ').trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function cached(key, url) {
  const file = path.join(CACHE, key.replace(/[^\w.-]+/g, '_') + '.json');
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  if (OFFLINE) return null;
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.ok) {
      const j = await res.json();
      fs.mkdirSync(CACHE, { recursive: true });
      fs.writeFileSync(file, JSON.stringify(j));
      await sleep(200);
      return j;
    }
    await sleep(1000 * 2 ** attempt);
  }
  return null;
}

const titleOf = (url) => decodeURIComponent(url.split('/wiki/')[1]).replace(/_/g, ' ');

async function article(title) {
  const j = await cached('wp-' + title, `https://en.wikipedia.org/w/api.php?action=query&prop=extracts|pageprops&ppprop=wikibase_item&explaintext=1&format=json&redirects=1&titles=${encodeURIComponent(title)}`);
  const page = j && Object.values(j.query.pages)[0];
  if (!page || page.missing !== undefined) return null;
  return { text: norm(page.extract || ''), qid: page.pageprops?.wikibase_item || null };
}

async function entity(qid) {
  const j = await cached('wd-' + qid, `https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`);
  return j?.entities?.[qid] || (j && Object.values(j.entities)[0]) || null;
}

function claim(e, prop) {
  const list = (e?.claims?.[prop] || []).filter((c) => c.mainsnak.snaktype === 'value' && c.rank !== 'deprecated');
  return (list.find((c) => c.rank === 'preferred') || list[0])?.mainsnak.datavalue.value ?? null;
}

function lifeDate(v) {
  if (!v) return null;
  const m = v.time.match(/^([+-])(\d+)-(\d\d)-(\d\d)/);
  const year = (m[1] === '-' ? -1 : 1) * Number(m[2]);
  const precise = v.precision >= 11;
  return { year, approx: v.precision < 9, date: precise ? `${m[2].padStart(4, '0')}-${m[3]}-${m[4]}` : null, julian: v.calendarmodel === JULIAN };
}

const label = (e, lang) => e?.labels?.[lang]?.value ?? null;

async function placeFromQid(qid) {
  const e = await entity(qid);
  if (!e) return null;
  const c = claim(e, 'P625');
  const k = claim(e, 'P17');
  let country = null;
  // ממלכת ארצות השפלה (Q29999) מאוחדת עם הולנד (Q55), כדי שלא יהיו שתי ארצות לאותה עיר
  const kid = k?.id === 'Q29999' ? 'Q55' : k?.id;
  if (kid && kid !== qid) {
    const ce = await entity(kid);
    if (ce) country = { wikidata: kid, nameHe: label(ce, 'he'), nameFull: label(ce, 'en') };
  }
  return { wikidata: qid, nameHe: label(e, 'he'), nameFull: label(e, 'en'), lat: c ? +c.latitude.toFixed(4) : null, lon: c ? +c.longitude.toFixed(4) : null, country };
}

async function commonsImage(file) {
  const j = await cached('cm-' + file, `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent('File:' + file)}&prop=imageinfo&iiprop=extmetadata|url&iiurlwidth=360&format=json`);
  const info = j && Object.values(j.query.pages)[0]?.imageinfo?.[0];
  const meta = info?.extmetadata || {};
  const license = meta.LicenseShortName?.value;
  if (!info || !license) return null;
  const strip = (s) => (s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  return {
    imageUrl: info.thumburl.split('?')[0],
    imageLicense: license,
    imageCredit: (/^unknown/i.test(strip(meta.Artist?.value)) ? 'Unknown author' : strip(meta.Artist?.value).slice(0, 120)) || null,
    imagePage: info.descriptionurl,
  };
}

const yearTokens = (y) => (y < 0 ? [`${-y} BC`, `${-y} BCE`] : [String(y)]);

async function main() {
  const subsOf = new Map(read('fields.json').families.flatMap((f) => f.domains.map((d) => [d.id, (d.subs || []).map((x) => x.id)])));
  const { _note: pn, persons } = read('persons.json');
  const { _note: dn, discoveries } = read('discoveries.json');
  const { _note: ln, links } = read('links.json');
  const { _note: sn, sources } = read('sources.json');
  const srcById = new Map(sources.map((s) => [s.id, s]));
  const report = { date: TODAY, persons: [], discoveries: [], links: [], places: [] };
  const texts = new Map();

  async function sourceText(id) {
    if (texts.has(id)) return texts.get(id);
    const s = srcById.get(id);
    const a = s && s.url.includes('wikipedia.org') ? await article(titleOf(s.url)) : null;
    if (a && s) s.accessedAt = TODAY;
    texts.set(id, a?.text ?? null);
    return a?.text ?? null;
  }
  async function quoteFound(ev) {
    const t = await sourceText(ev.sourceId);
    return !!t && t.includes(norm(ev.quote));
  }
  const ensureSource = (s) => { if (!srcById.has(s.id)) { srcById.set(s.id, s); sources.push(s); } };

  // persons
  for (const p of persons) {
    const reasons = [];
    const a = await article(p.wikipedia);
    const qid = a?.qid;
    const e = qid && (await entity(qid));
    if (!e) reasons.push('לא נמצא פריט בוויקינתונים');
    else {
      p.wikidata = qid;
      // preferTranslit: כשהתווית העברית בוויקינתונים שגויה (למשל "הקיסר הסיני הזה" לקיסר יונגלה), התעתיק גובר
      const he = p.preferTranslit ? null : label(e, 'he');
      p.nameHe = he || p.nameHeTranslit || null;
      p.nameHeSource = he ? 'wikidata' : p.nameHeTranslit ? 'transliteration' : null;
      p.nameFull = label(e, 'en');
      if (!p.nameHe) reasons.push('אין שם עברי בוויקינתונים, וגם לא תעתיק');
      const b = lifeDate(claim(e, 'P569'));
      const d = lifeDate(claim(e, 'P570'));
      p.birthYear = b?.year ?? null; p.birthDate = b?.date ?? null; p.birthApprox = b?.approx ?? false;
      p.deathYear = d?.year ?? null; p.deathDate = d?.date ?? null; p.deathApprox = d?.approx ?? false;
      p.calendar = b ? (b.julian ? 'julian' : 'gregorian') : d ? (d.julian ? 'julian' : 'gregorian') : null;
      // דמות עתיקה בלי תאריכים בוויקינתונים: לא ממציאים. הממשק מציג "שנים לא ידועות", והגילוי עצמו מתוארך לפי הציטוט.
      if (!b && !d) p.datesUnknown = true; else delete p.datesUnknown;
      const bp = claim(e, 'P19');
      p.birthPlace = bp ? await placeFromQid(bp.id) : null;
      const img = claim(e, 'P18');
      const im = img ? await commonsImage(img) : null;
      Object.assign(p, im || { imageUrl: null, imageLicense: null, imageCredit: null, imagePage: null });
      const wdId = 's-wd-' + qid.toLowerCase();
      ensureSource({ id: wdId, title: `${p.nameFull}, Wikidata`, url: `https://www.wikidata.org/wiki/${qid}`, accessedAt: TODAY });
      srcById.get(wdId).accessedAt = TODAY;
      p.sources = [...new Set([...p.sources.filter((s) => s.startsWith('s-wp-')), wdId])];
      await sourceText(p.sources[0]);
    }
    p.verified = reasons.length === 0;
    p.verifiedAt = p.verified ? TODAY : null;
    report.persons.push({ id: p.id, verified: p.verified, reasons });
  }
  const personIds = new Set(persons.map((p) => p.id));

  // discoveries
  for (const d of discoveries) {
    const reasons = [];
    for (const ev of d.evidence) if (!(await quoteFound(ev))) reasons.push(`הציטוט לא נמצא במקור ${ev.sourceId}: "${ev.quote.slice(0, 60)}"`);
    if (!d.evidence.some((ev) => [...yearTokens(d.yearFrom), ...yearTokens(d.yearTo)].some((t) => ev.quote.includes(t)))) reasons.push(`השנה ${d.yearFrom} או ${d.yearTo} לא מופיעה באף ציטוט`);
    for (const pid of d.personIds) if (!personIds.has(pid)) reasons.push(`דמות לא קיימת: ${pid}`);
    if (d.yearTo < d.yearFrom) reasons.push('טווח שנים הפוך');
    if (d.sub && !subsOf.get(d.domainId)?.includes(d.sub)) reasons.push(`תת-תחום לא קיים בתחום: ${d.sub}`);
    if (d.place) {
      const art = await article(d.place.wikipedia);
      const geo = art?.qid ? await placeFromQid(art.qid) : null;
      if (geo) Object.assign(d.place, { wikidata: geo.wikidata, nameFull: geo.nameFull, lat: geo.lat, lon: geo.lon, nameHe: geo.nameHe || d.place.nameHe, country: geo.country });
      // טיוטה מהממשק מגיעה עם שם עיר בלועזית: לוקחים את השם העברי מעיר קיימת באותו שם, או מוויקינתונים
      if (d.place.city && d.place.city.nameHe === d.place.city.nameFull) {
        const twin = discoveries.find((x) => x !== d && x.place?.city?.nameFull === d.place.city.nameFull && x.place.city.nameHe !== x.place.city.nameFull);
        d.place.city.nameHe = twin?.place.city.nameHe || geo?.nameHe || d.place.city.nameHe;
      }
      let placeOk = !!geo && geo.lat !== null;
      if (d.place.evidence) {
        const found = await quoteFound(d.place.evidence);
        if (!found) { placeOk = false; d.place.confidence = 'hypothesis'; }
        if (found && !d.sources.includes(d.place.evidence.sourceId)) d.sources.push(d.place.evidence.sourceId);
      } else if (d.place.confidence === 'documented') d.place.confidence = 'interpretive';
      report.places.push({ id: d.id, place: d.place.nameFull, ok: placeOk, confidence: d.place.confidence });
    }
    for (const pid of d.personIds) if (persons.find((p) => p.id === pid)?.verified === false) reasons.push(`הדמות ${pid} לא אומתה`);
    d.verified = reasons.length === 0;
    d.verifiedAt = d.verified ? TODAY : null;
    report.discoveries.push({ id: d.id, verified: d.verified, reasons });
  }
  const ids = new Set([...personIds, ...discoveries.map((d) => d.id)]);

  // links
  for (const l of links) {
    const reasons = [];
    if (!ids.has(l.fromId) || !ids.has(l.toId)) reasons.push('קצה של הקשר לא קיים');
    if (!l.evidence.length) reasons.push(l.rejectedReason || 'אין ציטוט מהמקור');
    for (const ev of l.evidence) if (!(await quoteFound(ev))) reasons.push(`הציטוט לא נמצא במקור ${ev.sourceId}`);
    l.verified = reasons.length === 0;
    l.verifiedAt = l.verified ? TODAY : null;
    report.links.push({ id: l.id, verified: l.verified, reasons });
  }

  sources.sort((a, b) => a.id.localeCompare(b.id));
  write('persons.json', { _note: pn, persons });
  write('discoveries.json', { _note: dn, discoveries });
  write('links.json', { _note: ln, links });
  write('sources.json', { _note: sn, sources });
  const count = (arr) => `${arr.filter((x) => x.verified).length}/${arr.length}`;
  report.summary = { persons: count(report.persons), discoveries: count(report.discoveries), links: count(report.links), images: persons.filter((p) => p.imageUrl).length };
  write('verification-report.json', report);

  console.log('אימות', TODAY, JSON.stringify(report.summary));
  for (const group of ['persons', 'discoveries', 'links']) for (const r of report[group]) if (!r.verified) console.log(`  לא אומת ${r.id}: ${r.reasons.join(' | ')}`);
  // תרגום עברי לכל ציטוט: הממשק מציג אותו קודם, מסומן כתרגום. חסר תרגום הוא אזהרה, לא כשל, כי האימות נעשה על המקור.
  const noHe = [...discoveries.flatMap((d) => [...d.evidence, d.place?.evidence].filter(Boolean).map((e) => [d.id, e])), ...links.flatMap((l) => l.evidence.map((e) => [l.id, e]))].filter(([, e]) => !e.quoteHe);
  if (noHe.length) console.log(`  אזהרה: ${noHe.length} ציטוטים בלי תרגום לעברית (quoteHe): ${[...new Set(noHe.map(([id]) => id))].slice(0, 8).join(', ')}`);
  for (const p of report.places) if (!p.ok) console.log(`  מקום לא אומת ${p.id}: ${p.place}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
