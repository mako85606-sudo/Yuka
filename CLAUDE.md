@AGENTS.md

# Loupe — mémo projet

Ce fichier est chargé automatiquement à chaque session. Il résume le brief produit de l'utilisateur. Si un point manque ou semble contredit par une demande récente, c'est la demande de l'utilisateur qui fait foi.

## Le produit en une phrase

L'utilisateur prend en photo un devis (garage, plombier, électricien, chauffagiste, serrurier, travaux, déménagement). En moins de 30 secondes, Loupe le corrige au stylo rouge : erreurs objectives, lignes suspectes, comparaison de prix, verdict, et un message de négociation prêt à envoyer.

Le moment clé : quelqu'un tient un devis dans la main et se demande s'il est en train de se faire avoir. Tout le produit sert ce moment.

## Principes non négociables

- **Indépendance.** Aucune publicité, aucun lien affilié vers des artisans en V1.
- **Honnêteté.** Les erreurs vérifiées (calcul faux, mention obligatoire absente) sont visuellement séparées des avis de prix (estimations). Chaque avis de prix affiche sa source et son niveau de confiance (« base Loupe, 23 devis comparables », « estimation IA, confiance faible »). Une estimation IA n'est jamais présentée comme un prix de marché.
- **Vie privée.** Le devis original (image ou PDF) n'est jamais stocké : traité en mémoire puis jeté. On ne demande pas au modèle d'extraire les valeurs personnelles (noms, adresses, téléphones, emails, numéros) : seulement des booléens de présence. En base : uniquement des lignes anonymisées, la catégorie et le département.
- **Aucun jugement public sur un artisan nommé.** Les verdicts sont privés. La page de partage ne montre ni nom d'entreprise ni adresse.
- **Pas de santé en V1.** Devis dentaire, optique, auditif ou médical : message poli (« pas encore pris en charge »), sans analyse ni stockage.
- **Avertissement visible :** « Avis indicatif, ne remplace pas un professionnel ni un conseil juridique. »
- **Pas de compte en V1.** Une analyse est accessible par un lien à identifiant aléatoire non devinable et expire au bout de 30 jours.

## Manière de travailler

- On avance par étapes (liste en bas). À la fin de chaque étape, `npm run lint`, `npm run typecheck` et `npm test` passent. Ensuite : résumé en 5 lignes (fait, reste, à tester à la main), puis **attendre le « go »** de l'utilisateur avant l'étape suivante.
- L'utilisateur est sur **Windows** : uniquement des scripts npm multiplateformes, jamais de bash dans `package.json` (`cross-env` si une variable d'environnement est nécessaire, `tsx` pour lancer du TypeScript).
- Vérifier versions et API dans la documentation officielle, pas de mémoire. Next.js embarque sa doc dans `node_modules/next/dist/docs/`. Pour Tailwind et Motion : dépôts GitHub officiels (`tailwindlabs/tailwindcss.com`, `motiondivision/motion`) et fichiers `.d.ts`. L'environnement cloud bloque nextjs.org, tailwindcss.com, motion.dev et docs.anthropic.com ; platform.claude.com est accessible.
- Information incertaine (règle juridique, prix de référence) : ne jamais l'inventer. La mettre dans `src/config/` avec `// TODO: vérifier` et la signaler dans le résumé d'étape.
- Écrire des fichiers complets, jamais « ... reste inchangé ».
- Toute l'interface est en français, au **vouvoiement** (tout le site depuis la refonte claire). Ton d'expert rassurant : clair, posé, factuel, jamais moqueur envers les artisans.

## Stack (versions vérifiées le 3 octobre 2026)

| Outil | Version | Notes |
| --- | --- | --- |
| Next.js | 16.3 | App Router, Turbopack par défaut, `params` asynchrones, `proxy.ts` remplace `middleware.ts`, plus de `next lint` |
| React | 19.2 | Server Components par défaut ; `"use client"` seulement sur les feuilles interactives ou animées |
| TypeScript | 5.9 | `strict` + `noUncheckedIndexedAccess`. TS 7 et ESLint 10 existent mais typescript-eslint et les plugins React ne les supportent pas encore |
| Tailwind CSS | 4.3 | `@tailwindcss/postcss`, tokens en variables CSS, `@theme inline`, palette par défaut désactivée |
| Motion | 14 | `import { motion } from "motion/react"` |
| Zod | 4 | tous les schémas : extraction LLM, API, config |
| SDK Anthropic | `@anthropic-ai/sdk` | modèle lu dans `ANTHROPIC_MODEL`, défaut `claude-sonnet-5-5` |
| Postgres + Drizzle | Neon ou Supabase | rate limit aussi en Postgres en V1 |
| PostHog | `posthog-node` 5.54 | hébergement EU, envoi depuis le serveur (aucun script tiers dans le navigateur) |
| Vitest | 5 | tests à côté du code : `*.test.ts` |
| Node | ≥ 22.12 | Vercel pour le déploiement |

Appel LLM : sortie JSON forcée via un outil (tool use) dont l'`input_schema` est dérivé du schéma Zod (`z.toJSONSchema`). Validation Zod côté serveur ; en cas d'échec, une seule relance avec l'erreur de validation. Les PDF partent directement au modèle ; les photos sont compressées côté client (environ 1600 px de large).

