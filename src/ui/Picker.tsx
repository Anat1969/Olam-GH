// בורר אחיד: כל לחיצה מחליפה את הבחירה. הוספה רק בלחיצה על "+" שליד הכפתור, והסרה ב"−".
// "הכול" מאפס. לחיצה על הבחירה היחידה מחזירה ל"הכול". אותו רכיב לתחומים, לסוגי קשר ולכל בורר אחר.
import IconButton from './IconButton';

export type PickOption = { id: string; label: React.ReactNode; title: string; className?: string; count?: number; disabled?: boolean };

/** selected: null = הכול */
export function pickOnly(selected: string[] | null, id: string): string[] | null {
  return selected && selected.length === 1 && selected[0] === id ? null : [id];
}
export function pickToggle(all: string[], selected: string[] | null, id: string): string[] | null {
  const s = new Set(selected || []);
  if (s.has(id)) s.delete(id); else s.add(id);
  const out = all.filter((x) => s.has(x));
  return out.length === 0 || out.length === all.length ? null : out;
}

export default function Picker({ options, selected, onChange, allLabel = 'הכול', label, className = '' }: {
  options: PickOption[]; selected: string[] | null; onChange: (next: string[] | null) => void; allLabel?: string; label: string; className?: string;
}) {
  const ids = options.map((o) => o.id);
  return (
    <div className={`seg picker ${className}`} role="group" aria-label={label}>
      <button type="button" className="press chip chip-all" aria-pressed={!selected} onClick={() => onChange(null)}>{allLabel}</button>
      {options.map((o) => {
        const on = !!selected && selected.includes(o.id);
        const multi = !!selected && selected.length > 1;
        return (
          <span key={o.id} className={`pick${on ? ' is-on' : ''}`}>
            <button type="button" className={`press chip ${o.className || ''}`} aria-pressed={on} disabled={o.disabled} title={o.title}
              onClick={() => onChange(pickOnly(selected, o.id))}>
              {o.label}{o.count !== undefined && <> <bdi className="num">{o.count}</bdi></>}
            </button>
            {/* "+" מוסיף לבחירה הקיימת, "−" מוריד ממנה. בלי בחירה (הכול) אין מה להוסיף אליו. */}
            {selected && !o.disabled && (on ? (multi && <IconButton icon="minus" className="pick-add" label={`הסרה מהבחירה: ${o.title}`} onClick={() => onChange(pickToggle(ids, selected, o.id))} />)
              : <IconButton icon="plus" className="pick-add" label={`הוספה לבחירה: ${o.title}`} onClick={() => onChange(pickToggle(ids, selected, o.id))} />)}
          </span>
        );
      })}
    </div>
  );
}
