- source_spec: `_bmad-output/implementation-artifacts/spec-jeu-ours-mvp.md`
  summary: Ajouter des tests pour src/input.js (clavier ZQSD/WASD, diagonales, zone morte, relâchement du joystick).
  evidence: Aucun test n'importe input.js ; casser le mapping des touches ou le relâchement du joystick laisserait les 19 tests au vert.
- source_spec: `_bmad-output/implementation-artifacts/spec-jeu-ours-mvp.md`
  summary: Ajouter un test qui vérifie que chaque entrée de ASSETS dans sw.js existe et que chaque module de src/ y figure.
  evidence: cache.addAll rejette tout si un fichier manque ; l'échec est avalé par le .catch de l'enregistrement, le mode hors ligne casse sans signal.
