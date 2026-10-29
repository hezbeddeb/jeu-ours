// Contrôles : joystick virtuel tactile (flottant, là où le doigt se pose)
// et clavier (flèches, ZQSD, WASD). Produit une direction normalisée.

const KEY_DIRS = {
  ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
  KeyW: [0, -1], KeyS: [0, 1], KeyA: [-1, 0], KeyD: [1, 0], // QWERTY (WASD)
  KeyZ: [0, -1], KeyQ: [-1, 0], // AZERTY (ZQSD) : event.code suit la position physique,
};
// on accepte aussi les touches par caractère pour couvrir les deux dispositions.
const CHAR_DIRS = {
  z: [0, -1], q: [-1, 0], s: [0, 1], d: [1, 0],
  w: [0, -1], a: [-1, 0],
};

export const JOYSTICK_RADIUS = 60; // px CSS
const DEAD_ZONE = 0.15;

export function createInput(canvas) {
  const pressed = new Set();
  const joy = {
    active: false,
    pointerId: null,
    baseX: 0,
    baseY: 0,
    knobX: 0,
    knobY: 0,
  };
  let enabled = true;

  function keyId(e) {
    const ch = (e.key || '').toLowerCase();
    if (CHAR_DIRS[ch]) return 'char:' + ch;
    if (KEY_DIRS[e.code]) return 'code:' + e.code;
    return null;
  }

  function onKeyDown(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return; // laisse passer Ctrl+S, Ctrl+D, etc.
    const id = keyId(e);
    if (!id) return;
    pressed.add(id);
    e.preventDefault();
  }
  function onKeyUp(e) {
    const id = keyId(e);
    if (id) pressed.delete(id);
    // En cas de doute (changement de disposition entre keydown et keyup), on nettoie.
    if (KEY_DIRS[e.code]) pressed.delete('code:' + e.code);
  }
  function onBlur() {
    pressed.clear();
    releaseJoystick();
  }

  function releaseJoystick() {
    joy.active = false;
    joy.pointerId = null;
  }

  function onPointerDown(e) {
    if (!enabled || joy.active) return;
    joy.active = true;
    joy.pointerId = e.pointerId;
    joy.baseX = joy.knobX = e.clientX;
    joy.baseY = joy.knobY = e.clientY;
    try { canvas.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    e.preventDefault();
  }
  function onPointerMove(e) {
    if (!joy.active || e.pointerId !== joy.pointerId) return;
    let dx = e.clientX - joy.baseX;
    let dy = e.clientY - joy.baseY;
    const d = Math.hypot(dx, dy);
    if (d > JOYSTICK_RADIUS) {
      dx = (dx / d) * JOYSTICK_RADIUS;
      dy = (dy / d) * JOYSTICK_RADIUS;
    }
    joy.knobX = joy.baseX + dx;
    joy.knobY = joy.baseY + dy;
    e.preventDefault();
  }
  function onPointerUp(e) {
    if (e.pointerId !== joy.pointerId) return;
    releaseJoystick();
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);
  canvas.addEventListener('lostpointercapture', onPointerUp);
  // Un appui long ne doit pas ouvrir de menu contextuel.
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  return {
    joystick: joy,
    /** Direction courante : vecteur unitaire, ou {0,0} si aucun contrôle. */
    getDirection() {
      if (joy.active) {
        const dx = (joy.knobX - joy.baseX) / JOYSTICK_RADIUS;
        const dy = (joy.knobY - joy.baseY) / JOYSTICK_RADIUS;
        const m = Math.hypot(dx, dy);
        if (m >= DEAD_ZONE) return { x: dx / m, y: dy / m };
        return { x: 0, y: 0 };
      }
      let x = 0;
      let y = 0;
      for (const id of pressed) {
        const [kind, name] = id.split(':');
        const v = kind === 'char' ? CHAR_DIRS[name] : KEY_DIRS[name];
        if (v) { x += v[0]; y += v[1]; }
      }
      x = Math.sign(x);
      y = Math.sign(y);
      const m = Math.hypot(x, y);
      return m > 0 ? { x: x / m, y: y / m } : { x: 0, y: 0 };
    },
    /** Active/désactive le joystick (désactivé sur l'écran de fin). */
    setEnabled(v) {
      enabled = v;
      if (!v) releaseJoystick();
    },
    reset() {
      pressed.clear();
      releaseJoystick();
    },
  };
}
