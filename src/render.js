// Rendu canvas : map, décors, personnages, HUD, joystick, écran de fin.
// Les sprites sont optionnels ; s'ils ne chargent pas, on dessine des formes colorées.

import { JOYSTICK_RADIUS } from './input.js';

const spriteCache = new Map(); // src -> { img, ok }

/** Renvoie l'image chargée pour `src`, ou null (pas encore chargée / échec / pas de sprite). */
export function getSprite(src) {
  if (!src || typeof Image === 'undefined') return null;
  let entry = spriteCache.get(src);
  if (!entry) {
    const img = new Image();
    entry = { img, ok: false };
    img.onload = () => { entry.ok = img.naturalWidth > 0; };
    img.onerror = () => { entry.ok = false; };
    img.src = src;
    spriteCache.set(src, entry);
  }
  return entry.ok ? entry.img : null;
}

export function computeCamera(state, viewW, viewH) {
  const { world, bear } = state;
  const cx = world.width <= viewW ? (world.width - viewW) / 2
    : Math.min(Math.max(bear.x - viewW / 2, 0), world.width - viewW);
  const cy = world.height <= viewH ? (world.height - viewH) / 2
    : Math.min(Math.max(bear.y - viewH / 2, 0), world.height - viewH);
  return { x: cx, y: cy };
}

function drawGround(ctx, state, cam, viewW, viewH) {
  ctx.fillStyle = '#1d2b16';
  ctx.fillRect(0, 0, viewW, viewH);
  ctx.fillStyle = '#5b8c3a';
  ctx.fillRect(-cam.x, -cam.y, state.world.width, state.world.height);
  // Quadrillage léger pour sentir le mouvement.
  ctx.strokeStyle = 'rgba(0,0,0,0.06)';
  ctx.lineWidth = 1;
  const step = 100;
  const x0 = Math.max(0, Math.floor(cam.x / step) * step);
  const y0 = Math.max(0, Math.floor(cam.y / step) * step);
  const x1 = Math.min(state.world.width, cam.x + viewW);
  const y1 = Math.min(state.world.height, cam.y + viewH);
  ctx.beginPath();
  for (let x = x0; x <= x1; x += step) {
    ctx.moveTo(x - cam.x, Math.max(0, -cam.y));
    ctx.lineTo(x - cam.x, y1 - cam.y);
  }
  for (let y = y0; y <= y1; y += step) {
    ctx.moveTo(Math.max(0, -cam.x), y - cam.y);
    ctx.lineTo(x1 - cam.x, y - cam.y);
  }
  ctx.stroke();
  // Bord de la map.
  ctx.strokeStyle = '#2f4a1f';
  ctx.lineWidth = 8;
  ctx.strokeRect(-cam.x, -cam.y, state.world.width, state.world.height);
}

function visible(x, y, r, cam, viewW, viewH) {
  return x + r >= cam.x && x - r <= cam.x + viewW && y + r >= cam.y && y - r <= cam.y + viewH;
}

