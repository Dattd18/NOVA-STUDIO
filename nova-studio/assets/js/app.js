import { initUI } from './ui.js';

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initUI, { once: true });
} else {
  initUI();
}
