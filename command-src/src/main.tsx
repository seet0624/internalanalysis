import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

document.documentElement.lang = (() => { try { return localStorage.getItem('cmd-lang') === 'en' ? 'en' : 'zh-CN'; } catch { return 'zh-CN'; } })();
const root = document.getElementById('root');
if (root) createRoot(root).render(<StrictMode><App /></StrictMode>);
