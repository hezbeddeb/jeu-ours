---
title: 'Jeu de l''ours — prototype jouable 2D pour Android'
type: 'feature'
created: '2026-10-28'
status: 'done'
baseline_commit: 'NO_VCS'
route: 'dispatch'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Le projet est vide. L'utilisateur veut un petit jeu 2D simple, jouable sur Android : un ours brun se déplace sur une map vue de dessus, cherche des individus et les mange quand il les attrape.

**Approach:** Jeu HTML5 Canvas en JavaScript pur (modules ES, sans étape de build), contrôle tactile par joystick virtuel et clavier (flèches/ZQSD) pour tester sur PC. Il s'installe sur Android en PWA (manifest + service worker) et pourra être empaqueté en APK plus tard via Capacitor. Les personnages sont décrits dans un fichier de configuration unique, pour que l'utilisateur puisse les remplacer facilement plus tard.

**Décisions (utilisateur) :**
- Fin de partie : chrono de 60 s ; l'écran de fin affiche le score et le meilleur score (sauvegardé en localStorage).
- Individus : ils errent au hasard et fuient quand l'ours est proche (plus lents que l'ours, pour qu'on puisse les attraper). Quand l'un est mangé, un autre réapparaît loin de l'ours.
- Map : plus grande que l'écran (environ 3×3 écrans), la caméra suit l'ours ; quelques décors (arbres, rochers) pour se repérer, sans collision.

## Boundaries & Constraints

**Always:** Fonctionne en mode portrait et paysage sur un écran tactile Android (Chrome). Pas de dépendance npm à l'exécution. La logique du jeu (déplacement, collisions, score) est séparée du rendu pour pouvoir la tester avec `node --test`. Les personnages (nom, taille, vitesse, couleur, sprite optionnel) sont définis dans `src/characters.js`.

**Never:** Pas de SDK Android, pas de Capacitor dans cette story. Pas de backend, pas de compte ni de classement en ligne. Pas de sprites dessinés à la main : les formes simples dessinées sur le canvas servent de placeholders.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Manger | L'ours touche un individu | L'individu disparaît, score +1 | N/A |
| Bord de map | L'ours ou un individu pousse contre le bord | Sa position reste dans la map | N/A |
| Joystick relâché | Le doigt quitte l'écran | L'ours s'arrête | N/A |
| Onglet en arrière-plan | Le jeu revient après une longue pause | Pas de saut géant (delta de temps plafonné) | N/A |
| Fuite | Un individu est à moins de ~200 px de l'ours | Il s'éloigne de l'ours, sans sortir de la map | N/A |
| Fin du chrono | Le temps atteint 0 | Le jeu se fige, écran de fin, meilleur score mis à jour si battu | localStorage indisponible → pas de meilleur score, pas de crash |
| Sprite manquant | Le sprite d'un personnage ne charge pas | Retour à la forme colorée | N/A |

</frozen-after-approval>

## Code Map

- Le dépôt est vide (seulement `_bmad/`). Tout est à créer, il n'y a rien à réutiliser.
- Outils disponibles : Node (pour `node --test` et un petit serveur statique), Python. Pas de SDK Android ni de git.

## Tasks & Acceptance

**Execution:**
- [x] `index.html` -- page plein écran avec le canvas, les balises meta viewport/PWA et le chargement de `src/main.js` -- point d'entrée
- [x] `src/characters.js` -- configuration de l'ours et des types d'individus -- personnages remplaçables
- [x] `src/logic.js` -- état du jeu, mise à jour par pas de temps, déplacements, maintien dans la map, collisions, score, fin de partie -- logique pure testable
- [x] `src/input.js` -- joystick virtuel tactile et clavier, qui produisent une direction normalisée -- contrôles
- [x] `src/render.js` -- dessin de la map, des personnages, du score/chrono, de l'écran de fin, avec repli sur les formes -- affichage
- [x] `src/main.js` -- boucle de jeu (requestAnimationFrame, delta plafonné), redimensionnement, rejouer -- assemblage
- [x] `manifest.webmanifest`, `sw.js`, `icons/icon.svg` -- installation PWA hors ligne -- Android
- [x] `tests/logic.test.js` -- tests des cas de la matrice I/O -- vérification
- [x] `serve.js`, `package.json`, `README.md` -- serveur statique local, `npm test`, comment jouer sur Android -- usage

**Acceptance Criteria:**
- Given le jeu ouvert dans Chrome Android, when je déplace le joystick, then l'ours se déplace dans cette direction.
- Given le jeu ouvert sur PC, when j'appuie sur les flèches ou ZQSD, then l'ours se déplace.
- Given la condition de fin atteinte, when la partie se termine, then un écran affiche le score et un bouton pour rejouer.
- Given le jeu servi en HTTPS ou sur localhost, when j'utilise « Ajouter à l'écran d'accueil », then il s'ouvre en plein écran et fonctionne hors ligne.

