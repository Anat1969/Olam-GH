// בחירת תחומים, אחידה בכל המסכים: "כל התחומים" מאפס, לחיצה ראשונה בוחרת רק את התחום שנלחץ,
// ולחיצות נוספות מוסיפות או מורידות. אם לא נשאר כלום, חוזרים לכל התחומים.
import DomainIcon from '../icons';
import { activeDomains, discoveries } from '../data';

/** selected: null = כל התחומים */
export function nextSelection(selected: string[] | null, id: string): string[] | null {
  if (!selected) return [id];
  const s = new Set(selected);
  if (s.has(id)) s.delete(id); else s.add(id);
  const out = activeDomains.map((d) => d.id).filter((d) => s.has(d));
  return out.length === 0 || out.length === activeDomains.length ? null : out;
}

export default function DomainPicker({ selected, onChange, counts = true, className = '' }: {
  selected: string[] | null; onChange: (next: string[] | null) => void; counts?: boolean; className?: string;
}) {
  return (
    <div className={`seg domain-picker ${className}`} role="group" aria-label="תחומים">
      <button type="button" className="press chip chip-all" aria-pressed={!selected} onClick={() => onChange(null)}>כל התחומים</button>
      {activeDomains.map((d) => (
        <button key={d.id} type="button" className={`press chip chip-dom dom-${d.id}`} aria-pressed={!!selected && selected.includes(d.id)} onClick={() => onChange(nextSelection(selected, d.id))}>
          <DomainIcon id={d.id} />{d.nameHe}{counts && <> <bdi className="num">{discoveries.filter((x) => x.domainId === d.id).length}</bdi></>}
        </button>
      ))}
    </div>
  );
}
