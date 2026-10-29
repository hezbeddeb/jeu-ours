import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  createGame, step, clampDelta, keepInWorld, saveBestScore, loadBestScore,
  FLEE_RADIUS, MIN_SPAWN_DISTANCE, MAX_DT, BEST_SCORE_KEY,
} from '../src/logic.js';
import { BEAR, CREATURES } from '../src/characters.js';
import { getSprite } from '../src/render.js';

// Générateur pseudo-aléatoire déterministe (mulberry32).
function seeded(seed = 42) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function newGame(extra = {}) {
  return createGame({ rng: seeded(), ...extra });
}

const STILL = { x: 0, y: 0 };

test('les individus sont plus lents que l\'ours', () => {
  for (const c of CREATURES) {
    assert.ok(c.speed < BEAR.speed, `${c.name} erre trop vite`);
    assert.ok((c.fleeSpeed ?? c.speed) < BEAR.speed, `${c.name} fuit trop vite`);
  }
});

test('la partie commence avec des individus loin de l\'ours', () => {
  const s = newGame();
  assert.ok(s.creatures.length > 0);
  for (const c of s.creatures) {
    assert.ok(Math.hypot(c.x - s.bear.x, c.y - s.bear.y) >= MIN_SPAWN_DISTANCE);
  }
});

test('Manger : l\'ours touche un individu → il disparaît, score +1, un autre réapparaît loin', () => {
  const s = newGame({ creatureCount: 3 });
  const target = s.creatures[0];
  target.x = s.bear.x + 5;
  target.y = s.bear.y;
  step(s, 0.016, STILL);
  assert.equal(s.score, 1);
  assert.ok(!s.creatures.includes(target), 'l\'individu mangé a disparu');
  assert.equal(s.creatures.length, 3, 'un individu réapparaît');
  const fresh = s.creatures[s.creatures.length - 1];
  assert.ok(Math.hypot(fresh.x - s.bear.x, fresh.y - s.bear.y) >= MIN_SPAWN_DISTANCE);
});

test('pas de collision → pas de score', () => {
  const s = newGame();
  step(s, 0.016, STILL);
  assert.equal(s.score, 0);
});

test('l\'ours se déplace dans la direction donnée', () => {
  const s = newGame({ creatureCount: 0 });
  const x0 = s.bear.x;
  const y0 = s.bear.y;
  step(s, 0.05, { x: 1, y: 0 });
  assert.ok(Math.abs(s.bear.x - (x0 + BEAR.speed * 0.05)) < 1e-9);
  assert.equal(s.bear.y, y0);
  step(s, 0.05, { x: 0, y: -1 });
  assert.ok(s.bear.y < y0);
});

test('Joystick relâché : direction nulle → l\'ours s\'arrête', () => {
  const s = newGame({ creatureCount: 0 });
  step(s, 0.05, { x: 1, y: 0 });
  const x = s.bear.x;
  const y = s.bear.y;
  step(s, 0.05, STILL);
  assert.equal(s.bear.x, x);
  assert.equal(s.bear.y, y);
  assert.equal(s.bear.moving, false);
});

test('Bord de map : l\'ours reste dans la map', () => {
  const s = newGame({ creatureCount: 0 });
  for (let i = 0; i < 500; i++) step(s, 0.05, { x: -1, y: -1 });
  assert.equal(s.bear.x, s.bear.radius);
  assert.equal(s.bear.y, s.bear.radius);
  for (let i = 0; i < 500; i++) step(s, 0.05, { x: 1, y: 1 });
  assert.equal(s.bear.x, s.world.width - s.bear.radius);
  assert.equal(s.bear.y, s.world.height - s.bear.radius);
});

test('Bord de map : keepInWorld ramène un individu dans la map', () => {
  const world = { width: 100, height: 100 };
  const e = { x: -50, y: 500, radius: 10 };
  keepInWorld(e, world);
  assert.deepEqual([e.x, e.y], [10, 90]);
});

