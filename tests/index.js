// Point d'entrée pour `node --test tests/` : depuis Node 21, `node --test` prend des
// motifs de fichiers et traite `tests/` comme un module -> il charge ce fichier.
// On y importe chaque fichier de test. (`node --test` sans argument fonctionne aussi.)
import './logic.test.js';
