import { render } from 'preact'
import './index.css'
import { App } from './app.jsx'
import { get, set } from './storage.js'

// Tema: 'dark' por defecto. A futuro, llamá setTheme('light' | 'dark')
// o toggleTheme() desde cualquier botón. Se guarda en localStorage.
const KEY = 'tt-theme'
function currentTheme() {
  const saved = get(KEY, "")
  if (saved) return saved
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}
function applyTheme(t) {
  document.documentElement.classList.toggle('dark', t === 'dark')
  set(KEY, t)
}
applyTheme(get(KEY, "") || 'dark')
window.ttTheme = {
  get: () => get(KEY, "") || 'dark',
  set: (t) => applyTheme(t === 'light' ? 'light' : 'dark'),
  toggle: () => applyTheme(currentTheme() === 'dark' ? 'light' : 'dark'),
}

render(<App />, document.getElementById('app'))

// PWA: registra el service worker solo en producción.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
