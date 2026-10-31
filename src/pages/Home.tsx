import { useState } from 'react';
import Rich from '../components/Rich';
import { activeDomains, citiesRanking, crossLinks, discoveries, families, links, persons, sources } from '../data';
import { href } from '../route';
import { posScale } from '../components/Timeline';

// ערימת שכבות איזומטרית: ארבע משפחות הידע כגיליונות זכוכית. שכל מלאה, השאר ממתינות.
function LayerStack({ hover, setHover }: { hover: string | null; setHover: (id: string | null) => void }) {
  const W = 460, H = 360;
  const sheet = (y: number) => `M60 ${y} L230 ${y + 85} L400 ${y} L230 ${y - 85} Z`;
  const order = [...families].reverse(); // מלמטה למעלה
  const frac = (y: number) => posScale(y); // אותה דחיסה כמו בציר הזמן
  return (
    <svg className="stack" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="ארבע משפחות הידע כשכבות. שכבת שכל מכילה 40 גילויים מאומתים.">
      {order.map((f, i) => {
        const base = 290 - i * 62;
        const active = f.domains.some((d) => activeDomains.some((a) => a.id === d.id));
        const lift = hover === f.id ? -10 : 0;
        const y = base + lift;
        return (
          <g key={f.id} className={`slab${active ? ' is-active' : ''}${hover === f.id ? ' is-hover' : ''}`}
            onMouseEnter={() => setHover(f.id)} onMouseLeave={() => setHover(null)}>
            <path d={sheet(y)} fill={f.color} fillOpacity={active ? 0.2 : 0.08} stroke={f.color} strokeOpacity={active ? 0.9 : 0.45} />
            <path d={`M60 ${y} L230 ${y + 85} L230 ${y + 91} L60 ${y + 6} Z`} fill={f.color} fillOpacity={active ? 0.5 : 0.2} />
            <path d={`M230 ${y + 85} L400 ${y} L400 ${y + 6} L230 ${y + 91} Z`} fill={f.color} fillOpacity={active ? 0.35 : 0.14} />
            {active && discoveries.map((d) => {
              const cx = 392 - frac(d.yearFrom) * 324;
              const half = 85 * (1 - Math.abs(cx - 230) / 170);
              const side = d.domainId === 'physics' ? -1 : 1;
              return <circle key={d.id} className="stack-dot" cx={cx} cy={y + side * 0.42 * half} r={3.6}
                fill={d.domainId === 'physics' ? 'var(--physics)' : 'var(--mathematics)'} />;
            })}
          </g>
        );
      })}
    </svg>
  );
}

