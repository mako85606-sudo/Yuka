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
- <http://localhost:3000/dev/design> : la planche de style ;
- <http://localhost:3000/admin> : le tableau de bord (il faut `ADMIN_PASSWORD` et `DATABASE_URL`).

Sans rien installer : sur la page du dépôt GitHub, « Code » → onglet « Codespaces » → « Create codespace » (sur la branche de travail). `.devcontainer/devcontainer.json` installe tout et lance `npm run dev` à chaque ouverture, après un `git pull` ; le site s'ouvre dans un nouvel onglet. L'adresse publique du codespace est autorisée par `next.config.ts` (`allowedDevOrigins`, Server Actions) et par le contrôle d'origine des routes (`codespaceHost`). Les comptes GitHub personnels ont un quota mensuel gratuit (120 heures de calcul et 15 Go de stockage pour l'offre gratuite, d'après la documentation de GitHub).

Sous Windows, une fois le dépôt cloné avec Git (`git clone -b claude/loupe-devis-analyzer-mvp-xy60ma https://github.com/mako85606-sudo/Yuka.git Loupe`), un double-clic sur `lancer-loupe.bat` récupère les nouveautés (`git pull`), installe ce qui manque et lance le site en ouvrant le navigateur.

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
| `npm run db:migrate` | applique les migrations à la base de `DATABASE_URL` (drizzle-kit) |
| `npm run db:deploy` | applique les migrations sans drizzle-kit ; ne fait rien sans `DATABASE_URL` |
| `npm run vercel-build` | ce que Vercel lance à chaque déploiement : migrations, puis build |
| `npm run db:generate` | génère une migration après un changement de `src/server/db/schema.ts` |
| `npm run fixtures:generate` | régénère les devis PDF fictifs et leur vérité terrain |
| `npm run eval:extraction` | fait lire les devis fictifs par le modèle et affiche la précision champ par champ |

## Variables d'environnement

Copie `.env.example` en `.env.local` ; chaque variable y est expliquée.

| Variable | Rôle | Obligatoire |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | lecture des devis par le modèle | pour analyser |
| `ANTHROPIC_MODEL` | modèle de lecture (défaut `claude-sonnet-5-5`) | non |
| `DATABASE_URL` | Postgres (Neon ou Supabase) : limite quotidienne, analyses, base de prix, inscriptions | en production |
| `IP_HASH_SECRET` | secret du hachage des adresses IP, 32 caractères au moins | en production |
| `POSTHOG_KEY` | clé de projet PostHog (hébergement EU) ; sans elle, les événements restent dans Postgres | non |
| `POSTHOG_HOST` | hôte PostHog (défaut `https://eu.i.posthog.com`) | non |
| `ADMIN_PASSWORD` | mot de passe de `/admin`, 16 caractères au moins | pour `/admin` |
| `SITE_URL` | adresse publique du site, pour les images de partage | non (Vercel la fournit) |
| `ENABLE_DEV_PAGES` | montre `/dev/design` en production si `true` | non |

## Base de données

