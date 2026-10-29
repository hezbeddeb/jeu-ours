// Logique pure du jeu : aucun accès au DOM ni au canvas.
// Testable avec `node --test`.

import { BEAR, CREATURES } from './characters.js';

export const WORLD_WIDTH = 2400;
export const WORLD_HEIGHT = 2400;
export const GAME_DURATION = 60; // secondes
export const CREATURE_COUNT = null; // null = un individu de chaque personnage de CREATURES
export const FLEE_RADIUS = 200; // px : distance à partir de laquelle un individu fuit
export const MIN_SPAWN_DISTANCE = 600; // px : réapparition loin de l'ours
export const ESCAPE_DURATION = 0.8; // s : durée d'une sortie le long d'un mur
export const MAX_DT = 0.1; // s : plafond du pas de temps (onglet en arrière-plan)
export const BEST_SCORE_KEY = 'jeu-ours-best-score';

/** Plafonne un delta de temps (en secondes) : jamais négatif, jamais > MAX_DT. */
export function clampDelta(dt) {
  if (!Number.isFinite(dt) || dt < 0) return 0;
  return Math.min(dt, MAX_DT);
}

export function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

/** Garde une entité (x, y, radius) entièrement dans la map. */
export function keepInWorld(entity, world) {
  entity.x = clamp(entity.x, entity.radius, world.width - entity.radius);
  entity.y = clamp(entity.y, entity.radius, world.height - entity.radius);
}

