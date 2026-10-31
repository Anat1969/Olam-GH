// תמונת היצירה (בניין, ציור, פסל, ספר, כרזה, אירוע): מוויקישיתוף, עם קרדיט, רישיון והמאמר שממנו נלקחה.
import type { Discovery } from '../data';

export default function WorkImage({ d, small = false }: { d: Discovery; small?: boolean }) {
  const im = d.workImage;
  if (!im) return null;
  return (
    <figure className={`work-img${small ? ' is-small' : ''}`}>
      <a href={im.page} target="_blank" rel="noreferrer"><img src={im.url} alt={d.title} loading="lazy" onError={(e) => { (e.currentTarget.closest('figure') as HTMLElement).style.display = 'none'; }} /></a>
      {!small && (
        <figcaption className="label">
          <span dir="ltr">{im.credit || 'Wikimedia Commons'}</span> · <span dir="ltr">{im.license}</span> · מתוך <span dir="ltr">{im.article}</span>
        </figcaption>
      )}
    </figure>
  );
}
