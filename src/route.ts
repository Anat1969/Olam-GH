import { useEffect, useState } from 'react';

// ניתוב hash: הכתובת נושאת דף, תחום, שנה ודמות, כך שהעתקת קישור פותחת את אותו מצב.
export type Route = { page: string; params: Record<string, string> };
const parse = (): Route => {
  const [path, query = ''] = window.location.hash.replace(/^#\/?/, '').split('?');
  return { page: path || 'home', params: Object.fromEntries(new URLSearchParams(query)) };
};

export function useRoute() {
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const on = () => {
      const next = parse();
      setRoute((prev) => {
        if (prev.page !== next.page) window.scrollTo({ top: 0 });
        return next;
      });
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

const build = (page: string, params?: Record<string, string | undefined>) => {
  const clean = Object.fromEntries(Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== '')) as Record<string, string>;
  const q = Object.keys(clean).length ? '?' + new URLSearchParams(clean).toString() : '';
  return page === 'home' ? '#/' : `#/${page}${q}`;
};
export const href = build;
export const go = (page: string, params?: Record<string, string | undefined>) => { window.location.hash = build(page, params); };
/** עדכון שקט של הכתובת (בלי רשומה חדשה בהיסטוריה), למחוון שזז ברציפות */
export const replace = (page: string, params?: Record<string, string | undefined>) => {
  history.replaceState(null, '', build(page, params));
  window.dispatchEvent(new HashChangeEvent('hashchange'));
};
