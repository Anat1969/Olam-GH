#!/usr/bin/env node
// שלב 5: דוחף את data/ לטבלה olam_records בפרויקט cultura-GH (רק טבלאות עם הקידומת olam_).
// דורש אסימון ייבוא זמני שנוצר ב-SQL (טבלת olam_import_tokens), ולא מפתח שירות.
// usage: OLAM_IMPORT_TOKEN=... npm run push
import fs from 'node:fs';
import path from 'node:path';
import { SUPABASE_URL, SUPABASE_KEY } from './supabase-config.mjs';

const token = process.env.OLAM_IMPORT_TOKEN;
if (!token) { console.error('חסר OLAM_IMPORT_TOKEN'); process.exit(1); }
const DATA = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', 'data');
const R = (f) => JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'));
const rows = [
  ...R('persons.json').persons.map((d) => ({ kind: 'person', id: d.id, data: d, verified: d.verified })),
  ...R('discoveries.json').discoveries.map((d) => ({ kind: 'discovery', id: d.id, data: d, verified: d.verified })),
  ...R('links.json').links.map((d) => ({ kind: 'link', id: d.id, data: d, verified: d.verified })),
  ...R('sources.json').sources.map((d) => ({ kind: 'source', id: d.id, data: d, verified: !!d.accessedAt })),
  ...R('cuts.json').cuts.map((d) => ({ kind: 'cut', id: d.id, data: d, verified: true })),
  ...R('fields.json').families.map((d) => ({ kind: 'field', id: d.id, data: d, verified: true })),
];
let total = 0;
for (let i = 0; i < rows.length; i += 150) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/olam_import`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_token: token, p_rows: rows.slice(i, i + 150) }),
  });
  if (!res.ok) { console.error('נכשל', res.status, await res.text()); process.exit(1); }
  total += await res.json();
}
console.log(`נדחפו ${total} רשומות מתוך ${rows.length}`);
