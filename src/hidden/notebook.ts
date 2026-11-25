// מחברת המחקר: הלולאה הרקורסיבית. כל כרטיס שנשמר הוא צומת, וכל צומת יכול להיות יעד של מנגנון נוסף.
// תוכן ← תובנה ← דפוס ← שאלה ← השערה ← בחינה ← תובנה חדשה ← (המשך מכאן) ← ...
// נשמר בדפדפן בלבד (localStorage). אם האחסון חסום, המחברת עובדת עד רענון הדף.
import { useSyncExternalStore } from 'react';
import type { Card } from './engine';

export type Verdict = 'supports' | 'refutes' | 'open';
export const verdictName: Record<Verdict, string> = { supports: 'נתמכה', refutes: 'נדחתה', open: 'נשארה פתוחה' };
export interface Note extends Card {
  id: string; parent: string | null; createdAt: string;
  result?: { verdict: Verdict; note: string; url: string };
  insight?: string;
}
/** שבעת השלבים של הלולאה. הכרטיס כבר מכיל את חמשת הראשונים, הבחינה והתובנה החדשה מגיעות מהמשתמשת */
export const STAGES = ['תוכן', 'תובנה', 'דפוס', 'שאלה', 'השערה', 'בחינה', 'תובנה חדשה'] as const;
export const stageOf = (n: Note) => (n.insight ? 7 : n.result ? 6 : 5);

const KEY = 'olam.notebook.v1';
const load = (): Note[] => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };
let notes: Note[] = load();
const subs = new Set<() => void>();
const save = (next: Note[]) => {
  notes = next;
  try { localStorage.setItem(KEY, JSON.stringify(notes)); } catch { /* אחסון חסום: נשאר בזיכרון */ }
  subs.forEach((f) => f());
};
export const useNotebook = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => notes);
export const notebook = () => notes;

export function addNote(card: Card, parent: string | null): Note {
  const existing = notes.find((n) => n.key === card.key && n.parent === parent);
  if (existing) return existing;
  const n: Note = { ...card, id: `n-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, parent, createdAt: new Date().toISOString() };
  save([...notes, n]);
  return n;
}
export const updateNote = (id: string, patch: Partial<Note>) => save(notes.map((n) => (n.id === id ? { ...n, ...patch } : n)));
/** מחיקה של צומת וכל הצאצאים שלו */
export function removeNote(id: string) {
  const drop = new Set([id]);
  let grew = true;
  while (grew) { grew = false; for (const n of notes) if (n.parent && drop.has(n.parent) && !drop.has(n.id)) { drop.add(n.id); grew = true; } }
  save(notes.filter((n) => !drop.has(n.id)));
}
export const noteById = (id: string | null | undefined) => notes.find((n) => n.id === id) || null;
/** השרשרת מהשורש עד הצומת */
export function chainOf(id: string): Note[] {
  const out: Note[] = [];
  let n = noteById(id);
  while (n) { out.unshift(n); n = noteById(n.parent); }
  return out;
}
export const childrenOf = (id: string | null) => notes.filter((n) => n.parent === id);