test('les individus restent dans la map pendant toute une partie', () => {
  const s = newGame({ duration: 1000 });
  const rng = seeded(7);
  for (let i = 0; i < 3000; i++) {
    const a = rng() * Math.PI * 2;
    step(s, 0.05, { x: Math.cos(a), y: Math.sin(a) });
    for (const c of s.creatures) {
      assert.ok(c.x >= c.radius && c.x <= s.world.width - c.radius);
      assert.ok(c.y >= c.radius && c.y <= s.world.height - c.radius);
    }
  }
});

test('Onglet en arrière-plan : delta de temps plafonné', () => {
  assert.equal(clampDelta(30), MAX_DT);
  assert.equal(clampDelta(-1), 0);
  assert.equal(clampDelta(NaN), 0);
  assert.equal(clampDelta(0.016), 0.016);
  const s = newGame({ creatureCount: 0 });
  const x0 = s.bear.x;
  const t0 = s.timeLeft;
  step(s, 30, { x: 1, y: 0 });
  assert.ok(s.bear.x - x0 <= BEAR.speed * MAX_DT + 1e-9, 'pas de saut géant');
  assert.ok(t0 - s.timeLeft <= MAX_DT + 1e-9, 'le chrono ne saute pas non plus');
});

test('Fuite : un individu proche s\'éloigne de l\'ours', () => {
  const s = newGame({ creatureCount: 1 });
  const c = s.creatures[0];
  c.x = s.bear.x + FLEE_RADIUS / 2;
  c.y = s.bear.y;
  const d0 = Math.hypot(c.x - s.bear.x, c.y - s.bear.y);
  step(s, 0.05, STILL);
  assert.equal(c.fleeing, true);
  assert.ok(Math.hypot(c.x - s.bear.x, c.y - s.bear.y) > d0);
});

test('Fuite : un individu loin n\'est pas en fuite', () => {
  const s = newGame({ creatureCount: 1 });
  const c = s.creatures[0];
  c.x = s.bear.x + FLEE_RADIUS * 2;
  c.y = s.bear.y;
  step(s, 0.05, STILL);
  assert.equal(c.fleeing, false);
});

test('Fuite : sans sortir de la map, même acculé dans un coin', () => {
  const s = newGame({ creatureCount: 1 });
  const c = s.creatures[0];
  s.bear.x = 120;
  s.bear.y = 120;
  c.x = c.radius + 1;
  c.y = c.radius + 1;
  const start = { x: c.x, y: c.y };
  for (let i = 0; i < 40; i++) {
    step(s, 0.05, STILL);
    if (!s.creatures.includes(c)) break;
    assert.ok(c.x >= c.radius && c.x <= s.world.width - c.radius);
    assert.ok(c.y >= c.radius && c.y <= s.world.height - c.radius);
  }
  assert.ok(s.creatures.includes(c), 'l\'individu n\'a pas été mangé');
  assert.ok(Math.hypot(c.x - start.x, c.y - start.y) > 10, 'il se dégage du coin');
});

test('Fuite : plaqué contre le mur gauche, ours aligné → la distance ne diminue pas', () => {
  const s = newGame({ creatureCount: 1 });
  const c = s.creatures[0];
  c.x = c.radius;
  c.y = 1000;
  s.bear.x = c.x + 150;
  s.bear.y = c.y;
  const d0 = Math.hypot(c.x - s.bear.x, c.y - s.bear.y);
  step(s, 0.05, STILL);
  assert.ok(s.creatures.includes(c));
  assert.ok(Math.hypot(c.x - s.bear.x, c.y - s.bear.y) >= d0);
  assert.notEqual(c.y, 1000, 'il glisse le long du mur');
});

test('Errance : un individu qui touche le mur gauche rebondit', () => {
  const s = newGame({ creatureCount: 1 });
  const c = s.creatures[0];
  s.bear.x = 2000;
  s.bear.y = 2000;
  c.x = c.radius;
  c.y = 500;
  c.heading = Math.PI;
  c.wanderTimer = 10;
  step(s, 0.05, STILL);
  assert.equal(c.fleeing, false);
  assert.ok(Math.cos(c.heading) > 0);
});

