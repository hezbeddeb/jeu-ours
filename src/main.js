// Assemblage : boucle de jeu, redimensionnement, rejouer, service worker.

import { createGame, step, clampDelta, saveBestScore, loadBestScore } from './logic.js';
import { createInput } from './input.js';
import { render, replayButtonRect } from './render.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const input = createInput(canvas);

const view = { width: 0, height: 0, dpr: 1 };

function getStorage() {
  try {
    return window.localStorage;
  } catch {
    return null; // localStorage indisponible (mode privé strict, etc.)
  }
}

let state = createGame();
let best = { best: loadBestScore(getStorage()), isNew: false };
let lastTime = null;
let gameOverAt = 0;

function resize() {
  view.dpr = Math.min(window.devicePixelRatio || 1, 3);
  view.width = window.innerWidth;
  view.height = window.innerHeight;
  canvas.width = Math.round(view.width * view.dpr);
  canvas.height = Math.round(view.height * view.dpr);
  canvas.style.width = view.width + 'px';
  canvas.style.height = view.height + 'px';
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', resize);
resize();

function restart() {
  state = createGame();
  best = { best: loadBestScore(getStorage()), isNew: false };
  input.reset();
  input.setEnabled(true);
  lastTime = null;
}

function onGameOver() {
  best = saveBestScore(getStorage(), state.score);
  input.setEnabled(false);
  gameOverAt = performance.now();
}

// Rejouer : clic/tap sur le bouton, ou Entrée/Espace.
canvas.addEventListener('pointerdown', (e) => {
  if (!state.over) return;
  if (performance.now() - gameOverAt < 400) return; // évite un tap accidentel
  const b = replayButtonRect(view.width, view.height);
  if (e.clientX >= b.x && e.clientX <= b.x + b.w && e.clientY >= b.y && e.clientY <= b.y + b.h) {
    restart();
  }
});
window.addEventListener('keydown', (e) => {
  if (state.over && (e.key === 'Enter' || e.key === ' ')) {
    e.preventDefault();
    restart();
  }
});

// Retour au premier plan : on repart d'un delta nul (pas de saut).
document.addEventListener('visibilitychange', () => {
  lastTime = null;
});

function frame(now) {
  const dt = lastTime === null ? 0 : clampDelta((now - lastTime) / 1000);
  lastTime = now;
  if (!state.over) {
    step(state, dt, input.getDirection());
    if (state.over) onGameOver();
  }
  ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
  render(ctx, state, view, { joystick: input.joystick, best });
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => { /* hors PWA : pas grave */ });
  });
}
