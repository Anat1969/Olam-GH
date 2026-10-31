**[אתר חי: olam-gh.vercel.app](https://olam-gh.vercel.app)** · **[מאגר GitHub](https://github.com/Anat1969/Olam-GH)**

המיזוג האחרון, בלי Vercel: https://raw.githack.com/Anat1969/Olam-GH/main/app/index.html

# עולם נעלם ומציאות מצוייה

אפליקציה שמציגה את האבולוציה של תחומי הידע כצירי זמן מקבילים, עם דמויות מפתח, גילויים וקשרים ביניהם.

## מה יש כאן כרגע

- `SPEC.md`: אפיון המוצר, מודל הנתונים, המסכים והשלבים
- `CLAUDE.md`: הוראות לבנייה ב-Claude Code, כולל חוקי תוכן ומקורות
- `data/fields.json`: ארבע המשפחות והתחומים
- `data/persons.json`, `data/discoveries.json`, `data/links.json`: תוכן פיילוט (קפלר וניוטון)
- `docs/CLAUDE-CODE-HANDOFF.md`: הפרומפט לפתיחת העבודה ב-Claude Code

## הרצה מקומית

```bash
npm install
npm run dev
```

```bash
npm run verify
```

```bash
npm run build && npm test
```

## מבנה
- `data/`: מקור האמת. `verification-report.json` נוצר ב-`npm run verify`.
- `scripts/verify-data.mjs`: בודק ציטוט מילולי מול ויקיפדיה, וממלא דמויות, מקומות ותמונות (עם רישיון) מוויקינתונים ומוויקישיתוף.
- `src/components/Timeline.tsx`: ציר זמן ב-D3, הזמן זורם מימין לשמאל, ציר דחוס לפני 1500.
- `src/components/PersonCard.tsx`: כרטיס דמות עם ציטוטים, קשרים ומקורות.
- `src/pages/Compare.tsx`: שלב 2, השוואה בין תחומים עם זום מסונכרן וקשרים בלחיצה.
- `tests/e2e.cjs`: 81 בדיקות Playwright מול `vite preview`. `tests/shot.cjs`: צילומים ב-1280 וב-390.

## תיעוד

הפרויקט מתועד באפליקציית האפליקציות (aoa_apps) עם כתובת GitHub וכתובת Vercel, לפי ההנחיות הכלליות ב-Claude-GH.
