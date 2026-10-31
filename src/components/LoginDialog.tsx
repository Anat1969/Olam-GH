// כניסה לעריכה: אימייל וסיסמה (Google כבוי בפרויקט). נפתח מתוך כפתור הלוגו בלבד.
import { useEffect, useRef, useState } from 'react';
import { login } from '../cloud';

export default function LoginDialog({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const first = useRef<HTMLInputElement>(null);
  useEffect(() => {
    first.current?.focus();
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try { await login(email, password); onClose(); } catch (x) { setErr((x as Error).message); } finally { setBusy(false); }
  };
  return (
    <div className="dialog-back" onClick={onClose}>
      <form className="dialog card rise" role="dialog" aria-label="כניסה לעריכה" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2 className="city-title">כניסה לעריכה</h2>
        <p className="muted small">העריכה פתוחה רק למנהלת. אפשר לערוך כותרות, חידוש, תרומה, תובנה ויישום. ציטוטים, שנים ומקומות נבדקים בסקריפט האימות.</p>
        <label className="search"><span className="label">אימייל</span><input ref={first} className="field" type="email" dir="ltr" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <label className="search"><span className="label">סיסמה</span><input className="field" type="password" dir="ltr" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        {err && <p className="tone tone-problem" role="alert">{err}</p>}
        <div className="seg">
          <button type="submit" className="press btn btn-primary" disabled={busy}>{busy ? 'נכנסת…' : 'כניסה'}</button>
          <button type="button" className="press btn" onClick={onClose}>ביטול</button>
        </div>
      </form>
    </div>
  );
}
