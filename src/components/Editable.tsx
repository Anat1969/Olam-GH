// טקסט שמוצג רגיל, ובמצב עריכה הופך לשדה עם שמירה. ההדגשות (**…**, ==…==) נשמרות כמו שהן.
import { type ElementType, useEffect, useState } from 'react';
import Rich from './Rich';
import { saveText, useCloud } from '../cloud';

export default function Editable({ kind, id, field, value, as = 'span', className, rich = true }: {
  kind: 'discovery' | 'link'; id: string; field: string; value: string; as?: ElementType; className?: string; rich?: boolean;
}) {
  const { editing } = useCloud();
  const [draft, setDraft] = useState(value);
  const [msg, setMsg] = useState('');
  useEffect(() => setDraft(value), [value]);
  if (!editing) return rich ? <Rich as={as} className={className}>{value}</Rich> : <span className={className}>{value}</span>;
  const save = async () => {
    if (draft === value) return;
    try { await saveText(kind, id, field, draft); setMsg('נשמר'); } catch (e) { setMsg((e as Error).message); }
  };
  return (
    <span className="editable">
      <textarea className="field edit-field" value={draft} dir="rtl" rows={Math.min(5, Math.max(1, Math.ceil(draft.length / 60)))}
        aria-label={`עריכת ${field}`} onChange={(e) => { setDraft(e.target.value); setMsg(''); }} onBlur={save} />
      <span className="label edit-msg" aria-live="polite">{msg || 'נשמר כשיוצאים מהשדה'}</span>
    </span>
  );
}
