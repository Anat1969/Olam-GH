/* <app-creations>: דף היצירות המשותף לאפליקציות של ענת.
 * כל נושא שעולה מהידע, ההבנה והיישום של אפליקציה הופך ל"חדר" עם יצירות בתשעה עיצובים:
 * poster (טקסט על תמונה), gradient (שדה צבע), veil (שקיפות), insight (תובנה), quote (ציטוט),
 * haiku (הייקו), post (פוסט), fromto (פרשנות ממה למה), essay (מאמר).
 * כל יצירה בפרופורציה של A4 (1:1.414), נמדדת ביחידות cqw ולכן זהה במסך, בהדפסה ובקובץ PNG.
 * שימוש: <script src="https://anat1969.github.io/AppOfApp-GH/creations.js"></script>
 *        <app-creations src="./creations.json"></app-creations>
 * תקן ומבנה הנתונים: docs/creations-standard.md
 */
(() => {
  if (customElements.get('app-creations')) return;
  const TAARUCHA = 'https://taarucha.vercel.app';
  const STYLE_HE = { poster: 'טקסט על תמונה', gradient: 'שדה צבע', veil: 'שקיפות', insight: 'תובנה', quote: 'ציטוט', haiku: 'הייקו', post: 'פוסט', fromto: 'ממה למה', essay: 'מאמר' };
  const ZONES = ['ידע', 'הבנה', 'יישום'];
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // טקסט עשיר מינימלי: **מודגש** ו-==מרקר==
  const rich = (s) => esc(s).replace(/==(.+?)==/g, '<mark>$1</mark>').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');

  const CSS = `
app-creations{display:block;direction:rtl;font-family:var(--cr-sans,"IBM Plex Sans Hebrew",system-ui,sans-serif);color:#1a1a18}
.cr-head{display:grid;gap:6px;margin:0 0 18px}
.cr-head h1{font-size:clamp(28px,3.4vw,46px);font-weight:700;line-height:1.05;margin:0;letter-spacing:-.01em}
.cr-why{margin:0;color:#55544f;font-size:15px;line-height:1.6}
.cr-why b{color:#1a1a18}
.cr-zones{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;max-width:520px;margin:6px 0 4px}
.cr-btn{font:inherit;font-size:13px;font-weight:500;padding:8px 12px;border:1px solid transparent;border-radius:0;background:#f0efeb;color:#1a1a18;cursor:pointer;text-align:center;text-decoration:none;box-shadow:0 1px 0 rgba(26,26,24,.06),0 2px 6px rgba(26,26,24,.08);transition:transform .15s,box-shadow .15s,background .15s;display:inline-flex;align-items:center;justify-content:center;gap:6px}
.cr-btn:hover{transform:translateY(-1px);box-shadow:0 2px 0 rgba(26,26,24,.08),0 8px 18px rgba(26,26,24,.12)}
.cr-btn:active{transform:translateY(1px);box-shadow:none}
.cr-btn:focus-visible{outline:2px solid var(--cr-accent,#1f3a68);outline-offset:2px}
.cr-btn.on,.cr-btn.primary{background:#1a1a18;color:#fff}
.cr-room{margin:28px 0 8px;padding-top:16px;border-top:2px solid #1a1a18}
.cr-room-hd{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:end;margin-bottom:12px}
.cr-zone{font-family:var(--cr-mono,"IBM Plex Mono","IBM Plex Sans Hebrew",monospace);font-size:11px;letter-spacing:.06em;color:var(--cr-accent,#1f3a68);font-weight:600}
.cr-room h2{font-size:clamp(20px,2vw,28px);margin:2px 0 4px;line-height:1.15}
.cr-room p.cr-sub{margin:0;color:#55544f;font-size:14px;line-height:1.55;max-width:70ch}
.cr-acts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;min-width:min(480px,100%)}
.cr-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:14px}
.cr-item{display:grid;gap:6px;min-width:0}
.cr-item-ft{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px;align-items:center}
.cr-item-ft .cr-lbl{font-family:var(--cr-mono,"IBM Plex Mono",monospace);font-size:10.5px;color:#85847e;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cr-item-ft .cr-btn{padding:4px 10px;font-size:12px}
.cr-open{all:unset;cursor:zoom-in;display:block}
.cr-open:focus-visible{outline:2px solid var(--cr-accent,#1f3a68);outline-offset:3px}
.cr-empty{padding:24px;background:#f6f5f1;color:#55544f}
@media (max-width:760px){.cr-room-hd{grid-template-columns:minmax(0,1fr)}.cr-acts{min-width:0}.cr-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}}
/* הגדלה בתוך הדף */
.cr-lb{position:fixed;inset:0;z-index:9000;background:rgba(18,18,16,.86);display:grid;place-items:center;padding:3vh 3vw;cursor:zoom-out}
.cr-lb .cr-card{height:min(92vh,calc(92vw*1.414));width:auto;box-shadow:0 30px 80px rgba(0,0,0,.5)}
.cr-lb-x{position:fixed;top:14px;left:14px;z-index:9001;background:#fff}

/* ───── היצירה: גיליון A4 שנמדד ביחידות של עצמו ───── */
.cr-card{--u:calc(var(--k,1)*1cqw);container-type:inline-size;aspect-ratio:1/1.4142;width:100%;position:relative;overflow:hidden;background:var(--cr-paper,#fff);color:var(--cr-ink,#1a1a18);box-shadow:0 2px 0 rgba(26,26,24,.08),0 12px 28px rgba(26,26,24,.14);direction:rtl;font-family:var(--cr-sans,"IBM Plex Sans Hebrew",system-ui,sans-serif)}
.cr-card *{box-sizing:border-box}
.cr-card mark{background:linear-gradient(transparent 52%,var(--cr-marker,#ffe45c) 52%);color:inherit;padding:0 .1em}
.cr-in{position:absolute;inset:0;padding:7cqw 7cqw 6cqw;display:grid;grid-template-rows:auto minmax(0,1fr) auto;gap:3cqw}
.cr-top{display:flex;justify-content:space-between;align-items:baseline;font-family:var(--cr-mono,"IBM Plex Mono","IBM Plex Sans Hebrew",monospace);font-size:calc(2.1*var(--u));letter-spacing:.06em;opacity:.8;gap:3cqw}
.cr-foot{display:flex;justify-content:space-between;align-items:end;font-size:calc(1.9*var(--u));opacity:.75;gap:3cqw;line-height:1.4}
.cr-foot b{font-weight:600}
.cr-serif{font-family:var(--cr-serif,"Frank Ruhl Libre","IBM Plex Sans Hebrew",serif)}
.cr-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
/* 1 טקסט על תמונה */
.cr-poster{background:#121212;color:#fff}
.cr-poster::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.35) 0%,rgba(0,0,0,0) 28%,rgba(0,0,0,.15) 52%,rgba(0,0,0,.86) 100%)}
.cr-poster .cr-in{z-index:1}
.cr-poster .cr-body{align-self:end;display:grid;gap:2.4cqw}
.cr-poster h3{font-size:calc(11*var(--u));line-height:.98;margin:0;font-weight:700;letter-spacing:-.01em;text-wrap:balance}
.cr-poster p{font-size:calc(3.4*var(--u));line-height:1.45;margin:0;max-width:78cqw;opacity:.92}
/* 2 שדה צבע */
.cr-gradient{color:#fff;background:radial-gradient(120% 90% at 85% 10%,var(--cr-c,#b8700f) 0%,transparent 55%),radial-gradient(110% 80% at 10% 95%,var(--cr-b,#a3261e) 0%,transparent 60%),linear-gradient(160deg,var(--cr-a,#1f3a68),#121212)}
.cr-gradient .cr-body{align-self:center;display:grid;gap:4cqw}
.cr-gradient h3{font-size:calc(9.6*var(--u));line-height:1.04;margin:0;font-weight:700;text-wrap:balance}
.cr-gradient p{font-size:calc(3.6*var(--u));line-height:1.5;margin:0;max-width:70cqw;opacity:.9}
.cr-gradient .cr-rule{width:18cqw;height:.7cqw;background:#fff;opacity:.85}
/* 3 שקיפות */
.cr-veil{background:#222}
.cr-veil .cr-in{z-index:1}
.cr-veil .cr-glass{align-self:center;justify-self:stretch;padding:6cqw;background:rgba(255,255,255,.62);backdrop-filter:blur(14px) saturate(1.2);-webkit-backdrop-filter:blur(14px) saturate(1.2);border-top:.8cqw solid var(--cr-a,#1f3a68);display:grid;gap:2.6cqw;box-shadow:0 2cqw 6cqw rgba(0,0,0,.25)}
.cr-veil h3{font-size:calc(7.4*var(--u));line-height:1.08;margin:0;font-weight:700}
.cr-veil p{font-size:calc(3.3*var(--u));line-height:1.55;margin:0}
.cr-veil .cr-top,.cr-veil .cr-foot{color:#fff;text-shadow:0 1px 6px rgba(0,0,0,.6)}
/* 4 תובנה */
.cr-insight .cr-body{align-self:center;display:grid;gap:4.5cqw}
.cr-insight .cr-k{font-family:var(--cr-mono,"IBM Plex Mono",monospace);font-size:calc(2.4*var(--u));letter-spacing:.08em;color:var(--cr-accent,#1d7a4f);font-weight:600}
.cr-insight h3{font-size:calc(10*var(--u));line-height:1.06;margin:0;font-weight:700;text-wrap:balance}
.cr-insight p{font-size:calc(3.6*var(--u));line-height:1.6;margin:0;color:#55544f;max-width:74cqw;border-inline-start:.7cqw solid var(--cr-marker,#ffe45c);padding-inline-start:3cqw}
/* 5 ציטוט */
.cr-quote .cr-body{align-self:center;display:grid;gap:4cqw;position:relative}
.cr-quote .cr-qm{font-size:calc(40*var(--u));line-height:.6;color:var(--cr-a,#1f3a68);opacity:.14;position:absolute;top:-6cqw;right:-3cqw;font-family:var(--cr-serif,"Frank Ruhl Libre",serif)}
.cr-quote blockquote{margin:0;font-size:calc(8.4*var(--u));line-height:1.22;font-weight:700;position:relative;text-wrap:balance}
.cr-quote cite{font-style:normal;font-size:calc(2.8*var(--u));color:#55544f;border-top:.35cqw solid currentColor;padding-top:2cqw;display:block;max-width:60cqw}
.cr-quote cite b{color:#1a1a18;font-size:calc(3.4*var(--u));display:block}
/* 6 הייקו */
.cr-haiku{background:var(--cr-paper2,#f6f4ee)}
.cr-haiku .cr-body{align-self:center;justify-self:center;text-align:center;display:grid;gap:6cqw}
.cr-haiku .cr-lines{display:grid;gap:3.4cqw}
.cr-haiku .cr-lines span{font-size:calc(7.2*var(--u));line-height:1.2}
.cr-haiku .cr-lines span:nth-child(2){padding-inline-start:10cqw}
.cr-haiku .cr-lines span:nth-child(3){padding-inline-start:20cqw}
.cr-haiku .cr-seal{width:7cqw;height:7cqw;background:var(--cr-b,#a3261e);justify-self:center;opacity:.9}
.cr-haiku p{font-size:calc(2.6*var(--u));color:#85847e;margin:0;max-width:60cqw;justify-self:center}
/* 7 פוסט */
.cr-post{background:var(--cr-paper2,#f6f4ee)}
.cr-post .cr-body{align-self:center;min-height:0;max-height:100%;background:#fff;box-shadow:0 1.5cqw 5cqw rgba(26,26,24,.14);display:grid;grid-template-rows:auto auto auto;overflow:hidden}
.cr-post .cr-ph{display:flex;align-items:center;gap:2.4cqw;padding:3.4cqw 4cqw}
.cr-post .cr-av{width:7cqw;height:7cqw;background:var(--cr-a,#1f3a68);color:#fff;display:grid;place-items:center;font-size:calc(2.6*var(--u));font-weight:700;flex:none}
.cr-post .cr-ph b{font-size:calc(3*var(--u));display:block}.cr-post .cr-ph span{font-size:calc(2.2*var(--u));color:#85847e}
.cr-post .cr-pimg{width:100%;aspect-ratio:16/9;object-fit:cover;display:block}
.cr-post .cr-ptxt{padding:3.6cqw 4cqw 4.4cqw;font-size:calc(3.1*var(--u));line-height:1.55;display:grid;gap:1.6cqw}
.cr-post .cr-ptxt h3{font-size:calc(4.6*var(--u));margin:0;line-height:1.2}
.cr-post .cr-tags{color:var(--cr-a,#1f3a68);font-size:calc(2.6*var(--u))}
/* 8 ממה למה */
.cr-fromto .cr-body{align-self:center;display:grid;gap:5cqw}
.cr-fromto h3{font-size:calc(6.4*var(--u));line-height:1.1;margin:0;font-weight:700}
.cr-fromto .cr-ft{display:grid;grid-template-columns:minmax(0,1fr) 8cqw minmax(0,1fr);align-items:stretch}
.cr-fromto .cr-side{padding:4cqw 3.6cqw;display:grid;gap:2cqw;align-content:start}
.cr-fromto .cr-side.f{background:var(--cr-b-wash,#fbeceb);border-top:.8cqw solid var(--cr-b,#a3261e)}
.cr-fromto .cr-side.t{background:var(--cr-s-wash,#e4f3eb);border-top:.8cqw solid var(--cr-s,#1d7a4f)}
.cr-fromto .cr-side span{font-family:var(--cr-mono,"IBM Plex Mono",monospace);font-size:calc(2.2*var(--u));letter-spacing:.08em;font-weight:600}
.cr-fromto .cr-side.f span{color:var(--cr-b,#a3261e)}.cr-fromto .cr-side.t span{color:var(--cr-s,#1d7a4f)}
.cr-fromto .cr-side p{font-size:calc(3.7*var(--u));line-height:1.4;margin:0;font-weight:600}
.cr-fromto .cr-axis{position:relative}
.cr-fromto .cr-axis::before{content:"";position:absolute;top:50%;right:1.2cqw;left:1.2cqw;height:.45cqw;background:#1a1a18}
.cr-fromto .cr-axis::after{content:"";position:absolute;top:calc(50% - 1.5cqw);left:.6cqw;border:1.7cqw solid transparent;border-right:2.4cqw solid #1a1a18;border-left:0}
.cr-fromto .cr-pivot{font-size:calc(3.6*var(--u));line-height:1.55;margin:0;color:#55544f}
/* 9 מאמר */
.cr-essay .cr-in{grid-template-rows:auto auto minmax(0,1fr) auto}
.cr-essay .cr-eh{display:grid;gap:1.6cqw;border-bottom:.5cqw solid #1a1a18;padding-bottom:3cqw}
.cr-essay h3{font-size:calc(7.4*var(--u));line-height:1.02;margin:0;font-weight:700}
.cr-essay .cr-lead{font-size:calc(3*var(--u));line-height:1.5;margin:0;color:#55544f}
.cr-essay .cr-eimg{height:30cqw;width:100%;object-fit:cover;display:block}
.cr-essay .cr-cols{column-count:2;column-gap:5cqw;column-rule:.15cqw solid #e5e4e0;font-size:calc(2.55*var(--u));line-height:1.62;overflow:hidden;text-align:justify}
.cr-essay .cr-cols p{margin:0 0 1.8cqw}
.cr-essay .cr-cols p:first-child::first-letter{font-family:var(--cr-serif,"Frank Ruhl Libre",serif);float:right;font-size:calc(8.6*var(--u));line-height:.8;padding-inline-end:1.4cqw;padding-top:.6cqw;font-weight:700}

/* הדפסה: רק היצירות שנבחרו, גיליון A4 לכל יצירה */
.cr-print{display:none}
@media print{
  html.cr-printing body>*:not(.cr-print){display:none!important}
  html.cr-printing .cr-print{display:block}
  html.cr-printing .cr-print .cr-card{width:210mm;height:297mm;aspect-ratio:auto;box-shadow:none;break-after:page;page-break-after:always}
  html.cr-printing body{margin:0;background:#fff}
  @page{size:A4;margin:0}
}
/* מצב צילום: יצירה אחת במסך, לייצוא PNG */
html.cr-shot body>*:not(.cr-shot-stage){display:none!important}
.cr-shot-stage{position:fixed;inset:0;background:#fff;display:grid;place-items:start;z-index:99999}
.cr-shot-stage .cr-card{width:1240px;box-shadow:none}
`;


  // התאמה לגיליון: אם טקסט גולש מהמסגרת, כל הטקסט ביצירה קטן יחד (עד 55%), כמו בעימוד מקצועי
  // גלישה = גוש הטקסט חוצה את שורת הכותרת או את התחתית, או שתוכן נחתך בתוך מסגרת סגורה (עמודות, פוסט)
  const clipped = (el) => getComputedStyle(el).overflow !== 'visible' && (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1);
  function fitCard(cardEl) {
    const inn = cardEl.querySelector('.cr-in'); if (!inn) return;
    const top = inn.querySelector(':scope>.cr-top'), foot = inn.querySelector(':scope>.cr-foot');
    const mids = [...inn.children].filter((e) => e !== top && e !== foot);
    const bad = () => {
      const tb = top ? top.getBoundingClientRect().bottom : -1e9, fb = foot ? foot.getBoundingClientRect().top : 1e9;
      return mids.some((m) => { const r = m.getBoundingClientRect(); return r.top < tb - 1 || r.bottom > fb + 1; })
        || [...inn.querySelectorAll('.cr-cols,.cr-ptxt,.cr-post .cr-body')].some(clipped);
    };
    let k = 1; cardEl.style.setProperty('--k', 1);
    while (k > 0.55 && bad()) { k = Math.round((k - 0.04) * 100) / 100; cardEl.style.setProperty('--k', k); }
    cardEl.dataset.fit = bad() ? 'over' : k;
  }
  async function fitAll(root) {
    const imgs = [...root.querySelectorAll('img')];
    await Promise.all(imgs.map((im) => (im.complete ? 0 : new Promise((r) => { im.onload = im.onerror = r; }))));
    if (document.fonts) await document.fonts.ready;
    root.querySelectorAll('.cr-card').forEach(fitCard);
  }

  function card(c, t, app, base) {
    const img = (u) => (u ? new URL(u, base).href : '');
    const top = `<div class="cr-top"><span>${esc(app.name)}</span><span>${esc(t.zone || '')} · ${esc(STYLE_HE[c.style] || '')}</span></div>`;
    const foot = `<div class="cr-foot"><span><b>${esc(c.kicker || t.title)}</b>${c.credit ? `<br>${esc(c.credit)}` : ''}</span><span>אד' ענת שטיבלמן A&amp;I</span></div>`;
    const bg = c.image ? `<img class="cr-img" src="${esc(img(c.image))}" alt="" ${c.pos ? `style="object-position:${esc(c.pos)}"` : ''} crossorigin="anonymous">` : '';
    let body = '';
    switch (c.style) {
      case 'poster': body = `${bg}<div class="cr-in">${top}<div class="cr-body"><h3 class="cr-serif">${rich(c.title)}</h3>${c.text ? `<p>${rich(c.text)}</p>` : ''}</div>${foot}</div>`; break;
      case 'gradient': body = `<div class="cr-in">${top}<div class="cr-body"><span class="cr-rule"></span><h3>${rich(c.title)}</h3>${c.text ? `<p>${rich(c.text)}</p>` : ''}</div>${foot}</div>`; break;
      case 'veil': body = `${bg}<div class="cr-in">${top}<div class="cr-glass"><h3 class="cr-serif">${rich(c.title)}</h3>${c.text ? `<p>${rich(c.text)}</p>` : ''}</div>${foot}</div>`; break;
      case 'insight': body = `<div class="cr-in">${top}<div class="cr-body"><span class="cr-k">התובנה</span><h3>${rich(c.title)}</h3>${c.text ? `<p>${rich(c.text)}</p>` : ''}</div>${foot}</div>`; break;
      case 'quote': body = `<div class="cr-in">${top}<div class="cr-body"><span class="cr-qm" aria-hidden="true">"</span><blockquote class="cr-serif">${rich(c.quote || c.title)}</blockquote><cite>${c.who ? `<b>${esc(c.who)}</b>` : ''}${esc(c.cite || '')}</cite></div>${foot}</div>`; break;
      case 'haiku': body = `<div class="cr-in">${top}<div class="cr-body"><div class="cr-lines cr-serif">${(c.lines || []).map((l) => `<span>${esc(l)}</span>`).join('')}</div><span class="cr-seal" aria-hidden="true"></span>${c.text ? `<p>${rich(c.text)}</p>` : ''}</div>${foot}</div>`; break;
      case 'post': body = `<div class="cr-in">${top}<div class="cr-body"><div class="cr-ph"><span class="cr-av">A&amp;I</span><div><b>${esc(app.name)}</b><span>${esc(t.title)}</span></div></div>${c.image ? `<img class="cr-pimg" src="${esc(img(c.image))}" alt="" ${c.pos ? `style="object-position:${esc(c.pos)}"` : ''} crossorigin="anonymous">` : ''}<div class="cr-ptxt"><h3>${rich(c.title)}</h3>${(c.text || '').split('\n').map((l) => `<span>${rich(l)}</span>`).join('')}${c.tags ? `<span class="cr-tags">${c.tags.map((x) => '#' + esc(x)).join(' ')}</span>` : ''}</div></div>${foot}</div>`; break;
      case 'fromto': body = `<div class="cr-in">${top}<div class="cr-body"><h3>${rich(c.title)}</h3><div class="cr-ft"><div class="cr-side f"><span>${esc(c.fromLabel || 'ממה')}</span><p>${rich(c.from)}</p></div><div class="cr-axis" aria-hidden="true"></div><div class="cr-side t"><span>${esc(c.toLabel || 'למה')}</span><p>${rich(c.to)}</p></div></div>${c.text ? `<p class="cr-pivot">${rich(c.text)}</p>` : ''}</div>${foot}</div>`; break;
      case 'essay': body = `<div class="cr-in">${top}<div class="cr-eh"><h3 class="cr-serif">${rich(c.title)}</h3>${c.text ? `<p class="cr-lead">${rich(c.text)}</p>` : ''}</div><div style="display:grid;grid-template-rows:auto minmax(0,1fr);gap:3cqw;min-height:0">${c.image ? `<img class="cr-eimg" src="${esc(img(c.image))}" alt="" ${c.pos ? `style="object-position:${esc(c.pos)}"` : ''} crossorigin="anonymous">` : '<span></span>'}<div class="cr-cols">${(c.body || []).map((p) => `<p>${rich(p)}</p>`).join('')}</div></div>${foot}</div>`; break;
      default: body = `<div class="cr-in">${top}<div><h3>${rich(c.title)}</h3></div>${foot}</div>`;
    }
    return `<div class="cr-card cr-${esc(c.style)}" data-cr="${esc(t.id)}/${esc(c.id)}">${body}</div>`;
  }

  class AppCreations extends HTMLElement {
    async connectedCallback() {
      if (!document.getElementById('cr-css')) { const s = document.createElement('style'); s.id = 'cr-css'; s.textContent = CSS; document.head.appendChild(s); }
      const src = this.getAttribute('src') || './creations.json';
      this.base = new URL(src, location.href).href;
      this.innerHTML = '<p class="cr-empty">טוען יצירות…</p>';
      try {
        const r = await fetch(this.base, { cache: 'no-cache' });
        if (!r.ok) throw new Error(r.status);
        this.data = await r.json();
      } catch (e) {
        this.innerHTML = `<p class="cr-empty">קובץ היצירות לא נטען (${esc(src)}). בדקו שהקובץ קיים בתיקיית public של האפליקציה.</p>`;
        return;
      }
      const p = this.data.app.palette || {};
      for (const [k, v] of Object.entries(p)) this.style.setProperty('--cr-' + k, v);
      this.zone = new URLSearchParams(location.hash.split('?')[1] || location.search).get('zone') || '';
      const shot = new URLSearchParams(location.search).get('cr');
      if (shot) return this.shot(shot);
      this.render();
    }
    get all() { return this.data.topics.flatMap((t) => t.creations.map((c) => ({ c, t }))); }
    render() {
      const { app, topics } = this.data;
      const n = this.all.length;
      const shown = topics.filter((t) => !this.zone || t.zone === this.zone);
      const jsonAbs = this.base;
      this.innerHTML = `
        <header class="cr-head">
          <span class="cr-zone">יצירות</span>
          <h1>${esc(this.getAttribute('heading') || 'מה האפליקציה יוצרת')}</h1>
          <p class="cr-why">כל נושא שעולה מ<b>ידע</b>, <b>הבנה</b> ו<b>יישום</b> הוא חדר: <b>${topics.length}</b> חדרים, <b>${n}</b> יצירות בתשעה עיצובים. כל יצירה מוכנה לחדר בתערוכה ולהדפסה בגודל A4.</p>
          <div class="cr-zones" role="group" aria-label="סינון לפי שלב">
            ${['', ...ZONES].map((z) => `<button class="cr-btn${this.zone === z ? ' on' : ''}" data-zone="${z}" aria-pressed="${this.zone === z}">${z || 'הכול'}</button>`).join('')}
          </div>
        </header>
        ${shown.map((t) => `
          <section class="cr-room" id="cr-${esc(t.id)}">
            <div class="cr-room-hd">
              <div><span class="cr-zone">${esc(t.zone)} · חדר ${topics.indexOf(t) + 1} מתוך ${topics.length}</span><h2>${esc(t.title)}</h2>${t.sub ? `<p class="cr-sub">${rich(t.sub)}</p>` : ''}</div>
              <div class="cr-acts">
                <button class="cr-btn primary" data-print="${esc(t.id)}" title="כל יצירות החדר, יצירה אחת בכל עמוד A4">הדפסת החדר A4</button>
                <a class="cr-btn" href="${TAARUCHA}/studio/import?src=${encodeURIComponent(jsonAbs)}&topic=${encodeURIComponent(t.id)}" target="_blank" rel="noopener" title="יוצר בתערוכות חדר לנושא, והיצירות נתלות על הקירות שלו">העלאה לחדר בתערוכה</a>
                ${t.room ? `<a class="cr-btn" href="${TAARUCHA}/e/${esc(t.room)}" target="_blank" rel="noopener">כניסה לחדר</a>` : `<span class="cr-btn" aria-disabled="true" style="opacity:.45;cursor:default" title="החדר עוד לא הועלה">כניסה לחדר</span>`}
              </div>
            </div>
            <div class="cr-grid">
              ${t.creations.map((c) => `<div class="cr-item"><button class="cr-open" data-open="${esc(t.id)}/${esc(c.id)}" aria-label="הגדלה: ${esc(c.title || c.quote || STYLE_HE[c.style])}">${card(c, t, app, this.base)}</button>
                <div class="cr-item-ft"><span class="cr-lbl">${esc(STYLE_HE[c.style] || c.style)}</span><button class="cr-btn" data-print="${esc(t.id)}/${esc(c.id)}">הדפסה A4</button></div></div>`).join('')}
            </div>
          </section>`).join('')}
        <p class="cr-why" style="margin-top:20px">הדפסה: בחלון ההדפסה בוחרים "שמירה כ-PDF", גודל A4, בלי שוליים.</p>`;
      fitAll(this);
      this.onclick = (e) => {
        const z = e.target.closest('[data-zone]'); if (z) { this.zone = z.dataset.zone; this.render(); return; }
        const pr = e.target.closest('[data-print]'); if (pr) { this.print(pr.dataset.print); return; }
        const op = e.target.closest('[data-open]'); if (op) this.open(op.dataset.open);
      };
    }
    find(key) { const [tid, cid] = key.split('/'); const t = this.data.topics.find((x) => x.id === tid); return { t, list: cid ? t.creations.filter((c) => c.id === cid) : t.creations }; }
    open(key) {
      const { t, list } = this.find(key);
      const lb = document.createElement('div');
      lb.className = 'cr-lb'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-label', 'יצירה מוגדלת');
      for (const [k, v] of Object.entries(this.data.app.palette || {})) lb.style.setProperty('--cr-' + k, v);
      lb.innerHTML = card(list[0], t, this.data.app, this.base) + '<button class="cr-btn cr-lb-x" aria-label="סגירה">×</button>';
      const close = () => { lb.remove(); document.removeEventListener('keydown', onKey); };
      const onKey = (e) => { if (e.key === 'Escape') close(); };
      lb.onclick = close; document.addEventListener('keydown', onKey);
      document.body.appendChild(lb); fitAll(lb); lb.querySelector('.cr-lb-x').focus();
    }
    print(key) {
      const { t, list } = this.find(key);
      const box = document.createElement('div');
      box.className = 'cr-print';
      for (const [k, v] of Object.entries(this.data.app.palette || {})) box.style.setProperty('--cr-' + k, v);
      box.innerHTML = list.map((c) => card(c, t, this.data.app, this.base)).join('');
      document.body.appendChild(box);
      document.documentElement.classList.add('cr-printing');
      const done = () => { box.remove(); document.documentElement.classList.remove('cr-printing'); window.removeEventListener('afterprint', done); };
      window.addEventListener('afterprint', done);
      // הגיליון בהדפסה רחב יותר מבמסך: מודדים אחרי שמצב ההדפסה פעיל
      box.style.cssText += ';display:block;position:absolute;left:-99999px;top:0;width:210mm';
      box.querySelectorAll('.cr-card').forEach((c) => { c.style.width = '210mm'; });
      fitAll(box).then(() => { box.style.cssText = box.style.cssText.replace(/display:block;position:absolute;left:-99999px;top:0;width:210mm;?/, ''); window.print(); });
    }
    // ?cr=<topic>/<creation>: יצירה אחת ברוחב 1240 פיקסלים, לצילום PNG (tools/creations-render.cjs)
    shot(key) {
      const { t, list } = this.find(key);
      const st = document.createElement('div');
      st.className = 'cr-shot-stage';
      for (const [k, v] of Object.entries(this.data.app.palette || {})) st.style.setProperty('--cr-' + k, v);
      st.innerHTML = card(list[0], t, this.data.app, this.base);
      document.body.appendChild(st);
      document.documentElement.classList.add('cr-shot');
      this.innerHTML = '';
      fitAll(st).then(() => st.setAttribute('data-ready', '1'));
    }
  }
  customElements.define('app-creations', AppCreations);
})();
