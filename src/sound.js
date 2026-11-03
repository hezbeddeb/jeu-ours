// Effets sonores générés avec Web Audio (aucun fichier audio).
// Les navigateurs n'autorisent le son qu'après un geste du joueur : unlock() est
// appelé au premier toucher / clic / touche.

export function createSound() {
  let ctx = null;

  function audio() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    return ctx;
  }

  function noiseBuffer(ac, seconds) {
    const buf = ac.createBuffer(1, Math.ceil(ac.sampleRate * seconds), ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  return {
    unlock() {
      const ac = audio();
      if (ac && ac.state === 'suspended') ac.resume().catch(() => {});
    },

    /** « Crounch » : craquement bruité + grognement grave qui descend. */
    eat() {
      const ac = audio();
      if (!ac || ac.state !== 'running') return;
      const t = ac.currentTime;

      // Deux coups de mâchoire (bruit filtré).
      for (const offset of [0, 0.11]) {
        const src = ac.createBufferSource();
        src.buffer = noiseBuffer(ac, 0.12);
        const filter = ac.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2400, t + offset);
        filter.frequency.exponentialRampToValueAtTime(300, t + offset + 0.1);
        const gain = ac.createGain();
        gain.gain.setValueAtTime(0.9, t + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.11);
        src.connect(filter).connect(gain).connect(ac.destination);
        src.start(t + offset);
      }

      // Grognement de l'ours.
      const osc = ac.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.exponentialRampToValueAtTime(55, t + 0.35);
      const lp = ac.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 600;
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.35, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
      osc.connect(lp).connect(g).connect(ac.destination);
      osc.start(t);
      osc.stop(t + 0.4);
    },
  };
}
