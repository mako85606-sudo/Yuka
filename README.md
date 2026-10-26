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

Sans rien installer : sur la page du dépôt GitHub, « Code » → onglet « Codespaces » → « Create codespace » (sur la branche de travail). `.devcontainer/devcontainer.json` installe tout et lance `npm run dev` à chaque ouverture, après un `git pull` ; le site s'ouvre dans un nouvel onglet. Le relais de Codespaces réécrit l'en-tête `Origin` en `http://localhost:3000` et met l'adresse publique dans `x-forwarded-host` : en développement, ces adresses sont autorisées par `next.config.ts` (`allowedDevOrigins`, Server Actions) et par le contrôle d'origine des routes (`src/lib/forwarded-hosts.ts`). Pour analyser un devis dans le codespace, il faut la clé du modèle : sur GitHub, « Settings » → « Codespaces » → « Codespaces secrets » → « New secret », nom `ANTHROPIC_API_KEY`, accès au dépôt `Yuka` ; puis redémarrer le codespace (la clé est lue au démarrage). Les comptes GitHub personnels ont un quota mensuel gratuit (120 heures de calcul et 15 Go de stockage pour l'offre gratuite, d'après la documentation de GitHub).

Sous Windows, une fois le dépôt cloné avec Git (`git clone -b claude/loupe-devis-analyzer-mvp-xy60ma https://github.com/mako85606-sudo/Yuka.git Loupe`), un double-clic sur `lancer-loupe.bat` récupère les nouveautés (`git pull`), installe ce qui manque et lance le site en ouvrant le navigateur.

