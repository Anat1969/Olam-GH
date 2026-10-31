import { useEffect, useState } from 'react';
import { useRoute, href, go } from './route';
import { loadCloud, logout, toggleEditing, useCloud } from './cloud';
import LoginDialog from './components/LoginDialog';
import DraftDialog from './components/DraftDialog';
import Home from './pages/Home';
import TimelinePage from './pages/TimelinePage';
import Method from './pages/Method';
import Compare from './pages/Compare';
import MapPage from './pages/MapPage';
import GraphPage from './pages/GraphPage';
import SearchPage from './pages/SearchPage';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX { interface IntrinsicElements { 'ai-menu': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & { chat?: string } } }
}

const TABS: [string, string][] = [['timeline', 'ציר הזמן'], ['compare', 'השוואה'], ['map', 'מפה'], ['graph', 'גרף'], ['search', 'חיפוש'], ['method', 'מקורות']];

export default function App() {
  const { page, params } = useRoute();
  const cloud = useCloud();
  const [loginOpen, setLoginOpen] = useState(false);
  const [draftOpen, setDraftOpen] = useState(false);
  useEffect(() => { loadCloud(); }, []);
  // גובה הסרגל העליון משתנה (בטלפון הלשוניות בשורה שנייה). כרטיס הדמות ופס העריכה נצמדים מתחתיו.
  useEffect(() => {
    const bar = document.querySelector('.topbar');
    if (!bar) return;
    const set = () => document.documentElement.style.setProperty('--topbar-h', `${Math.round(bar.getBoundingClientRect().height)}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(bar);
    return () => ro.disconnect();
  }, []);
  // "/" מכל מקום פותח את החיפוש (כשלא מקלידים בשדה)
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey || t.closest('input, textarea, select, [contenteditable="true"]')) return;
      e.preventDefault();
      go('search');
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);
  // כל פעולות העריכה יושבות בתוך כפתור הלוגו, לפי תקן ai-menu
  useEffect(() => {
    const apply = () => {
      const menu = document.querySelector('ai-menu') as (HTMLElement & { items?: unknown; status?: string }) | null;
      if (!menu) return;
      menu.items = cloud.admin
        ? [
          { label: 'מצב עריכה', pressed: cloud.editing, onSelect: () => toggleEditing() },
          { label: 'גילוי חדש (טיוטה)', onSelect: () => setDraftOpen(true) },
          { label: `יציאה (${cloud.session?.email || ''})`, onSelect: () => logout() },
        ]
        : [{ label: 'כניסה לעריכה', onSelect: () => setLoginOpen(true) }];
      menu.status = cloud.editing ? (cloud.status || 'מצב עריכה') : '';
    };
    apply();
    customElements.whenDefined('ai-menu').then(apply);
  }, [cloud.admin, cloud.editing, cloud.status, cloud.session]);
  const current = TABS.some(([id]) => id === page) ? page : 'home';
  return (
    <>
      <header className="topbar">
        <div className="topbar-in">
          <a className="brand" href={href('home')} aria-label="עולם נעלם ומציאות מצוייה, לדף הבית">
            <img src="icon.svg" alt="" width={26} height={26} />
            <span>עולם נעלם</span>
          </a>
          <nav className="tabs" aria-label="ניווט">
            {TABS.map(([id, label]) => (
              <a key={id} className="tab" href={href(id)} aria-current={current === id ? 'page' : undefined}>{label}</a>
            ))}
          </nav>
          <ai-menu chat="https://claude.ai/code/session_018qeN17LAcGjZpUinASMoqS"></ai-menu>
        </div>
      </header>
      {loginOpen && <LoginDialog onClose={() => setLoginOpen(false)} />}
      {draftOpen && cloud.admin && <DraftDialog onClose={() => setDraftOpen(false)} />}
      {cloud.editing && <div className="edit-banner" role="status">מצב עריכה: לחצי על דמות או על קשר, וערכי את הטקסט. כל שינוי נשמר עם היסטוריה.</div>}
      {current === 'timeline' ? <TimelinePage params={params} /> : current === 'compare' ? <Compare params={params} /> : current === 'map' ? <MapPage params={params} /> : current === 'graph' ? <GraphPage params={params} /> : current === 'search' ? <SearchPage params={params} /> : current === 'method' ? <Method /> : <Home />}
    </>
  );
}
