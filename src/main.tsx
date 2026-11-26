import React from 'react';
import ReactDOM from 'react-dom/client';
import { getCurrentWindow } from '@tauri-apps/api/window';
import './styles/index.css';

let label = 'main';
try { label = getCurrentWindow().label; } catch { /* Browser preview. */ }

const entry = label.startsWith('note-') ? import('./components/StickyNoteWindow') : import('./App');
void entry.then(({ default: WindowContent }) => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode><WindowContent /></React.StrictMode>
  );
});
