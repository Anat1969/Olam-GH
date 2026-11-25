/*
 * <app-cover> - the cover page of Anat Stiebelman's apps (כריכה).
 *
 * Rule (Anat, 21.11.2026 and 25.11.2026): the entry page of every app is an experiential cover:
 * poetic, animated, graphic. It feels before it explains. It holds the haiku, the vision and the goal,
 * a place for the presentation video, and one main button, "פתיחה", that leads to the opening page
 * (the landing page about the inquiry and the tool). The logo and the app name always lead back here.
 * Every app uses this same frame. Only the content (cover.json) and the art (slot="art") change.
 *
 * Use:
 *   <script src="https://appofapp-gh.vercel.app/cover.js"></script>
 *   <app-cover src="./cover.json">
 *     <div slot="art"> the app's own animated graphic (optional; a generic one is drawn without it) </div>
 *   </app-cover>
 *
 * cover.json:
 *   {
 *     "name": "עולם נעלם", "subtitle": "ומציאות מצויה",
 *     "kicker": ["עולם · העלם · נעלם", "מציאות · מצא · מציאה"],     (optional, 1-2 short lines)
 *     "haiku": ["three", "short", "lines"],
 *     "vision": "one sentence", "goal": "one sentence",
 *     "open": { "label": "פתיחה", "href": "#/open" },
 *     "video": { "src": "demo.mp4", "poster": "poster.jpg", "caption": "short" } | { "youtube": "ID" } | null,
 *     "share": { "title": "...", "text": "..." },
 *     "credit": "small line at the bottom (inspiration, source)",
 *     "palette": { "ink": "#2E2E2B", "paper": "#F4F2EC", "accent": "#1F4E79", "marker": "#FFE45C" }
 *   }
 *
 * The page answers three questions on one screen, without scrolling: what is this (name + art),
 * why (haiku + vision), what for (goal), and what now ("פתיחה"). Video replaces the art in the same frame,
 * so there is never an empty frame. prefers-reduced-motion: everything appears at once, nothing moves.
 * Events: 'cover-open' (detail: href) before navigating, 'cover-share'.
 */
