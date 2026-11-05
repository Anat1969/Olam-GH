/* גשר ארק ובינה: אפליקציה שותפה מתקינה שורה אחת:
   <script src="https://arc-and-bina.vercel.app/bridge.js" defer></script>
   כשמגיעים עם ?ab_q=<שאלה>&ab_back=<כתובת חזרה>, מוצג פס עליון עם השאלה וכפתור חזרה.
   הכתובת נשארת כמו שהיא (הפרמטרים לפני ה-#), כך שהניתוב של האפליקציה לא נפגע. */
(function () {
  var p = new URLSearchParams(location.search), q = p.get("ab_q"), back = p.get("ab_back");
  if (!q) return;
  if (!back || back.indexOf("https://arc-and-bina.vercel.app/") !== 0) back = "https://arc-and-bina.vercel.app/";
  function show() {
    if (document.getElementById("ab-bridge")) return;
    var bar = document.createElement("div");
    bar.id = "ab-bridge"; bar.setAttribute("dir", "rtl"); bar.setAttribute("role", "note");
    bar.style.cssText = "position:fixed;inset-inline:0;bottom:0;z-index:2147483000;display:flex;gap:12px;align-items:center;justify-content:space-between;padding:10px 16px;background:#16303A;color:#fff;font:14px/1.4 'IBM Plex Sans Hebrew',system-ui,sans-serif;box-shadow:0 -4px 16px rgba(0,0,0,.18)";
    var t = document.createElement("span");
    var b = document.createElement("b"); b.textContent = "הגעת מארק ובינה: ";
    t.appendChild(b); t.appendChild(document.createTextNode(q));
    var actions = document.createElement("span"); actions.style.cssText = "display:flex;gap:8px;flex:none";
    var a = document.createElement("a"); a.href = back; a.textContent = "חזרה לשאלה";
    a.style.cssText = "background:#DCEAEC;color:#16303A;padding:8px 12px;text-decoration:none;font-weight:600";
    var x = document.createElement("button"); x.type = "button"; x.textContent = "סגירה";
    x.style.cssText = "background:transparent;color:#fff;border:0;padding:8px 12px;cursor:pointer;font:inherit";
    x.onclick = function () { bar.remove(); };
    actions.appendChild(a); actions.appendChild(x);
    bar.appendChild(t); bar.appendChild(actions);
    document.body.appendChild(bar);
  }
  if (document.body) show(); else document.addEventListener("DOMContentLoaded", show);
})();
