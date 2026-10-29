// Copie les fichiers du jeu dans www/ (dossier utilisé par Capacitor et par la page publique).
// Usage : node scripts/build-web.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'www');
const ENTRIES = ['index.html', 'manifest.webmanifest', 'sw.js', 'src', 'icons', 'assets'];

fs.rmSync(OUT, { recursive: true, force: true });
for (const entry of ENTRIES) {
  const from = path.join(ROOT, entry);
  if (!fs.existsSync(from)) continue; // assets/ (sprites) est optionnel
  fs.cpSync(from, path.join(OUT, entry), { recursive: true });
}
console.log(`Jeu copié dans ${path.relative(ROOT, OUT)}/`);