(function () {
  if (customElements.get('app-cover')) return;

  const CSS = `
  :host { --ink: #2E2E2B; --paper: #F4F2EC; --accent: #1F4E79; --marker: #FFE45C; --mute: #6E7076;
    display: block; color: var(--ink); font-family: "IBM Plex Sans Hebrew", -apple-system, "Segoe UI", system-ui, sans-serif; }
  .cv { direction: rtl; display: grid; grid-template-columns: minmax(0, 1.618fr) minmax(0, 1fr); gap: clamp(16px, 2.4vw, 40px);
    min-height: calc(100vh - var(--topbar-h, 60px) - 24px); align-items: stretch; padding: clamp(8px, 1.4vw, 24px) 0; box-sizing: border-box; }
  .art { position: relative; min-height: 320px; overflow: hidden; background: rgba(255, 255, 255, .55);
    box-shadow: 0 1px 0 rgba(255, 255, 255, .9) inset, 0 18px 40px -18px rgba(23, 25, 28, .35); }
  .art ::slotted(*) { position: absolute; inset: 0; width: 100%; height: 100%; }
  .art svg.gen { position: absolute; inset: 0; width: 100%; height: 100%; }
  .art video, .art iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; background: #000; object-fit: contain; }
  .txt { display: grid; align-content: center; gap: clamp(12px, 1.8vh, 22px); min-width: 0; }
  .kicker { display: grid; gap: 2px; font-size: clamp(13px, 1vw, 16px); color: var(--mute); letter-spacing: .03em; margin: 0; }
  .kicker b { color: var(--ink); font-weight: 600; }
  h1 { margin: 0; font-weight: 300; font-size: clamp(36px, 4.6vw, 72px); line-height: 1.02; letter-spacing: -0.02em; }
  h1 small { display: block; font-size: .42em; font-weight: 300; color: var(--mute); margin-top: .35em; letter-spacing: 0; }
  .haiku { margin: 0; font-size: clamp(20px, 1.9vw, 30px); line-height: 1.55; font-weight: 300; }
  .haiku span { display: block; opacity: 0; transform: translateY(10px); animation: in .9s cubic-bezier(.2, .7, .2, 1) forwards; }
  .vg { display: grid; gap: 10px; margin: 0; }
  .vg div { display: grid; grid-template-columns: 4.6em minmax(0, 1fr); gap: 10px; align-items: baseline; opacity: 0; animation: in .8s ease forwards; }
  .vg dt { font-family: "IBM Plex Mono", ui-monospace, monospace; font-size: 11px; letter-spacing: .06em; color: var(--mute); }
  .vg dd { margin: 0; font-size: clamp(15px, 1.15vw, 19px); line-height: 1.55; }
  .vg dd b { font-weight: 600; background: linear-gradient(transparent 55%, var(--marker) 55%, var(--marker) 92%, transparent 92%); }
  .acts { display: flex; flex-wrap: wrap; gap: 8px; opacity: 0; animation: in .8s ease forwards; }
  button, a.btn { font: inherit; font-size: 15px; padding: 11px 22px; border: 0; border-radius: 0; cursor: pointer; text-decoration: none;
    background: var(--paper); color: var(--ink); box-shadow: 0 1px 0 rgba(23, 25, 28, .08), 0 4px 12px rgba(23, 25, 28, .12);
    transition: transform .15s, box-shadow .15s; display: inline-flex; align-items: center; gap: 8px; }
  button:hover, a.btn:hover { transform: translateY(-2px); box-shadow: 0 2px 0 rgba(23, 25, 28, .08), 0 10px 24px rgba(23, 25, 28, .16); }
  button:active, a.btn:active { transform: translateY(1px); }
  button:focus-visible, a.btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  a.open { background: var(--ink); color: #fff; font-weight: 600; padding-inline: 30px; }
  button[aria-pressed="true"] { background: var(--ink); color: #fff; }
  .status { font-size: 12px; color: var(--mute); align-self: center; min-height: 1em; }
  .credit { margin: 0; font-size: 12px; color: var(--mute); }
  svg.i { width: 16px; height: 16px; flex: none; }
  @keyframes in { to { opacity: 1; transform: none; } }
  @keyframes drift { from { transform: translateX(0); } to { transform: translateX(-50%); } }
  @media (max-width: 860px) {
    .cv { grid-template-columns: minmax(0, 1fr); min-height: 0; }
    .art { min-height: 46vh; }
    .txt { align-content: start; }
  }
  @media (prefers-reduced-motion: reduce) {
    .haiku span, .vg div, .acts { animation: none; opacity: 1; transform: none; }
    .gen g { animation: none !important; }
  }`;

  const ICON = {
    open: '<path d="M15 5l-7 7 7 7"/>',
    share: '<circle cx="6" cy="12" r="2.4"/><circle cx="18" cy="6" r="2.4"/><circle cx="18" cy="18" r="2.4"/><path d="M8.2 11l7.6-3.9M8.2 13l7.6 3.9"/>',
    play: '<path d="M16 6 7 12l9 6z"/>',
    art: '<rect x="4" y="5" width="16" height="14" rx="1"/><path d="M4 16l5-5 4 4 3-3 4 4"/>',
  };
  const icon = (k) => `<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k]}</svg>`;
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // **מודגש** בטקסט של החזון והמטרה
  const rich = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');

  // אמנות כללית כשהאפליקציה לא מביאה אמנות משלה: שכבות שקופות שנעות לאט, כמו נייר על זכוכית
  function genericArt(accent) {
    const rows = Array.from({ length: 9 }, (_, i) => {
      const y = 40 + i * 58, op = (0.08 + (i % 4) * 0.05).toFixed(2), dur = 38 + i * 7;
      const w = () => `M-200 ${y} ` + Array.from({ length: 12 }, (_, j) => `Q${j * 200 + 100} ${y + (j % 2 ? -26 : 26)} ${j * 200 + 200} ${y}`).join(' ');
      return `<g style="animation: drift ${dur}s linear infinite ${i % 2 ? 'reverse' : ''}"><path d="${w()}" fill="none" stroke="${accent}" stroke-opacity="${op}" stroke-width="${18 - i}"/></g>`;
    }).join('');
    return `<svg class="gen" viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${rows}</svg>`;
  }

  class AppCover extends HTMLElement {
    static get observedAttributes() { return ['src']; }
    constructor() { super(); this.attachShadow({ mode: 'open' }); this.data = null; this.showVideo = false; }
    connectedCallback() { this.load(); }
    attributeChangedCallback() { if (this.isConnected) this.load(); }
    set config(v) { this.data = v; this.render(); }
    get config() { return this.data; }
    async load() {
      const src = this.getAttribute('src');
      if (!src) { this.render(); return; }
      try { const r = await fetch(new URL(src, location.href)); this.data = await r.json(); }
      catch { this.data = this.data || null; }
      this.render();
    }
    render() {
      const d = this.data;
      if (!d) { this.shadowRoot.innerHTML = `<style>${CSS}</style>`; return; }
      const p = d.palette || {};
      const vars = Object.entries({ ink: p.ink, paper: p.paper, accent: p.accent, marker: p.marker }).filter(([, v]) => v).map(([k, v]) => `--${k}:${v}`).join(';');
      const haiku = (d.haiku || []).slice(0, 3);
      const base = 0.35, step = 0.75;
      const tHaiku = (i) => base + i * step, tVg = base + haiku.length * step + 0.2;
      const v = d.video;
      const hasVideo = !!(v && (v.src || v.youtube));
      const videoHtml = !hasVideo ? '' : v.youtube
        ? `<iframe src="https://www.youtube-nocookie.com/embed/${esc(v.youtube)}?autoplay=1&rel=0" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen title="${esc(v.caption || d.name)}"></iframe>`
        : `<video src="${esc(v.src)}" ${v.poster ? `poster="${esc(v.poster)}"` : ''} controls autoplay playsinline></video>`;
      this.shadowRoot.innerHTML = `<style>${CSS}</style>
      <section class="cv" style="${vars}" part="cover" data-cover>
        <div class="art" part="art" data-art>
          ${this.showVideo && hasVideo ? videoHtml : `<slot name="art">${genericArt(p.accent || '#1F4E79')}</slot>`}
        </div>
        <div class="txt" part="text">
          ${d.kicker ? `<p class="kicker">${(Array.isArray(d.kicker) ? d.kicker : [d.kicker]).map((k) => `<span>${esc(k).replace(/([^\s·]+)\s*$/, '<b>$1</b>')}</span>`).join('')}</p>` : ''}
          <h1>${esc(d.name)}${d.subtitle ? `<small>${esc(d.subtitle)}</small>` : ''}</h1>
          ${haiku.length ? `<p class="haiku" data-haiku aria-label="הייקו">${haiku.map((l, i) => `<span style="animation-delay:${tHaiku(i)}s">${esc(l)}</span>`).join('')}</p>` : ''}
          <dl class="vg">
            ${d.vision ? `<div style="animation-delay:${tVg}s" data-vision><dt>החזון</dt><dd>${rich(d.vision)}</dd></div>` : ''}
            ${d.goal ? `<div style="animation-delay:${tVg + 0.3}s" data-goal><dt>המטרה</dt><dd>${rich(d.goal)}</dd></div>` : ''}
          </dl>
          <div class="acts" style="animation-delay:${tVg + 0.6}s">
            <a class="btn open" href="${esc(d.open?.href || '#/open')}" data-open>${esc(d.open?.label || 'פתיחה')} ${icon('open')}</a>
            ${hasVideo ? `<button type="button" data-video aria-pressed="${this.showVideo}">${this.showVideo ? `${icon('art')} חזרה לכריכה` : `${icon('play')} ${esc(v.label || 'הסרטון')}`}</button>` : ''}
            <button type="button" data-share>${icon('share')} שיתוף</button>
            <span class="status" role="status" aria-live="polite"></span>
          </div>
          ${hasVideo && v.caption && this.showVideo ? `<p class="credit">${esc(v.caption)}</p>` : ''}
          ${d.credit ? `<p class="credit">${esc(d.credit)}</p>` : ''}
        </div>
      </section>`;
      const root = this.shadowRoot;
      root.querySelector('[data-open]').addEventListener('click', (e) => {
        const ev = new CustomEvent('cover-open', { detail: { href: d.open?.href || '#/open' }, cancelable: true, bubbles: true, composed: true });
        if (!this.dispatchEvent(ev)) e.preventDefault();
      });
      root.querySelector('[data-video]')?.addEventListener('click', () => { this.showVideo = !this.showVideo; this.render(); });
      root.querySelector('[data-share]').addEventListener('click', async () => {
        const status = root.querySelector('.status');
        const url = location.href.split('#')[0];
        const s = d.share || {};
        this.dispatchEvent(new CustomEvent('cover-share', { bubbles: true, composed: true }));
        try {
          if (navigator.share) { await navigator.share({ title: s.title || d.name, text: s.text || d.vision || '', url }); return; }
          await navigator.clipboard.writeText(url);
          status.textContent = 'הקישור הועתק';
        } catch { status.textContent = url; }
      });
    }
  }
  customElements.define('app-cover', AppCover);
})();