test('l\'ours finit par rattraper un individu qui fuit', () => {
  const s = newGame({ creatureCount: 1 });
  const c = s.creatures[0];
  c.x = s.bear.x + 150;
  c.y = s.bear.y;
  for (let i = 0; i < 400 && s.score === 0; i++) {
    const target = s.creatures[0];
    const dx = target.x - s.bear.x;
    const dy = target.y - s.bear.y;
    const m = Math.hypot(dx, dy) || 1;
    step(s, 0.05, { x: dx / m, y: dy / m });
  }
  assert.equal(s.score, 1);
});

test('Fin du chrono : le jeu se fige à 0', () => {
  const s = newGame({ duration: 1 });
  for (let i = 0; i < 30; i++) step(s, 0.05, { x: 1, y: 0 });
  assert.equal(s.over, true);
  assert.equal(s.timeLeft, 0);
  const snapshot = JSON.stringify({ b: [s.bear.x, s.bear.y], c: s.creatures.map((c) => [c.x, c.y]), score: s.score });
  step(s, 0.05, { x: -1, y: 0 });
  const after = JSON.stringify({ b: [s.bear.x, s.bear.y], c: s.creatures.map((c) => [c.x, c.y]), score: s.score });
  assert.equal(after, snapshot, 'plus rien ne bouge après la fin');
});

test('la durée par défaut est de 60 s', () => {
  const s = createGame();
  assert.equal(s.timeLeft, 60);
});

function memoryStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    map: m,
  };
}

test('Fin du chrono : meilleur score mis à jour si battu', () => {
  const st = memoryStorage();
  assert.equal(loadBestScore(st), 0);
  assert.deepEqual(saveBestScore(st, 5), { best: 5, isNew: true });
  assert.equal(st.map.get(BEST_SCORE_KEY), '5');
  assert.deepEqual(saveBestScore(st, 3), { best: 5, isNew: false });
  assert.equal(st.map.get(BEST_SCORE_KEY), '5');
  assert.deepEqual(saveBestScore(st, 8), { best: 8, isNew: true });
});

test('Fin du chrono : localStorage indisponible → pas de meilleur score, pas de crash', () => {
  const throwing = {
    getItem() { throw new Error('SecurityError'); },
    setItem() { throw new Error('SecurityError'); },
  };
  assert.equal(loadBestScore(throwing), null);
  assert.deepEqual(saveBestScore(throwing, 4), { best: null, isNew: false });
  assert.equal(loadBestScore(null), null);
  assert.deepEqual(saveBestScore(undefined, 4), { best: null, isNew: false });
  const quotaFull = { getItem: () => '2', setItem() { throw new Error('QuotaExceeded'); } };
  assert.deepEqual(saveBestScore(quotaFull, 9), { best: null, isNew: false });
});

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

test('Sprite manquant : retour à la forme colorée', async () => {
  const saved = globalThis.Image;
  try {
    assert.equal(getSprite(null), null, 'pas de sprite -> forme');
    globalThis.Image = class FailingImage {
      set src(v) { this._src = v; queueMicrotask(() => this.onerror?.()); }
    };
    assert.equal(getSprite('assets/absent.png'), null, 'pas encore chargé -> forme');
    await tick();
    assert.equal(getSprite('assets/absent.png'), null, 'échec de chargement -> forme');

    globalThis.Image = class OkImage {
      constructor() { this.naturalWidth = 64; }
      set src(v) { this._src = v; queueMicrotask(() => this.onload?.()); }
    };
    getSprite('assets/ok.png');
    await tick();
    assert.ok(getSprite('assets/ok.png'), 'sprite chargé -> image utilisée');
  } finally {
    globalThis.Image = saved;
  }
});

test('chaque personnage est présent une fois, et réapparaît sous le même nom après avoir été mangé', () => {
  const s = createGame({ rng: seeded() });
  const names = s.creatures.map((c) => c.name).sort();
  assert.deepEqual(names, CREATURES.map((c) => c.name).sort());
  const target = s.creatures[0];
  target.x = s.bear.x + 5;
  target.y = s.bear.y;
  step(s, 0.016, STILL);
  assert.equal(s.score, 1);
  assert.deepEqual(s.creatures.map((c) => c.name).sort(), names, 'toujours un exemplaire de chaque nom');
});
