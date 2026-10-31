import { useState } from 'react';
import Rich from '../components/Rich';
import { allDiscoveries, allLinks, allPersons, discoveries, persons, rejected, report, sources } from '../data';

export default function Method() {
  const [q, setQ] = useState('');
  const places = report.places;
  const placeDoc = places.filter((p) => p.ok && p.confidence === 'documented').length;
  const placeInt = places.filter((p) => p.ok && p.confidence === 'interpretive').length;
  const images = persons.filter((p) => p.imageUrl && p.imageLicense).length;
  const list = sources.filter((s) => !q || s.title.toLowerCase().includes(q.toLowerCase()));
  const kpis: [string, string][] = [
    ['גילויים מאומתים', `${discoveries.length}/${allDiscoveries.length}`],
    ['דמויות מאומתות', `${persons.length}/${allPersons.length}`],
    ['קשרים מאומתים', `${allLinks.filter((l) => l.verified).length}/${allLinks.length}`],
    ['תמונות עם רישיון', `${images}/${persons.length}`],
  ];

  return (
    <main className="page">
      <div className="crumbs"><a href="#/">בית</a> / שיטה ומקורות</div>
      <h1 className="page-title">כל רשומה נבדקת מול המקור שלה.</h1>
      <p className="page-sub lines">
        <span><strong>ציטוט מילולי</strong> מוויקיפדיה לכל גילוי ולכל קשר, ו<strong>נתונים מובנים</strong> מוויקינתונים לכל דמות.</span>
        <span>הציטוט מופיע עם <strong>תרגום לעברית</strong>, מסומן כתרגום. האימות נעשה תמיד על המקור באנגלית, כי רק כך אפשר לבדוק התאמה מילה במילה.</span>
        <span>הבדיקה רצה מחדש בכל עדכון. הבדיקה האחרונה: <bdi className="num">{report.date}</bdi>.</span>
      </p>

      <div className="grid-kpi">
        {kpis.map(([k, v]) => (
          <div key={k} className="card kpi"><div className="label">{k}</div><div className="kpi-v num">{v}</div></div>
        ))}
      </div>

      <h2 className="section-title">על מה הבדיקה נשענת</h2>
      <div className="grid-2">
        <div className="tone tone-neutral"><h4>גילוי</h4><p><Rich>{'הציטוט נמצא **מילה במילה** במאמר המקור, ו**השנה** מופיעה בתוך הציטוט.'}</Rich></p></div>
        <div className="tone tone-neutral"><h4>דמות</h4><p><Rich>{'שם עברי, תאריכים, **לוח שנה** (יוליאני או גרגוריאני) ומקום לידה נלקחים **רק** מוויקינתונים.'}</Rich></p></div>
        <div className="tone tone-neutral"><h4>קשר</h4><p><Rich>{'שני הקצוות קיימים, ו**כל ציטוט** שמבסס את הקשר נמצא במקור. קשר בלי ציטוט לא מוצג.'}</Rich></p></div>
        <div className="tone tone-neutral"><h4>תמונה</h4><p><Rich>{'רק מוויקישיתוף, ורק כש**הרישיון** כתוב בדף הקובץ. בלי רישיון, בלי תמונה.'}</Rich></p></div>
      </div>

      <h2 className="section-title">רמת הביטחון, בצבע</h2>
      <ul className="legend legend-wide">
        <li><span className="conf conf-documented">מתועד</span> הציטוט מהמקור אומר זאת במפורש. <bdi className="num">{placeDoc}</bdi> מקומות פעילות.</li>
        <li><span className="conf conf-interpretive">פרשנות מקובלת</span> המקור מצביע על כך, בלי לקבוע במפורש. <bdi className="num">{placeInt}</bdi> מקומות פעילות.</li>
        <li><span className="conf conf-hypothesis">הנחה</span> טרם אומת, ולכן לא מוצג בממשק.</li>
      </ul>

      <h2 className="section-title">מה לא עבר את הבדיקה</h2>
      {rejected.links.length + rejected.discoveries.length + rejected.persons.length === 0
        ? <p className="muted">כל הרשומות עברו.</p>
        : (
          <ul className="rejected">
            {rejected.discoveries.map((d) => <li key={d.id} className="tone tone-problem"><strong dir="ltr">{d.id}</strong> {d.title}</li>)}
            {rejected.persons.map((p) => <li key={p.id} className="tone tone-problem"><strong dir="ltr">{p.id}</strong> {p.wikipedia}</li>)}
            {rejected.links.map((l) => (
              <li key={l.id} className="tone tone-problem"><h4 dir="ltr">{l.id}</h4><p><Rich>{l.rejectedReason || l.explanation}</Rich></p></li>
            ))}
          </ul>
        )}

      <h2 className="section-title">מגבלות</h2>
      <div className="tone tone-insight">
        <p className="lines">
          <span><Rich>{'ויקיפדיה וויקינתונים הם **מקורות משניים**. השלב הבא: מקור אקדמי או ראשוני לכל רשומה.'}</Rich></span>
          <span><Rich>{'מקום הלידה מגיע בשם של היום. למשל **קלינינגרד** (Kaliningrad) ולא קניגסברג (Königsberg).'}</Rich></span>
          <span><Rich>{'**מקום הפעילות** הוא המקום שבו הדמות עבדה באותה תקופה, לא בהכרח מקום ההדפסה.'}</Rich></span>
        </p>
      </div>

      <h2 className="section-title">כל המקורות</h2>
      <label className="search">
        <span className="label">חיפוש במקורות</span>
        <input className="field" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="למשל Kepler" aria-label="חיפוש במקורות" />
      </label>
      {list.length === 0 ? <p className="muted">לא נמצא מקור בשם הזה. נסו מילה אחרת באנגלית.</p> : (
        <table className="src-table">
          <thead><tr><th>מקור</th><th>נבדק</th></tr></thead>
          <tbody>
            {list.map((s) => (
              <tr key={s.id}><td><a href={s.url} target="_blank" rel="noreferrer" dir="ltr">{s.title}</a></td><td><bdi className="num">{s.accessedAt}</bdi></td></tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
