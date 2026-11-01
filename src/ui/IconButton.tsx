// כפתורי תפעול: אייקון קו מינימלי, קומפקטי, בשורה בפינה. אותו סט בכל האפליקציה.
// כיוונים לפי קריאה מימין לשמאל: "קודם" (מוקדם בזמן) מצביע ימינה, "הבא" שמאלה.
const P: Record<string, string> = {
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  prev: '<path d="M9 5l7 7-7 7"/>',
  next: '<path d="M15 5l-7 7 7 7"/>',
  play: '<path d="M16 6 7 12l9 6z"/>',
  pause: '<path d="M9 6v12M15 6v12"/>',
  stop: '<rect x="7" y="7" width="10" height="10" rx="1"/>',
  card: '<circle cx="12" cy="8.5" r="3.2"/><path d="M5.5 19.5c.8-3.4 3.4-5.2 6.5-5.2s5.7 1.8 6.5 5.2"/>',
  work: '<rect x="4" y="5" width="16" height="14" rx="1"/><path d="M4 16l5-5 4 4 3-3 4 4"/>',
  zoomIn: '<path d="M4 12h4M16 12h4M8 9l-3 3 3 3M16 9l3 3-3 3"/>',
  zoomOut: '<path d="M3 12h5M16 12h5M5 9l3 3-3 3M19 9l-3 3 3 3"/>',
  back: '<path d="M13 6l6 6-6 6M5 6l6 6-6 6"/>',
  forward: '<path d="M11 6l-6 6 6 6M19 6l-6 6 6 6"/>',
  reset: '<path d="M5 12a7 7 0 1 0 2-5"/><path d="M5 4v4h4"/>',
  plus: '<path d="M12 6v12M6 12h12"/>',
  minus: '<path d="M6 12h12"/>',
};
export type IconName = keyof typeof P;

export default function IconButton({ icon, label, onClick, disabled, pressed, className = '' }: {
  icon: IconName; label: string; onClick?: () => void; disabled?: boolean; pressed?: boolean; className?: string;
}) {
  return (
    <button type="button" className={`icon-btn ${className}`} aria-label={label} title={label} disabled={disabled} aria-pressed={pressed} onClick={onClick}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: P[icon] }} />
    </button>
  );
}

/** שורת כפתורי תפעול בפינה */
export function IconRow({ children, label, className = '' }: { children: React.ReactNode; label: string; className?: string }) {
  return <div className={`icon-row ${className}`} role="group" aria-label={label}>{children}</div>;
}
