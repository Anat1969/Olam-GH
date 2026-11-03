// יצירות: כל נושא מהידע, ההבנה והיישום של האפליקציה הופך לחדר עם יצירות בעיצובים שונים.
// הרכיב המשותף <app-creations> (AppOfApp-GH/public/creations.js) מציג אותן, מדפיס A4 ומעלה לחדר ב-TAARUCHA.
// הנתונים: public/creations.json, נגזר מ-data/ ב-tools/creations.mjs.
export default function Creations() {
  return (
    <main className="page creations-page">
      <app-creations src="./creations.json" heading="מה העולם הנעלם יוצר" />
    </main>
  );
}
