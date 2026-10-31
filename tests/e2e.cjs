// בדיקת קצה לקצה מול vite preview: node tests/e2e.cjs (אחרי npm run build)
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const PORT = 4199;
const BASE = `http://localhost:${PORT}/`;
const MENU = fs.readFileSync(path.join(__dirname, 'fixtures/ai-menu.js'), 'utf8');
const fails = [];
// ספירות צפויות נגזרות מהנתונים עצמם, כדי שהבדיקות לא יישברו כשנוסף תוכן מאומת
const DATA = path.join(__dirname, '..', 'data');
const read = (f) => JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'));
const DISC = read('discoveries.json').discoveries.filter((d) => d.verified);
const PERS = read('persons.json').persons.filter((x) => x.verified);
const DOMS = [...new Set(DISC.map((d) => d.domainId))];
const N = DISC.length;
const FIELDS = read('fields.json').families.flatMap((f) => f.domains);
const inDomain = (id) => DISC.filter((d) => d.domainId === id).length;
const parisPeople = new Set(DISC.filter((d) => d.place && d.place.city.nameFull === 'Paris').flatMap((d) => d.personIds)).size;
const ok = (cond, msg) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) fails.push(msg); };
const h1 = (p) => p.locator('h1').innerText();
const waitH1 = (p, part) => p.waitForFunction((t) => document.querySelector('h1')?.innerText.includes(t), part, { timeout: 5000 }).catch(() => {});
// Supabase מדומה: טקסט אחד ערוך בענן, כניסה, בדיקת מנהלת ושמירה
const patches = [];
const posts = [];
const CLOUD_NOVELTY = 'חידוש שנערך בענן לבדיקה.';
const mockCloud = async (p, mode = 'ok') => {
  await p.route('**/ktqmwpbzcnzkhjskqisy.supabase.co/**', async (r) => {
    const u = r.request().url();
    if (mode === 'down') return r.abort();
    if (u.includes('/auth/v1/token')) return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ access_token: 'test-token', expires_in: 3600, user: { email: 'shtanat5@gmail.com' } }) });
    if (u.includes('/olam_admins')) return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ email: 'shtanat5@gmail.com' }]) });
    if (r.request().method() === 'POST' && u.includes('/rest/v1/olam_records')) { posts.push(JSON.parse(r.request().postData() || '{}')); return r.fulfill({ status: 201, body: '' }); }
    if (u.includes('id=like.draft')) return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(posts.map((x) => ({ id: x.id, data: x.data }))) });
    if (r.request().method() === 'PATCH') { patches.push({ url: u, body: JSON.parse(r.request().postData() || '{}') }); return r.fulfill({ status: 204, body: '' }); }
    if (u.includes('select=data&')) return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ data: { id: 'x', title: 'x' } }]) });
    if (u.includes('/olam_records')) return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ kind: 'discovery', id: 'd-1687-newton-principia', data: { novelty: CLOUD_NOVELTY, evidence: 'מנסה לדרוס ציטוט' } }]) });
    return r.fulfill({ status: 404, body: '' });
  });
};
// טקסט שעולה על טקסט (בלי מה שמוסתר מתחת לשכבה אטומה)
const overlaps = (p) => p.evaluate(() => {
        const rects = [];
        const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        while (w.nextNode()) {
          const t = w.currentNode; if (!t.textContent.trim()) continue;
          const el = t.parentElement; const cs = getComputedStyle(el);
          if (cs.visibility === 'hidden' || +cs.opacity === 0 || el.closest('[aria-hidden="true"]:not(svg)')) continue;
          const r = document.createRange(); r.selectNodeContents(t);
          for (const q of r.getClientRects()) if (q.width > 2 && q.height > 2 && q.bottom > 0 && q.top < innerHeight * 3) rects.push({ q, el, txt: t.textContent.trim().slice(0, 30) });
        }
        const out = [];
        for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
          const a = rects[i], c = rects[j]; if (a.el === c.el || a.el.contains(c.el) || c.el.contains(a.el)) continue;
          const x = Math.min(a.q.right, c.q.right) - Math.max(a.q.left, c.q.left), y = Math.min(a.q.bottom, c.q.bottom) - Math.max(a.q.top, c.q.top);
          if (x <= 0 || y <= 0) continue;
          const small = Math.min(a.q.width * a.q.height, c.q.width * c.q.height);
          if (x * y <= 0.3 * small) continue;
          // מוסתר מתחת לשכבה אטומה? בודקים את האלמנט העליון במרכז החפיפה
          const px = Math.max(a.q.left, c.q.left) + x / 2, py = Math.max(a.q.top, c.q.top) + y / 2;
          if (py < 0 || py > innerHeight) continue;
          const top = document.elementFromPoint(px, py);
          const lower = top && (a.el.contains(top) || top.contains(a.el) || top === a.el) ? c.el : a.el;
          let n = top, occluded = false;
          while (n && n !== document.body && !n.contains(lower)) { const bg = getComputedStyle(n).backgroundColor; if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent' && !bg.endsWith(', 0)')) { occluded = true; break; } n = n.parentElement; }
          if (occluded) continue;
          if (true) out.push(`${a.txt} ⟂ ${c.txt} [${(a.el.getAttribute('class') || a.el.tagName)}|${(c.el.getAttribute('class') || c.el.tagName)}]`);
        }
        return [...new Set(out)].slice(0, 25);
      });
const mock = async (p) => {
  await mockCloud(p);
  await p.route('**/appofapp-gh.vercel.app/**', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: MENU }));
  await p.route('**/fonts.googleapis.com/**', (r) => r.abort());
};

