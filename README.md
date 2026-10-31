**[אתר חי: olam-gh.vercel.app](https://olam-gh.vercel.app)** · **[מאגר GitHub](https://github.com/Anat1969/Olam-GH)**

המיזוג האחרון, בלי Vercel: https://raw.githack.com/Anat1969/Olam-GH/main/app/index.html

# עולם נעלם ומציאות מצוייה

אפליקציה שמציגה את האבולוציה של תחומי הידע כצירי זמן מקבילים, עם דמויות מפתח, גילויים וקשרים ביניהם.

כרגע: **423 גילויים** ב-15 תחומים ו-96 תתי תחומים, מ-2670 לפנה״ס ועד 2020. **458 דמויות** ו-**229 קשרים**, כולם מאומתים מול מקור, ולכל ציטוט תרגום לעברית. חיפוש לפי מילת מפתח בלשונית "חיפוש" או במקש `/`.

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
- `src/cloud.ts`, `scripts/push-supabase.mjs`, `scripts/pull-supabase.mjs`: שלב 5, Supabase (cultura-GH, טבלאות `olam_`) ועריכת טקסט.
- `src/components/DraftDialog.tsx`, `scripts/pull-drafts.mjs`, `supabase/olam_drafts.sql`: גילוי חדש כטיוטה מהממשק.

## גילוי חדש כטיוטה
1. בכפתור הלוגו: "כניסה לעריכה", ואז "גילוי חדש (טיוטה)". הממשק בודק מיד שהציטוט נמצא במאמר ושהשנה מופיעה בו.
2. הטיוטה נשמרת בענן כ-`verified: false`, ולכן לא מוצגת לציבור.
3. אסימון זמני ב-SQL: `insert into olam_import_tokens (token, expires_at) values ('<אסימון>', now() + interval '30 minutes');`
4. משיכה ואימות:

```bash
OLAM_IMPORT_TOKEN=<אסימון> npm run drafts
```

```bash
npm run verify
```

5. רשומה שעברה מקבלת `verified: true`. אחרי מיזוג, `npm run push` מעדכן את הענן, והטיוטה מסומנת בחלון כ"נקלטה".
- `src/pages/MapPage.tsx`, `src/components/MapView.tsx`, `src/geo.ts`: שלב 3, גלובוס עם מחוון זמן, מסלולי ידע ומרכז הכובד.
- `src/pages/GraphPage.tsx`, `src/graph.ts`, `data/cuts.json`: שלב 4, גרף דמויות, מסננים מתקדמים, חיתוכים ותצוגות שמורות.
- `tests/e2e.cjs`: 140 בדיקות Playwright מול `vite preview`. `tests/shot.cjs`: צילומים ב-1280 וב-390.

## תיעוד

הפרויקט מתועד באפליקציית האפליקציות (aoa_apps) עם כתובת GitHub וכתובת Vercel, לפי ההנחיות הכלליות ב-Claude-GH.