## Implementation Notes

- Node 22 traite les arguments de `node --test` comme des motifs de fichiers : `node --test tests/` chargeait `tests` comme un module et échouait. `tests/index.js` importe les fichiers de test pour que la commande de vérification fonctionne telle quelle ; `node --test` sans argument fonctionne aussi.
- Map fixe de 2400×2400 px (≈ 3×3 écrans de téléphone), 10 individus, rayon de fuite 200 px, réapparition à ≥ 600 px de l'ours, delta plafonné à 0,1 s.
- Le meilleur score n'est écrit que s'il est strictement battu (un score de 0 n'écrit rien).
- Icône PWA en SVG uniquement (`sizes: any`) ; si une version de Chrome exige des PNG 192/512 pour l'installation, il faudra en ajouter.

## Spec Change Log

## Review Triage Log

| # | Finding | Verdict | Evidence | Route |
|---|---------|---------|----------|-------|
| B1/E13 | Icônes PWA uniquement SVG | medium | WebAPK Android attend des PNG 192/512 ; l'AC d'installation en dépend | patch |
| B2/E11 | HUD sous l'encoche (viewport-fit=cover) | medium | `viewport-fit=cover` + HUD à 12 px fixes, sans gestion des safe-areas | patch (retirer viewport-fit=cover) |
| B3 | Pas d'écran de démarrage / pause au blur | false | Le chrono démarre après le chargement des modules ; onglet caché → rAF stoppé et `lastTime` remis à zéro | rejet |
| B4/E4 | Repli en coin : direction ignore l'ours | medium | `logic.js` fallback `fx = c.x < W/2 ? 1 : -1` ; contre le mur gauche avec l'ours au même y, l'individu fonce sur l'ours | patch |
| V1 | Glissement le long des murs / rebond non testés | medium | Vérifié par le relecteur : suppression du code → 19/19 passent | patch |
| B5/V2 | `input.js` non testé | medium | Aucun test n'importe `input.js` ; nécessite un faux EventTarget | defer |
| B6 | Script npm test dépend du shim | low | Un nouveau fichier de test oublié dans `tests/index.js` est ignoré ; correction directe | patch |
| B7/E9/E10 | SW : pas de timeout, cache.put hors waitUntil, repli index.html pour tout | medium | Réseau lent → le jeu installé reste bloqué au chargement | patch |
| B8 | Conseil CACHE_VERSION | low | Documentation seulement, pas de mal réel | rejet |
| B9 | Sprite sans rotation ni ratio | low | L'utilisateur ajoutera des sprites ; l'ours sprite ne s'orienterait pas | patch |
| B10/E3 | serve.js expose tout le dossier sur le LAN | low | Liste de refus d'une ligne | patch |
| B11 | Décors sans collision | false | Choix du spec (« sans collision ») | rejet |
| B12 | Appui long → menu contextuel | low | Une ligne `contextmenu` preventDefault | patch |
| B13 | Joystick non analogique | false | Choix de conception, pas un défaut | rejet |
| E1 | `/%00` fait planter serve.js | low | Vérifié : `fs.readFile('a\0b')` lève ERR_INVALID_ARG_VALUE en synchrone (Node 22) | patch |
| E2 | Port occupé → stack trace | low | Échec bruyant acceptable | rejet |
| E5 | CREATURES vide → TypeError | false | Erreur de config qui échoue bruyamment | rejet |
| E6 | Ctrl+S / Ctrl+D bloqués par preventDefault | low | `s`/`d` dans CHAR_DIRS ; garde d'une ligne | patch |
| E7 | Changement de disposition clavier pendant l'appui | low | Improbable, correctif complexe | rejet |
| E8 | Entrée maintenue saute l'écran de fin | low | Improbable (Entrée n'est pas une touche de direction) | rejet |
| E12 | Map pas 3×3 écrans sur PC | low | 2400 px ≈ 3×6 écrans sur téléphone, cible Android ; « environ » | rejet |
| V3 | Liste ASSETS du SW non vérifiée | medium (non vérifié en usage) | Un fichier renommé casse l'install SW silencieusement | defer |

## Verification

**Commands:**
- `node --test tests/` -- expected: tous les tests passent

**Manual checks (if no CLI):**
- `node serve.js`, ouvrir http://localhost:8080 : l'ours bouge au clavier, mange les individus, le score monte, l'écran de fin apparaît.