(async () => {
  const srv = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 2500));
  const b = await chromium.launch();
  try {
    const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
    await mock(p);
    const errors = [];
    p.on('pageerror', (e) => errors.push(e.message));
    const t0 = Date.now();
    await p.goto(BASE, { waitUntil: 'load' });
    await p.locator('h1').waitFor();
    const loadMs = Date.now() - t0;
    ok(loadMs < 2000, `טעינה מתחת ל-2 שניות (${loadMs}ms)`);
    ok(await p.evaluate(() => document.documentElement.dir === 'rtl' && document.documentElement.lang === 'he'), 'עברית ו-RTL מוגדרים במפורש');
    ok((await h1(p)).includes(`${N} גילויים`), `דף הבית: שורת התובנה עם המספר המרכזי (${N})`);
    ok(await p.locator('ai-menu .logo').isVisible(), 'כפתור הלוגו A&I בסרגל העליון');
    ok(!(await p.locator('header >> text=העתקת קישור').first().isVisible().catch(() => false)), 'אין כפתורי פיתוח חופשיים בסרגל');
    ok(await p.locator('svg.stack .slab').count() === 4, 'דף הבית: 4 שכבות של משפחות ידע');
    ok(await p.locator('svg.stack .stack-dot').count() === N, `דף הבית: ${N} נקודות גילוי על שכבת שכל`);
    await p.locator('.stack-legend li').nth(1).hover();
    ok(await p.locator('.slab.is-hover').count() === 1, 'ריחוף על המקרא מרים את השכבה');
    ok(await p.locator('.city-bars li').count() >= 5, 'ערי הידע מוצגות');

    await p.locator('.tabs').getByText('ציר הזמן').click();
    await waitH1(p, 'בשנת');
    const PHYS = DISC.filter((d) => d.domainId === 'physics');
    const physKnown = PHYS.filter((d) => d.yearFrom <= 1700).length;
    ok((await h1(p)).includes(`בשנת 1700 ידועים ${physKnown} מתוך ${PHYS.length} גילויים`), 'ציר הזמן: ברירת מחדל, פיזיקה ב-1700');
    ok(await p.locator('.tabs [aria-current="page"]').innerText() === 'ציר הזמן', 'לשונית ציר הזמן מסומנת');
    ok(await p.locator('.tl-card').count() === PHYS.length, `ציר הפיזיקה: ${PHYS.length} כרטיסים, רק רשומות מאומתות`);
    ok(await p.locator('.tl-card.is-hidden').count() === PHYS.length - physKnown, 'גילויים אחרי 1700 מתחת לזכוכית');
    await p.getByRole('button', { name: 'הגילוי הבא' }).click();
    const nextY = Math.min(...PHYS.filter((d) => d.yearFrom > 1700).map((d) => d.yearFrom));
    const prevY = Math.max(...PHYS.filter((d) => d.yearFrom < nextY).map((d) => d.yearFrom));
    await waitH1(p, String(nextY));
    ok((await h1(p)).includes(`בשנת ${nextY} ידועים ${PHYS.filter((d) => d.yearFrom <= nextY).length}`), `הגילוי הבא קופץ ל-${nextY}`);
    await p.waitForTimeout(400);
    ok(p.url().includes(`y=${nextY}`), 'השנה נשמרת בכתובת');
    await p.getByRole('button', { name: 'הגילוי הקודם' }).click();
    await waitH1(p, String(prevY));
    ok((await h1(p)).includes(`בשנת ${prevY}`), `הגילוי הקודם קופץ ל-${prevY}`);
    await p.locator('input[type=range]').fill('500');
    await p.waitForTimeout(100);
    ok(!(await h1(p)).includes('1687'), 'המחוון משנה את השנה');
    await p.getByRole('button', { name: 'הפעלה' }).click();
    const before = await h1(p);
    await p.waitForTimeout(900);
    const after = await h1(p);
    await p.getByRole('button', { name: 'עצירה' }).click();
    ok(before !== after, 'הפעלה מזיזה את הזמן, ועצירה עוצרת');

    await p.locator('.tl-card[data-id="d-1687-newton-principia"]').click();
    await p.locator('aside.person').waitFor();
    ok(await p.locator('.person-name').innerText() === 'אייזק ניוטון', 'לחיצה על כרטיס פותחת את כרטיס הדמות');
    ok(p.url().includes('p=p-newton'), 'הדמות נשמרת בכתובת');
    ok((await p.locator('aside.person').innerText()).includes('הלוח היוליאני'), 'לוח יוליאני מסומן במפורש');
    ok((await p.locator('aside.person .facts').innerText()).includes('1642'), 'ניוטון: שנת לידה 1642 לפי המקור');
    ok(await p.locator('aside.person blockquote').count() >= 2, 'ציטוטים מהמקור בכרטיס');
    ok(await p.locator('aside.person .src-list a').count() >= 2, 'רשימת מקורות עם קישורים');
    ok(await p.locator('aside.person .person-face figcaption').innerText().then((t) => t.includes('רישיון')), 'התמונה מגיעה עם רישיון');
    ok(await p.locator('.tl-arc').count() >= 1, 'קשרי הדמות מסומנים כקשתות על הציר');
    ok(await p.locator('.tl-card[aria-pressed="true"]').count() === 1, 'הכרטיס של הדמות מסומן כנבחר');
    ok(await p.locator('.tl-mark[data-year="1687"]').count() === 1, 'השנה של הדמות שנבחרה מודגשת על הציר');
    ok(await p.locator('aside.person .find-nc dd').first().evaluate((e) => +getComputedStyle(e).fontWeight >= 600), 'החידוש והתרומה בהבלטה');
    ok(await p.locator('aside.person .quote-he').first().evaluate((e) => +getComputedStyle(e).fontWeight >= 700), 'הציטוט בעברית בבולט');
    ok(await p.locator('aside.person .card-nav').isVisible(), 'בכרטיס הדמות: הקודם והבא באותו נושא');
    const navPos = await p.locator('.card-nav-pos').innerText();
    await p.locator('.card-nav').getByRole('button', { name: 'הבא' }).click();
    await p.waitForTimeout(300);
    ok(!p.url().includes('p=p-newton') && (await p.locator('.card-nav-pos').innerText()) !== navPos, 'הבא עובר לדמות הבאה בזמן');
    await p.locator('.card-nav').getByRole('button', { name: 'הקודם' }).click();
    await p.waitForTimeout(300);
    ok(p.url().includes('p=p-newton'), 'הקודם חוזר לדמות');
    if ((await p.viewportSize()).width >= 1100) {
      const asideR = await p.locator('aside.person').evaluate((e) => e.getBoundingClientRect().right);
      const ctlL = await p.locator('.tl-controls').evaluate((e) => e.getBoundingClientRect().left);
      ok(ctlL >= asideR, 'מסך לא על מסך: כרטיס הדמות לא מסתיר את הציר');
    }
    ok(DISC.filter((d) => d.workImage).every((d) => d.workImage.license && d.workImage.url.includes('wikimedia')), 'תמונות היצירות מוויקישיתוף ועם רישיון');
    const PHYS_SUBS = FIELDS.find((d) => d.id === 'physics').subs;
    ok(await p.locator('.subs-grid .sub-col').count() === PHYS_SUBS.length, `מתחת לציר: ${PHYS_SUBS.length} תתי תחומים של פיזיקה`);
    ok(DISC.every((d) => !d.sub || FIELDS.find((f) => f.id === d.domainId).subs.some((x) => x.id === d.sub)), 'כל תת-תחום בנתונים קיים בתחום שלו');
    ok(await p.locator('.sub-person[aria-pressed="true"]').count() >= 1, 'הדמות שנבחרה מסומנת גם ברשימת תתי התחומים');
    await p.locator('aside.person .rel .chip').first().click();
    await p.waitForFunction(() => document.querySelector('.person-name')?.textContent !== 'אייזק ניוטון');
    ok((await p.locator('.person-name').innerText()).includes('קפלר'), 'קשר מוביל לדמות השנייה');
    await p.keyboard.press('Escape');
    await p.waitForTimeout(150);
    ok(await p.locator('aside.person').count() === 0, 'Escape סוגר את הכרטיס');

    await p.getByRole('button', { name: /מתמטיקה/ }).click();
    await p.waitForTimeout(150);
    ok(p.url().includes('d=mathematics') && (await p.locator('.tl-card').count()) === inDomain('mathematics'), 'מעבר לתחום מתמטיקה');

    await p.goto(BASE + '#/timeline?d=mathematics&y=1850&p=p-godel', { waitUntil: 'networkidle' });
    await waitH1(p, 'בשנת 1850');
    await p.locator('.person-name').waitFor();
    ok((await h1(p)).includes('בשנת 1850') && (await p.locator('.person-name').innerText()) === 'קורט גדל', 'קישור מועתק פותח את אותו מצב');
    ok((await p.locator('aside.person .rel').first().innerText()).includes('ערער על'), 'כיוון הקשר: גדל ערער על הילברט');
    await p.locator('.brand').click();
    await waitH1(p, `${N} גילויים`);
    ok((await h1(p)).includes(`${N} גילויים`), 'שם האפליקציה מוביל לבית');

    // שלב 2: השוואה בין תחומים
    await p.goto(BASE + '#/compare', { waitUntil: 'networkidle' });
    await p.locator('.tabs').getByText('השוואה').waitFor();
    ok(await p.locator('.tabs [aria-current="page"]').innerText() === 'השוואה', 'לשונית השוואה מסומנת');
    const cmpTitle = await h1(p);
    const crossN = Number(cmpTitle.match(/\d+/)[0]);
    ok(/קשרים חוצים בין/.test(cmpTitle) && crossN >= 8, `השוואה: שורת התובנה (${crossN} קשרים חוצים)`);
    ok(await p.locator('.cmp-rowname').count() === DOMS.length, `${DOMS.length} שורות תחום על ציר אחד`);
    ok((await p.locator('.cmp-card').count()) + (await p.locator('.cmp-pin').count()) === N, `כל ${N} הגילויים על הציר המשותף`);
    await p.getByRole('button', { name: '1500–1750' }).click();
    await p.waitForTimeout(250);
    ok(p.url().includes('f=1500') && p.url().includes('t=1750'), 'חלון התקופה נשמר בכתובת');
    ok((await p.locator('.cmp-view').innerText()).includes('1500'), 'חלון הזום מוצג');
    const inWindow = await p.locator('.cmp-card').count();
    ok(inWindow > 0 && inWindow < N, `זום מסונכרן: רק הגילויים בחלון (${inWindow})`);
    const ys = await p.locator('.cmp-card').evaluateAll((els) => [...new Set(els.map((e) => e.style.top))].length);
    ok(ys > 2, 'הזום חל על שתי השורות יחד');
    await p.getByRole('button', { name: 'כל הציר' }).click();
    await p.waitForTimeout(200);
    const fullSpan = await p.locator('.cmp-view').innerText();
    await p.getByRole('button', { name: 'הגדלה' }).click();
    await p.waitForTimeout(250);
    ok((await p.locator('.cmp-view').innerText()) !== fullSpan, 'כפתור הגדלה משנה את החלון');
    const box = await p.locator('.cmp-plot').boundingBox();
    const beforeDrag = await p.locator('.cmp-view').innerText();
    const gapY = box.y + 30 + 188 + 60; // בתוך שדה הקשרים, לא על כרטיס
    await p.mouse.move(box.x + box.width / 2, gapY);
    await p.mouse.down(); await p.mouse.move(box.x + box.width / 2 - 200, gapY, { steps: 8 }); await p.mouse.up();
    await p.waitForTimeout(200);
    ok((await p.locator('.cmp-view').innerText()) !== beforeDrag, 'גרירה מזיזה את הציר');
    await p.getByRole('button', { name: 'כל הציר' }).click();
    await p.locator('.link-item', { hasText: 'רימן' }).click();
    await p.waitForTimeout(200);
    ok(p.url().includes('l=l-19'), 'בחירת קשר נשמרת בכתובת');
    const panel = await p.locator('.link-panel').innerText();
    ok(panel.includes('הכלל') && panel.includes('התובנה') && panel.includes('היישום'), 'קשר מוצג עם כלל, תובנה ויישום');
    ok(await p.locator('.link-panel blockquote').count() >= 1, 'הכלל מגיע עם ציטוט מהמקור');
    ok(await p.locator('.lk.is-on .lk-halo').count() === 1, 'הקשר שנבחר מסומן על הציר');
    ok(await p.locator('.cmp-card.is-end, .cmp-pin.is-end').count() === 2, 'שני קצות הקשר מודגשים');
    await p.locator('[data-link="l-26"]').dispatchEvent('click');
    await p.waitForTimeout(200);
    ok(p.url().includes('l=l-26') && (await p.locator('.link-panel').innerText()).includes('הויגנס'), 'לחיצה על קו הקשר בוחרת אותו');
    const allN = await p.locator('.link-item').count();
    await p.locator('.cmp-controls .line-opposed').click();
    await p.waitForTimeout(150);
    ok(p.url().includes('h=opposed') && (await p.locator('.link-item').count()) < allN, 'סינון לפי סוג קשר');
    await p.locator('.cmp-controls .line-opposed').click();
    await p.getByRole('button', { name: 'רק חוצי תחום' }).click();
    await p.waitForTimeout(150);
    ok((await p.locator('.link-item').count()) === crossN, 'רק קשרים חוצי תחום');
    await p.goto(BASE + '#/compare?d=physics', { waitUntil: 'networkidle' });
    ok((await p.locator('.cmp-rowname').count()) === 1 && (await h1(p)).includes('בתוך'), 'אפשר להשאיר תחום אחד');
    await p.goto(BASE + '#/compare?d=mathematics,physics', { waitUntil: 'networkidle' });
    await p.locator('[data-id="d-1915-einstein-general"]').click();
    await p.locator('aside.person').waitFor();
    ok((await p.locator('.person-name').innerText()).includes('איינשטיין'), 'כרטיס בהשוואה פותח את הדמות');
    ok((await p.locator('aside.person').innerText()).includes('רימן'), 'כרטיס הדמות כולל את הקשר החדש');
    await p.keyboard.press('Escape');
    await p.goto(BASE + '#/compare?f=1600&t=1700&l=l-23', { waitUntil: 'networkidle' });
    await p.reload({ waitUntil: 'networkidle' });
    ok((await p.locator('.cmp-view').innerText()).includes('1600') && (await p.locator('.link-panel').innerText()).includes('דקארט'), 'קישור מועתק להשוואה פותח את אותו מצב');
    ok(await p.locator('.link-panel .conf-interpretive').count() === 1, 'קשר פרשני מסומן בכתום');

    // שלב 3: מפה
    await p.goto(BASE + '#/map', { waitUntil: 'networkidle' });
    await p.locator('.map-canvas[data-ready="true"]').waitFor({ timeout: 20000 });
    ok(await p.locator('.tabs [aria-current="page"]').innerText() === 'מפה', 'לשונית מפה מסומנת');
    const mapH1 = await h1(p);
    ok(/^בשנת 1700: \d+ גילויים ב-\d+ ערים\.$/.test(mapH1), 'מפה: שורת התובנה ' + mapH1);
    const m1700 = await p.locator('.map-city').count();
    ok(m1700 === Number(mapH1.match(/ב-(\d+) ערים/)[1]), `סמן לכל עיר ידועה (${m1700})`);
    ok(await p.locator('.country-rank li').count() >= 5, 'רשימת ארצות הידע ליד המפה');
    ok(await p.evaluate(() => [...document.querySelectorAll('.mc-n')].every((e) => !e.textContent)), 'בתצוגה הרגילה אין מספרים על הסמנים');
    ok((await p.locator('.page-sub').innerText()).includes('מרכז הכובד'), 'מרכז הכובד מחושב ומוסבר');
    ok(await p.locator('.map-center').count() === 1, 'סמן מרכז הכובד על הגלובוס');
    await p.locator('.map-controls input[type=range]').fill('1000');
    await p.waitForTimeout(250);
    const m1950 = await p.locator('.map-city').count();
    ok(p.url().includes('y=2025') && m1950 > m1700, `המחוון מזיז את הנקודות בזמן אמת (${m1700} ל-${m1950})`);
    await p.locator('.map-controls input[type=range]').fill('0');
    await p.waitForTimeout(250);
    ok((await p.locator('.map-city').count()) < m1700, 'בתחילת הציר יש פחות ערים');
    await p.locator('.map-controls input[type=range]').fill('1000');
    await p.waitForTimeout(200);
    await p.locator('.map-city[data-city="Paris"]').dispatchEvent('click'); // בפריז סמנים צפופים: לחיצה ישירה על הסמן, כמו מקלדת
    await p.waitForTimeout(250);
    ok(p.url().includes('c=Paris') && (await p.locator('.city-panel').innerText()).includes('פריז'), 'לחיצה על עיר פותחת את הגילויים שבה');
    ok(new Set(await p.locator('.place-panel .pp-work').evaluateAll((els) => els.map((e) => e.dataset.id))).size === DISC.filter((d) => d.place && d.place.city.nameFull === 'Paris').length, 'פריז: כל הגילויים שבה');
    ok(await p.locator('.place-panel .pp-family').count() >= 3 && await p.locator('.place-panel .pp-dom-title').count() >= 3, 'פריז: היררכיה של משפחה, תחום ודמות');
    await p.locator('.place-panel .pp-person', { hasText: 'בלז פסקל' }).click();
    await p.locator('aside.person').waitFor();
    ok((await p.locator('.person-name').innerText()).includes('פסקל'), 'מהעיר לכרטיס הדמות');
    await p.keyboard.press('Escape');
    await p.getByRole('button', { name: 'כל צרפת' }).click();
    await p.waitForTimeout(200);
    ok(p.url().includes('k=France') && (await p.locator('.place-panel .pp-cities .chip').count()) >= 3, 'מעיר לארץ: צרפת עם כל הערים שלה');
    await p.locator('.place-panel .pp-cities').getByRole('button', { name: 'חזרה לכל הארצות' }).click();
    await p.locator('.country-rank li button').first().click();
    await p.waitForTimeout(200);
    ok(p.url().includes('k=') && (await p.locator('.place-panel').count()) === 1, 'לחיצה על ארץ ברשימה פותחת את הדמויות שלה');
    await p.locator('.place-panel .pp-cities').getByRole('button', { name: 'חזרה לכל הארצות' }).click();
    // מסע לפי סדר כרונולוגי
    await p.locator('.tour-seg .chip-dom', { hasText: 'פיזיקה' }).click();
    await p.locator('.tour-card').waitFor();
    const physN = DISC.filter((d) => d.domainId === 'physics' && d.place).length;
    ok(p.url().includes('t=physics') && (await p.locator('.tour-num').innerText()) === `1/${physN}`, `מסע בפיזיקה: תחנה 1 מתוך ${physN}`);
    ok(await p.evaluate(() => [...document.querySelectorAll('.mc-n')].some((e) => e.textContent)), 'במסע הסמנים מציגים את מספר התחנה');
    await p.locator('.tour-card').getByRole('button', { name: 'הבאה' }).click();
    await p.waitForTimeout(200);
    ok(p.url().includes('s=1') && (await h1(p)).includes('תחנה 2'), 'הבאה מעבירה לתחנה הבאה');
    await p.locator('.tour-list li button').nth(4).click();
    await p.waitForTimeout(200);
    ok(p.url().includes('s=4') && (await p.locator('.tour-num').innerText()).startsWith('5/'), 'בחירת תחנה מהרשימה');
    const yearsInOrder = await p.locator('.tour-list .tour-y').evaluateAll((els) => els.map((e) => Number(e.dataset.year)));
    ok(yearsInOrder.length > 5 && yearsInOrder.every((v, i, a) => i === 0 || a[i - 1] <= v), 'התחנות בסדר כרונולוגי');
    await p.locator('.tour-card').getByRole('button', { name: 'סיום המסע' }).click();
    await p.waitForTimeout(150);
    ok(!p.url().includes('t=physics') && (await p.locator('.tour-card').count()) === 0, 'סיום המסע');
    // מסע חוצה תחומים
    await p.locator('.tour-seg .chip-all').click();
    await p.locator('.tour-card').waitFor();
    const tourAllN = DISC.filter((d) => d.place).length;
    ok(p.url().includes('t=all') && (await p.locator('.tour-num').innerText()) === `1/${tourAllN}`, `מסע בכל התחומים: ${tourAllN} תחנות`);
    const allYears = await p.locator('.tour-list .tour-y').evaluateAll((els) => els.map((e) => Number(e.dataset.year)));
    ok(allYears.length === tourAllN && allYears.every((v, i, a) => i === 0 || a[i - 1] <= v), 'כל התחומים בסדר כרונולוגי אחד');
    ok(new Set(await p.locator('.tour-list .dicon').evaluateAll((els) => els.map((e) => e.getAttribute('class')))).size >= 10, 'ברשימה אייקון בצבע לכל תחום');
    await p.locator('.tour-list li button').nth(30).click();
    await p.waitForTimeout(300);
    const badges = await p.evaluate(() => [...document.querySelectorAll('.mc-n')].filter((e) => e.textContent).map((e) => e.textContent));
    await p.evaluate(() => { location.hash = '#/map?t=all&s=120'; });
    await p.waitForTimeout(300);
    ok(await p.locator('.tour-list').evaluate((ol) => { const li = ol.children[120]; return li.offsetTop >= ol.scrollTop && li.offsetTop + li.offsetHeight <= ol.scrollTop + ol.clientHeight; }), 'הרשימה נגללת לתחנה הנוכחית');
    ok(badges.length === 1 && badges[0] === '31', `מספר רק על העיר הנוכחית (${badges.join(',')})`);
    await p.locator('.tour-card').getByRole('button', { name: 'סיום המסע' }).click();
    await p.waitForTimeout(150);
    const routesN = await p.locator('.link-item').count();
    ok(routesN >= 15, `מסלולי ידע ברשימה (${routesN})`);
    await p.locator('.link-item', { hasText: 'קהיר' }).first().click();
    await p.waitForTimeout(200);
    ok(p.url().includes('l=') && (await p.locator('.link-panel').innerText()).includes('היישום'), 'מסלול נבחר עם כלל, תובנה ויישום');
    await p.locator('.map-controls > .seg:first-child .chip-dom', { hasText: 'פיזיקה' }).click();
    await p.waitForTimeout(200);
    ok(!new URL(p.url().replace('#/', '')).searchParams.get('d').split(',').includes('physics') && (await p.locator('.map-city.dom-physics').count()) === 0, 'סינון תחום על המפה');
    await p.locator('.map-controls > .seg:first-child .chip-dom', { hasText: 'פיזיקה' }).click();
    await p.locator('.map-controls input[type=range]').fill('0');
    await p.getByRole('button', { name: 'הפעלה' }).click();
    await p.waitForTimeout(1500);
    await p.getByRole('button', { name: 'עצירה' }).click();
    ok(!p.url().includes('y=-400'), 'הפעלה מקדמת את הזמן על המפה');
    await p.goto(BASE + '#/map?y=1640&c=Prague', { waitUntil: 'networkidle' });
    await p.reload({ waitUntil: 'networkidle' });
    ok((await h1(p)).includes('1640') && (await p.locator('.city-panel').innerText()).includes('פראג'), 'קישור מועתק למפה פותח את אותו מצב');

    // שלב 4: גרף וחיתוכים
    await p.goto(BASE + '#/graph', { waitUntil: 'networkidle' });
    ok(await p.locator('.tabs [aria-current="page"]').innerText() === 'גרף', 'לשונית גרף מסומנת');
    ok((await h1(p)).startsWith('הצומת המרכזי:'), 'גרף: שורת התובנה מחושבת ' + (await h1(p)));
    const nAll = await p.locator('.g-node').count();
    ok(nAll === PERS.length, `צומת לכל דמות מאומתת (${nAll})`);
    const eAll = await p.locator('.g-edge').count();
    ok(eAll >= 25, `קו לכל קשר בין דמויות (${eAll})`);
    await p.locator('.g-node[data-person="p-galileo"]').click();
    await p.waitForTimeout(150);
    ok(p.url().includes('n=p-galileo') && (await p.locator('.g-node.is-dim').count()) > 20, 'לחיצה על דמות מדגישה את השכנים שלה');
    ok((await p.locator('.focus-bar').innerText()).includes('גלילאו'), 'פס המוקד מציג את הדמות');
    await p.locator('.focus-bar').getByRole('button', { name: 'כרטיס הדמות' }).click();
    await p.locator('aside.person').waitFor();
    ok((await p.locator('.person-name').innerText()).includes('גלילאו'), 'מהגרף לכרטיס הדמות');
    await p.keyboard.press('Escape');
    await p.locator('.g-hit[data-link="l-24"]').dispatchEvent('click');
    await p.waitForTimeout(150);
    ok((await p.locator('.link-panel').innerText()).includes('ארכימדס'), 'לחיצה על קו פותחת כלל, תובנה ויישום');
    await p.locator('.cut', { hasText: 'גבולות ההוכחה' }).click();
    await p.waitForTimeout(200);
    ok(p.url().includes('f=1890') && p.url().includes('d=mathematics'), 'חיתוך מוכן מגדיר מסננים בכתובת');
    const limits = await p.locator('.g-node').count();
    ok(limits > 0 && limits < 10 && (await p.locator('.g-node[data-person="p-turing"]').count()) === 1, `חיתוך "גבולות ההוכחה" (${limits} דמויות)`);
    ok(await p.locator('.cut[aria-pressed="true"]').count() === 1, 'החיתוך הפעיל מסומן');
    await p.getByRole('button', { name: 'איפוס', exact: true }).click();
    await p.waitForTimeout(150);
    ok((await p.locator('.g-node').count()) === PERS.length, 'איפוס מחזיר את כל הדמויות');
    await p.locator('.graph-controls select').selectOption('Paris');
    await p.waitForTimeout(150);
    ok(p.url().includes('c=Paris') && (await p.locator('.g-node:not(.is-context)').count()) === parisPeople, `סינון לפי עיר: ${parisPeople} הדמויות של פריז`);
    ok(await p.locator('.g-node.is-context').count() > 0, 'שכנים מחוץ לעיר מוצגים כהקשר');
    await p.locator('.graph-controls select').selectOption('');
    await p.locator('.conf-chip-documented').click();
    await p.waitForTimeout(150);
    ok(p.url().includes('k=documented') && (await p.locator('.g-edge').count()) < eAll && (await p.locator('.g-edge.lk-documented').count()) === 0, 'סינון לפי רמת ביטחון');
    await p.locator('.conf-chip-documented').click();
    await p.getByRole('button', { name: 'בלי דמויות בודדות' }).click();
    await p.waitForTimeout(150);
    ok((await p.locator('.g-node.is-alone').count()) === 0, 'הסתרת דמויות בלי קשר');
    await p.getByLabel('שם לתצוגה').fill('בדיקה');
    await p.getByRole('button', { name: 'שמירת התצוגה' }).click();
    ok((await p.locator('.save-status').innerText()) === 'נשמר' && (await p.locator('.saved-item', { hasText: 'בדיקה' }).count()) === 1, 'שמירת תצוגה עם חיווי נשמר');
    await p.reload({ waitUntil: 'networkidle' });
    ok((await p.locator('.saved-item', { hasText: 'בדיקה' }).count()) === 1, 'התצוגה השמורה נשארת אחרי רענון');
    await p.getByRole('button', { name: 'איפוס', exact: true }).click();
    await p.locator('.saved-item', { hasText: 'בדיקה' }).click();
    await p.waitForTimeout(200);
    ok(p.url().includes('i=1'), 'תצוגה שמורה משחזרת את המסננים');
    await p.getByRole('button', { name: 'מחיקת בדיקה' }).click();
    ok((await p.locator('.saved-item').count()) === 0, 'מחיקת תצוגה שמורה');
    await p.goto(BASE + '#/graph?f=1540&t=1700&n=p-kepler', { waitUntil: 'networkidle' });
    await p.reload({ waitUntil: 'networkidle' });
    ok((await p.locator('.cut[aria-pressed="true"]').innerText()).includes('המהפכה המדעית') && (await p.locator('.g-node.is-focus').count()) === 1, 'קישור מועתק לגרף פותח את אותו מצב');

    // חיפוש קבוע בסרגל: אותו מקום בכל דף, איקס גלוי, שורת תוצאות לפי תחום, והדגשה בדף הפתוח
    const boxes = [];
    for (const h of ['#/timeline', '#/map', '#/graph', '#/method']) {
      await p.goto(BASE + h, { waitUntil: 'networkidle' });
      const bx = await p.locator('header .kw-field input').boundingBox();
      boxes.push(bx && `${Math.round(bx.x)},${Math.round(bx.y)},${Math.round(bx.width)}`);
    }
    ok(boxes.every((x) => x && x === boxes[0]), `שדה החיפוש באותו מקום בכל הדפים (${boxes[0]})`);
    ok(await p.locator('header .kw-field .clearable-x').isVisible() && await p.locator('header .kw-field .clearable-x').evaluate((e) => getComputedStyle(e).color !== 'rgba(0, 0, 0, 0)'), 'האיקס לאיפוס גלוי גם כשהשדה ריק');
    await p.goto(BASE + '#/timeline?d=physics&y=2025', { waitUntil: 'networkidle' });
    await p.locator('body').press('/');
    ok(await p.evaluate(() => document.activeElement?.closest('.kw-field')), 'מקש / מתמקד בשדה החיפוש');
    await p.keyboard.type('טלפון');
    await p.locator('.kw-strip').waitFor();
    const TEL = DISC.filter((d) => /טלפון/.test(d.title));
    ok((await p.locator('.kw-strip').innerText()).includes('פיזיקה') && TEL.length > 0, 'שורה מתחת לסרגל: מספר התוצאות לפי תחום');
    ok(await p.locator('.tl-card.is-kw').count() === TEL.filter((d) => d.domainId === 'physics').length && await p.locator('.tl-card.is-kw-off').count() > 0, 'ציר הזמן: ההתאמות מודגשות, השאר מעומעם');
    await p.locator('.kw-doms .chip-dom', { hasText: 'פיזיקה' }).click();
    await p.locator('.kw-panel .kw-item').first().click();
    await p.waitForTimeout(300);
    ok(p.url().includes(`p=${TEL[0].personIds[0]}`), 'בחירה מהרשימה פותחת את הדמות');
    await p.goto(BASE + '#/graph', { waitUntil: 'networkidle' });
    ok(await p.locator('.g-node.is-kw').count() >= 1, 'המילה נשמרת במעבר דף: הגרף מדגיש');
    await p.locator('header .kw-field .clearable-x').click();
    await p.waitForTimeout(300);
    ok(await p.locator('.kw-strip').count() === 0 && await p.locator('.is-kw, .is-kw-off').count() === 0, 'האיקס מאפס את החיפוש ואת ההדגשה');
    // דף כל התוצאות
    await p.goto(BASE + '#/search?q=' + encodeURIComponent('קירי'), { waitUntil: 'networkidle' });
    await p.locator('.search-hit[data-kind="person"]').first().waitFor();
    ok((await p.locator('.search-hit[data-kind="person"]').allInnerTexts()).some((t) => t.includes('קירי')) && (await p.locator('header .kw-field input').inputValue()) === 'קירי', 'קישור לכל התוצאות ממלא את השדה בסרגל');
    await p.locator('header .kw-field input').fill('Kyoto');
    await p.locator('.search-hit[data-kind="city"]').first().waitFor();
    ok((await p.locator('.search-hit[data-kind="city"]').first().innerText()).includes('קיוטו'), 'חיפוש בלועזית מוצא עיר בעברית');
    await p.locator('header .kw-field input').fill('אבחון');
    await p.locator('.search-hit[data-kind="sub"]').first().waitFor();
    await p.locator('.search-hit[data-kind="sub"]').first().click();
    await p.locator('.sub-col.is-target').waitFor();
    ok(p.url().includes('sub=assessment'), 'תת-תחום מהחיפוש נפתח ומסומן מתחת לציר');
    await p.locator('header .kw-field input').fill('xqzw');
    await p.waitForTimeout(300);
    ok((await p.locator('.kw-strip').innerText()).includes('אין תוצאות'), 'חיפוש בלי תוצאות אומר זאת במפורש');
    await p.locator('header .kw-field .clearable-x').click();
    // יצירה בלי יוצר ידוע
    const ANON_D = DISC.find((d) => !d.personIds.length);
    ok(!!ANON_D, 'בנתונים יש יצירה בלי יוצר ידוע');
    await p.goto(BASE + `#/timeline?d=${ANON_D.domainId}&y=2025`, { waitUntil: 'networkidle' });
    await p.locator(`.tl-card[data-id="${ANON_D.id}"]`).click();
    await p.locator('aside.work').waitFor();
    ok((await p.locator('aside.work').innerText()).includes('יוצר לא ידוע') && p.url().includes(`w=${ANON_D.id}`), 'יצירה בלי יוצר פותחת כרטיס יצירה עם "יוצר לא ידוע"');
    ok(await p.locator(`.tl-mark[data-year="${ANON_D.yearFrom}"]`).count() === 1, 'השנה של היצירה מודגשת על הציר');
    await p.keyboard.press('Escape');

    // שלב 5: Supabase ועריכה
    await p.goto(BASE + '#/timeline?d=physics&y=1700&p=p-newton', { waitUntil: 'networkidle' });
    await p.locator('aside.person').waitFor();
    ok((await p.locator('aside.person').innerText()).includes(CLOUD_NOVELTY), 'טקסט שנערך בענן מוצג מעל הנתונים');
    ok((await p.locator('aside.person blockquote').count()) >= 2, 'הענן לא יכול לדרוס ציטוטים, רק טקסט מותר');
    await p.locator('ai-menu .logo').click();
    await p.getByText('כניסה לעריכה').click();
    await p.getByRole('dialog', { name: 'כניסה לעריכה' }).waitFor();
    ok(true, 'כניסה לעריכה נפתחת מתוך כפתור הלוגו');
    await p.locator('.dialog input[type=email]').fill('shtanat5@gmail.com');
    await p.locator('.dialog input[type=password]').fill('x');
    await p.locator('.dialog').getByRole('button', { name: 'כניסה' }).click();
    await p.locator('.edit-banner').waitFor({ timeout: 5000 });
    ok(await p.locator('.edit-banner').isVisible(), 'מצב עריכה פעיל אחרי כניסה');
    const area = p.locator('aside.person textarea[aria-label="עריכת novelty"]').first();
    ok(await area.isVisible(), 'שדה עריכה בכרטיס הדמות');
    await area.fill('חידוש חדש מהבדיקה.');
    await p.locator('aside.person .person-name').click();
    await p.waitForTimeout(300);
    const last = patches[patches.length - 1];
    ok(!!last && last.body.data.novelty === 'חידוש חדש מהבדיקה.' && last.url.includes('id=eq.d-1687-newton-principia'), 'שמירה שולחת את השדה לרשומה הנכונה');
    ok((await area.locator('xpath=following-sibling::span').innerText()) === 'נשמר', 'חיווי נשמר אחרי שמירה');
    // גילוי חדש כטיוטה
    await p.route('**/en.wikipedia.org/w/api.php**', (r) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ query: { pages: { 1: { extract: 'In 1898, Marie and Pierre Curie discovered radium in Paris.' } } } }) }));
    await p.locator('ai-menu .logo').click();
    await p.getByText('גילוי חדש (טיוטה)').click();
    const dlg = p.getByRole('dialog', { name: 'גילוי חדש' });
    await dlg.waitFor();
    ok(true, 'גילוי חדש נפתח מתוך כפתור הלוגו');
    await dlg.getByLabel('כותרת').fill('גילוי הרדיום');
    await dlg.getByLabel('תחום').selectOption('chemistry');
    await dlg.getByLabel('שנה (לפנה״ס במינוס)').fill('1898');
    await dlg.getByLabel('דמות: שם המאמר בוויקיפדיה').fill('Marie Curie');
    await dlg.getByLabel('מאמר המקור').fill('Radium');
    await dlg.getByLabel('ציטוט מילולי מהמאמר').fill('In 1898, Marie and Pierre Curie discovered radium');
    await dlg.getByLabel('החידוש: מה היה ייחודי').click();
    await p.locator('.draft-checks li[data-check="quote"].ok').waitFor({ timeout: 3000 });
    ok(await p.locator('.draft-checks li[data-check="year"].ok').count() === 1, 'בדיקה חיה: הציטוט נמצא והשנה מופיעה בו');
    await dlg.getByLabel('ציטוט מילולי מהמאמר').fill('Marie Curie discovered polonium');
    await dlg.getByLabel('החידוש: מה היה ייחודי').click();
    await p.locator('.draft-checks li[data-check="quote"].bad').waitFor({ timeout: 3000 });
    ok(await p.locator('.draft-checks li[data-check="year"].bad').count() === 1, 'בדיקה חיה: ציטוט שלא במאמר ובלי שנה מסומן לתיקון');
    await dlg.getByLabel('ציטוט מילולי מהמאמר').fill('In 1898, Marie and Pierre Curie discovered radium');
    await dlg.getByLabel('החידוש: מה היה ייחודי').fill('יסוד חדש שזוהה לפי הקרינה שלו.');
    await dlg.getByLabel('התרומה: מה זה שינה').fill('פתח את חקר הרדיואקטיביות.');
    await dlg.getByRole('button', { name: 'שמירת טיוטה' }).click();
    await p.locator('.draft-list li').first().waitFor({ timeout: 3000 });
    const sent = posts[posts.length - 1];
    ok(!!sent && sent.kind === 'discovery' && sent.verified === false && sent.id.startsWith('draft-') && sent.data.yearTo === 1898 && sent.data.check.quoteFound === true, 'הטיוטה נשמרת כ-verified=false עם תוצאת הבדיקה');
    ok((await p.locator('.draft-list li').first().innerText()).includes('ממתינה לאימות'), 'רשימת הטיוטות מציגה את המצב');
    await dlg.getByRole('button', { name: 'סגירה' }).click();
    ok(!(await h1(p)).includes('רדיום') && (await p.locator('text=גילוי הרדיום').count()) === 0, 'הטיוטה לא מוצגת באתר לפני אימות');
    await p.locator('ai-menu .logo').click();
    await p.getByText(/^יציאה/).click();
    await p.waitForTimeout(150);
    ok((await p.locator('.edit-banner').count()) === 0 && (await p.locator('aside.person textarea').count()) === 0, 'יציאה מסיימת את מצב העריכה');
    {
      const off = await b.newPage({ viewport: { width: 1280, height: 900 } });
      await off.route('**/appofapp-gh.vercel.app/**', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: MENU }));
      await mockCloud(off, 'down');
      await off.goto(BASE, { waitUntil: 'networkidle' });
      ok((await off.locator('h1').innerText()).includes(`${N} גילויים`), 'בלי רשת לענן: האפליקציה עובדת מהנתונים שבחבילה');
      await off.close();
    }

    await p.goto(BASE + '#/method', { waitUntil: 'networkidle' });
    ok((await h1(p)) === 'כל רשומה נבדקת מול המקור שלה.', 'דף השיטה');
    ok((await p.locator('.rejected').innerText()).includes('l-2'), 'רשומה שלא עברה מוצגת עם הסיבה');
    await p.getByLabel('חיפוש במקורות', { exact: true }).fill('Kepler');
    ok((await p.locator('.src-table tbody tr').count()) >= 2, 'חיפוש מסנן מקורות');
    await p.getByLabel('חיפוש במקורות', { exact: true }).fill('zzzz');
    ok(await p.getByText('לא נמצא מקור').isVisible(), 'מצב ריק מוסבר');

    ok(await p.locator('.num').count() > 5, 'מספרים מודגשים אוטומטית');
    for (const h of ['', '#/timeline?p=p-newton', '#/compare?l=l-19', '#/map?c=Paris', '#/graph', '#/method']) {
      await p.goto(BASE + h, { waitUntil: 'networkidle' });
      const square = await p.evaluate(() => [...document.querySelectorAll('button, .press, input, .chip')].every((el) => getComputedStyle(el).borderRadius === '0px'));
      ok(square, `${h || 'בית'}: כל הכפתורים מרובעים`);
    }
    const cdp = await p.context().newCDPSession(p);
    await p.goto(BASE, { waitUntil: 'networkidle' });
    const inst = await cdp.send('Page.getInstallabilityErrors');
    ok(inst.installabilityErrors.length === 0, 'התקנה מ-Chrome: ' + (JSON.stringify(inst.installabilityErrors) || 'אין שגיאות'));

    for (const vp of [{ width: 390, height: 844 }, { width: 1280, height: 900 }]) {
      const m = await b.newPage({ viewport: vp, reducedMotion: 'reduce' });
      await mock(m);
      m.on('pageerror', (e) => errors.push(e.message));
      for (const h of ['', '#/timeline', '#/timeline?d=mathematics&p=p-noether', '#/timeline?d=religion&y=2025', '#/compare', '#/compare?f=1500&t=1750&l=l-26', '#/map', '#/map?c=Paris&l=l-26', '#/graph', '#/graph?n=p-galileo&l=l-24', '#/search?q=%D7%A7%D7%99%D7%A8%D7%99', '#/method']) {
        await m.goto(BASE + h, { waitUntil: 'networkidle' });
        const hs = await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
        ok(!hs, `${vp.width}px ${h || 'בית'}: בלי גלילה אופקית בדף`);
        if (!h.startsWith('#/map')) { const ov = await overlaps(m); ok(ov.length === 0, `${vp.width}px ${h || 'בית'}: טקסט לא עולה על טקסט${ov.length ? ' — ' + ov.slice(0, 3).join(' | ') : ''}`); }
      }
      await m.goto(BASE, { waitUntil: 'networkidle' });
      const anim = await m.evaluate(() => getComputedStyle(document.querySelector('.rise')).animationName);
      ok(anim === 'none', `${vp.width}px: הפחתת תנועה מכובדת`);
      await m.close();
    }
    // מגע מדומה בגודל טלפון: גרירה באצבע אחת וצביטה בשתיים על הגלובוס
    {
      const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
      const m = await ctx.newPage();
      await mock(m);
      await m.goto(BASE + '#/map', { waitUntil: 'networkidle' });
      await m.locator('.map-canvas[data-ready="true"]').waitFor({ timeout: 20000 });
      await m.locator('.map-canvas').scrollIntoViewIfNeeded();
      const bb = await m.locator('.map-canvas').boundingBox();
      const cdp = await ctx.newCDPSession(m);
      const cx = bb.x + bb.width / 2, cy = bb.y + bb.height / 2;
      const pos = () => m.evaluate(() => { const el = document.querySelector('.map-city'); const r = el.getBoundingClientRect(); return [r.x, r.y]; });
      const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y], id) => ({ x, y, id })) });
      const before = await pos();
      await touch('touchStart', [[cx, cy]]);
      for (let i = 1; i <= 8; i++) await touch('touchMove', [[cx + i * 10, cy + i * 4]]);
      await touch('touchEnd', []);
      await m.waitForTimeout(600);
      const afterDrag = await pos();
      ok(Math.abs(afterDrag[0] - before[0]) > 20, 'נייד: גרירה באצבע מסובבת את הגלובוס');
      const size = () => m.evaluate(() => [...document.querySelectorAll('.map-city')].map((e) => e.getBoundingClientRect()).reduce((s, r, i, a) => (i ? s + Math.hypot(r.x - a[0].x, r.y - a[0].y) : 0), 0));
      const spread0 = await size();
      await touch('touchStart', [[cx - 20, cy], [cx + 20, cy]]);
      for (let i = 1; i <= 10; i++) await touch('touchMove', [[cx - 20 - i * 9, cy], [cx + 20 + i * 9, cy]]);
      await touch('touchEnd', []);
      await m.waitForTimeout(800);
      ok((await size()) > spread0 * 1.3, 'נייד: צביטה בשתי אצבעות מגדילה');
      ok(!(await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)), 'נייד: בלי גלילה אופקית אחרי מגע');
      await ctx.close();
    }
    ok(errors.length === 0, 'אין שגיאות JavaScript ' + errors.join(' | '));
  } finally {
    await b.close();
    srv.kill();
  }
  console.log(fails.length ? `\n${fails.length} נכשלו` : '\nהכול עבר');
  process.exit(fails.length ? 1 : 0);
})();
