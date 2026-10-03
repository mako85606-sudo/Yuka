# Loupe

Ton devis, corrigé au stylo rouge. L'utilisateur prend en photo un devis ; Loupe repère les erreurs vérifiées, compare les prix, rend un verdict et prépare un message de négociation.

Le brief complet, les conventions et les règles de design sont dans [`CLAUDE.md`](./CLAUDE.md).

## Démarrer

Prérequis : Node.js 22.12 ou plus récent (Node 24 LTS conseillé). Tous les scripts fonctionnent sous Windows, macOS et Linux.

```bash
npm install
npm run dev
```

Puis ouvre <http://localhost:3000/dev/design> : la planche de style (étape 1).

## Scripts

| Commande | Rôle |
| --- | --- |
| `npm run dev` | serveur de développement |
| `npm run build` puis `npm start` | build et serveur de production |
| `npm run lint` | ESLint |
| `npm run typecheck` | génère les types des routes puis lance `tsc` |
| `npm test` | tests Vitest (une passe) |
| `npm run test:watch` | tests Vitest en continu |

## Variables d'environnement

Copie `.env.example` en `.env.local`. À l'étape 1, seule `ENABLE_DEV_PAGES` existe : la planche `/dev/design` est visible en local et sur les prévisualisations Vercel, masquée en production sauf si elle vaut `true`.
