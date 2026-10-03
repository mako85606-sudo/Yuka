# Loupe

Ton devis, corrigé au stylo rouge. L'utilisateur prend en photo un devis ; Loupe repère les erreurs vérifiées, compare les prix, rend un verdict et prépare un message de négociation.

Le brief complet, les conventions et les règles de design sont dans [`CLAUDE.md`](./CLAUDE.md).

## Démarrer

Prérequis : Node.js 22.12 ou plus récent (Node 24 LTS conseillé). Tous les scripts fonctionnent sous Windows, macOS et Linux.

```bash
npm install
cp .env.example .env.local   # sous Windows : copy .env.example .env.local
npm run dev
```

Puis ouvre :

- <http://localhost:3000> : la landing ;
- <http://localhost:3000/analyse> : le dépôt d'un devis et sa lecture en direct (il faut `ANTHROPIC_API_KEY`) ;
- <http://localhost:3000/dev/design> : la planche de style.

Pour essayer sur ton téléphone, lance `npm run build` puis `npm start` et ouvre l'adresse « Network » affichée, sur le même Wi-Fi.

## Scripts

| Commande | Rôle |
| --- | --- |
| `npm run dev` | serveur de développement |
| `npm run build` puis `npm start` | build et serveur de production |
| `npm run lint` | ESLint |
| `npm run typecheck` | génère les types des routes puis lance `tsc` |
| `npm test` | tests Vitest (une passe) |
| `npm run test:watch` | tests Vitest en continu |
| `npm run db:migrate` | applique les migrations à la base de `DATABASE_URL` |
| `npm run db:generate` | génère une migration après un changement de `src/server/db/schema.ts` |
| `npm run fixtures:generate` | régénère les devis PDF fictifs et leur vérité terrain |
| `npm run eval:extraction` | fait lire les devis fictifs par le modèle et affiche la précision champ par champ |

## Variables d'environnement

Copie `.env.example` en `.env.local` ; chaque variable y est expliquée.

| Variable | Rôle | Obligatoire |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | lecture des devis par le modèle | pour analyser |
| `ANTHROPIC_MODEL` | modèle de lecture (défaut `claude-sonnet-5-5`) | non |
| `DATABASE_URL` | Postgres (Neon ou Supabase) : limite quotidienne, inscriptions | en production |
| `IP_HASH_SECRET` | secret du hachage des adresses IP, 32 caractères au moins | en production |
| `ENABLE_DEV_PAGES` | montre `/dev/design` en production si `true` | non |

## Base de données

1. Crée une base sur [Neon](https://neon.tech) ou [Supabase](https://supabase.com).
2. Mets sa chaîne de connexion dans `DATABASE_URL` (`.env.local` en local, réglages du projet sur Vercel).
3. Lance `npm run db:migrate` une fois, puis après chaque nouvelle migration.

Si la migration échoue avec la chaîne « pooled » (Neon) ou « Transaction pooler » (Supabase), lance-la avec la chaîne directe (« Direct connection »), puis remets la chaîne « pooled » pour le site.

En local, sans `DATABASE_URL`, tout fonctionne quand même : la limite de 5 analyses par jour est tenue en mémoire (remise à zéro au redémarrage) et les inscriptions email sont seulement signalées dans le terminal.

## Évaluer la lecture

`src/fixtures/quotes/` contient six devis PDF fictifs générés avec pdf-lib : cinq à lire (deux avec des erreurs volontaires) et un devis d'optique, que Loupe doit refuser. Chacun a sa vérité terrain (`*.truth.json`).

```bash
npm run eval:extraction          # les six devis (quelques centimes d'API)
npm run eval:extraction -- 02    # seulement le devis 02
```

Le script affiche, pour chaque champ (catégorie, mentions, dates, montants, lignes…), le nombre de lectures justes, liste les écarts, vérifie qu'aucune donnée personnelle du devis n'a été recopiée, et écrit un rapport détaillé dans `eval-results/`.
