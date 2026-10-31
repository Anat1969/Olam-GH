// צילומי מסך ב-1280 וב-390. usage: node tests/shot.cjs <baseUrl> <outPrefix> [hashes...]
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const MENU = fs.readFileSync(path.join(__dirname, 'fixtures/ai-menu.js'), 'utf8');
(async () => {
  const [base = 'http://localhost:4173/', out = 'tests/shots/shot', ...hashes] = process.argv.slice(2);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const b = await chromium.launch();
  for (const [name, vp] of [['desk', { width: 1280, height: 900 }], ['mob', { width: 390, height: 844 }]]) {
    const p = await b.newPage({ viewport: vp });
    await p.route('**/appofapp-gh.vercel.app/**', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: MENU }));
    await p.route('**/fonts.googleapis.com/**', (r) => r.abort());
    for (const h of hashes.length ? hashes : ['']) {
      await p.goto(base + (h ? '#' + h : ''), { waitUntil: 'networkidle' });
      await p.waitForTimeout(900);
      const sw = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      const file = `${out}-${name}-${(h || 'home').replace(/\W/g, '') || 'home'}.png`;
      await p.screenshot({ path: file, fullPage: name === 'desk' });
      console.log(file, 'hscroll:', sw);
    }
    await p.close();
  }
  await b.close();
})();
