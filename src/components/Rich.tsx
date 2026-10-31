// טקסט עשיר: **מודגש**, ==תובנה== (מרקר צהוב), ומספרים מודגשים אוטומטית בכיוון LTR מבודד.
import type { ElementType } from 'react';
const TOKEN = /(\*\*[^*]+\*\*|==[^=]+==)/g;
// מספר: ספרות, ופסיק רק כמפריד אלפים (1,000). פסיק אחרי מספר הוא פיסוק, ולא חלק ממנו.
const NUM = /(\d+(?:,\d{3})*(?:\.\d+)?%?)/g;

function Numbers({ text }: { text: string }) {
  return <>{text.split(NUM).map((part, i) => (i % 2 ? <bdi key={i} className="num">{part}</bdi> : part))}</>;
}

export default function Rich({ children, as: Tag = 'span', className }: { children: string; as?: ElementType; className?: string }) {
  const parts = String(children).split(TOKEN);
  return (
    <Tag className={className}>
      {parts.map((part, i) => {
        if (part.startsWith('**')) return <strong key={i}><Numbers text={part.slice(2, -2)} /></strong>;
        if (part.startsWith('==')) return <mark key={i} className="insight"><Numbers text={part.slice(2, -2)} /></mark>;
        return <Numbers key={i} text={part} />;
      })}
    </Tag>
  );
}
