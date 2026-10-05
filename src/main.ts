import '@fontsource/noto-sans/latin-400.css';
import '@fontsource/noto-sans/latin-700.css';
import '@fontsource/noto-sans-devanagari/devanagari-400.css';
import '@fontsource/noto-sans-devanagari/devanagari-700.css';
import './ui/styles.css';
import { registerSW } from 'virtual:pwa-register';
import { App } from './app';

const canvas = document.getElementById('stage') as HTMLCanvasElement | null;
const ui = document.getElementById('ui');

function fatal(msg: string): void {
  if (!ui) return;
  ui.innerHTML = '';
  const box = document.createElement('div');
  box.className = 'screen';
  box.innerHTML =
    '<div class="wrap"><div class="card"><h2>Mind Palace</h2><p class="err"></p><button class="btn primary">Reload</button></div></div>';
  (box.querySelector('.err') as HTMLElement).textContent = msg;
  box.querySelector('button')?.addEventListener('click', () => location.reload());
  ui.append(box);
}

// Never show a blank screen: surface unexpected errors in the UI.
window.addEventListener('error', (e) => {
  console.error(e.error ?? e.message);
});
window.addEventListener('unhandledrejection', (e) => console.error(e.reason));

if (canvas && ui) {
  const app = new App(canvas, ui);
  (window as unknown as { __mp: App }).__mp = app;
  app.init().catch((e: unknown) => {
    console.error(e);
    fatal(`Something went wrong while starting: ${e instanceof Error ? e.message : String(e)}`);
  });
  registerSW({ immediate: true });
} else fatal('The page is missing its canvas.');