export default function Home() {
  const [hover, setHover] = useState<string | null>(null);
  const cities = citiesRanking();
  const top = cities[0];
  const span = discoveries[discoveries.length - 1].yearFrom - discoveries[0].yearFrom;
  const cross = crossLinks.length;
  const first = discoveries[0];
  const last = discoveries[discoveries.length - 1];

  return (
    <main className="page">
      <section className="hero">
        <div className="hero-text rise">
          <div className="label">שלב 0 ושלב 1 · <bdi className="num">{discoveries.length}</bdi> גילויים מאומתים</div>
          <h1 className="hero-title"><Rich>{`${discoveries.length} גילויים, ולכל אחד ציטוט מהמקור.`}</Rich></h1>
          <p className="hero-sub lines">
            <span><strong>פיזיקה</strong> ו<strong>מתמטיקה</strong> על ציר זמן אחד, לאורך <bdi className="num">{span.toLocaleString('en')}</bdi> שנה.</span>
            <span>מ<strong>{first.title.split(':')[0]}</strong> ועד <strong>{last.title.split(':')[0]}</strong>.</span>
          </p>
          <div className="hero-actions">
            <a className="press btn btn-primary" href={href('timeline', { d: 'physics' })}>לציר הזמן של הפיזיקה</a>
            <a className="press btn" href={href('compare')}>להשוואה בין התחומים</a>
          </div>
        </div>
        <div className="hero-object rise" style={{ animationDelay: '.12s' }}>
          <LayerStack hover={hover} setHover={setHover} />
          <ul className="stack-legend" aria-label="מקרא השכבות">
            {families.map((f) => {
              const active = f.domains.some((d) => activeDomains.some((a) => a.id === d.id));
              const n = discoveries.filter((d) => f.domains.some((x) => x.id === d.domainId)).length;
              return (
                <li key={f.id} className={hover === f.id ? 'is-hover' : ''} onMouseEnter={() => setHover(f.id)} onMouseLeave={() => setHover(null)}>
                  <span className="sw" style={{ background: f.color, opacity: active ? 1 : 0.4 }} />
                  <strong>{f.nameHe}</strong>
                  <span className="muted">{f.domains.map((d) => d.nameHe).join(', ')}</span>
                  <span className="lg-n">{active ? <bdi className="num">{n}</bdi> : 'בשלב הבא'}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <div className="grid-kpi">
        {[['גילויים', discoveries.length], ['דמויות', persons.length], ['קשרים מאומתים', links.length], ['מקורות', sources.length]].map(([k, v], i) => (
          <div key={k} className="card kpi rise" style={{ animationDelay: `${0.05 * i}s` }}>
            <div className="label">{k}</div><div className="kpi-v num">{v}</div>
          </div>
        ))}
      </div>

      <h2 className="section-title">למה ציר אחד</h2>
      <div className="grid-3">
        <div className="tone tone-problem"><h4>תחומים נלמדים בנפרד.</h4><p>פיזיקה ומתמטיקה נלמדות כשני מקצועות, והקשר ביניהם נעלם.</p></div>
        <div className="tone tone-solution"><h4>ציר משותף, וציטוט לכל טענה.</h4><p>כל גילוי מופיע עם <strong>ציטוט מילולי</strong> מהמקור, וכל קשר עם הכלל שמסביר אותו.</p></div>
        <div className="tone tone-insight"><h4>גילוי הוא תשובה לגילוי קודם.</h4><p><Rich>{`==${links.length} קשרים מאומתים==, ו-**${cross}** מהם חוצים בין פיזיקה למתמטיקה.`}</Rich></p></div>
      </div>

      <h2 className="section-title">מפת התוכן</h2>
      <div className="grid-3">
        {activeDomains.map((d) => {
          const list = discoveries.filter((x) => x.domainId === d.id);
          return (
            <a key={d.id} className="press card map-card" href={href('timeline', { d: d.id })}>
              <span className="label">ציר הזמן</span>
              <strong className="map-title">{d.nameHe}</strong>
              <span><bdi className="num">{list.length}</bdi> גילויים, <bdi className="num">{list[0].yearFrom < 0 ? `${-list[0].yearFrom}` : list[0].yearFrom}</bdi>{list[0].yearFrom < 0 ? ' לפנה״ס' : ''} עד <bdi className="num">{list[list.length - 1].yearFrom}</bdi></span>
            </a>
          );
        })}
        <a className="press card map-card" href={href('compare')}>
          <span className="label">השוואה בין תחומים</span>
          <strong className="map-title">פיזיקה מול מתמטיקה</strong>
          <span><bdi className="num">{cross}</bdi> קשרים חוצי תחום, עם כלל, תובנה ויישום</span>
        </a>
        <a className="press card map-card" href={href('method')}>
          <span className="label">שיטה ומקורות</span>
          <strong className="map-title">איך זה נבדק</strong>
          <span><bdi className="num">{sources.length}</bdi> מקורות, כל אחד עם תאריך בדיקה</span>
        </a>
      </div>

      <h2 className="section-title">ערי הידע</h2>
      <div className="cities card">
        <Rich as="p" className="cities-head">{`==${top.nameHe} מובילה: ${top.count} גילויים בעיר אחת.==`}</Rich>
        <ol className="city-bars">
          {cities.slice(0, 8).map((c) => (
            <li key={c.nameFull}>
              <span className="city-name">{c.nameHe} <span className="muted" dir="ltr">{c.nameFull}</span></span>
              <span className="city-bar" style={{ width: `${(c.count / top.count) * 100}%` }} />
              <bdi className="num">{c.count}</bdi>
            </li>
          ))}
        </ol>
        <p className="muted small">לפי מקום הפעילות של כל גילוי. אוניברסיטאות ומכונים נספרים בעיר שלהם.</p>
      </div>

      <h2 className="section-title">שכבת הידע</h2>
      <div className="museum">
        <figure className="pull">
          <blockquote>
            <p className="pull-he">אם ראיתי רחוק יותר, זה משום שעמדתי על כתפי ענקים.</p>
            <p className="pull-en" dir="ltr" lang="en">“If I have seen further it is by standing on the shoulders of giants.”</p>
          </blockquote>
          <figcaption className="label">
            אייזק ניוטון (Isaac Newton), מכתב לרוברט הוק (Robert Hooke), פברואר <bdi className="num">1675</bdi> ·{' '}
            <a href="https://en.wikipedia.org/wiki/Isaac_Newton" target="_blank" rel="noreferrer" dir="ltr">Isaac Newton, Wikipedia</a>
          </figcaption>
        </figure>
        <div className="haiku card">
          <p className="haiku-lines lines"><span>זכוכית על נייר</span><span>קו דק של דיו נמשך</span><span>העיר שמתחת</span></p>
          <p className="muted small">מה ההייקו מאיר: כל גילוי נכתב על גבי מה שכבר היה, כמו עיר שנבנתה מעל עיר קודמת.</p>
        </div>
      </div>

      <p className="inspire">בהשראת מפת הביוגרפיה של ג׳וזף פריסטלי (Joseph Priestley, A Chart of Biography), <bdi className="num">1765</bdi>.</p>
    </main>
  );
}
