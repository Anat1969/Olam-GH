// הנעלם: השכבה שמתחת לזכוכית. הלשוניות האחרות מראות מה נמצא, וזו מראה איך מוצאים, ומה עוד נעלם.
// ארבעה מסכים: בין השורות, מנגנוני הגילוי, מעבדת הנסתר, הגילוי הבא.
import { lazy, Suspense } from 'react';
import { replace } from '../route';
import { discoveries, links } from '../data';
import { domainMatrix } from '../hidden/metrics';
import { mechanisms } from '../hidden/model';
import Lines from './hidden/Lines';
import Mechanisms from './hidden/Mechanisms';
import Next from './hidden/Next';

const Lab = lazy(() => import('./hidden/Lab'));
const VIEWS: [string, string, string][] = [
  ['lines', 'בין השורות', 'מגמות שמתגלות רק כשקוראים את כל האטלס יחד'],
  ['mechanisms', 'מנגנוני הגילוי', 'תבניות החשיבה שמאחורי פריצות הדרך'],
  ['lab', 'מעבדת הנסתר', 'להפעיל מנגנון על תחום, ולקבל שאלה והשערה'],
  ['next', 'הגילוי הבא', 'שאלות פתוחות, חורים, וההשערות שלך'],
];

export default function Hidden({ params }: { params: Record<string, string> }) {
  const v = VIEWS.some(([id]) => id === params.v) ? params.v : 'lines';
  const { empty, total } = domainMatrix();
  return (
    <main className="page page-wide hidden-page">
      <div className="crumbs"><a href="#/">בית</a> / הנעלם</div>
      <header className="hd-hero">
        <p className="hd-words" aria-label="עולם, העלם, נעלם. מציאות, מצא, מציאה.">
          <span>עולם <i>·</i> העלם <i>·</i> <b>נעלם</b></span>
          <span>מציאות <i>·</i> מצא <i>·</i> <b>מציאה</b></span>
        </p>
        <h1 className="page-title">רב הנסתר על הגלוי.</h1>
        <p className="page-sub lines">
          <span>באטלס <bdi className="num">{discoveries.length}</bdi> גילויים ו-<bdi className="num">{links.length}</bdi> קשרים. <strong><bdi className="num">{empty.length}</bdi> מתוך <bdi className="num">{total}</bdi></strong> צירופי התחומים עוד ריקים.</span>
          <span>כאן קוראים את האטלס כמכלול, מחלצים <strong>{mechanisms.length} מנגנוני גילוי</strong>, ומפעילים אותם על מה שעוד לא ידוע.</span>
          <span className="muted small">הזיקה בין המילים היא רעיונית, לא טענה אטימולוגית.</span>
        </p>
      </header>
      <nav className="seg hd-views" aria-label="מסכי הנעלם">
        {VIEWS.map(([id, name, sub]) => (
          <button key={id} type="button" className="press chip hd-view" aria-pressed={v === id} data-v={id} title={sub} onClick={() => replace('hidden', { v: id })}>
            {name}<span className="hd-view-sub">{sub}</span>
          </button>
        ))}
        <div className="levels label hd-legend" aria-label="מקרא רמות הידע">
          <span className="lvl lvl-documented">ידע מבוסס</span><span className="lvl lvl-interpretive">פרשנות</span><span className="lvl lvl-hypothesis">השערה</span><span className="lvl lvl-possible">גילוי אפשרי</span>
        </div>
      </nav>
      {v === 'lines' && <Lines />}
      {v === 'mechanisms' && <Mechanisms open={params.m || null} onOpen={(m) => replace('hidden', { v: 'mechanisms', m: m || undefined })} />}
      {v === 'lab' && <Suspense fallback={<p className="muted">טוען את המעבדה…</p>}><Lab params={params} /></Suspense>}
      {v === 'next' && <Next />}
    </main>
  );
}
