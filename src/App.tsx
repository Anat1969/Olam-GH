import { useRoute, href } from './route';
import Home from './pages/Home';
import TimelinePage from './pages/TimelinePage';
import Method from './pages/Method';
import Compare from './pages/Compare';
import MapPage from './pages/MapPage';
import GraphPage from './pages/GraphPage';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX { interface IntrinsicElements { 'ai-menu': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & { chat?: string } } }
}

const TABS: [string, string][] = [['timeline', 'ציר הזמן'], ['compare', 'השוואה'], ['map', 'מפה'], ['graph', 'גרף'], ['method', 'מקורות']];

export default function App() {
  const { page, params } = useRoute();
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
      {current === 'timeline' ? <TimelinePage params={params} /> : current === 'compare' ? <Compare params={params} /> : current === 'map' ? <MapPage params={params} /> : current === 'graph' ? <GraphPage params={params} /> : current === 'method' ? <Method /> : <Home />}
    </>
  );
}
