import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/base.css';
import './styles/app.css';

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);

// service worker רק כשהבסיס הוא '/', כלומר ב-Vercel. ב-raw.githack לא רושמים.
if ('serviceWorker' in navigator && import.meta.env.BASE_URL === '/' && import.meta.env.PROD) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}
