// Effets visuels quand l'ours mange : gouttes de sang projetées, tache au sol, « +1 ».
// Coordonnées dans le monde ; le temps est en secondes (performance.now() / 1000).

const STAIN_LIFE = 8; // s avant que la tache disparaisse
const DROP_LIFE = 0.6;
const POPUP_LIFE = 0.9;

export function createEffects() {
  const stains = [];
  const drops = [];
  const popups = [];

  return {
    /** Déclenche une giclée de sang en (x, y). */
    blood(x, y, now) {
      const blobs = [];
      for (let i = 0; i < 7; i++) {
        const a = Math.random() * Math.PI * 2;
        const d = Math.random() * 22;
        blobs.push({ dx: Math.cos(a) * d, dy: Math.sin(a) * d, r: 6 + Math.random() * 10 });
      }
      stains.push({ x, y, born: now, blobs });
      for (let i = 0; i < 26; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = 120 + Math.random() * 260;
        drops.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: 2 + Math.random() * 3.5, born: now });
      }
      popups.push({ x, y, born: now });
    },

    update(dt, now) {
      for (const d of drops) {
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        d.vx *= 1 - Math.min(1, 5 * dt); // freinage
        d.vy *= 1 - Math.min(1, 5 * dt);
      }
      prune(drops, now, DROP_LIFE);
      prune(stains, now, STAIN_LIFE);
      prune(popups, now, POPUP_LIFE);
    },

    /** Sous les personnages : taches de sang au sol. */
    drawBelow(ctx, cam, now) {
      for (const s of stains) {
        const t = (now - s.born) / STAIN_LIFE;
        ctx.fillStyle = `rgba(120, 0, 0, ${0.75 * (1 - t * t)})`;
        for (const b of s.blobs) {
          ctx.beginPath();
          ctx.arc(s.x + b.dx - cam.x, s.y + b.dy - cam.y, b.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    },

    /** Au-dessus des personnages : gouttes et « +1 ». */
    drawAbove(ctx, cam, now) {
      for (const d of drops) {
        const t = (now - d.born) / DROP_LIFE;
        ctx.fillStyle = `rgba(200, 10, 10, ${1 - t})`;
        ctx.beginPath();
        ctx.arc(d.x - cam.x, d.y - cam.y, d.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 4;
      for (const p of popups) {
        const t = (now - p.born) / POPUP_LIFE;
        const y = p.y - cam.y - 30 - t * 40;
        ctx.globalAlpha = 1 - t;
        ctx.strokeStyle = '#000';
        ctx.strokeText('+1', p.x - cam.x, y);
        ctx.fillStyle = '#ffe27a';
        ctx.fillText('+1', p.x - cam.x, y);
      }
      ctx.globalAlpha = 1;
    },

    clear() {
      stains.length = 0;
      drops.length = 0;
      popups.length = 0;
    },
  };
}

function prune(list, now, life) {
  for (let i = list.length - 1; i >= 0; i--) {
    if (now - list[i].born >= life) list.splice(i, 1);
  }
}