function drawScenery(ctx, state, cam, viewW, viewH) {
  for (const s of state.scenery) {
    if (!visible(s.x, s.y, s.size, cam, viewW, viewH)) continue;
    const x = s.x - cam.x;
    const y = s.y - cam.y;
    if (s.kind === 'tree') {
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath();
      ctx.ellipse(x + 4, y + 6, s.size, s.size * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2e6b2a';
      ctx.beginPath();
      ctx.arc(x, y, s.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3f8a37';
      ctx.beginPath();
      ctx.arc(x - s.size * 0.25, y - s.size * 0.25, s.size * 0.55, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#8d8d86';
      ctx.beginPath();
      ctx.ellipse(x, y, s.size * 1.2, s.size, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#a8a8a0';
      ctx.beginPath();
      ctx.ellipse(x - s.size * 0.3, y - s.size * 0.3, s.size * 0.5, s.size * 0.35, 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// Le sprite garde ses proportions (contenu dans un carré de côté radius*2).
// `rotation` (radians) : le sprite est supposé dessiné tourné vers la droite.
function drawSpriteOrShape(ctx, entity, x, y, drawShape, rotation = 0) {
  const img = getSprite(entity.sprite);
  if (img) {
    const box = entity.radius * 2;
    const scale = box / Math.max(img.naturalWidth || box, img.naturalHeight || box);
    const w = (img.naturalWidth || box) * scale;
    const h = (img.naturalHeight || box) * scale;
    ctx.save();
    ctx.translate(x, y);
    if (rotation) ctx.rotate(rotation);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
  } else {
    drawShape();
  }
}

const EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
const emojiCache = new Map(); // "emoji|taille" -> canvas pré-rendu (plus rapide que fillText à chaque frame)

function emojiImage(emoji, size) {
  const key = `${emoji}|${size}`;
  let img = emojiCache.get(key);
  if (!img && typeof document !== 'undefined') {
    img = document.createElement('canvas');
    img.width = img.height = Math.ceil(size * 1.3);
    const g = img.getContext('2d');
    g.font = `${size}px ${EMOJI_FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(emoji, img.width / 2, img.height / 2 + size * 0.06);
    emojiCache.set(key, img);
  }
  return img;
}

function drawEmojiCreature(ctx, c, x, y) {
  const t = c.type;
  const size = Math.round(c.radius * 2.3);
  // Petit sautillement en marchant ; se tourne vers la gauche/droite selon sa direction.
  const bob = Math.abs(Math.sin(performance.now() / 130 + c.x * 0.01)) * c.radius * 0.18;
  const flip = Math.cos(c.heading) > 0 ? -1 : 1; // les emojis regardent souvent vers la gauche
  ctx.save();
  ctx.translate(x, y - bob);
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.ellipse(0, c.radius * 0.85 + bob, c.radius * 0.8, c.radius * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.scale(flip * (t.emojiScaleX ?? 1), 1);
  if (t.emojiBehind) {
    // Balai couché sous la sorcière (l'emoji 🧹 est en diagonale : on le remet à l'horizontale).
    const behind = emojiImage(t.emojiBehind, Math.round(size * 1.35));
    ctx.save();
    ctx.translate(0, c.radius * 0.55);
    ctx.rotate(Math.PI / 4);
    ctx.drawImage(behind, -behind.width / 2, -behind.height / 2);
    ctx.restore();
  }
  const img = emojiImage(t.emoji, size);
  ctx.drawImage(img, -img.width / 2, -img.height / 2);
  ctx.restore();
}

// Dessins spéciaux (quand aucun emoji ne convient).
const CUSTOM_DRAWINGS = {
  // Grosse dame vue de face : robe très large, bras potelés, chignon et rouge à lèvres.
  grosseDame(ctx, c, x, y) {
    const r = c.radius;
    const bob = Math.abs(Math.sin(performance.now() / 160 + c.x * 0.01)) * r * 0.12;
    ctx.save();
    ctx.translate(x, y - bob);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.ellipse(0, r * 1.0 + bob, r * 1.25, r * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    // Jambes.
    ctx.fillStyle = '#e8b48a';
    ctx.fillRect(-r * 0.5, r * 0.6, r * 0.3, r * 0.4);
    ctx.fillRect(r * 0.2, r * 0.6, r * 0.3, r * 0.4);
    // Bras.
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(side * r * 1.15, r * 0.05, r * 0.28, r * 0.5, side * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    // Robe très large.
    ctx.fillStyle = '#d6336c';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.15, r * 1.1, r * 0.75, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Pois blancs sur la robe.
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    for (const [px, py] of [[-0.5, 0], [0.1, 0.35], [0.55, -0.05], [-0.15, -0.3], [-0.6, 0.45], [0.6, 0.45]]) {
      ctx.beginPath();
      ctx.arc(px * r, py * r + r * 0.15, r * 0.09, 0, Math.PI * 2);
      ctx.fill();
    }
    // Tête, joues, chignon.
    ctx.fillStyle = '#5a3418';
    ctx.beginPath();
    ctx.arc(0, -r * 1.05, r * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f0c29a';
    ctx.beginPath();
    ctx.arc(0, -r * 0.7, r * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#5a3418';
    ctx.beginPath();
    ctx.arc(0, -r * 0.82, r * 0.42, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = 'rgba(230,90,110,0.55)';
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(side * r * 0.24, -r * 0.6, r * 0.09, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#111';
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(side * r * 0.14, -r * 0.72, r * 0.05, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#c2185b';
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.52, r * 0.12, r * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },
};

function drawCreature(ctx, c, x, y) {
  drawSpriteOrShape(ctx, c, x, y, () => {
    const custom = CUSTOM_DRAWINGS[c.type.draw];
    if (custom) {
      custom(ctx, c, x, y);
      return;
    }
    if (c.type.emoji) {
      drawEmojiCreature(ctx, c, x, y);
      return;
    }
    ctx.fillStyle = c.color;
    ctx.beginPath();
    ctx.arc(x, y, c.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Tête.
    ctx.fillStyle = '#f2d2b0';
    ctx.beginPath();
    ctx.arc(x, y, c.radius * 0.45, 0, Math.PI * 2);
    ctx.fill();
  });
  // Nom au-dessus de l'individu (rouge clair + « ! » quand il fuit).
  const label = c.fleeing ? `${c.name} !` : c.name;
  ctx.font = 'bold 17px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(0,0,0,0.8)';
  ctx.strokeText(label, x, y - c.radius - 8);
  ctx.fillStyle = c.fleeing ? '#ffb3a8' : '#fff';
  ctx.fillText(label, x, y - c.radius - 8);
}

function drawBear(ctx, bear, x, y) {
  drawSpriteOrShape(ctx, bear, x, y, () => {
    const r = bear.radius;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(bear.facing);
    const dark = '#3b2210';
    // Ombre au sol.
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(r * 0.1, r * 0.15, r * 1.15, r * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();
    // Pattes (avant et arrière), qui « marchent » quand l'ours bouge.
    const stride = bear.moving ? Math.sin(performance.now() / 90) * r * 0.18 : 0;
    ctx.fillStyle = dark;
    for (const [px, py, s] of [[r * 0.45, -r * 0.62, 1], [r * 0.45, r * 0.62, -1], [-r * 0.55, -r * 0.6, -1], [-r * 0.55, r * 0.6, 1]]) {
      ctx.beginPath();
      ctx.ellipse(px + stride * s, py, r * 0.26, r * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // Corps massif avec contour sombre.
    const body = ctx.createRadialGradient(-r * 0.1, -r * 0.2, r * 0.1, 0, 0, r);
    body.addColorStop(0, '#9a6332');
    body.addColorStop(1, bear.color);
    ctx.fillStyle = body;
    ctx.strokeStyle = dark;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(-r * 0.15, 0, r * 0.95, r * 0.68, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Bosse des épaules (typique de l'ours brun).
    ctx.fillStyle = '#5a3418';
    ctx.beginPath();
    ctx.ellipse(r * 0.2, 0, r * 0.32, r * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    // Oreilles rondes.
    for (const side of [-1, 1]) {
      ctx.fillStyle = bear.color;
      ctx.beginPath();
      ctx.arc(r * 0.7, side * r * 0.42, r * 0.17, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#c9965f';
      ctx.beginPath();
      ctx.arc(r * 0.7, side * r * 0.42, r * 0.08, 0, Math.PI * 2);
      ctx.fill();
    }
    // Tête.
    ctx.fillStyle = bear.color;
    ctx.beginPath();
    ctx.arc(r * 0.92, 0, r * 0.46, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Museau clair, truffe et yeux.
    ctx.fillStyle = '#c9965f';
    ctx.beginPath();
    ctx.ellipse(r * 1.22, 0, r * 0.22, r * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.ellipse(r * 1.42, 0, r * 0.09, r * 0.11, 0, 0, Math.PI * 2);
    ctx.fill();
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(r * 1.02, side * r * 0.19, r * 0.065, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }, bear.facing);
}

function drawHud(ctx, state, viewW) {
  const pad = 12;
  ctx.font = 'bold 22px sans-serif';
  ctx.textBaseline = 'top';
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.fillStyle = '#fff';
  const scoreText = `Score : ${state.score}`;
  ctx.textAlign = 'left';
  ctx.strokeText(scoreText, pad, pad);
  ctx.fillText(scoreText, pad, pad);
  const t = Math.ceil(state.timeLeft);
  const timeText = `${t} s`;
  ctx.textAlign = 'right';
  ctx.fillStyle = t <= 10 ? '#ffb3a8' : '#fff';
  ctx.strokeText(timeText, viewW - pad, pad);
  ctx.fillText(timeText, viewW - pad, pad);
}

function drawJoystick(ctx, joy) {
  if (!joy || !joy.active) return;
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(joy.baseX, joy.baseY, JOYSTICK_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.arc(joy.knobX, joy.knobY, JOYSTICK_RADIUS * 0.45, 0, Math.PI * 2);
  ctx.fill();
}

/** Rectangle du bouton « Rejouer » (coordonnées CSS), pour le test de clic. */
export function replayButtonRect(viewW, viewH) {
  const w = Math.min(220, viewW - 40);
  const h = 56;
  return { x: (viewW - w) / 2, y: viewH / 2 + 60, w, h };
}

function drawGameOver(ctx, state, viewW, viewH, best) {
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, viewW, viewH);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 34px sans-serif';
  ctx.fillText('Temps écoulé !', viewW / 2, viewH / 2 - 80);
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText(`Score : ${state.score}`, viewW / 2, viewH / 2 - 30);
  ctx.font = '20px sans-serif';
  let bestText;
  if (best.best === null) bestText = 'Meilleur score indisponible';
  else if (best.isNew) bestText = `Nouveau record : ${best.best} !`;
  else bestText = `Meilleur score : ${best.best}`;
  ctx.fillStyle = best.isNew ? '#ffe27a' : '#ddd';
  ctx.fillText(bestText, viewW / 2, viewH / 2 + 10);

  const b = replayButtonRect(viewW, viewH);
  ctx.fillStyle = '#e8a33d';
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(b.x, b.y, b.w, b.h, 12);
  else ctx.rect(b.x, b.y, b.w, b.h);
  ctx.fill();
  ctx.fillStyle = '#2b1a08';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('Rejouer', viewW / 2, b.y + b.h / 2);
}

/**
 * Dessine une frame. `view` = { width, height } en pixels CSS ;
 * le contexte doit déjà être mis à l'échelle devicePixelRatio.
 */
export function render(ctx, state, view, extras = {}) {
  const { width: viewW, height: viewH } = view;
  const cam = computeCamera(state, viewW, viewH);
  drawGround(ctx, state, cam, viewW, viewH);
  drawScenery(ctx, state, cam, viewW, viewH);
  extras.effects?.drawBelow(ctx, cam, extras.now);
  for (const c of state.creatures) {
    if (visible(c.x, c.y, c.radius + 20, cam, viewW, viewH)) drawCreature(ctx, c, c.x - cam.x, c.y - cam.y);
  }
  drawBear(ctx, state.bear, state.bear.x - cam.x, state.bear.y - cam.y);
  extras.effects?.drawAbove(ctx, cam, extras.now);
  drawHud(ctx, state, viewW);
  if (state.over) drawGameOver(ctx, state, viewW, viewH, extras.best ?? { best: null, isNew: false });
  else drawJoystick(ctx, extras.joystick);
}
