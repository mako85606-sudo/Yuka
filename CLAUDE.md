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
- Toute l'interface est en français, au tutoiement. Ton direct et rassurant, un peu d'humour sec, jamais moqueur envers les artisans.

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
- Constat (`Finding`, `src/lib/analysis/result.ts`) : `kind` `error` (calcul faux, mention absente), `warning` (ligne vague, acompte élevé, TVA inhabituelle), `reminder` (rétractation) ; `confirmed` faux si les chiffres en cause sont lus en confiance `low` (affiché « à confirmer sur ton devis », jamais une erreur sûre, jamais une alerte) ; `legalRef` affichée seulement si `ruleVerified`.
- Prix : une ligne mal lue, vague, remise ou de moins de 20 € n'a pas d'avis. Base Loupe : `price_lines` `comparable` de la même prestation, même unité de comparaison, même région (`src/config/regions.ts`), moins de 24 mois, autre empreinte ; médiane et quartiles en TS dès 5 comparables. Sinon fourchette du modèle (`src/server/pricing/estimate-prices.ts`, outil strict `estimer_prix`, non streamé, une relance) : il ne voit jamais les prix du devis ; 12 lignes au plus, les plus chères ; délai = reste du budget de la requête (`limits.analysisBudgetMs`). Écart d'une estimation IA compté seulement hors fourchette.
- Verdict (`src/lib/verdict.ts`, seuils `src/config/verdict.ts`) : `alert` si les erreurs de calcul coûtent ≥ 20 €, si le nom ou le SIRET manque (constat sûr), ou si un prix dépasse la médiane Loupe de 60 % ; `negotiate` pour tout autre constat (hors rappel), un prix à +15 % de la médiane, ou au-dessus d'une fourchette IA ; sinon `ok` (sans économie annoncée). Une estimation IA ne mène jamais à `alert`. Économie : trop-payé recalculé + écarts au-dessus du 3e quartile (bas) ou de la médiane et des fourchettes IA (haut).
- Enregistrement (`src/server/analysis/store.ts`) : `analyses` (id aléatoire 128 bits, catégorie, département, région, verdict, `result` = l'extraction sans ses lignes + constats + avis + verdict, coût) et `price_lines` (libellés repassés par `anonymizeText`). Empreinte des prix (`quoteFingerprint`) : un même devis analysé deux fois ne compte qu'une fois dans les médianes. Analyses effacées après 30 jours, lignes après 24 mois (détachées entre-temps) par `after()` dans la route. Sans base : résultat affiché, pas de lien. Visiteur parti avant la fin : rien n'est enregistré.
- Journal : `[analyse] verdict … · constats · avis (base, IA) · enregistrée · coût total` en plus de la ligne de lecture.

Écran de résultat (étape 5) :
- Une seule scène pour la démo et l'analyse réelle : `CorrectionScene` prend un `CorrectionQuote` (valeurs absentes permises ; `SceneQuote` en est la version complète des démos). `src/lib/analysis/sheet.ts` y range les constats : sur une ligne (surligneur, cercle, note de marge), sur un total (même geste sur le montant), sur le devis entier (« Remarques du correcteur » au pied de la feuille, étiquetées Manque / Attention / À vérifier / Rappel). Un constat à confirmer est surligné et annoté (« À vérifier : … »), jamais entouré de rouge.
- Rythme : `usePacedPhase` (`src/components/scene/use-paced-phase.ts`) fait suivre à la feuille l'étape réelle du serveur, sans jamais la devancer, un bloc à la fois (`blockDuration`, `src/lib/demo-script.ts`) : si le serveur va plus vite, chaque bloc a le temps de se jouer. En direct, les lignes apparaissent au moment où elles sont lues. Une analyse rouverte se rejoue en entier. Le suivi d'étapes, lui, montre l'étape du serveur.
- « Tout afficher » (au-dessus de la feuille) et un tap sur la feuille passent l'animation (`MotionPreferences skip`). Le verdict prend le focus quand la correction est affichée, sans faire défiler.
- Conclusion (`AnalysisResult`) : verdict en clair, économie, points clés, « Préparer mon message », puis Erreurs vérifiées, À confirmer, Avis sur les prix, Points d'attention, Bon à savoir, Message à envoyer.
- Message (`src/lib/negotiation.ts`, `NegotiationMessage`) : email (objet + corps) et SMS (3 points au plus, sans espace insécable), vouvoiement, questions et propositions, jamais d'accusation. Fondé seulement sur les constats sûrs et sur les prix de la base Loupe à +15 % de la médiane ; jamais une estimation IA ni un chiffre à confirmer ; pas de message sans point vérifié. Texte modifiable, « Copier » répond « Copié » 2 s (`holds.copied`).
- Adresse : à la fin d'une analyse enregistrée, `/analyse` devient `/analyse/[id]` (`history.replaceState`, sans recharger). `/analyse/[id]` est rendue à chaque visite (`connection()`), `loadAnalysis` revalide le contenu et refuse une analyse expirée ; sinon `not-found.tsx`. `robots: noindex` et `referrer: no-referrer` sur `/analyse` et `/analyse/[id]`.
- Hasard visuel arrondi (gouttes d'encre, inclinaison du tampon) : Motion arrondit les styles au rendu serveur, des décimales en trop provoquaient une erreur d'hydratation.

Partage et mesure (étape 6) :
- Partage : `analyses.share_id`, créé à la demande (`createShareLink`, `ensureShareId`), distinct de l'identifiant privé : le lien public n'ouvre jamais l'analyse privée, et inversement. `/v/[shareId]` (rendue à chaque visite, `noindex`) passe par `shareableAnalysis` : région au lieu du département, aucune date ni validité ni délai, ni rappel personnel (rétractation), ni message, ni identifiant privé. Expire avec l'analyse. Sur téléphone, `navigator.share` ; sinon le lien est copié.
- Image de partage : `next/og`, polices TTF locales (`assets/fonts`, Instrument Serif, Geist, Geist Mono), couleurs `src/config/og.ts`. `SITE_URL` (facultative) fixe `metadataBase`.
- Mesure : liste fermée de dix événements (`src/lib/events.ts`, propriétés validées par Zod, codes sans texte libre). `track()` envoie à `/api/events` (`sendBeacon`), sans cookie ni stockage : la visite est un UUID en mémoire (une navigation interne la garde, un rechargement en ouvre une autre). La route vérifie l'origine, la taille (1 Ko) et le schéma, répond 204, puis enregistre dans `events` (Postgres) et relaie à PostHog (`posthog-node`, EU, `disableGeoip`, `$process_person_profile: false`). Purge à 13 mois après chaque analyse.
- `/admin` : `ADMIN_PASSWORD` (16 caractères au moins, sinon fermé), cookie de session HMAC (12 h, `httpOnly`, `sameSite: strict`, chemin `/admin`), 10 essais par jour et par IP (compteur `rate_limits`, clé préfixée), une seconde d'attente après un échec. Statistiques sur 30 jours (`src/server/admin/stats.ts`).
- « Rapport détaillé — 4,90 € » n'encaisse rien : il ouvre « Bientôt disponible, laisse ton email pour l'avoir en premier » (inscription `detailed_report`).

Durcissement (étape 7) :
- Pages légales : `/mentions-legales` et `/confidentialite` (`LegalPage`), nourries par `src/config/legal.ts` : éditeur, hébergeur, prestataires et contact restent `null` (affichés « à compléter » en rouge) tant qu'ils ne sont pas renseignés, jamais inventés (`// TODO: vérifier`). Durées de conservation tirées de la configuration. Liens dans le pied de page et dans le détail du consentement.
- Effacement : « Effacer cette analyse » (`DeleteAnalysis`, Server Action `deleteAnalysisNow`, `deleteAnalysis` dans `store.ts`) supprime l'analyse et son lien de partage ; ses lignes anonymes restent, détachées.
- Photo floue : netteté mesurée dans le navigateur (`src/lib/image-sharpness.ts`, variance du laplacien par zone, 90e centile, à 800 px), seuil `limits.blurThreshold` (`// TODO: vérifier`). Une page floue porte « Floue ? » et un conseil ; le premier envoi demande confirmation, le second part. Rien n'est bloqué.
- Pages d'erreur : `not-found.tsx`, `error.tsx` (`retry`), `global-error.tsx` (son propre `<html>`).
- Performance : Zod hors du paquet navigateur (`src/lib/signup-form.ts` sans Zod pour le formulaire), seule Instrument Serif préchargée. Lighthouse mobile : performance ≥ 90, accessibilité 100, bonnes pratiques 100, SEO 100 sur les pages publiques (les pages `noindex` perdent ce seul point, voulu).
- Déploiement : `vercel.json` (fonctions à Francfort, `fra1`, près d'une base Neon ou Supabase à Francfort) ; Vercel lance `npm run vercel-build` (`scripts/migrate.ts` puis `next build`) : migrations appliquées à `DATABASE_URL` avant chaque build, rien sans base. `robots.ts` (ferme `/admin`, `/api/`, `/dev/`) et `sitemap.ts` (pages publiques), adresse par `siteOrigin()` (`SITE_URL`, sinon `VERCEL_PROJECT_PRODUCTION_URL`). En-têtes de sécurité dans `next.config.ts` (CSP sans nonce et sans ressource tierce, `frame-ancestors 'none'`, `nosniff`, HSTS ; caméra non coupée). Envoi plafonné à 4 Mo (le brief dit 10 Mo, mais Vercel refuse plus de 4,5 Mo : `HOSTING_BODY_LIMIT_BYTES`, `// TODO: vérifier`). Guide pas à pas dans le README.

Effets de la landing (étape 8) :
- Ordre : héros (feuille corrigée) → « Comment ça marche » → carrousel des métiers → « Ce qu'on vérifie » → confiance → FAQ → inscription. `main` a `overflow-x-clip` : une feuille ou une goutte d'encre n'élargit jamais la page.
- La boucle de trois démos (`DemoLoop`), la chute de pièces (`SavingsDrop`) et le tampon renforcé ont été retirés par la refonte DA (voir plus bas).
- Honnêteté des exemples : `src/lib/demo-outcome.ts` (`demoVerdict`, `demoSavings`, `describeOutcome`) applique les règles réelles du verdict et de l'économie (haut de fourchette) ; `demo-quotes.test.ts` garde démos et cartes (erreurs réelles, verdict conforme, message fondé sur les erreurs vérifiées). Les démos ont été ajustées pour que leur tampon soit celui que Loupe rendrait.
- Carrousel (`TradeCarousel`, `TradeCard`, données `src/fixtures/trade-quotes.ts`) : six métiers, défilement natif aimanté, flèches, une carte se corrige quand elle est visible à 60 % dans un carrousel à l'écran. Textes pour lecteurs d'écran dans chaque `li` (`relative`, sinon le texte masqué déborde).
- « Ce qu'on vérifie » : calcul barré puis corrigé au-dessus, coches tracées une à une puis mention absente entourée, jauge de prix (zone habituelle, médiane, le devis glisse à sa place).
- Performance : carrousel monté à l'approche (`LAZY_MOUNT_MARGIN`). Lighthouse mobile mesuré en alternance avec la version d'avant, mêmes conditions : médiane identique (89 contre 89,5 dans ce conteneur, scores de 88 à 98 selon les passages) ; accessibilité, bonnes pratiques et SEO à 100. `experimental.inlineCss` essayé : aucun gain mesurable, non retenu.

Refonte DA (après l'étape 8, brief de l'utilisateur M1 à M7) :
- Une seule identité, le bureau sombre : plus de thème clair ni de `data-theme`. `:root` porte les encres du bureau (`--paper` #221E19 = le bureau, encres claires, un seul rouge clair #F0806C, AA) ; `.surface-paper` (couche `components`) redéclare les encres d'une feuille crème (#F2ECDD : encre #2B2119, rouge correcteur #D63A2B, `-strong` pour le petit texte, orange de tampon, bleu de marge, `--paper` = creux de la feuille) et ses tokens calculés (`--rule`, `--margin-rule`, `--grain`). Tout ce qui est une feuille (devis, cartes, champs, résultat) porte `surface-paper` ; sur le bureau, le bouton principal est `bg-ink text-paper`. Plus de vert : « Correct » à l'encre, coches au stylo rouge, avis sous la médiane à l'encre neutre. Surligneur en `mix-blend-multiply` (pas d'`isolate` entre lui et le papier). `tokens.test.ts` vérifie les deux surfaces.
- Hero (`HeroSheet`, `src/lib/hero-sheet.ts`, M7 option B : devis de chauffe-eau, « 1 527 € » = son total TTC) : feuille crème de 40 em, posée à 2,5°, qui déborde du bord droit et glisse sous la section suivante (`relative z-10 bg-paper`). Une séquence d'environ 3,5 s jouée en CSS (`heroSchedule`) : lignes tapées (cache papier par crans, `steps()`), boucle au stylo à largeur variable autour de 275,00, « 260 » à la main, note de marge, tampon « À NÉGOCIER » dans le « Visa du correcteur » (1,3 → 1, −6°, `InkStamp`, filtre feTurbulence). Lignes à hauteur fixe, annotations dans la marge : pas de CLS. Petit écran : lignes imprimées, correction lancée quand la ligne est à l'écran (`data-hold`, IntersectionObserver ; sans JS, elle joue). Choisir une ligne y fait passer le stylo (`heroMark` : calcul entouré et corrigé, ligne vague surlignée, prix souligné en bleu avec sa source, coche sinon).
- Gestes CSS (`.gesture` + `gesture-draw|type|wipe|sweep|fade|slam|slide|scan`, globals.css) : départ, durée et courbe en variables (`cssGesture`, motion.ts) ; aucune durée en dur dans le CSS (testé). Le style de repos est l'état final (fill `backwards`) : en mouvement réduit, sans JS ou une fois joué, tout est à sa place, et une police chargée en cours de route ne fige pas un pourcentage faux.
- Trait de stylo à largeur variable (`inkStroke`, `InkStroke`) : contour rempli dévoilé par un masque qui parcourt la ligne médiane (pathLength 1). Même stylo pour le hero, « Comment ça marche », `RedCircle` (Motion), les coches (`PenTick`, `penTick`) et les cadres au crayon (`pencilBox`). Gestes partagés : `SheetMarks.tsx`.
- « Comment ça marche » (`HowItWorks`, `storySchedule`) : étapes à gauche, une seule feuille collée au centre de l'écran à droite (en haut sur mobile) : photo en perspective dans le viseur (vrai texte, ligne de scan, étiquette sur ruban adhésif `--tape`), cadres au crayon ligne à ligne, stylo rouge (105, note, avis de prix, tampon), feuillet quadrillé (`graph-paper`) où le message s'écrit. Étape en cours : IntersectionObserver sur la ligne de lecture (centre de l'écran, 66 % sur mobile) ; l'étape lue s'éclaire au défilement avec `animation-timeline: view()`, sinon `data-current` ; les autres restent à 76 % (contraste AA, testé).
- Le cercle du logo devient un motif (`PenRing`, `penRing`, `ringVariant`) : quatre variantes, formes `word` et `wide`. Logo, lien de la page en cours (`SiteFooter current`, `LegalPage path`), survol et focus des liens de l'en-tête et des boutons secondaires (`.group` + `ring-hover`), mots clés entourés au défilement (`Ringed`, `ring-view`).
- Matière : grain global ≤ 4 %, ombres de papier courtes, pas de dégradé (faisceau de scan à plat), pas de pilule (angles droits), titres de section (`text-section`) plus grands que ceux des étapes.
- Police manuscrite : La Belle Aurore (é è ê à ç œ € vérifiés dans le fichier, OFL). Avis de prix : vraie valeur dès le rendu serveur.
- Lighthouse mobile, en alternance avec la version d'avant : performance médiane 93 contre 90, accessibilité, bonnes pratiques et SEO à 100. CLS 0,006 : le paragraphe du hero se recompose quand Geist arrive (seuil « bon » : 0,1).

Lancement sans installation (après l'étape 8) : GitHub Codespaces (`.devcontainer/devcontainer.json`, image Node 24 : `git pull`, `npm install`, `npm run dev` à chaque ouverture, port 3000 ouvert dans le navigateur). L'hôte public du codespace (`codespaceHost()`, d'après `CODESPACE_NAME` et `GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN`) est accepté par `isSameOrigin`, `allowedDevOrigins` et `serverActions.allowedOrigins` ; ces variables n'existent pas en production. Sous Windows, `lancer-loupe.bat` (CRLF) fait la même chose sur un clone Git local.

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
- `src/components/signature/` : les composants signature (les six du brief, plus `InkStroke`, `HandText`, `InkStamp`, `PenRing`).
- `src/components/quote/` : le devis reconstruit (en-tête avec « cadre réservé au correcteur » et son remplaçant pendant la lecture, lignes, totaux annotables, remarques du correcteur, lignes fantômes). Ils acceptent des valeurs absentes (`PrintedLine`, `PrintedTotals` : `null` = non lu, affiché « — »).
- `src/components/scene/` : `CorrectionScene` (la correction complète pilotée par l'étape affichée, démo ou réelle, `live` pour la lecture en direct), `use-paced-phase.ts` (étape affichée au rythme du serveur), `ScriptedScene` (démo fictive de la planche de style).
- `src/components/analyze/` : la page `/analyse` : `AnalyzeFlow` (parcours), `PagePicker` + `use-pages` (photos compressées, PDF), `StepTracker` (étapes réelles), `AnalysisView` (feuille corrigée au rythme du serveur, « Tout afficher », puis conclusion ; mode partage avec `place`), `AnalysisResult` (verdict, économie, points clés, « Erreurs vérifiées » séparées des « Avis sur les prix », message, « Et maintenant ? »), `NegotiationMessage` (email et SMS, copie), `ShareLink` (lien public), `DetailedReport` (« Rapport détaillé — 4,90 € »), `DeleteAnalysis` (effacer l'analyse), `AnalysisOutcome` (refus, erreurs).
- `src/components/legal/LegalPage.tsx` : gabarit des pages légales (`Filled` : « à compléter » pour une valeur absente).
- `src/components/share/` : `SharedConclusion` (verdict public et invitation). `src/components/admin/` : connexion et tableau de bord. `src/components/analytics/TrackView.tsx` : événement de vue d'une page.
- `src/components/landing/` : sections de la landing (en-tête, illustrations, FAQ, inscription, CTA collant mobile, pied de page), `HeroSheet` (la feuille du hero), `SheetMarks` (gestes du correcteur partagés), `HowItWorks` (« Comment ça marche » au défilement), `TradeCarousel` et `TradeCard` (carrousel des métiers), `Ringed` (mot clé entouré).
- `src/app/actions/` : Server Actions (`"use server"`). `src/server/` : code serveur uniquement (`import "server-only"`) : `env.ts` (variables validées par Zod), `anthropic.ts` (client), `extraction/` (consignes et appel au modèle), `analysis/` (envoi, origine, flux NDJSON, enregistrement `store.ts`), `pricing/` (comparables en base, estimation IA, orchestration `price-quote.ts`), `db/` (schéma Drizzle, client postgres.js), `rate-limit.ts`, `signups.ts`, `events/` (enregistrement Postgres et PostHog), `admin/` (session, statistiques), `og/` (image de partage).
- `src/components/motion/` : préférences de mouvement (mouvement réduit, saut d'animation).
- `src/components/ui/` : éléments d'interface maison (pas de shadcn brut) ; `icons.tsx` (pictogrammes au trait).
- `src/lib/` : code pur et testé : `motion.ts` (durées, courbes, springs), `choreography.ts` (ordre des gestes dans chaque bloc), `phases.ts` (étapes serveur), `hand-drawn.ts` et `seeded-random.ts` (tracés à la main), `format.ts`, `price-wording.ts`, `color.ts`, `demo-script.ts`, `typography.ts`, `anonymize.ts` (filet anti-données personnelles), `department.ts`, `client-ip.ts`, `llm-cost.ts`, `image-compression.ts`, `image-sharpness.ts` (photo floue), `signup.ts` et `signup-form.ts` (inscription : schéma Zod côté serveur, constantes sans Zod côté navigateur), `verdict.ts` (verdict, économie, points clés), `hero-sheet.ts` (ce que le stylo écrit sur une ligne de la feuille du hero), `demo-outcome.ts` (verdict et économie des exemples fictifs, mêmes règles), `negotiation.ts` (message email et SMS), `events.ts` (liste fermée des événements et de leurs propriétés), `analytics.ts` (`track()` côté navigateur).
- `src/lib/extraction/` : `schema.ts` (schéma Zod de la lecture, source unique), `tool-schema.ts` (schéma d'outil strict dérivé), `progress.ts` (lecture progressive du flux, arrêt anticipé), `normalize.ts`.
- `src/lib/analysis/` : protocole du flux (`events.ts`), types du résultat (`result.ts`), mise en mots du résultat (`result-view.ts`), constats placés sur la feuille (`sheet.ts`), part publique d'une analyse partagée (`share.ts`), messages, client navigateur, état de l'analyse en direct (`live-state.ts`), règles d'ajout des pages.
- `src/lib/eval/` : comparaison d'une lecture avec sa vérité terrain, et des constats avec les erreurs volontaires (`known-issues.ts`).
- `src/lib/checks/` : une fonction par règle déterministe (calculs, TVA, mentions, acompte, vente à domicile, lignes vagues), `overcharge.ts` (trop-payé recalculé), `index.ts` (`runChecks`). Chaque règle a au moins un test qui passe et un qui échoue (`rules.test.ts`, `calculations.test.ts`) ; `index.test.ts` vérifie que le jeu de test donne exactement ses erreurs volontaires.
- `src/lib/pricing/` : `stats.ts` (médiane, quartiles), `opinions.ts` (unité de comparaison, avis base Loupe ou IA).
- `src/config/` : `site.ts`, `taxonomy.ts` (catégories, unités, prestations comparables), `llm.ts` (réglages et tarifs du modèle), `limits.ts` (envoi, quota, conservation, budget de temps), `departments.ts`, `regions.ts`, `rules.ts` (mentions, taux de TVA, rétractation : `// TODO: vérifier`, `verified: false`), `checks.ts` (tolérances, seuils, mots vagues), `pricing.ts`, `verdict.ts`, `analytics.ts` (PostHog, conservation des événements : `// TODO: vérifier`), `og.ts` (couleurs de l'image de partage : le bureau et les encres de la feuille, gardées en phase avec les tokens), `legal.ts` (éditeur, hébergeur, prestataires des pages légales : `// TODO: vérifier`).
- `src/fixtures/` : données fictives. `demo-quotes.ts` : trois devis de démo, `trade-quotes.ts` : six devis courts du carrousel ; `demo-quotes.test.ts` garantit l'honnêteté des deux. `quotes/` : les devis PDF du jeu de test (`definitions.ts` en est la source, `definitions.test.ts` garde leurs erreurs volontaires). `sample-extraction.ts` : une lecture type pour les tests.
- `src/test/` : outils de test : faux serveur Claude (`fake-anthropic.ts`, le vrai SDK sur des flux SSE ou des réponses JSON écrits à la main), base Postgres en mémoire (`test-db.ts`, PGlite + migrations du projet), lecture propre à modifier (`extraction.ts`), remplaçant de `server-only`.
- `scripts/` : générateur des PDF, évaluation, migrations au déploiement (`migrate.ts`), lancés par `tsx`. `drizzle/` : migrations SQL générées. `assets/fonts/` : polices TTF de l'image de partage (licence OFL jointe).

## Conventions de code

- Composants en `PascalCase.tsx`, le reste en `kebab-case.ts`. Imports via l'alias `@/`.
- Couleurs uniquement via les tokens (`bg-paper`, `text-ink`, `text-pen-red-strong`…). Aucune couleur en dur dans un composant.
- Durées, courbes et springs uniquement via `src/lib/motion.ts`. Aucune valeur d'animation en dur dans un composant.
- Le hasard visuel (tracés « à la main », rotation du tampon) est toujours initialisé par un identifiant stable (`createRandom(id)`) : même rendu à chaque fois.
- Les montants s'affichent en Geist Mono, chiffres tabulaires, alignés à droite, formatés par `src/lib/format.ts` (fr-FR, espace insécable, vrai signe moins).
- Chaque annotation visuelle a un équivalent texte pour les lecteurs d'écran.
- Mouvement réduit : ne jamais rendre un DOM différent selon `reduced` (le serveur ne connaît pas la préférence : erreur d'hydratation). Seules les transitions et les cibles d'animation changent ; pour masquer un élément, la variante CSS `motion-reduce:`.
- Composants animés « activables » : prop `active` (vrai par défaut). Tout ce qui est connu est posé dès le départ, invisible, puis s'anime quand son étape arrive : la mise en page ne bouge pas (pas de CLS).
- Typographie française : `fr()` (`src/lib/typography.ts`) sur les textes avec « ? ! : ; % € » ou des guillemets, `&nbsp;` dans le JSX (« 30&nbsp;secondes »).
- Durées en CSS : seulement via des variables miroir de `motion.ts` (ex. `--duration-micro`) ou les variables d'un geste (`cssGesture` : `--t`, `--d`, `--e`), vérifiées par `tokens.test.ts`.
- Une feuille posée sur le bureau porte `surface-paper` : `text-ink`, `text-pen-red-strong`… y prennent les encres imprimées. Sur le bureau, le texte d'un bouton à fond encre est `text-paper`, jamais `text-paper-raised`.
- Formulaires : Server Action + `useActionState`, validation Zod côté serveur, messages reliés au champ (`aria-describedby`, `aria-live`). Exception : l'envoi d'un devis passe par `fetch` vers `POST /api/analyze` (fichiers lourds et réponse streamée).
- Code serveur : `import "server-only"` en tête ; Vitest le remplace par un module vide, `npm run eval:extraction` passe `--conditions=react-server`. `src/server/db/schema.ts` n'a ni `server-only` ni alias `@/` (drizzle-kit le charge hors de Next.js).
- Tests : pas de réseau. Appels au modèle testés contre `src/test/fake-anthropic.ts`, requêtes SQL contre PGlite (`src/test/test-db.ts`).

## Direction artistique : « le correcteur au stylo rouge »

Le devis est une copie que Loupe corrige comme un prof : stylo rouge, surligneur, tampon. Esthétique papier, éditoriale, française, reconnaissable sur une capture d'écran.

Le bureau est sombre, les feuilles (devis, photo, message, cartes) sont en papier crème. Valeurs actuelles (le brief d'origine, en mode clair, a été remplacé par la refonte DA) :

| Token | Bureau (`:root`) | Feuille (`.surface-paper`) | Usage |
| --- | --- | --- | --- |
| `--paper` | `#221E19` | `#E8E0CC` | le bureau ; sur la feuille, son creux (champ, encadré) |
| `--paper-raised` | `#F2ECDD` | `#F2ECDD` | la feuille |
| `--ink` | `#EEE6D4` | `#2B2119` | texte, encre imprimée |
| `--ink-muted` | `#B4A994` | `#6E6150` | texte secondaire |
| `--pen-red` | `#F0806C` | `#D63A2B` | sur le bureau : le seul rouge (titre) ; sur la feuille : stylo, cercles |
| `--pen-red-strong` | `#F0806C` | `#B42A1E` | petit texte d'erreur |
| `--highlighter-mark` | `#FFE45C` | `#FFE45C` | surligneur, en `multiply` sur le papier |
| `--stamp-orange(-strong)` | `#E9A15C` | `#C46A1C` / `#8E4B12` | « à négocier » |
| `--annotation-blue` | `#9DB6F2` | `#2B4A8B` | notes de marge, focus |
| `--verdict-ok / negotiate / alert` | encre, orange, rouge | `#2B2119`, `#B5601A`, `#D63A2B` | tampon (gros texte, ≥ 3:1) |

Pas de vert. Le test `src/app/tokens.test.ts` vérifie les valeurs et les contrastes sur les deux surfaces (≥ 7:1 pour l'encre, ≥ 4,5:1 pour le petit texte, ≥ 3:1 pour le tampon et les traits).

Grain : bruit SVG en data URI, opacité ≤ 4 % (clair sur le bureau, sombre sur la feuille). Ombres de papier courtes et nettes.

Typographie (`next/font/google`) : titres en **Instrument Serif** (grand, éditorial) ; interface en **Geist** ; montants et lignes de devis en **Geist Mono** (tabulaires, alignés à droite) ; annotations manuscrites en **La Belle Aurore** (stylo bille rapide), avec parcimonie.

Composants signature : `<PaperSheet>` (devis reconstruit, jamais l'image originale ; ombre de papier ; −0,6° au repos), `<RedCircle>` (boucle au stylo à largeur variable, irrégularité initialisée par l'id de la ligne), `<HighlighterMark>` (surligneur jaune en `multiply`, bords irréguliers), `<Stamp>` (double bordure, majuscules, texture d'encre, rotation entre −8° et −12°), `<MarginNote>` (note bleue reliée à sa ligne par un trait courbe), `<PriceDelta>` (« +340 € au-dessus de la médiane », compteur animé, vraie valeur dès le rendu serveur). Plus : `<InkStroke>` (trait de stylo à largeur variable, joué en CSS), `<HandText>` (texte écrit ou tapé), `<InkStamp>` (tampon SVG, filtre feTurbulence), `<PenRing>` (le cercle du logo en motif).

**Interdits :** dégradés (de toute sorte), glow, glassmorphism, pilules arrondies, grilles de cartes identiques à icône, fonds noirs néon ; composants shadcn non retouchés ; Inter partout ; illustrations 3D de banque d'images ; emojis utilisés comme icônes ; copier l'identité visuelle d'une app existante (Yuka compris).

## Motion design

Le mouvement raconte la correction dans l'ordre où un humain la ferait. Il sert la lecture et ne la bloque jamais.

- N'animer que `transform` et `opacity`, plus `pathLength` pour les SVG. Objectif 60 fps sur un Android milieu de gamme. (L'ombre qui se resserre = fondu entre deux calques d'ombre, pas d'animation de `box-shadow`.)
- Chorégraphie : dépôt de la feuille (y 40 → 0, rotation 3° → −0,6°, spring `gentle`) ; lecture (faisceau de scan pendant l'étape `reading` réelle, lignes une par une, 40 à 60 ms d'écart) ; vérifications (pour chaque problème : surligneur scaleX 0 → 1 depuis la gauche en 280 ms, puis cercle rouge pathLength 0 → 1 en 450 ms ease-out, puis note de marge en fondu avec léger décalage) ; prix (compteur ≤ 600 ms) ; verdict (tampon scale 1,6 → 1 et opacity 0 → 1, spring `stamp`, micro-secousse de la feuille de 2 px pendant 120 ms, bref éclat d'encre) ; message de négociation affiché d'un bloc en quelques centaines de ms, bouton « Copier » avec retour net.
- `prefers-reduced-motion` : tout devient des fondus de 150 ms, ou l'état final statique (gestes CSS du hero et de « Comment ça marche »). Pas de secousse, pas de balayage.
- Hero et « Comment ça marche » : gestes joués en CSS (`cssGesture`), lisibles sans JavaScript ; seul le déclenchement (étape lue, ligne choisie) passe par JavaScript.
- Micro-interactions 150 à 250 ms ; chaque séquence ≤ 1,2 s par bloc. Un tap passe l'animation et affiche tout (bouton « Tout afficher » pour le clavier).
- Durées, courbes et springs nommés `gentle`, `snappy`, `stamp` : tout dans `src/lib/motion.ts`.
- Les états de chargement reflètent les vraies étapes du serveur (`received`, `reading`, `checking`, `pricing`, `verdict`), jamais un minuteur factice.

## Pipeline d'analyse (résumé)

`POST /api/analyze` streame les étapes réelles : `received` → `reading` → `checking` → `pricing` → `verdict`.

1. Entrée : 1 à 4 photos ou un PDF, 10 Mo max (4 Mo en pratique : plafond de Vercel). Compression côté client. Sur mobile, `capture="environment"`.
2. Extraction (modèle vision) : `documentKind` (devis, facture, autre), `category`, `readability` (good, partial, poor), `subject` (objet sans donnée personnelle), `issuer` (booléens uniquement : les six du brief plus `hasClientIdentity` et `hasPaymentTerms`), `meta` (date, validité en jours ou en date, acompte en % et en euros, délai en jours, département = 2 premiers chiffres du code postal du chantier, 3 en outre-mer, `isDoorToDoorSale`), `lines[]` (`label`, `quantity`, `unit`, `unitPriceHT`, `totalHT`, `vatRate` en pourcentage, `canonicalItem`, `confidence`), `totals`, `confidence` par champ (`high`, `medium`, `low`). `canonicalItem` vient de la taxonomie `src/config/taxonomy.ts` (ex. `plomberie.chauffe-eau.remplacement.200l`). Les montants sont recopiés tels qu'imprimés, même faux. Refus sans analyse ni stockage : devis de santé, document qui n'est pas un devis, photo illisible (avec un conseil).
3. Vérifications déterministes en TypeScript pur (`src/lib/checks/`), jamais confiées au LLM : calculs (avec tolérance d'arrondi), TVA plausible, mentions obligatoires (`src/config/rules.ts`, forme `{ id, severity, message, legalRef, verified }`), acompte élevé (avertissement, jamais le mot « illégal »), vente à domicile (rappel du délai de rétractation), lignes vagues.
4. Prix : médiane et écart si au moins `MIN_COMPARABLES` (défaut 5) lignes comparables (même item, région proche, moins de 24 mois), sinon fourchette demandée au LLM étiquetée « estimation IA, confiance faible ». Médianes et écarts calculés en TypeScript, jamais par le LLM.
5. Verdict : `ok` (vert, « Correct »), `negotiate` (orange, « À négocier »), `alert` (rouge, « À vérifier sérieusement ») ; fourchette d'économie potentielle ; trois points clés maximum.
6. Message de négociation : poli, factuel, sans accusation, fondé uniquement sur les points vérifiés ; versions email et SMS.
7. Stockage : `analysis` (id, catégorie, département, verdict, résultats des vérifications, dates) et `price_lines` anonymisées. Rien d'autre.
8. Garde-fous : 5 analyses par jour et par IP, timeout sur chaque appel, coût LLM journalisé par analyse.

## Pages

`/` landing (démo animée en boucle, « Scanner mon devis », ce qu'on vérifie, confiance, FAQ, email) ; `/analyse` (dépôt, aperçu, consentement RGPD explicite) ; `/analyse/[id]` (tampon + feuille annotée, « Erreurs vérifiées », « Avis sur les prix », message de négociation, partage, « Rapport détaillé — 4,90 € ») ; `/v/[shareId]` (partage public sans rien de personnel, image OG `next/og`) ; `/confidentialite`, `/mentions-legales` ; `/admin` (mot de passe en variable d'environnement : analyses par jour, conversion par étape, catégories, coût LLM moyen).

Mesure (PostHog) : `landing_view`, `upload_started`, `upload_completed`, `analysis_completed`, `analysis_failed` (avec l'étape), `negotiation_copied`, `share_clicked`, `share_page_view`, `detailed_report_clicked`, `email_submitted`. Le bouton « Rapport détaillé — 4,90 € » n'encaisse rien en V1 : il affiche « Bientôt disponible, laisse ton email pour l'avoir en premier ».

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