1. Crée une base sur [Neon](https://neon.tech) ou [Supabase](https://supabase.com).
2. Mets sa chaîne de connexion dans `DATABASE_URL` (`.env.local` en local, réglages du projet sur Vercel).
3. En local, lance `npm run db:migrate` une fois, puis après chaque nouvelle migration. Sur Vercel, rien à faire : chaque déploiement applique les migrations avant le build.

Si la migration échoue avec la chaîne « pooled » (Neon) ou « Transaction pooler » (Supabase), lance-la avec la chaîne directe (« Direct connection »), puis remets la chaîne « pooled » pour le site.

En local, sans `DATABASE_URL`, tout fonctionne quand même : la limite de 5 analyses par jour est tenue en mémoire (remise à zéro au redémarrage), les analyses ne sont pas enregistrées (le résultat s'affiche, sans lien), les prix sont comparés à des estimations IA seulement, et les inscriptions email sont seulement signalées dans le terminal.

Chaque analyse enregistrée a son adresse, `/analyse/<identifiant>` : l'adresse de la page change d'elle-même à la fin de l'analyse, et la rouvrir rejoue la correction. Sans base, le résultat s'affiche mais n'a pas d'adresse.

Ce qui est enregistré d'une analyse : son verdict, ses constats, ses avis de prix, la catégorie, le département et les lignes anonymisées du devis. Jamais le devis lui-même. Les analyses sont effacées au bout de 30 jours ; les lignes anonymisées servent à comparer les prix pendant 24 mois.

## Évaluer la lecture

`src/fixtures/quotes/` contient six devis PDF fictifs générés avec pdf-lib : cinq à lire (deux avec des erreurs volontaires) et un devis d'optique, que Loupe doit refuser. Chacun a sa vérité terrain (`*.truth.json`).

```bash
npm run eval:extraction          # les six devis (quelques centimes d'API)
npm run eval:extraction -- 02    # seulement le devis 02
```

Le script affiche, pour chaque champ (catégorie, mentions, dates, montants, lignes…), le nombre de lectures justes, liste les écarts, vérifie qu'aucune donnée personnelle du devis n'a été recopiée, lance les vérifications sur la lecture du modèle (erreurs volontaires retrouvées, constats en trop), et écrit un rapport détaillé dans `eval-results/`.

## Partage et mesure

- **Partage.** Sous une analyse enregistrée, « Partager la correction » crée un lien public `/v/<identifiant>`, distinct du lien privé : il montre la feuille corrigée et le verdict, avec la région au lieu du département, sans date, sans rappel personnel ni message. Il expire avec l'analyse (30 jours) et n'est pas indexé par les moteurs de recherche. Son image de partage est générée par `next/og` (polices dans `assets/fonts`, licence OFL).
- **Mesure.** Dix événements (`src/lib/events.ts`), sans cookie ni stockage sur l'appareil, envoyés à `/api/events`, gardés dans Postgres (13 mois) et relayés à PostHog (EU) sans adresse IP, sans géolocalisation et sans profil de personne.
- **`/admin`.** Analyses par jour, verdicts, conversion par étape, catégories, analyses ratées, coût du modèle, sur 30 jours. Session de 12 heures, 10 essais de mot de passe par jour et par adresse.

## Mettre en ligne sur Vercel

Compte une demi-heure la première fois. Il te faut : le dépôt GitHub (il y est déjà), un compte [Vercel](https://vercel.com) relié à GitHub, un compte [Neon](https://neon.tech) (ou Supabase) et une clé API Claude.

1. **La base.** Crée un projet Neon dans la région **Francfort** (AWS Europe Central). Copie la chaîne de connexion « pooled » : c'est `DATABASE_URL`. Les fonctions de Loupe tournent aussi à Francfort (`vercel.json`, région `fra1`) : la base est à côté.
2. **Les secrets.** Prépare :
   - `ANTHROPIC_API_KEY` : sur <https://platform.claude.com>, rubrique API keys ;
   - `IP_HASH_SECRET` : `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` ;
   - `ADMIN_PASSWORD` : 16 caractères au moins, à garder dans ton gestionnaire de mots de passe ;
   - `POSTHOG_KEY` (facultatif) : la clé du projet PostHog, hébergement EU.
3. **La branche.** Vercel met en ligne la branche principale du dépôt (`main`). Le travail est sur `claude/loupe-devis-analyzer-mvp-xy60ma` : fusionne-la dans `main` (une pull request sur GitHub, puis « Merge »), ou choisis cette branche comme branche de production dans les réglages du projet Vercel.
4. **Le projet.** Sur Vercel : « Add New… » → « Project » → importe le dépôt `Yuka`. Next.js est reconnu tout seul ; ne touche ni à la commande de build ni au dossier de sortie (Vercel lance `npm run vercel-build` : migrations, puis build). Avant « Deploy », ajoute les variables de l'étape 2 et `DATABASE_URL`, pour l'environnement **Production**.
5. **Le déploiement.** Clique « Deploy ». Dans le journal du build, tu dois voir `[migrations] base à jour.` puis la fin du build. Ouvre l'adresse donnée (`….vercel.app`) : la landing, puis `/analyse` avec un vrai devis, puis `/admin`.
6. **Ton domaine** (facultatif). Réglages du projet → Domains. Mets ensuite son adresse dans `SITE_URL` (« https://loupe.fr ») et redéploie : les images de partage et le plan du site l'utiliseront.
7. **Avant d'ouvrir au public.** Complète `src/config/legal.ts` (éditeur, contact, hébergeur, prestataires) : tant que ce n'est pas fait, les pages `/mentions-legales` et `/confidentialite` affichent « à compléter » en rouge.

Bon à savoir :

- **Les déploiements de test** (« Preview », un par branche ou pull request) appliquent eux aussi les migrations à la base qu'ils voient. Ne leur donne pas la base de production : laisse `DATABASE_URL` vide pour Preview (l'analyse y sera fermée), ou donne-leur une autre base (une branche Neon).
- **Durée d'une analyse.** La route d'analyse peut durer jusqu'à 120 secondes (`maxDuration`). À vérifier : que ton offre Vercel l'autorise (sinon, Vercel coupe plus tôt et l'analyse s'interrompt).
- **Poids des envois.** Vercel refuse un envoi de plus de 4,5 Mo avant qu'il n'atteigne Loupe (à vérifier dans sa documentation) : Loupe accepte donc 4 Mo au plus, au lieu des 10 Mo prévus. Les photos compressées en pèsent bien moins ; seul un gros PDF scanné est refusé, avec le conseil de prendre les pages en photo.
- **Offre gratuite.** L'offre Hobby de Vercel est prévue pour un usage personnel, non commercial (à vérifier dans ses conditions) : pour un lancement public, prévois l'offre Pro.
- **Sécurité.** `next.config.ts` envoie des en-têtes de sécurité (politique de contenu sans aucune ressource tierce, pas d'affichage dans un cadre, HTTPS imposé une fois en ligne).
