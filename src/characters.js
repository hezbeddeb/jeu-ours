// Configuration des personnages.
// Pour remplacer un personnage, modifiez simplement ses champs ici.
//   name   : nom affiché / pour le debug
//   radius : taille (rayon en pixels du monde) utilisée pour le dessin et les collisions
//   speed  : vitesse en pixels par seconde (errance pour les individus)
//   fleeSpeed : (individus) vitesse quand ils fuient l'ours — doit rester < BEAR.speed
//   color  : couleur de la forme de repli
//   emoji  : (individus) image affichée, sous forme d'emoji (prioritaire sur la forme colorée)
//   emojiBehind : emoji optionnel dessiné derrière (ex. le balai de la sorcière)
//   emojiScaleX : étirement horizontal optionnel (ex. 1.5 = plus large)
//   draw   : dessin spécial intégré au jeu, à la place d'un emoji (ex. 'grosseDame')
//   sprite : chemin optionnel vers une image (ex. 'assets/ours.png'), ou null.
//            Si l'image ne charge pas, la forme colorée est dessinée à la place.
//            L'image garde ses proportions (elle tient dans un carré de côté 2 × radius).
//            Le sprite de l'ours doit être dessiné tourné vers la DROITE : il pivote
//            ensuite selon la direction de déplacement.

export const BEAR = {
  name: 'Ours brun',
  radius: 40,
  speed: 340,
  color: '#6b3f1d',
  sprite: null,
};

// Un individu de chaque personnage est présent sur la map ; son nom s'affiche au-dessus de lui.
export const CREATURES = [
  { name: 'El Khenzira', emoji: '🐷', radius: 23, speed: 45, fleeSpeed: 122, color: '#e98aa8', sprite: null },
  { name: 'El 9a7bawi', draw: 'grosseDame', radius: 22, speed: 56, fleeSpeed: 147, color: '#e2463b', sprite: null },
  { name: 'El Bawela', emoji: '🚽', radius: 23, speed: 49, fleeSpeed: 133, color: '#3b7be2', sprite: null },
  { name: 'Zina Sa7ara', emoji: '🧙‍♀️', emojiBehind: '🧹', radius: 22, speed: 60, fleeSpeed: 154, color: '#8e44ad', sprite: null },
  { name: 'Fayda Chamta', emoji: '🦊', radius: 22, speed: 52, fleeSpeed: 140, color: '#e2b23b', sprite: null },
  { name: 'Ogan Bou Me3za', emoji: '🐐', radius: 24, speed: 41, fleeSpeed: 119, color: '#e67e22', sprite: null },
  { name: 'Kamel Tasjilet', emoji: '📹', radius: 23, speed: 52, fleeSpeed: 136, color: '#16a085', sprite: null },
  { name: 'Boulis Mkasser', emoji: '👮‍♂️', radius: 24, speed: 45, fleeSpeed: 126, color: '#34495e', sprite: null },
  { name: 'Weld 3arem', emoji: '🐔', radius: 21, speed: 60, fleeSpeed: 150, color: '#c0392b', sprite: null },
];
