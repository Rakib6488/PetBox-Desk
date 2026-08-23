import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

document.title = 'Petbox Desk';

const root = document.getElementById('root');

window.addEventListener('error', (event) => {
  if (root && !root.querySelector('[data-app-mounted]')) {
    const shell = document.createElement('div');
    shell.style.cssText = 'min-height:100vh;display:grid;place-items:center;padding:24px;font-family:system-ui;background:#f8fafc;color:#334155';
    const content = document.createElement('div');
    const heading = document.createElement('h1');
    heading.style.cssText = 'margin:0 0 8px;font-size:20px';
    heading.textContent = 'Petbox Desk could not start';
    const message = document.createElement('p');
    message.style.cssText = 'margin:0;color:#64748b';
    message.textContent = String(event.error?.message || event.message || 'Refresh the page and try again.');
    content.append(heading, message);
    shell.append(content);
    root.replaceChildren(shell);
  }
});

createRoot(root!).render(
  <StrictMode>
    <div data-app-mounted><App /></div>
  </StrictMode>,
);
