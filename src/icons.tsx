// אייקון לכל תחום: קו אחד בעובי אחיד (1.75), פינות מעוגלות, 24 על 24, בצבע של התחום.
// שפה אחידה לכל הנושאים, במקום קוביות צבע. אותו מקור משמש גם את סמני המפה (מחרוזת SVG).
const P: Record<string, string> = {
  religion: '<path d="M10 21h4M10 21V11h4v10M12 11V9"/><path d="M12 9c-1.6-1.4-1.6-3.2 0-5 1.6 1.8 1.6 3.6 0 5z"/>',
  philosophy: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.4c-.7.3-1 .8-1 1.5V14"/><path d="M12 17.2h.01"/>',
  psychology: '<path d="M15 21v-3h2a2 2 0 0 0 2-2v-2.2l1.4-.6-1.6-3.2A7.4 7.4 0 1 0 8 16.4V21"/><path d="M10.5 9.5a2 2 0 1 1 2 2v1.5"/>',
  mathematics: '<path d="M17 5H7l6 7-6 7h10"/>',
  physics: '<circle cx="12" cy="12" r="1.3"/><ellipse cx="12" cy="12" rx="9.5" ry="3.6"/><ellipse cx="12" cy="12" rx="9.5" ry="3.6" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9.5" ry="3.6" transform="rotate(120 12 12)"/>',
  chemistry: '<path d="M9 3h6M10 3v6.2L5.2 17.8A2 2 0 0 0 7 21h10a2 2 0 0 0 1.8-3.2L14 9.2V3"/><path d="M7.6 15h8.8"/>',
  biology: '<path d="M8 3c0 5 8 6 8 9s-8 4-8 9"/><path d="M16 3c0 5-8 6-8 9s8 4 8 9"/><path d="M9.2 6.5h5.6M9.2 17.5h5.6"/>',
  music: '<path d="M9 18V5l10-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>',
  dance: '<circle cx="13" cy="4" r="1.8"/><path d="M13 7l-1 6M12.5 9.5 7 7M12.5 9.5l5.5 1.5M12 13l-3.5 7.5M12 13l4.5 6"/>',
  'combat-sports': '<path d="M3 11h18v3H3z"/><path d="M10.5 14 8 21M13.5 14l2.5 7"/><path d="M10 9.5h4v6h-4z"/>',
  painting: '<path d="M12 3a9 9 0 1 0 0 18c1.4 0 2-.9 2-1.9 0-.9-.6-1.4-.6-2.3 0-1 .8-1.6 1.8-1.6H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="14.5" cy="7" r="1"/>',
  sculpture: '<circle cx="12" cy="5.5" r="2.8"/><path d="M6.5 14.5c0-3 2.6-5 5.5-5s5.5 2 5.5 5"/><path d="M5 14.5h14v3H5zM8 17.5V21h8v-3.5"/>',
  architecture: '<path d="M3 9.5 12 4l9 5.5M4 9.5h16M6 9.5V18M10 9.5V18M14 9.5V18M18 9.5V18M3 20.5h18"/>',
  cinema: '<rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M10 9.2l5 2.8-5 2.8z"/>',
  mixed: '<rect x="4" y="4" width="6.5" height="6.5" rx="1"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1"/>',
};

const wrap = (inner: string, cls: string) => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${inner}</svg>`;

/** מחרוזת SVG, לסמני המפה שנבנים ב-DOM */
export const iconSvg = (id: string) => wrap(P[id] || P.mixed, `dicon i-${P[id] ? id : 'mixed'}`);

export default function DomainIcon({ id, label }: { id: string; label?: string }) {
  return <span className="dicon-wrap" role={label ? 'img' : undefined} aria-label={label} dangerouslySetInnerHTML={{ __html: iconSvg(id) }} />;
}
