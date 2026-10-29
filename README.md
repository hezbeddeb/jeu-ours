# Jeu de l'ours

Prototype 2D vu de dessus : un ours brun parcourt une map et mange les individus
qu'il attrape. Une partie dure 60 secondes ; le meilleur score est gardé dans le
navigateur (localStorage).

HTML5 Canvas + JavaScript (modules ES), sans dépendance ni étape de build.

## Jouer sur PC

```sh
node serve.js        # ou : npm start
```

Ouvrez http://localhost:8080.

- Déplacement : flèches, ZQSD (AZERTY) ou WASD (QWERTY).
- Fin de partie : bouton « Rejouer », ou Entrée / Espace.

## Jouer sur Android

Le jeu est une PWA : une fois installé, il s'ouvre en plein écran et fonctionne
hors ligne. Chrome n'autorise l'installation et le mode hors ligne que sur
**HTTPS** ou **localhost**.

Options :

1. **Hébergement HTTPS** (le plus simple) : copiez le dossier (sans `tests/`,
   `_bmad*`) sur n'importe quel hébergement statique HTTPS (GitHub Pages,
   Netlify, …). Ouvrez l'URL dans Chrome Android, puis menu ⋮ → « Ajouter à
   l'écran d'accueil » / « Installer l'application ».
2. **Depuis le PC, via USB** : lancez `node serve.js`, branchez le téléphone
   (débogage USB activé), ouvrez `chrome://inspect/#devices` sur le PC et
   ajoutez une redirection de port `8080 → localhost:8080`. Sur le téléphone,
   ouvrez http://localhost:8080 puis installez comme ci-dessus.
3. **Même Wi-Fi, sans installation** : `node serve.js`, puis sur le téléphone
   http://IP-DU-PC:8080. Le jeu fonctionne mais sans installation ni hors ligne
   (pas de HTTPS).

Contrôle tactile : posez le doigt n'importe où, un joystick apparaît ; glissez
pour diriger l'ours, relâchez pour l'arrêter. Portrait et paysage sont gérés.

Après une modification des fichiers, augmentez `CACHE_VERSION` dans `sw.js`
pour que les appareils installés récupèrent la nouvelle version.

## Changer les personnages

Tout est dans `src/characters.js` : nom, taille (`radius`), vitesse (`speed`,
`fleeSpeed` pour les individus — à garder sous la vitesse de l'ours), couleur et
`sprite` optionnel (chemin d'une image, ex. `assets/ours.png`). Si l'image ne
charge pas, une forme colorée est dessinée à la place. Pensez à ajouter les
nouvelles images à la liste `ASSETS` de `sw.js` pour le mode hors ligne.

## Tests

```sh
node --test tests/   # ou : npm test
```

La logique (`src/logic.js`) est séparée du rendu et testée avec `node --test`.

## Structure

| Fichier | Rôle |
|---|---|
| `index.html` | page plein écran, canvas, balises PWA |
| `src/characters.js` | configuration des personnages |
| `src/logic.js` | état, déplacements, fuite, collisions, score, chrono, meilleur score |
| `src/input.js` | joystick virtuel + clavier → direction normalisée |
| `src/render.js` | dessin de la map, des personnages, du HUD et de l'écran de fin |
| `src/main.js` | boucle de jeu, redimensionnement, rejouer |
| `manifest.webmanifest`, `sw.js`, `icons/icon.svg` | installation PWA hors ligne |
| `serve.js` | serveur statique local |

## APK Android et page de téléchargement (GitHub)

À chaque `git push` sur `main`, le workflow `.github/workflows/android.yml` :

1. lance les tests, copie le jeu dans `www/` (`npm run build:web`) ;
2. crée le projet Android avec Capacitor (`capacitor.config.json`, icône `resources/icon-only.png`) ;
3. construit l'APK (signé si les secrets de signature existent, sinon APK debug) ;
4. publie sur GitHub Pages le jeu web + `telecharger.html` + `jeu-ours.apk`.

Page publique : `https://<utilisateur>.github.io/<dépôt>/telecharger.html`.

Configuration unique dans GitHub :

- **Settings → Pages → Source** : « GitHub Actions » (le dépôt doit être public sur un compte gratuit).
- **Settings → Secrets and variables → Actions** (conseillé) : `ANDROID_KEYSTORE_BASE64`,
  `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.
  Avec la même clé à chaque build, les joueurs peuvent mettre à jour le jeu sans le désinstaller.
  Gardez le fichier `.jks` et ses mots de passe en lieu sûr : sans eux, impossible de publier une mise à jour.