Pour essayer sur ton téléphone, lance `npm run build` puis `npm start` et ouvre l'adresse « Network » affichée, sur le même Wi-Fi. Un build de production reste fermé sans base ni secret (sécurité) : pour un essai local sans base, ajoute `ALLOW_MEMORY_QUOTA=true` dans `.env.local` (jamais sur un site en ligne).

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
| `npm run db:deploy` | applique les migrations sans drizzle-kit (adresse directe d'abord) ; ne fait rien sans base ni depuis un déploiement de test |
| `npm run secrets` | tire au hasard `IP_HASH_SECRET`, `CRON_SECRET` et `ADMIN_PASSWORD`, à coller dans Vercel |
| `npm run vercel-build` | ce que Vercel lance à chaque déploiement : migrations, puis build |
| `npm run db:generate` | génère une migration après un changement de `src/server/db/schema.ts` |
| `npm run fixtures:generate` | régénère les devis PDF fictifs et leur vérité terrain |
| `npm run eval:extraction` | fait lire les devis fictifs par le modèle et affiche la précision champ par champ |

## Variables d'environnement

Copie `.env.example` en `.env.local` ; chaque variable y est expliquée.

| Variable | Rôle | Obligatoire |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | lecture des devis par le modèle | pour analyser |
| `ANTHROPIC_MODEL` | modèle de lecture (défaut `claude-sonnet-5-5`). Évitez Claude Fable et Mythos : Anthropic garde 30 jours ce qu'ils lisent, ce que la politique de confidentialité ne dit pas | non |
| `DATABASE_URL` | Postgres (Neon ou Supabase) : limite quotidienne, analyses, base de prix, inscriptions | en production |
| `DATABASE_URL_UNPOOLED` | adresse directe de la base, pour les seules migrations (posée par l'intégration Neon de Vercel) | non |
| `MIGRATE_PREVIEW_DATABASE` | `true` pour migrer aussi depuis un déploiement de test qui a sa propre base | non |
| `IP_HASH_SECRET` | secret du hachage des adresses IP, 32 caractères au moins | en production |
| `POSTHOG_KEY` | clé de projet PostHog (hébergement EU) ; sans elle, les événements restent dans Postgres | non |
| `POSTHOG_HOST` | hôte PostHog (défaut `https://eu.i.posthog.com`) | non |
| `ADMIN_PASSWORD` | mot de passe de `/admin`, 16 caractères au moins | pour `/admin` |
| `SITE_URL` | adresse publique du site, pour les images de partage | non (Vercel la fournit) |
| `ENABLE_DEV_PAGES` | montre `/dev/design` hors développement si `true` | non |
| `CRON_SECRET` | secret du nettoyage de nuit (`/api/purge`, 16 caractères au moins) ; Vercel l'envoie tout seul | en production |
| `ALLOW_MEMORY_QUOTA` | `true` seulement pour un essai local d'un build sans base (`npm start`) | non |
| `TRUSTED_PROXY` | `true` si un relais de confiance autre que Vercel ajoute l'adresse du visiteur à la fin de `X-Forwarded-For` (seule cette dernière adresse est crue) | non |

## Base de données

1. Crée une base sur [Neon](https://neon.tech) ou [Supabase](https://supabase.com).
2. Mets sa chaîne de connexion dans `DATABASE_URL` (`.env.local` en local, réglages du projet sur Vercel).
3. En local, lance `npm run db:deploy` une fois, puis après chaque nouvelle migration. Sur Vercel, rien à faire : chaque déploiement de production applique les migrations avant le build (jamais un déploiement de test, voir plus bas).

Les migrations passent par l'adresse directe si elle existe (`DATABASE_URL_UNPOOLED`, que l'intégration Neon de Vercel pose toute seule), sinon par `DATABASE_URL` : Neon déconseille son relais de connexions (« pooled ») pour modifier le schéma. Le site, lui, utilise `DATABASE_URL` (« pooled »). Les adresses de Neon contiennent `channel_binding=require`, que le pilote de Loupe ne sait pas faire : Loupe retire ce réglage et vérifie à la place le certificat du serveur (`src/server/db/connection.ts`).

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
- **Mesure.** Dix événements (`src/lib/events.ts`), sans cookie, envoyés à `/api/events`, gardés dans Postgres (13 mois) et relayés à PostHog (EU) sans adresse IP, sans géolocalisation et sans profil de personne. Chacun peut s'y opposer sur `/confidentialite` (le refus est gardé dans son navigateur) ; le signal Global Privacy Control est respecté.
- **`/admin`.** L'état de la configuration (ce qui est réglé, ce qui manque, jamais une valeur secrète), puis analyses par jour, verdicts, conversion par étape, catégories, analyses ratées, coût du modèle, sur 30 jours. Session de 12 heures, 10 essais de mot de passe par jour et par adresse.

## Mettre en ligne sur Vercel

Compte une heure la première fois. Tout se fait dans le navigateur ; la seule commande à taper l'est dans le terminal du Codespace. Faits vérifiés le 26 octobre 2026 dans la documentation de Neon et dans le code de Vercel ; ce qui vient seulement de la documentation de Vercel (site inaccessible depuis l'environnement de développement) est marqué « à vérifier ».

### Avant de commencer

- **Le code est dans `main`.** Vercel met en ligne la branche principale : fusionne la dernière pull request.
- **Un compte [Vercel](https://vercel.com)**, relié à ton compte GitHub. L'offre gratuite (Hobby) est réservée à un usage personnel et non commercial (à vérifier dans les conditions de Vercel) ; pour un lancement public, prends l'offre **Pro** (20 $ par mois, à vérifier). Hobby suffit pour un essai privé.
- **Une clé de l'API Claude** sur <https://platform.claude.com> (rubrique API keys), et, au même endroit, une **limite de dépense mensuelle** : c'est la protection ultime contre une facture imprévue.

### 1. Le projet

1. Sur Vercel : « Add New… » → « Project » → importe le dépôt `Yuka`.
2. Next.js est reconnu tout seul. Ne touche ni à la commande de build ni au dossier de sortie : Vercel lance `npm run vercel-build` (migrations, puis build).
3. Clique « Deploy ». Ce premier déploiement fonctionne mais l'analyse reste fermée : il manque la base et les secrets (étapes 2 et 3).
4. Dans « Settings » → « Functions », vérifie que **Fluid compute** est activé (c'est le réglage par défaut des nouveaux projets). Une analyse peut durer jusqu'à 120 secondes ; sans Fluid compute, l'offre Hobby coupe à 60 secondes (à vérifier).

### 2. La base de données (Neon, depuis Vercel)

1. Dans le projet Vercel : onglet « Storage » → « Create Database » → **Neon**.
2. Région : **Europe (Frankfurt), `aws-eu-central-1`**. Elle ne se change plus ensuite. Les fonctions de Loupe tournent aussi à Francfort (`vercel.json`, région `fra1`) : la base est à côté.
3. Environnements qui reçoivent la base : coche **Production** seulement (et Development si tu veux). Ne donne pas la base de production aux déploiements de test (Preview).
4. L'intégration crée toute seule `DATABASE_URL` (adresse « pooled », pour le site) et `DATABASE_URL_UNPOOLED` (adresse directe, pour les migrations). Rien à copier.

L'offre gratuite de Neon suffit pour commencer : 1 Go de données, 100 heures de calcul par mois ; la base s'endort après 5 minutes sans visite et se réveille en quelques centaines de millisecondes.

### 3. Les secrets

1. Dans le terminal du Codespace : `npm run secrets`. La commande affiche trois valeurs tirées au hasard : `IP_HASH_SECRET`, `CRON_SECRET`, `ADMIN_PASSWORD`. Garde `ADMIN_PASSWORD` dans ton gestionnaire de mots de passe.
2. Dans Vercel : « Settings » → « Environment Variables », environnement **Production**, ajoute :
   - `ANTHROPIC_API_KEY` : ta clé de l'API Claude ;
   - `IP_HASH_SECRET`, `CRON_SECRET`, `ADMIN_PASSWORD` : les valeurs de `npm run secrets` ;
   - `POSTHOG_KEY` (facultatif) : la clé d'un projet PostHog hébergé en Europe.
3. Ne colle jamais ces valeurs dans un message, une capture d'écran ou un fichier du dépôt.

### 4. Le vrai déploiement

1. « Deployments » → le dernier → « Redeploy » : les variables ne comptent qu'à partir du déploiement suivant.
2. Dans le journal du build, tu dois voir `[migrations] base à jour (DATABASE_URL_UNPOOLED).`
3. Ouvre l'adresse donnée (`….vercel.app`), puis `/admin` avec `ADMIN_PASSWORD` : la carte « Configuration » doit dire « Réglé » partout, sauf PostHog (facultatif) et les pages légales (« À revoir » tant qu'elles ne sont pas complétées).
4. Fais une vraie analyse sur `/analyse` avec un devis.

### 5. Ton domaine (facultatif)

« Settings » → « Domains ». Mets ensuite son adresse dans `SITE_URL` (« https://loupe.fr ») et redéploie : les images de partage et le plan du site l'utiliseront.

### 6. Avant d'ouvrir au public

- **Pages légales.** Complète `src/config/legal.ts` (éditeur, contact, hébergeur de la base, prestataires) : tant que ce n'est pas fait, `/mentions-legales` et `/confidentialite` affichent « à compléter » en rouge, et `/admin` le signale.
- **Accords de traitement.** Accepte et garde les accords de traitement des données (DPA) d'Anthropic, de Vercel, de Neon et de PostHog ; le registre des traitements est dans `docs/registre-traitements.md`.
- **Budget.** Ajuste `limits.dailyLlmBudgetUsd` (20 $ par jour) dans `src/config/limits.ts`.

### Bon à savoir

- **Déploiements de test (Preview).** Un par branche ou pull request. Ils n'appliquent jamais les migrations (`src/server/db/migration-target.ts`), sauf si tu poses `MIGRATE_PREVIEW_DATABASE=true` après avoir activé, dans l'intégration Neon, une branche de base par déploiement de test. Sans base ni `IP_HASH_SECRET`, l'analyse y reste fermée.
- **Nettoyage de nuit.** Vercel appelle `/api/purge` une fois par jour (`vercel.json`) avec `CRON_SECRET` ; sur l'offre Hobby, à une heure quelconque entre 3 h et 4 h UTC. Seul le déploiement de production est concerné.
- **Plafond de dépense.** Avant chaque analyse, Loupe réserve 1,50 $ sur le budget du jour, puis solde au coût réel (quelques centimes par analyse). Dès qu'il reste moins de 1,50 $ (donc à partir de 18,50 $ dépensés sur 20 $), l'analyse se met en pause jusqu'au lendemain, sans coûter au visiteur l'une de ses 5 analyses. `/admin` montre la dépense du jour.
- **Poids des envois.** Vercel refuse un envoi de plus de 4,5 Mo avant qu'il n'atteigne Loupe (à vérifier) : Loupe accepte 4 Mo au plus. Les photos compressées en pèsent bien moins ; seul un gros PDF scanné est refusé, avec le conseil de prendre les pages en photo.
- **Sécurité.** En-têtes de sécurité dans `next.config.ts` (politique de contenu sans ressource tierce, pas d'affichage dans un cadre, HTTPS imposé) ; politique stricte à nonce sur les pages rendues à chaque visite (`src/proxy.ts`).
