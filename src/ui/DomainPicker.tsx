// בורר התחומים: אותו בורר בכל המסכים (Picker). לחיצה מחליפה, "+" מוסיף, "הכול" מאפס.
import DomainIcon from '../icons';
import { activeDomains, discoveries } from '../data';
import Picker from './Picker';

export default function DomainPicker({ selected, onChange, counts = true, className = '' }: {
  selected: string[] | null; onChange: (next: string[] | null) => void; counts?: boolean; className?: string;
}) {
  return (
    <Picker label="תחומים" allLabel="כל התחומים" className={`domain-picker ${className}`} selected={selected} onChange={onChange}
      options={activeDomains.map((d) => ({ id: d.id, title: d.nameHe, className: `chip-dom dom-${d.id}`, label: <><DomainIcon id={d.id} />{d.nameHe}</>, count: counts ? discoveries.filter((x) => x.domainId === d.id).length : undefined }))} />
  );
}
