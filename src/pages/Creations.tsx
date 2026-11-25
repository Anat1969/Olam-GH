// יצירות: שני מסכים. כתבות A4 (הרכיב המשותף <app-creations>), וארבעה תוצרים (כתבה, מאמר, מסה, יצירה).
// הרכיב המשותף מציג חדרים, מדפיס A4 ומעלה לחדר ב-TAARUCHA. הנתונים: public/creations.json, נגזר מ-data/ ב-tools/creations.mjs.
// ארבעת התוצרים: data/outputs.json, לפי הסקיל anat-outputs ב-Claude-GH.
import { replace } from '../route';
import Outputs from './outputs/Outputs';

export default function Creations({ params = {} }: { params?: Record<string, string> }) {
  const v = params.v === 'outputs' ? 'outputs' : 'sheets';
  return (
    <main className={`page creations-page${v === 'outputs' ? ' page-wide' : ''}`}>
      <nav className="seg hd-views" aria-label="מסכי היצירות">
        <button type="button" className="press chip hd-view" aria-pressed={v === 'outputs'} data-v="outputs" onClick={() => replace('creations', { v: 'outputs' })}>
          ארבעה תוצרים<span className="hd-view-sub">כתבה, מאמר, מסה ויצירה, ומעבר ביניהם</span>
        </button>
        <button type="button" className="press chip hd-view" aria-pressed={v === 'sheets'} data-v="sheets" onClick={() => replace('creations', {})}>
          לוחות A4<span className="hd-view-sub">כתבה אחת לכל חדר, להדפסה ולמוזיאון</span>
        </button>
      </nav>
      {v === 'outputs' ? <Outputs params={params} /> : <app-creations src="./creations.json" heading="מה העולם הנעלם יוצר" />}
    </main>
  );
}
