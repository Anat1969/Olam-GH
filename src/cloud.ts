// שלב 5: Supabase (פרויקט cultura-GH, טבלאות olam_ בלבד).
// קריאה: טקסטים ערוכים נטענים מעל הנתונים שבחבילה. אם אין רשת, האפליקציה עובדת מהחבילה.
// עריכה: רק לאחר כניסה, ורק למנהלת (RLS). רק שדות טקסט, כדי שעריכה לא תשבור את האימות.
import { useSyncExternalStore } from 'react';
import { allDiscoveries, allLinks } from './data';

export const SUPABASE_URL = 'https://ktqmwpbzcnzkhjskqisy.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_IkreG7naPa1h-d4kGp1gpA_sLU4tg5q';
export const EDITABLE: Record<'discovery' | 'link', string[]> = {
  discovery: ['title', 'novelty', 'contribution'],
  link: ['explanation', 'application'],
};

type Session = { access_token: string; expires_at: number; email: string };
type State = { version: number; online: boolean; session: Session | null; admin: boolean; editing: boolean; status: string };
const KEY = 'olam.session';
const read = (): Session | null => { try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); return s && s.expires_at * 1000 > Date.now() ? s : null; } catch { return null; } };
let state: State = { version: 0, online: false, session: read(), admin: false, editing: false, status: '' };
const subs = new Set<() => void>();
const set = (patch: Partial<State>) => { state = { ...state, ...patch }; subs.forEach((f) => f()); };
export const useCloud = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => state);
export const cloudState = () => state;

const headers = (auth = false) => ({
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${auth && state.session ? state.session.access_token : SUPABASE_KEY}`,
  'Content-Type': 'application/json',
});

const targets = { discovery: new Map(allDiscoveries.map((d) => [d.id, d as unknown as Record<string, unknown>])), link: new Map(allLinks.map((l) => [l.id, l as unknown as Record<string, unknown>])) };

/** טוען את הטקסטים מהענן, ומעדכן רק שדות טקסט מותרים ברשומות שכבר אומתו בחבילה */
export async function loadCloud() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/olam_records?select=kind,id,data&kind=in.(discovery,link)`, { headers: headers(!!state.session) });
    if (!res.ok) throw new Error(String(res.status));
    const rows: { kind: 'discovery' | 'link'; id: string; data: Record<string, unknown> }[] = await res.json();
    for (const r of rows) {
      const t = targets[r.kind]?.get(r.id);
      if (!t) continue;
      for (const f of EDITABLE[r.kind]) if (typeof r.data[f] === 'string' && r.data[f]) t[f] = r.data[f];
    }
    set({ online: true, version: state.version + 1 });
  } catch {
    set({ online: false });
  }
  if (state.session) await checkAdmin();
}

async function checkAdmin() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/olam_admins?select=email`, { headers: headers(true) });
    const rows = res.ok ? await res.json() : [];
    set({ admin: rows.length > 0 });
  } catch { set({ admin: false }); }
}

export async function login(email: string, password: string) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, { method: 'POST', headers: headers(), body: JSON.stringify({ email, password }) });
  if (!res.ok) throw new Error('האימייל או הסיסמה לא נכונים.');
  const j = await res.json();
  const session: Session = { access_token: j.access_token, expires_at: j.expires_at || Math.floor(Date.now() / 1000) + (j.expires_in || 3600), email: j.user?.email || email };
  try { localStorage.setItem(KEY, JSON.stringify(session)); } catch { /* מצב פרטי */ }
  set({ session });
  await checkAdmin();
  if (!state.admin) throw new Error('החשבון הזה לא מורשה לערוך את עולם נעלם.');
  set({ editing: true });
}

export function logout() {
  try { localStorage.removeItem(KEY); } catch { /* מצב פרטי */ }
  set({ session: null, admin: false, editing: false, status: '' });
}
export const toggleEditing = () => set({ editing: !state.editing });

/** שמירת שדה טקסט אחד. קורא את הרשומה העדכנית, משנה שדה אחד, וכותב. ההיסטוריה נשמרת בשרת. */
export async function saveText(kind: 'discovery' | 'link', id: string, field: string, value: string) {
  if (!EDITABLE[kind].includes(field)) throw new Error('שדה לא ניתן לעריכה');
  set({ status: 'שומר…' });
  const q = `kind=eq.${kind}&id=eq.${encodeURIComponent(id)}`;
  const cur = await fetch(`${SUPABASE_URL}/rest/v1/olam_records?select=data&${q}`, { headers: headers(true) });
  const rows = cur.ok ? await cur.json() : [];
  if (!rows.length) { set({ status: 'לא נשמר' }); throw new Error('הרשומה לא נמצאה'); }
  const data = { ...rows[0].data, [field]: value };
  const res = await fetch(`${SUPABASE_URL}/rest/v1/olam_records?${q}`, { method: 'PATCH', headers: { ...headers(true), Prefer: 'return=minimal' }, body: JSON.stringify({ data }) });
  if (!res.ok) { set({ status: 'לא נשמר' }); throw new Error('השמירה נכשלה. נסי להיכנס שוב.'); }
  const t = targets[kind].get(id);
  if (t) t[field] = value;
  set({ status: 'נשמר', version: state.version + 1 });
}

// טיוטות: גילוי חדש שהמנהלת מוסיפה מהממשק. נשמר בענן כ-verified=false, ולכן לא מוצג לציבור (RLS).
// npm run drafts מושך אותן ל-data/, ו-npm run verify מחליט אם הן נכנסות.
export type Draft = {
  title: string; domainId: string; yearFrom: number; yearTo: number;
  person: string; article: string; quote: string; place: string;
  novelty: string; contribution: string;
  check?: { quoteFound: boolean | null; yearInQuote: boolean };
  createdAt?: string; createdBy?: string;
};
export const yearTokens = (y: number) => (y < 0 ? [`${-y} BC`, `${-y} BCE`] : [String(y)]);
const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

/** אותה בדיקה כמו בסקריפט האימות: הציטוט מופיע מילה במילה במאמר. null = אי אפשר היה לבדוק */
export async function checkQuote(article: string, quote: string): Promise<boolean | null> {
  try {
    const u = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&format=json&redirects=1&origin=*&titles=${encodeURIComponent(article)}`;
    const res = await fetch(u, { headers: { 'Api-User-Agent': 'OlamGH-drafts/1.0 (https://github.com/Anat1969/olam-gh)' } });
    if (!res.ok) return null;
    const pages = (await res.json()).query?.pages || {};
    const text = (Object.values(pages)[0] as { extract?: string } | undefined)?.extract;
    if (!text) return false;
    return norm(text).includes(norm(quote));
  } catch { return null; }
}

export async function loadDrafts(): Promise<{ id: string; data: Draft }[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/olam_records?select=id,data&kind=eq.discovery&verified=eq.false&id=like.draft-*&order=id.desc`, { headers: headers(true) });
  return res.ok ? res.json() : [];
}

export async function saveDraft(d: Draft) {
  const id = `draft-${Date.now()}`;
  const data = { ...d, createdAt: new Date().toISOString(), createdBy: state.session?.email || '' };
  const res = await fetch(`${SUPABASE_URL}/rest/v1/olam_records`, { method: 'POST', headers: { ...headers(true), Prefer: 'return=minimal' }, body: JSON.stringify({ kind: 'discovery', id, data, verified: false }) });
  if (!res.ok) throw new Error('הטיוטה לא נשמרה. נסי להיכנס שוב.');
  return id;
}