function dist2(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function randomHeading(rng) {
  return rng() * Math.PI * 2;
}

function makeCreature(type, x, y, rng) {
  return {
    type,
    name: type.name,
    radius: type.radius,
    color: type.color,
    sprite: type.sprite ?? null,
    x,
    y,
    heading: randomHeading(rng),
    wanderTimer: 0.5 + rng() * 2,
    fleeing: false,
  };
}

/** Choisit une position loin de l'ours (la plus éloignée parmi quelques essais si besoin). */
export function findSpawnPosition(state, radius) {
  const { world, bear, rng } = state;
  let best = null;
  let bestD = -1;
  for (let i = 0; i < 30; i++) {
    const p = {
      x: radius + rng() * (world.width - 2 * radius),
      y: radius + rng() * (world.height - 2 * radius),
    };
    const d = dist2(p, bear);
    if (d >= MIN_SPAWN_DISTANCE * MIN_SPAWN_DISTANCE) return p;
    if (d > bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
}

/** Fait apparaître un individu loin de l'ours (type tiré au hasard si non précisé). */
export function spawnCreature(state, type) {
  const { rng } = state;
  const types = state.creatureTypes;
  type ??= types[Math.floor(rng() * types.length) % types.length];
  const p = findSpawnPosition(state, type.radius);
  const c = makeCreature(type, p.x, p.y, rng);
  state.creatures.push(c);
  return c;
}

function makeScenery(world, rng) {
  const items = [];
  const count = Math.round((world.width * world.height) / 60000);
  for (let i = 0; i < count; i++) {
    const kind = rng() < 0.65 ? 'tree' : 'rock';
    items.push({
      kind,
      x: rng() * world.width,
      y: rng() * world.height,
      size: kind === 'tree' ? 22 + rng() * 18 : 12 + rng() * 14,
    });
  }
  return items;
}

/**
 * Crée un nouvel état de partie.
 * Options : rng (fonction [0,1)), worldWidth, worldHeight, duration, creatureCount,
 * bear (config), creatureTypes (liste de configs).
 */
export function createGame(options = {}) {
  const rng = options.rng ?? Math.random;
  const world = {
    width: options.worldWidth ?? WORLD_WIDTH,
    height: options.worldHeight ?? WORLD_HEIGHT,
  };
  const bearCfg = options.bear ?? BEAR;
  const state = {
    rng,
    world,
    bear: {
      name: bearCfg.name,
      radius: bearCfg.radius,
      speed: bearCfg.speed,
      color: bearCfg.color,
      sprite: bearCfg.sprite ?? null,
      x: world.width / 2,
      y: world.height / 2,
      facing: 0,
      moving: false,
    },
    creatureTypes: options.creatureTypes ?? CREATURES,
    creatures: [],
    scenery: makeScenery(world, rng),
    score: 0,
    duration: options.duration ?? GAME_DURATION,
    timeLeft: options.duration ?? GAME_DURATION,
    over: false,
  };
  // Chaque personnage apparaît une fois (puis en boucle si on en demande plus).
  const types = state.creatureTypes;
  const count = options.creatureCount ?? CREATURE_COUNT ?? types.length;
  for (let i = 0; i < count; i++) spawnCreature(state, types[i % types.length]);
  return state;
}

function updateBear(state, dt, dir) {
  const bear = state.bear;
  const dx = dir?.x ?? 0;
  const dy = dir?.y ?? 0;
  let len = Math.hypot(dx, dy);
  if (len < 1e-6) {
    bear.moving = false;
  } else {
    const scale = len > 1 ? 1 / len : 1; // magnitude max 1
    bear.x += dx * scale * bear.speed * dt;
    bear.y += dy * scale * bear.speed * dt;
    bear.facing = Math.atan2(dy, dx);
    bear.moving = true;
  }
  keepInWorld(bear, state.world);
}

function updateCreature(state, c, dt) {
  const { bear, world, rng } = state;
  const dx = c.x - bear.x;
  const dy = c.y - bear.y;
  const d = Math.hypot(dx, dy);
  let vx;
  let vy;
  if (d < FLEE_RADIUS) {
    c.fleeing = true;
    let fx = d > 1e-6 ? dx / d : Math.cos(c.heading);
    let fy = d > 1e-6 ? dy / d : Math.sin(c.heading);
    // Contre un bord, on glisse le long du mur au lieu d'y rester collé.
    const margin = c.radius + 2;
    const blockedX = (vx0) => (c.x <= margin && vx0 < 0) || (c.x >= world.width - margin && vx0 > 0);
    const blockedY = (vy0) => (c.y <= margin && vy0 < 0) || (c.y >= world.height - margin && vy0 > 0);
    if (blockedX(fx)) fx = 0;
    if (blockedY(fy)) fy = 0;
    // Échappée en cours (sortie de coin) : on la garde un moment pour ne pas osciller.
    c.escapeTimer = (c.escapeTimer ?? 0) - dt;
    if (c.escapeTimer > 0 && c.escape && !blockedX(c.escape.x) && !blockedY(c.escape.y)) {
      fx = c.escape.x;
      fy = c.escape.y;
    } else if (fx === 0 && fy === 0) {
      // Plaqué contre un mur, l'ours en face : on glisse le long de ce mur,
      // du côté opposé à l'ours (vers le centre de la map si l'ours est pile aligné).
      // Dans un coin, ce sens est lui aussi bloqué : on part dans l'autre sens.
      const pinnedX = c.x <= margin || c.x >= world.width - margin;
      if (pinnedX) {
        fy = dy !== 0 ? Math.sign(dy) : c.y < world.height / 2 ? 1 : -1;
        if ((fy < 0 && c.y <= margin) || (fy > 0 && c.y >= world.height - margin)) fy = -fy;
      } else {
        fx = dx !== 0 ? Math.sign(dx) : c.x < world.width / 2 ? 1 : -1;
        if ((fx < 0 && c.x <= margin) || (fx > 0 && c.x >= world.width - margin)) fx = -fx;
      }
      c.escape = { x: fx, y: fy };
      c.escapeTimer = ESCAPE_DURATION;
    }
    const fl = Math.hypot(fx, fy);
    const speed = c.type.fleeSpeed ?? c.type.speed;
    vx = (fx / fl) * speed;
    vy = (fy / fl) * speed;
    c.heading = Math.atan2(vy, vx);
  } else {
    c.fleeing = false;
    c.escapeTimer = 0;
    c.wanderTimer -= dt;
    if (c.wanderTimer <= 0) {
      c.heading = randomHeading(rng);
      c.wanderTimer = 1 + rng() * 2.5;
    }
    vx = Math.cos(c.heading) * c.type.speed;
    vy = Math.sin(c.heading) * c.type.speed;
  }
  c.x += vx * dt;
  c.y += vy * dt;
  const bx = c.x;
  const by = c.y;
  keepInWorld(c, world);
  // En errance, rebondit sur les bords.
  if (!c.fleeing && (bx !== c.x || by !== c.y)) {
    const nvx = bx !== c.x ? -vx : vx;
    const nvy = by !== c.y ? -vy : vy;
    c.heading = Math.atan2(nvy, nvx);
  }
}

/** L'ours mange les individus qu'il touche ; chacun est remplacé loin de l'ours. */
function handleCollisions(state) {
  const { bear } = state;
  const eaten = [];
  for (let i = state.creatures.length - 1; i >= 0; i--) {
    const c = state.creatures[i];
    const r = bear.radius + c.radius;
    if (dist2(bear, c) <= r * r) {
      state.creatures.splice(i, 1);
      state.score += 1;
      eaten.push(c.type);
    }
  }
  // Le même personnage réapparaît ailleurs : chaque nom reste unique sur la map.
  for (const type of eaten) spawnCreature(state, type);
  return eaten.length;
}

/**
 * Avance la partie de `dt` secondes avec la direction `dir` ({x, y}, magnitude ≤ 1).
 * Retourne l'état (modifié en place). Ne fait rien si la partie est finie.
 */
export function step(state, dt, dir) {
  if (state.over) return state;
  dt = clampDelta(dt);
  if (dt === 0) return state;
  const used = Math.min(dt, state.timeLeft);
  updateBear(state, used, dir);
  for (const c of state.creatures) updateCreature(state, c, used);
  handleCollisions(state);
  state.timeLeft -= dt;
  if (state.timeLeft <= 0) {
    state.timeLeft = 0;
    state.over = true;
  }
  return state;
}

/** Lit le meilleur score ; renvoie null si le stockage est indisponible. */
export function loadBestScore(storage) {
  try {
    if (!storage) return null;
    const raw = storage.getItem(BEST_SCORE_KEY);
    const n = raw == null ? 0 : parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return null;
  }
}

/**
 * Enregistre le score s'il bat le record.
 * Renvoie { best, isNew } ; best vaut null si le stockage est indisponible.
 */
export function saveBestScore(storage, score) {
  const prev = loadBestScore(storage);
  if (prev === null) return { best: null, isNew: false };
  if (score > prev) {
    try {
      storage.setItem(BEST_SCORE_KEY, String(score));
      return { best: score, isNew: true };
    } catch {
      return { best: null, isNew: false };
    }
  }
  return { best: prev, isNew: false };
}
