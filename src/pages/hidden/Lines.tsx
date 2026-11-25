// בין השורות: תובנות מסדר שני. כל תובנה בשלוש שכבות: הבנה, הדגמה, הפעלה.
import Rich from '../../components/Rich';
import { href } from '../../route';
import { insights } from '../../hidden/metrics';
import { mechById } from '../../hidden/model';
import { Evidence, LevelTag, VizView } from './parts';

export default function Lines() {
  return (
    <div className="hd-grid">
      {insights().map((x) => (
        <article key={x.id} className="hd-card glass" data-insight={x.id}>
          <header className="hd-head">
            <span className="label">{x.lead}</span>
            <LevelTag level={x.level} />
          </header>
          <h3 className="hd-title"><Rich>{x.headline}</Rich></h3>
          <VizView viz={x.viz} />
          <div className="layers">
            <section><h4>הבנה</h4><p><Rich>{x.understanding}</Rich></p>{x.detail && <p className="muted"><Rich>{x.detail}</Rich></p>}</section>
            <section><h4>הדגמה</h4><Evidence ids={x.examples} /><p className="caveat"><Rich>{x.caveat}</Rich></p></section>
            <section className="act">
              <h4>הפעלה</h4>
              <a className="press btn btn-primary btn-quiet" href={href('hidden', { v: 'lab', m: x.preset.m, t: x.preset.t })} data-activate={x.id}>
                להפעיל את "{mechById.get(x.preset.m)?.name}" במעבדה
              </a>
              {x.map && <a className="press btn btn-quiet" href={href('map', x.map)} data-map={x.id}>לראות את המסלולים על המפה</a>}
            </section>
          </div>
        </article>
      ))}
    </div>
  );
}
