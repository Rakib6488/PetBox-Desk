import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

document.title = 'Petbox Desk';

const root = document.getElementById('root');

window.addEventListener('error', (event) => {
  if (root && !root.querySelector('[data-app-mounted]')) {
    root.innerHTML = `<div style="min-height:100vh;display:grid;place-items:center;padding:24px;font-family:system-ui;background:#f8fafc;color:#334155"><div><h1 style="margin:0 0 8px;font-size:20px">Petbox Desk could not start</h1><p style="margin:0;color:#64748b">${String(event.error?.message || event.message || 'Refresh the page and try again.')}</p></div></div>`;
  }
});

createRoot(root!).render(
  <StrictMode>
    <div data-app-mounted><App /></div>
  </StrictMode>,
);
