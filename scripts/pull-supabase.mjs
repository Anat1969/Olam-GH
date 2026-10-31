#!/usr/bin/env node
// שלב 5: מושך את הטקסטים שנערכו ב-Supabase (cultura-GH, olam_records) אל data/*.json, כדי שהריפו יישאר ייצוא מלא.
// רק שדות טקסט מותרים עוברים. ציטוטים, שנים ומקומות נשארים באחריות npm run verify.
import fs from 'node:fs';
import path from 'node:path';
import { SUPABASE_URL, SUPABASE_KEY } from './supabase-config.mjs';

const EDITABLE = { discovery: ['title', 'novelty', 'contribution'], link: ['explanation', 'application'] };
const DATA = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', 'data');
const res = await fetch(`${SUPABASE_URL}/rest/v1/olam_records?select=kind,id,data&kind=in.(discovery,link)`, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
if (!res.ok) { console.error('נכשל', res.status); process.exit(1); }
const rows = await res.json();
let changed = 0;
for (const [file, key, kind] of [['discoveries.json', 'discoveries', 'discovery'], ['links.json', 'links', 'link']]) {
  const j = JSON.parse(fs.readFileSync(path.join(DATA, file), 'utf8'));
  const byId = new Map(j[key].map((x) => [x.id, x]));
  for (const r of rows.filter((x) => x.kind === kind)) {
    const t = byId.get(r.id);
    if (!t) continue;
    for (const f of EDITABLE[kind]) if (typeof r.data[f] === 'string' && r.data[f] && r.data[f] !== t[f]) { t[f] = r.data[f]; changed++; }
  }
  fs.writeFileSync(path.join(DATA, file), JSON.stringify(j, null, 2) + '\n');
}
console.log(`עודכנו ${changed} שדות טקסט מהענן`);
