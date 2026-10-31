// שדה חיפוש אחיד לכל האפליקציה: איקס לאיפוס תמיד גלוי (אפור בהיר), Esc מאפס,
// ולחיצה בשדה מסמנת את הטקסט, כך שאפשר להקליד חיפוש חדש בלי למחוק.
import { forwardRef } from 'react';

type Props = { value: string; onChange: (v: string) => void; placeholder?: string; label: string; className?: string; dir?: 'rtl' | 'ltr' | 'auto' };

const SearchInput = forwardRef<HTMLInputElement, Props>(function SearchInput({ value, onChange, placeholder, label, className = '', dir = 'rtl' }, ref) {
  return (
    <span className={`clearable ${className}`}>
      <input ref={ref} className="clearable-input" type="text" dir={dir} value={value} placeholder={placeholder} aria-label={label}
        onChange={(e) => onChange(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        onKeyDown={(e) => { if (e.key === 'Escape' && value) { e.stopPropagation(); onChange(''); } }} />
      <button type="button" className="clearable-x" aria-label={`איפוס: ${label}`} disabled={!value}
        onMouseDown={(e) => e.preventDefault()}
        onClick={(e) => { onChange(''); (e.currentTarget.previousElementSibling as HTMLInputElement | null)?.focus(); }}>×</button>
    </span>
  );
});
export default SearchInput;
