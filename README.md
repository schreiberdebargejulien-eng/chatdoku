# Chatdoku 🐾

> Chaque chat à sa place.

Jeu de logique mobile (PWA installable sur iPhone). Une grille N×N découpée en N régions colorées irrégulières : il faut y placer N chats.

## Règles

1. **Une région = un chat**
2. **Une ligne = un chat**
3. **Une colonne = un chat**
4. **Deux chats ne se touchent jamais**, ni horizontalement, ni verticalement, ni en diagonale (y compris entre deux régions).

3 vies par partie. Les croix (X) sont des annotations libres et ne coûtent jamais de vie.

## Stack

React 19 · TypeScript strict · Vite · Tailwind CSS 4 · Framer Motion · Zustand · vite-plugin-pwa (Workbox) · Vitest.

## Architecture

```
src/
  game-engine/        Moteur pur (aucune dépendance UI), déterministe
    board.ts          Coordonnées, voisinages
    regions.ts        Régions : validation, connexité, description
    rules.ts          Les 4 règles
    validator.ts      Validation d'un placement / d'une grille
    solver.ts         Backtracking + propagation + MRV, comptage jusqu'à 2 solutions
    logic.ts          Déductions « humaines » pas à pas (single, confinement, blocage, sous-ensembles, raisonnement par l'absurde)
    generator.ts      Génération : placement → régions → unicité garantie
    difficulty.ts     Évaluation et classement de la difficulté
    hints.ts          Indices à 3 niveaux fondés sur la logique et la solution
  game/gameLogic.ts   Boucle de jeu pure : vies, X, annuler, victoire/défaite
  stats/stats.ts      Statistiques et succès
  store/gameStore.ts  État global (Zustand) + sauvegarde automatique
  services/           Pré-génération des grilles dans un Web Worker
  cats/               Les 9 chats (SVG originaux) et les collections
  components/, screens/  Interface
```

### Comment une grille est garantie

1. Placement aléatoire de N chats respectant lignes/colonnes/voisinage.
2. Croissance de N régions connexes autour de ces chats (formes plus ou moins irrégulières selon la difficulté).
3. Le solveur compte les solutions ; tant qu'il en existe une autre, une case de la solution parasite est déplacée vers une région voisine (ce qui la détruit sans toucher la solution prévue).
4. Le moteur logique « humain » résout la grille sans deviner et mesure la difficulté (technique la plus dure, quantité de raisonnement, points d'entrée faciles).
5. Contrôle final (`verifyPuzzle`) dans le worker **et** sur le thread principal : régions valides, solution valide, solution unique.

### Difficultés

| Niveau    | Grille  | Ce qui est exigé                                                        |
| --------- | ------- | ----------------------------------------------------------------------- |
| Facile    | 8×8     | Cases uniques et confinements simples                                    |
| Moyen     | 9×9     | Combinaison de contraintes (paires de régions/lignes)                   |
| Difficile | 9 ou 10 | Sous-ensembles de 3+ unités, chaînes de déductions                      |
| Expert    | 10×10   | Peu d'évidences, raisonnement par l'absurde                             |

## Développement

```bash
npm install
npm run dev        # http://localhost:5173 (aussi accessible depuis le téléphone sur le même Wi-Fi)
npm test           # tests unitaires
npm run build      # build de production dans dist/
npm run preview    # sert dist/ (service worker actif)
npm run icons      # régénère les icônes à partir de l'illustration (nécessite Playwright)
```

## Déploiement

Le build (`dist/`) est un site statique : n'importe quel hébergeur HTTPS convient (HTTPS est obligatoire pour la PWA).

**GitHub Pages (inclus)** : le workflow `.github/workflows/deploy.yml` teste, construit et publie à chaque push sur `main`. Activer une fois : *Settings → Pages → Source : GitHub Actions*. URL : `https://<utilisateur>.github.io/chatdoku/`.

**Netlify / Vercel** : importer le dépôt, commande `npm run build`, dossier `dist`.

## Installer sur iPhone

1. Ouvrir l'URL dans **Safari**.
2. Bouton **Partager** → **Sur l'écran d'accueil** → **Ajouter**.
3. Lancer Chatdoku depuis l'icône : plein écran, sans barre Safari, et jouable hors ligne après la première ouverture.