Précisions vérifiées dans la documentation de l'API Claude (étape 3) :
- Claude Sonnet 5.5 refuse le forçage d'outil (`tool_choice` `any` ou `tool` : erreur 400). On envoie `tool_choice: { type: "auto", disable_parallel_tool_use: true }`, une consigne explicite d'appeler l'outil, et un outil `strict: true` (schéma garanti). Pas d'appel d'outil = échec de validation, donc la relance unique.
- Schémas stricts : objets fermés (`additionalProperties: false`), pas de `minimum`/`maximum`/`pattern`/longueurs (retirés du schéma envoyé, gardés par Zod), au plus 24 champs optionnels et 16 unions par requête. D'où : valeur absente = champ omis (pas de `null`), garde par `schema.test.ts`.
- Champs obligatoires dans l'ordre déclaré, optionnels ensuite : `documentKind`, `category`, `readability` sortent en premier. Avec `eager_input_streaming: true`, l'entrée de l'outil arrive en fragments : `src/lib/extraction/progress.ts` en tire l'en-tête et chaque ligne dès qu'ils sont complets, et arrête la lecture d'un devis de santé, d'un non-devis ou d'une photo illisible avant la suite.
- Réflexion adaptative par défaut (`thinking: disabled` renvoie 400 sur ce modèle), effort `low` (conseillé pour l'extraction), `max_tokens` 16 000. Consignes en cache (`cache_control` sur le bloc système). Un refus (`stop_reason: "refusal"`) ou une réponse tronquée ne sont pas relancés.
- Coût journalisé à chaque lecture (`[analyse] …` dans les journaux du serveur), d'après `MODEL_PRICING` (`src/config/llm.ts`).
- Vie privée : les photos sont réencodées dans le navigateur (métadonnées EXIF et position GPS effacées) ; le modèle ne renvoie que des booléens pour l'émetteur ; libellés et objet passent par `anonymizeText` ; les fichiers restent en mémoire le temps de la requête.

Vérifications, prix et verdict (étape 4) :
- Flux : `extracted` → étape `checking` + `checks` (constats) → étape `pricing` + `prices` (avis, `complete`) → étape `verdict` + `verdict` (résultat, `analysisId`, `expiresAt`), qui clôt l'analyse. Un flux coupé avant le verdict est « interrompu ».
- Constat (`Finding`, `src/lib/analysis/result.ts`) : `kind` `error` (calcul faux, mention absente), `warning` (ligne vague, acompte élevé, TVA inhabituelle), `reminder` (rétractation) ; `confirmed` faux si les chiffres en cause sont lus en confiance `low` (affiché « À vérifier » et « à confirmer sur votre devis », jamais une erreur sûre, jamais une alerte) ; `legalRef` affichée seulement si `ruleVerified`.
- Prix : une ligne mal lue, vague, remise ou de moins de 20 € n'a pas d'avis. Base Loupe : `price_lines` `comparable` de la même prestation, même unité de comparaison, même région (`src/config/regions.ts`), moins de 24 mois, autre empreinte ; médiane et quartiles en TS dès 5 comparables. Sinon fourchette du modèle (`src/server/pricing/estimate-prices.ts`, outil strict `estimer_prix`, non streamé, une relance) : il ne voit jamais les prix du devis ; 12 lignes au plus, les plus chères ; délai = reste du budget de la requête (`limits.analysisBudgetMs`). Écart d'une estimation IA compté seulement hors fourchette.
- Verdict (`src/lib/verdict.ts`, seuils `src/config/verdict.ts`) : `alert` si les erreurs de calcul coûtent ≥ 20 €, si le nom ou le SIRET manque (constat sûr), ou si un prix dépasse la médiane Loupe de 60 % ; `negotiate` pour tout autre constat (hors rappel), un prix à +15 % de la médiane, ou au-dessus d'une fourchette IA ; sinon `ok` (sans économie annoncée). Une estimation IA ne mène jamais à `alert`. Économie : trop-payé recalculé + écarts au-dessus du 3e quartile (bas) ou de la médiane et des fourchettes IA (haut).
- Enregistrement (`src/server/analysis/store.ts`) : `analyses` (id aléatoire 128 bits, catégorie, département, région, verdict, `result` = l'extraction sans ses lignes + constats + avis + verdict, coût) et `price_lines` (libellés repassés par `anonymizeText`). Empreinte des prix (`quoteFingerprint`) : un même devis analysé deux fois ne compte qu'une fois dans les médianes. Analyses effacées après 30 jours, lignes après 24 mois (détachées entre-temps) par `after()` dans la route. Sans base : résultat affiché, pas de lien. Visiteur parti avant la fin : rien n'est enregistré.
- Journal : `[analyse] verdict … · constats · avis (base, IA) · enregistrée · coût total` en plus de la ligne de lecture.

Écran de résultat (étape 5) :
- Une seule scène pour la démo et l'analyse réelle : `CorrectionScene` prend un `CorrectionQuote` (valeurs absentes permises ; `SceneQuote` en est la version complète des démos). `src/lib/analysis/sheet.ts` y range les constats : sur une ligne (kind `calculation`, `vague-line` ou `other`), sur un total, sur le devis entier (« Remarques sur le devis », pastilles Manque / Attention / À vérifier / Rappel). Depuis la refonte claire : une carte de devis propre (voir « Refonte claire »).
- Rythme : `usePacedPhase` (`src/components/scene/use-paced-phase.ts`) fait suivre à la feuille l'étape réelle du serveur, sans jamais la devancer, un bloc à la fois (`blockDuration`, `src/lib/demo-script.ts`) : si le serveur va plus vite, chaque bloc a le temps de se jouer. En direct, les lignes apparaissent au moment où elles sont lues. Une analyse rouverte se rejoue en entier. Le suivi d'étapes, lui, montre l'étape du serveur.
- « Tout afficher » (dans le panneau de suivi) et un tap sur le devis passent l'animation (`MotionPreferences skip`). Le verdict prend le focus quand la vérification est affichée, sans faire défiler.
- Conclusion (`AnalysisResult.tsx`) : `ResultSummary` (verdict en pastille, économie en grand, points clés, « Préparer mon message ») puis `ResultDetails` (Erreurs vérifiées, À confirmer, Avis sur les prix, Points d'attention, Bon à savoir, Message à envoyer, Et maintenant ?).
- Message (`src/lib/negotiation.ts`, `NegotiationMessage`) : email (objet + corps) et SMS (3 points au plus, sans espace insécable), vouvoiement, questions et propositions, jamais d'accusation. Fondé seulement sur les constats sûrs et sur les prix de la base Loupe à +15 % de la médiane ; jamais une estimation IA ni un chiffre à confirmer ; pas de message sans point vérifié. Texte modifiable, « Copier » répond « Copié » 2 s (`holds.copied`).
- Adresse : à la fin d'une analyse enregistrée, `/analyse` devient `/analyse/[id]` (`history.replaceState`, sans recharger). `/analyse/[id]` est rendue à chaque visite (`connection()`), `loadAnalysis` revalide le contenu et refuse une analyse expirée ; sinon `not-found.tsx`. `robots: noindex` et `referrer: no-referrer` sur `/analyse` et `/analyse/[id]`.

Partage et mesure (étape 6) :
- Partage : `analyses.share_id`, créé à la demande (`createShareLink`, `ensureShareId`), distinct de l'identifiant privé : le lien public n'ouvre jamais l'analyse privée, et inversement. `/v/[shareId]` (rendue à chaque visite, `noindex`) passe par `shareableAnalysis` : région au lieu du département, aucune date ni validité ni délai, ni rappel personnel (rétractation), ni message, ni identifiant privé. Expire avec l'analyse. Sur téléphone, `navigator.share` ; sinon le lien est copié.
- Image de partage : `next/og`, polices TTF locales (`assets/fonts`, Instrument Serif, Geist, Geist Mono), couleurs `src/config/og.ts`. `SITE_URL` (facultative) fixe `metadataBase`.
- Mesure : liste fermée de dix événements (`src/lib/events.ts`, propriétés validées par Zod, codes sans texte libre). `track()` envoie à `/api/events` (`sendBeacon`), sans cookie ni stockage : la visite est un UUID en mémoire (une navigation interne la garde, un rechargement en ouvre une autre). La route vérifie l'origine, la taille (1 Ko) et le schéma, répond 204, puis enregistre dans `events` (Postgres) et relaie à PostHog (`posthog-node`, EU, `disableGeoip`, `$process_person_profile: false`). Purge à 13 mois après chaque analyse.
- `/admin` : `ADMIN_PASSWORD` (16 caractères au moins, sinon fermé), cookie de session HMAC (12 h, `httpOnly`, `sameSite: strict`, chemin `/admin`), 10 essais par jour et par IP (compteur `rate_limits`, clé préfixée), une seconde d'attente après un échec. Statistiques sur 30 jours (`src/server/admin/stats.ts`).
- « Rapport détaillé — 4,90 € » n'encaisse rien : il ouvre « Bientôt disponible : laissez votre email pour l'avoir en premier » (inscription `detailed_report`).

Durcissement (étape 7) :
- Pages légales : `/mentions-legales` et `/confidentialite` (`LegalPage`), nourries par `src/config/legal.ts` : éditeur, hébergeur, prestataires et contact restent `null` (affichés « à compléter » en rouge) tant qu'ils ne sont pas renseignés, jamais inventés (`// TODO: vérifier`). Durées de conservation tirées de la configuration. Liens dans le pied de page et dans le détail du consentement.
- Effacement : « Effacer cette analyse » (`DeleteAnalysis`, Server Action `deleteAnalysisNow`, `deleteAnalysis` dans `store.ts`) supprime l'analyse et son lien de partage ; ses lignes anonymes restent, détachées.
- Photo floue : netteté mesurée dans le navigateur (`src/lib/image-sharpness.ts`, variance du laplacien par zone, 90e centile, à 800 px), seuil `limits.blurThreshold` (`// TODO: vérifier`). Une page floue porte « Floue ? » et un conseil ; le premier envoi demande confirmation, le second part. Rien n'est bloqué.
- Pages d'erreur : `not-found.tsx`, `error.tsx` (`retry` ; « Revenir à l'accueil » réessaie si l'erreur est déjà sur l'accueil, sinon navigue), `global-error.tsx` (son propre `<html>`). L'inscription email ne fait jamais tomber la page : un échec réseau devient un message sous le champ (`subscribeSafely`).
- Performance : Zod hors du paquet navigateur (`src/lib/signup-form.ts` sans Zod pour le formulaire), seule Instrument Serif préchargée. Lighthouse mobile : performance ≥ 90, accessibilité 100, bonnes pratiques 100, SEO 100 sur les pages publiques (les pages `noindex` perdent ce seul point, voulu).
- Déploiement : `vercel.json` (fonctions à Francfort, `fra1`, près d'une base Neon ou Supabase à Francfort) ; Vercel lance `npm run vercel-build` (`scripts/migrate.ts` puis `next build`) : migrations appliquées à `DATABASE_URL` avant chaque build, rien sans base. `robots.ts` (ferme `/admin`, `/api/`, `/dev/`) et `sitemap.ts` (pages publiques), adresse par `siteOrigin()` (`SITE_URL`, sinon `VERCEL_PROJECT_PRODUCTION_URL`). En-têtes de sécurité dans `next.config.ts` (CSP sans nonce et sans ressource tierce, `frame-ancestors 'none'`, `nosniff`, HSTS ; caméra non coupée). Envoi plafonné à 4 Mo (le brief dit 10 Mo, mais Vercel refuse plus de 4,5 Mo : `HOSTING_BODY_LIMIT_BYTES`, `// TODO: vérifier`). Guide pas à pas dans le README.

Refonte claire (étape 11 ; l'utilisateur a rejeté les étapes 9 et 10 : « faut faire une vraie refonte, un autre type de design ») :
- Brief (questionnaire en six séries, validé) : clair et épuré, inspiré de Doctolib et d'Apple ; ton d'expert rassurant, vouvoiement ; fond blanc ; vert vif et frais (le nôtre, pas celui de Yuka) ; maquettes de téléphone ; titres en Instrument Serif fine, interface en Geist ; animations modérées et fluides ; ordinateur d'abord ; correcteur gardé « autrement », propre et moderne (ligne surlignée, pastille « Erreur de calcul », montant faux barré et bon montant à côté), sans écriture manuscrite ni tampon ; angles légèrement arrondis (6 à 10 px) ; nouveau logo avec icône.
- Étape 1 (faite) : identité et page d'accueil. Étape 2 (faite) : tout le reste du site, vouvoiement partout, plus d'écriture manuscrite ni de tampon (`PaperSheet`, `RedCircle`, `Stamp`, `MarginNote`, `HighlighterMark`, `hand-drawn.ts`, `seeded-random.ts` et La Belle Aurore supprimés).
- Devis lu (`CorrectionScene`, `src/components/quote/`) : une carte blanche (`rounded-lg`, `elevation-1`). En-tête (catégorie · département, objet, dates) avec le verdict en pastille (`VerdictBadge`) à droite ; pendant la lecture, une barre verte court en haut de la carte et des lignes fantômes attendent la suite. Un constat sur une ligne la surligne en jaune de gauche à droite (`bg-highlighter-mark`), puis pose sa pastille (`Tag` : « Erreur de calcul » rouge, « À préciser » ou « Attention » orange, « À vérifier » neutre) et sa note ; une erreur de calcul sûre barre le montant imprimé et écrit le bon à côté (`correctedLineTotal`, scene-quote.ts). Un constat à confirmer n'est jamais barré. Avis de prix sous la ligne (`PriceDelta`, source et confiance, jamais en rouge). Totaux et remarques : même geste. Calendrier inchangé (`choreography.ts` : `highlight` = surlignage, `circle` = pastille et rature, `note` = bon montant).
- Page d'analyse (`/analyse`, `/analyse/[id]`) : sur ordinateur, le devis à gauche et un panneau collant à droite, qui montre le suivi des étapes (`StepTracker`, liste cochée ; barre de cinq étapes sur mobile, « Tout afficher »), puis le résumé (`ResultSummary`). Sur mobile, le panneau passe au-dessus du devis : l'économie se lit en premier. Le détail suit sous le devis. Le dépôt : zone de dépôt sur fond `mist`, cliquable en entier (elle ouvre l'explorateur ; tuile « Ajouter une page » ensuite, sauf pour un PDF), consentement dans une carte, conseils de prise de vue et rappel de vie privée à droite. Bouton « Analyser mon devis ».
- Partage (`/v/[shareId]`) : même mise en page ; `SharedSummary` (verdict, économie, nombre d'erreurs) et `SharedInvite` (« Un devis à faire vérifier ? ») remplacent le résumé et le détail privés (props `summary` et `details` d'`AnalysisView`).
- Pages légales (`LegalPage` : en-tête sur `mist`, sommaire « Sur cette page », encadré « En bref »), pages d'erreur (`src/components/errors/StatusPage.tsx` ; `global-error.tsx` reste autonome, en polices du système), admin (cartes `rounded-lg`, fond `mist`) : refaites dans l'identité claire.
- Accueil (`src/app/page.tsx`), court : héros (« Ne payez plus un devis trop cher. », une phrase, « Scanner mon devis », trois promesses ; à droite le téléphone animé) → « Comment ça marche » (quatre étapes illustrées par des écrans de l'application, `HowItWorks`) → « Nos engagements » et questions fréquentes (fond `mist`) → inscription discrète → pied de page. Le carrousel des métiers et « Ce qu'on vérifie » ont quitté l'accueil (la vérification est l'étape 2 de « Comment ça marche »).
- Téléphone de l'accueil (`src/components/landing/phone/`) : `PhoneDemo` boucle photo (viseur, coins verts, ligne de scan, déclencheur et éclair) → analyse (barre continue, quatre vérifications cochées) → résultat (verdict en petit, « jusqu'à 219 € » compté en grand, constats, « Préparer mon message »). Retour de l'utilisateur : l'animation doit partir sans latence. Elle part donc de la photo dès le rendu serveur, et la ligne de scan tourne en CSS (`phone-scan`, globals.css, durée en variables depuis motion.ts) avant même l'hydratation. Mouvement réduit : le résultat, immobile, appliqué après l'hydratation (`useHydrated`, pour que le premier rendu reste celui du serveur). La boucle ne tourne qu'à l'écran et onglet affiché (`useInView`, `usePageVisible`) ; écrans empilés en fondu et léger zoom, remontés à chaque visite (`visits`) pour rejouer compteur et cartes. Contenu tiré du devis fictif par `src/lib/phone-demo.ts` (`phoneResult` : économie = `demoSavings`, calcul refait, source de chaque avis de prix, estimation IA en « confiance faible ») ; phrase pour lecteurs d'écran : `describePhoneResult`. Durées : `phoneDemo` (motion.ts). Pièces partagées avec « Comment ça marche » (cadre, barre d'état, devis photographié, carte de constat) : `PhoneParts.tsx`, tout en em.
- Logo (version B, choisie par l'utilisateur) : `Logo`, `LogoMark`, géométrie unique `src/lib/logo.ts`, reprise par `src/app/icon.svg` et l'image de partage : tuile à l'encre, loupe blanche, coche verte.
- Image de partage : fond `mist`, carte blanche, logo, titre en Instrument Serif, économie en vert foncé, verdict en pastille.
- Supprimés : `HeroSheet`, `SheetMarks`, l'ancien `HowItWorks`, `TradeCarousel`, `TradeCard`, `CheckIllustration`, `Ringed`, `PenTick`, `Wordmark`, `InkStroke`, `HandText`, `InkStamp`, `PenRing`, `hero-sheet.ts`, `trade-quotes.ts`, les gestes CSS (`cssGesture`), le grain et les fonds quadrillés.
- Honnêteté des exemples (inchangée) : `src/lib/demo-outcome.ts` applique les règles réelles du verdict et de l'économie (haut de fourchette) ; `demo-quotes.test.ts` et `phone-demo.test.ts` la gardent ; « Exemple fictif » est écrit sous le téléphone et dans son écran.

Lancement sans installation (après l'étape 8) : GitHub Codespaces (`.devcontainer/devcontainer.json`, image Node 24 : `git pull`, `npm install`, `npm run dev` à chaque ouverture, port 3000 ouvert dans le navigateur). Derrière le proxy de Codespaces, le serveur reçoit `x-forwarded-host: localhost:3000` alors que le navigateur envoie l'adresse publique : sans réglage, `/api/analyze` répondait « Cette demande ne vient pas du site de Loupe » et l'inscription email (Server Action) plantait (« Invalid Server Actions request », reproduit avec un proxy local). D'où `ownForwardedHosts()` (env.ts) : l'adresse exacte du codespace (`codespaceHost()`) si le serveur la connaît, et, en développement seulement, tout hôte `*.app.github.dev` (`hostMatches`, un seul niveau) ; mêmes hôtes dans `allowedDevOrigins` et `serverActions.allowedOrigins` (next.config.ts). Rien en production. Sous Windows, `lancer-loupe.bat` (CRLF) fait la même chose sur un clone Git local.

## Commandes

- `npm run dev`, `npm run build`, `npm start`
- `npm run lint` : ESLint CLI (flat config `eslint-config-next`)
- `npm run typecheck` : `next typegen && tsc --noEmit` (génère les types `PageProps`/`LayoutProps` avant de vérifier)
- `npm test` : Vitest en une passe ; `npm run test:watch` en continu
- `npm run db:generate` (migration SQL après un changement de `src/server/db/schema.ts`), `npm run db:migrate` (l'applique à `DATABASE_URL`)
- `npm run db:deploy` (migrations sans drizzle-kit, rien sans `DATABASE_URL`), `npm run vercel-build` (ce que Vercel lance : `db:deploy` puis `next build`)
- `npm run fixtures:generate` : régénère les devis PDF fictifs et leur vérité terrain (rendu déterministe)
- `npm run eval:extraction [-- préfixe]` : fait lire les devis fictifs par le vrai modèle (clé requise), précision champ par champ, contrôle vie privée, vérifications lancées sur la lecture (erreurs volontaires retrouvées, constats en trop), rapport dans `eval-results/` (ignoré par git)

## Arborescence

- `src/app/` : routes. `analyse/[id]/` : une analyse rouverte par son lien (et son `not-found.tsx`). `v/[shareId]/` : la page de partage public et son `opengraph-image.tsx` ; `opengraph-image.tsx` à la racine : l'image du site. `admin/` : le tableau de bord. `api/events/route.ts` : la mesure. `/dev/design` est la planche de style (masquée en production Vercel sauf `ENABLE_DEV_PAGES=true`). `globals.css` porte les tokens ; `tokens.test.ts` les garde. `api/analyze/route.ts` : l'analyse streamée. `mentions-legales/`, `confidentialite/` : les pages légales. `not-found.tsx`, `error.tsx`, `global-error.tsx` : les pages d'erreur. `robots.ts`, `sitemap.ts`.
- `src/components/quote/` : le devis lu (en-tête et son remplaçant pendant la lecture, lignes, totaux, remarques sur le devis, lignes fantômes, `VerdictBadge`, `PriceDelta`). Ils acceptent des valeurs absentes (`PrintedLine`, `PrintedTotals` : `null` = non lu, affiché « — »).
- `src/components/scene/` : `CorrectionScene` (la carte du devis vérifié, pilotée par l'étape affichée, démo ou réelle, `live` pour la lecture en direct), `use-paced-phase.ts` (étape affichée au rythme du serveur), `ScriptedScene` (démo fictive de la planche de style).
- `src/components/analyze/` : la page `/analyse` : `AnalyzeFlow` (parcours), `PagePicker` + `use-pages` (photos compressées, PDF), `StepTracker` (étapes réelles), `AnalysisView` (devis à gauche, panneau de suivi puis résumé à droite, détail dessous ; mode partage avec `place`, `summary`, `details`), `AnalysisResult` (`ResultSummary` : verdict, économie, points clés ; `ResultDetails` : « Erreurs vérifiées » séparées des « Avis sur les prix », message, « Et maintenant ? » ; `SavingsFigure`), `NegotiationMessage` (email et SMS, copie), `ShareLink` (lien public), `DetailedReport` (« Rapport détaillé — 4,90 € »), `DeleteAnalysis` (effacer l'analyse), `AnalysisOutcome` (refus, erreurs).
- `src/components/legal/LegalPage.tsx` : gabarit des pages légales (`Filled` : « à compléter » pour une valeur absente).
- `src/components/share/` : `SharedConclusion.tsx` (`SharedSummary` : verdict public ; `SharedInvite` : invitation). `src/components/errors/StatusPage.tsx` : gabarit des pages d'erreur. `src/components/admin/` : connexion et tableau de bord. `src/components/analytics/TrackView.tsx` : événement de vue d'une page.
- `src/components/landing/` : l'accueil et les pièces communes : `SiteHeader`, `SiteFooter`, `Logo` (et `LogoMark`), `HowItWorks` (quatre étapes illustrées), `Faq`, `EmailSignup`, `StickyCta` (bouton collant sur mobile) ; `phone/` : `PhoneDemo` (téléphone animé du héros) et `PhoneParts` (pièces des écrans d'application).
- `src/app/actions/` : Server Actions (`"use server"`). `src/server/` : code serveur uniquement (`import "server-only"`) : `env.ts` (variables validées par Zod), `anthropic.ts` (client), `extraction/` (consignes et appel au modèle), `analysis/` (envoi, origine, flux NDJSON, enregistrement `store.ts`), `pricing/` (comparables en base, estimation IA, orchestration `price-quote.ts`), `db/` (schéma Drizzle, client postgres.js), `rate-limit.ts`, `signups.ts`, `events/` (enregistrement Postgres et PostHog), `admin/` (session, statistiques), `og/` (image de partage).
- `src/components/motion/` : préférences de mouvement (mouvement réduit, saut d'animation).
- `src/components/ui/` : éléments d'interface maison (pas de shadcn brut) : `Button`, `Tag` (pastille de constat), `icons.tsx` (pictogrammes au trait).
- `src/lib/` : code pur et testé : `motion.ts` (durées, courbes, springs), `choreography.ts` (ordre des gestes dans chaque bloc), `phases.ts` (étapes serveur), `format.ts`, `price-wording.ts`, `color.ts`, `demo-script.ts`, `typography.ts`, `anonymize.ts` (filet anti-données personnelles), `department.ts`, `client-ip.ts`, `llm-cost.ts`, `image-compression.ts`, `image-sharpness.ts` (photo floue), `signup.ts` et `signup-form.ts` (inscription : schéma Zod côté serveur, constantes sans Zod côté navigateur), `verdict.ts` (verdict, économie, points clés), `phone-demo.ts` (écran de résultat du téléphone, tiré d'un devis fictif), `logo.ts` (géométrie du logo), `demo-outcome.ts` (verdict et économie des exemples fictifs, mêmes règles), `negotiation.ts` (message email et SMS), `events.ts` (liste fermée des événements et de leurs propriétés), `analytics.ts` (`track()` côté navigateur), `use-hydrated.ts` (faux au rendu serveur et pendant l'hydratation, pour ce qui dépend du mouvement réduit).
- `src/lib/extraction/` : `schema.ts` (schéma Zod de la lecture, source unique), `tool-schema.ts` (schéma d'outil strict dérivé), `progress.ts` (lecture progressive du flux, arrêt anticipé), `normalize.ts`.
- `src/lib/analysis/` : protocole du flux (`events.ts`), types du résultat (`result.ts`), mise en mots du résultat (`result-view.ts`), constats placés sur la feuille (`sheet.ts`), part publique d'une analyse partagée (`share.ts`), messages, client navigateur, état de l'analyse en direct (`live-state.ts`), règles d'ajout des pages.
- `src/lib/eval/` : comparaison d'une lecture avec sa vérité terrain, et des constats avec les erreurs volontaires (`known-issues.ts`).
- `src/lib/checks/` : une fonction par règle déterministe (calculs, TVA, mentions, acompte, vente à domicile, lignes vagues), `overcharge.ts` (trop-payé recalculé), `index.ts` (`runChecks`). Chaque règle a au moins un test qui passe et un qui échoue (`rules.test.ts`, `calculations.test.ts`) ; `index.test.ts` vérifie que le jeu de test donne exactement ses erreurs volontaires.
- `src/lib/pricing/` : `stats.ts` (médiane, quartiles), `opinions.ts` (unité de comparaison, avis base Loupe ou IA).
- `src/config/` : `site.ts`, `taxonomy.ts` (catégories, unités, prestations comparables), `llm.ts` (réglages et tarifs du modèle), `limits.ts` (envoi, quota, conservation, budget de temps), `departments.ts`, `regions.ts`, `rules.ts` (mentions, taux de TVA, rétractation : `// TODO: vérifier`, `verified: false`), `checks.ts` (tolérances, seuils, mots vagues), `pricing.ts`, `verdict.ts`, `analytics.ts` (PostHog, conservation des événements : `// TODO: vérifier`), `og.ts` (couleurs de l'image de partage, gardées en phase avec les tokens), `legal.ts` (éditeur, hébergeur, prestataires des pages légales : `// TODO: vérifier`).
- `src/fixtures/` : données fictives. `demo-quotes.ts` : trois devis de démo (le chauffe-eau du téléphone en tête) ; `demo-quotes.test.ts` garantit leur honnêteté. `quotes/` : les devis PDF du jeu de test (`definitions.ts` en est la source, `definitions.test.ts` garde leurs erreurs volontaires). `sample-extraction.ts` : une lecture type pour les tests.
- `src/test/` : outils de test : faux serveur Claude (`fake-anthropic.ts`, le vrai SDK sur des flux SSE ou des réponses JSON écrits à la main), base Postgres en mémoire (`test-db.ts`, PGlite + migrations du projet), lecture propre à modifier (`extraction.ts`), remplaçant de `server-only`.
- `scripts/` : générateur des PDF, évaluation, migrations au déploiement (`migrate.ts`), lancés par `tsx`. `drizzle/` : migrations SQL générées. `assets/fonts/` : polices TTF de l'image de partage (licence OFL jointe).

## Conventions de code

- Composants en `PascalCase.tsx`, le reste en `kebab-case.ts`. Imports via l'alias `@/`.
- Couleurs uniquement via les tokens (`bg-paper`, `text-ink`, `text-pen-red-strong`…). Aucune couleur en dur dans un composant.
- Durées, courbes et springs uniquement via `src/lib/motion.ts`. Aucune valeur d'animation en dur dans un composant.
- Les montants s'affichent en Geist Mono, chiffres tabulaires, alignés à droite, formatés par `src/lib/format.ts` (fr-FR, espace insécable, vrai signe moins).
- Chaque annotation visuelle a un équivalent texte pour les lecteurs d'écran.
- Mouvement réduit : ne jamais rendre un DOM différent selon `reduced` (le serveur ne connaît pas la préférence : erreur d'hydratation). Seules les transitions et les cibles d'animation changent ; pour masquer un élément, la variante CSS `motion-reduce:`.
- Composants animés « activables » : prop `active` (vrai par défaut). Tout ce qui est connu est posé dès le départ, invisible, puis s'anime quand son étape arrive : la mise en page ne bouge pas (pas de CLS).
- Typographie française : `fr()` (`src/lib/typography.ts`) sur les textes avec « ? ! : ; % € » ou des guillemets, `&nbsp;` dans le JSX (« 30&nbsp;secondes »).
- Durées en CSS : seulement via des variables miroir de `motion.ts` (ex. `--duration-micro`) ou passées en style depuis motion.ts (`--scan-d`, `cssEase`), vérifiées par `tokens.test.ts`.
- Texte vert : toujours `text-brand-strong`. Le vert vif (`bg-brand`) est un aplat qui porte l'encre (`text-ink`), jamais du blanc ni du texte vert vif (testé). Bouton principal (`Button` `primary`) : à l'encre comme la tuile du logo, texte blanc, pictogramme vert (`[&>svg]:stroke-brand`) ; décision de l'utilisateur. Une carte : `bg-paper-raised`, `rounded-lg`, `elevation-1` ou un filet `border-rule`.
- Formulaires : Server Action + `useActionState`, validation Zod côté serveur, messages reliés au champ (`aria-describedby`, `aria-live`). Exception : l'envoi d'un devis passe par `fetch` vers `POST /api/analyze` (fichiers lourds et réponse streamée).
- Code serveur : `import "server-only"` en tête ; Vitest le remplace par un module vide, `npm run eval:extraction` passe `--conditions=react-server`. `src/server/db/schema.ts` n'a ni `server-only` ni alias `@/` (drizzle-kit le charge hors de Next.js).
- Tests : pas de réseau. Appels au modèle testés contre `src/test/fake-anthropic.ts`, requêtes SQL contre PGlite (`src/test/test-db.ts`).

## Direction artistique : « l'expert rassurant » (refonte claire)

Clair et épuré, inspiré de Doctolib et d'Apple : beaucoup de blanc, une seule couleur de marque, l'application montrée dans un téléphone. Le correcteur reste, en interface propre : ligne surlignée, pastille « Erreur de calcul », montant faux barré et bon montant à côté.

| Token | Valeur | Usage |
| --- | --- | --- |
| `--paper` / `--paper-raised` | `#FFFFFF` | la page, une carte |
| `--mist` | `#F3F6F4` | fond de section, panneau d'illustration |
| `--ink` | `#0E1B16` | texte |
| `--ink-muted` | `#56645E` | texte secondaire |
| `--brand` | `#17C26B` | coches, étapes cochées, barres ; pictogramme des boutons principaux (sur l'encre, comme la coche du logo) |
| `--brand-strong` | `#0A7A45` | texte vert : l'économie, les surtitres |
| `--brand-soft` | `#E6F8EE` | fond vert pâle (pastille, socle du téléphone) |
| `--pen-red` / `--pen-red-strong` / `--error-soft` | `#D92D20` / `#B42318` / `#FDECEA` | erreurs vérifiées : trait, petit texte, fond de pastille |
| `--stamp-orange` / `--stamp-orange-strong` / `--warning-soft` | `#C2410C` / `#9A3412` / `#FFF4E5` | points d'attention, « À négocier » |
| `--annotation-blue` | `#2454D6` | focus |
| `--highlighter` / `--highlighter-mark` | `#FFE45C` / `#FFF2B3` | surlignage, sélection |
| `--verdict-ok / negotiate / alert` | `#0A7A45`, `#C2410C`, `#D92D20` | verdict |

`src/app/tokens.test.ts` vérifie valeurs et contrastes (encre ≥ 7:1 ; petit texte ≥ 4,5:1 sur blanc, sur `mist` et sur sa pastille ; encre sur vert vif ≥ 4,5:1 ; traits ≥ 3:1), l'absence de dégradé et de grain, les rayons ≤ 10 px, les couleurs de l'icône et de l'image de partage, et qu'aucun texte n'est en vert vif.

Matière : pas de grain, pas de dégradé ; ombres douces (`elevation-1` pour une carte, `elevation-2` pour le téléphone) ; rayons `rounded-sm` 6 px (pastilles), `rounded-md` 8 px (boutons, champs), `rounded-lg` 10 px (cartes) ; seul le téléphone, un objet réel, a des coins plus ronds.

Typographie (`next/font/google`) : titres en **Instrument Serif** (`text-hero`, `text-section`, `text-title`), un mot en italique vert foncé dans le titre du héros ; interface en **Geist** ; montants et lignes de devis en **Geist Mono**. Plus de police manuscrite.

Composants de l'identité : `Logo`/`LogoMark`, `Button`, `Tag` (pastilles), `VerdictBadge`, `PriceDelta`, la carte du devis (`CorrectionScene` et `src/components/quote/`), le téléphone (`PhoneDemo`, `PhoneParts`). Tous sur `/dev/design`.

**Interdits :** dégradés (de toute sorte), glow, glassmorphism, grandes pilules, fonds noirs néon ; composants shadcn non retouchés ; Inter partout ; illustrations 3D de banque d'images ; emojis utilisés comme icônes ; copier l'identité visuelle d'une app existante (Yuka compris : notre vert est le nôtre).

## Motion design

Le mouvement raconte la correction dans l'ordre où un humain la ferait. Il sert la lecture et ne la bloque jamais.

- N'animer que `transform` et `opacity`, plus `pathLength` pour les SVG. Objectif 60 fps sur un Android milieu de gamme. (L'ombre qui se resserre = fondu entre deux calques d'ombre, pas d'animation de `box-shadow`.)
- Chorégraphie du devis : arrivée de la carte (spring `gentle`) ; lecture (barre verte qui court pendant l'étape `reading` réelle, lignes une par une, 40 à 60 ms d'écart) ; vérifications (pour chaque constat : ligne surlignée scaleX 0 → 1 depuis la gauche en 280 ms, puis pastille et rature du montant faux, puis bon montant en fondu avec léger décalage) ; prix (compteur ≤ 600 ms) ; verdict (pastille scale 0,9 → 1 et opacity 0 → 1, spring `stamp`) ; message de négociation affiché d'un bloc en quelques centaines de ms, bouton « Copier » avec retour net.
- `prefers-reduced-motion` : tout devient des fondus de 150 ms, ou l'état final statique (le téléphone de l'accueil reste sur le résultat). Pas de secousse, pas de balayage.
- Accueil : le téléphone boucle photo → analyse → résultat (`phoneDemo`), en fondus et petits déplacements, seulement à l'écran ; « Comment ça marche » est immobile.
- Micro-interactions 150 à 250 ms ; chaque séquence ≤ 1,2 s par bloc. Un tap passe l'animation et affiche tout (bouton « Tout afficher » pour le clavier).
- Durées, courbes et springs nommés `gentle`, `snappy`, `stamp` : tout dans `src/lib/motion.ts`.
- Les états de chargement reflètent les vraies étapes du serveur (`received`, `reading`, `checking`, `pricing`, `verdict`), jamais un minuteur factice.

## Pipeline d'analyse (résumé)

`POST /api/analyze` streame les étapes réelles : `received` → `reading` → `checking` → `pricing` → `verdict`.

1. Entrée : 1 à 4 photos ou un PDF, 10 Mo max (4 Mo en pratique : plafond de Vercel). Compression côté client. Sur mobile, `capture="environment"`.
2. Extraction (modèle vision) : `documentKind` (devis, facture, autre), `category`, `readability` (good, partial, poor), `subject` (objet sans donnée personnelle), `issuer` (booléens uniquement : les six du brief plus `hasClientIdentity` et `hasPaymentTerms`), `meta` (date, validité en jours ou en date, acompte en % et en euros, délai en jours, département = 2 premiers chiffres du code postal du chantier, 3 en outre-mer, `isDoorToDoorSale`), `lines[]` (`label`, `quantity`, `unit`, `unitPriceHT`, `totalHT`, `vatRate` en pourcentage, `canonicalItem`, `confidence`), `totals`, `confidence` par champ (`high`, `medium`, `low`). `canonicalItem` vient de la taxonomie `src/config/taxonomy.ts` (ex. `plomberie.chauffe-eau.remplacement.200l`). Les montants sont recopiés tels qu'imprimés, même faux. Refus sans analyse ni stockage : devis de santé, document qui n'est pas un devis (une facture comprise : seuls les devis sont analysés, `earlyStop`), photo illisible (avec un conseil).
3. Vérifications déterministes en TypeScript pur (`src/lib/checks/`), jamais confiées au LLM : calculs (avec tolérance d'arrondi), TVA plausible, mentions obligatoires (`src/config/rules.ts`, forme `{ id, severity, message, legalRef, verified }`), acompte élevé (avertissement, jamais le mot « illégal »), vente à domicile (rappel du délai de rétractation), lignes vagues.
4. Prix : médiane et écart si au moins `MIN_COMPARABLES` (défaut 5) lignes comparables (même item, région proche, moins de 24 mois), sinon fourchette demandée au LLM étiquetée « estimation IA, confiance faible ». Médianes et écarts calculés en TypeScript, jamais par le LLM.
5. Verdict : `ok` (vert, « Correct »), `negotiate` (orange, « À négocier »), `alert` (rouge, « À vérifier sérieusement ») ; fourchette d'économie potentielle ; trois points clés maximum.
6. Message de négociation : poli, factuel, sans accusation, fondé uniquement sur les points vérifiés ; versions email et SMS.
7. Stockage : `analysis` (id, catégorie, département, verdict, résultats des vérifications, dates) et `price_lines` anonymisées. Rien d'autre.
8. Garde-fous : 5 analyses par jour et par IP, timeout sur chaque appel, coût LLM journalisé par analyse.

## Pages

`/` accueil (titre, téléphone animé, « Scanner mon devis », comment ça marche, engagements, FAQ, email) ; `/analyse` (dépôt, aperçu, consentement RGPD explicite) ; `/analyse/[id]` (devis vérifié, résumé avec l'économie, « Erreurs vérifiées », « Avis sur les prix », message de négociation, partage, « Rapport détaillé — 4,90 € ») ; `/v/[shareId]` (partage public sans rien de personnel, image OG `next/og`) ; `/confidentialite`, `/mentions-legales` ; `/admin` (mot de passe en variable d'environnement : analyses par jour, conversion par étape, catégories, coût LLM moyen).

Mesure (PostHog) : `landing_view`, `upload_started`, `upload_completed`, `analysis_completed`, `analysis_failed` (avec l'étape), `negotiation_copied`, `share_clicked`, `share_page_view`, `detailed_report_clicked`, `email_submitted`. Le bouton « Rapport détaillé — 4,90 € » n'encaisse rien en V1 : il affiche « Bientôt disponible : laissez votre email pour l'avoir en premier ».

## Étapes

1. Fondations et identité : projet, CLAUDE.md, tokens, polices, `src/lib/motion.ts`, six composants signature animés sur `/dev/design`. L'utilisateur valide le style avant la suite.
2. Landing avec la démo animée (données dans `src/fixtures/`). Fait : l'inscription email valide (Zod) mais n'enregistre rien avant la base de l'étape 3 (`src/server/signups.ts`).
3. Extraction : route streamée, schémas Zod, appel LLM, refus santé, rate limit ; 5 devis PDF fictifs (pdf-lib), dont 2 avec erreurs connues, et leur vérité terrain JSON ; `npm run eval:extraction` (précision champ par champ). Fait : `/analyse` dépose le devis et montre la lecture en direct (étapes `received` et `reading` ; contrôles, prix et verdict annoncés « bientôt »). En base : `rate_limits` (HMAC du jour et de l'IP, jamais l'IP) et `signups`.
4. Vérifications et prix : règles déterministes (au moins un test qui passe et un qui échoue par règle), taxonomie, médianes, verdict. Fait : flux complet jusqu'au verdict, enregistrement (`analyses`, `price_lines`), résultat affiché sur `/analyse` (tampon, économie, points clés, erreurs vérifiées, à confirmer, avis sur les prix avec source et confiance, points d'attention, rappels). La page `/analyse/[id]` et la feuille annotée arrivent à l'étape 5.
5. Écran de résultat : chorégraphie complète, version reduced-motion, message de négociation. Fait : feuille annotée en direct et au rythme du serveur, conclusion, message email/SMS, `/analyse/[id]` (rejeu, expiration). Partage public, mesure et rapport détaillé : étape 6.
6. Partage et mesure : page publique, image OG, événements, bouton rapport détaillé, `/admin`. Fait : tout, plus l'image de partage du site ; événements dans Postgres et PostHog.
7. Durcissement : pages légales, erreurs (photo floue + conseil), accessibilité (contrastes, focus visibles, équivalent texte des annotations), Lighthouse mobile ≥ 90, déploiement Vercel. Fait : tout, sauf le déploiement lui-même, qui demande le compte Vercel de l'utilisateur (guide dans le README) ; pages légales à compléter (`src/config/legal.ts`).
8. Effets « waouh » de la landing (demande de l'utilisateur après la V1) : euros qui tombent du devis dans le compteur d'économie, message qui s'écrit, feuille lancée et tampon renforcé, « Comment ça marche » au défilement, carrousel des métiers, mini-preuves des vérifications. Fait : tout, avec mouvement réduit et performance inchangée.
9. Refonte de la direction artistique (brief M1 à M7) : bureau sombre et feuilles crème, hero en une seule séquence, « Comment ça marche » en un seul objet qui évolue, coches au stylo, cercle du logo en motif, matière. Fait : tout ; la boucle de démos et la chute de pièces de l'étape 8 ont été retirées (décision validée).
10. Mise en page (retour de l'utilisateur : « trop de vide ») : chaque section du bas devient un objet en papier posé sur le bureau. « Ce qu'on vérifie » en zig-zag (fiches agrandies, `zoom` 1,3 sur grand écran, numéros), « Ce qu'on s'interdit » en règlement imprimé (articles barrés au stylo rouge), FAQ sur une copie double à grands carreaux (`seyes-paper`, marge rouge), inscription sur un coupon à découper ; « Comment ça marche » plus grand (feuille à 18,5 px, numéros d'étape), espacements resserrés, plus de filets entre les sections.
11. Refonte claire (l'utilisateur : « une vraie refonte, un autre type de design ») : identité blanche et verte, vouvoiement, téléphone animé, nouveau logo. Étape 1 faite : identité et accueil ; retour de l'utilisateur : téléphone sans latence au démarrage, logo B. Étape 2 faite : tout le reste du site (devis lu en interface propre, page d'analyse en deux colonnes avec l'économie en premier, partage, pages légales, erreurs, admin, planche de style), vouvoiement partout, plus d'écriture manuscrite.
12. Retours après la refonte claire : boutons principaux à l'encre comme le logo (icône verte) ; envoi et inscription réparés dans Codespaces (hôte public accepté en développement) ; « Revenir à l'accueil » de la page d'erreur ; zone de dépôt cliquable ; factures refusées comme tout document qui n'est pas un devis.
