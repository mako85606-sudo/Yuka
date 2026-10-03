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
| PostHog | hébergement EU | événements et entonnoirs |
| Vitest | 5 | tests à côté du code : `*.test.ts` |
| Node | ≥ 22.12 | Vercel pour le déploiement |

Appel LLM : sortie JSON forcée via un outil (tool use) dont l'`input_schema` est dérivé du schéma Zod (`z.toJSONSchema`). Validation Zod côté serveur ; en cas d'échec, une seule relance avec l'erreur de validation. Les PDF partent directement au modèle ; les photos sont compressées côté client (environ 1600 px de large).

## Commandes

- `npm run dev`, `npm run build`, `npm start`
- `npm run lint` : ESLint CLI (flat config `eslint-config-next`)
- `npm run typecheck` : `next typegen && tsc --noEmit` (génère les types `PageProps`/`LayoutProps` avant de vérifier)
- `npm test` : Vitest en une passe ; `npm run test:watch` en continu

## Arborescence

- `src/app/` : routes. `/dev/design` est la planche de style (masquée en production Vercel sauf `ENABLE_DEV_PAGES=true`). `globals.css` porte les tokens ; `tokens.test.ts` les garde.
- `src/components/signature/` : les six composants signature.
- `src/components/quote/` : le devis reconstruit (en-tête avec « cadre réservé au correcteur », lignes, totaux).
- `src/components/scene/` : `CorrectionScene`, la correction complète pilotée par l'étape atteinte.
- `src/components/motion/` : préférences de mouvement (mouvement réduit, saut d'animation).
- `src/components/ui/` : éléments d'interface maison (pas de shadcn brut).
- `src/lib/` : code pur et testé : `motion.ts` (durées, courbes, springs), `choreography.ts` (ordre des gestes dans chaque bloc), `phases.ts` (étapes serveur), `hand-drawn.ts` et `seeded-random.ts` (tracés à la main), `format.ts`, `price-wording.ts`, `color.ts`, `demo-script.ts`.
- `src/lib/checks/` (étape 4) : une fonction par règle déterministe, chacune testée.
- `src/config/` : `site.ts` ; plus tard `taxonomy.ts`, `rules.ts`, seuils et références (avec `// TODO: vérifier` si incertain).
- `src/fixtures/` : données fictives (démo, devis de test et vérités terrain).

## Conventions de code

- Composants en `PascalCase.tsx`, le reste en `kebab-case.ts`. Imports via l'alias `@/`.
- Couleurs uniquement via les tokens (`bg-paper`, `text-ink`, `text-pen-red-strong`…). Aucune couleur en dur dans un composant.
- Durées, courbes et springs uniquement via `src/lib/motion.ts`. Aucune valeur d'animation en dur dans un composant.
- Le hasard visuel (tracés « à la main », rotation du tampon) est toujours initialisé par un identifiant stable (`createRandom(id)`) : même rendu à chaque fois.
- Les montants s'affichent en Geist Mono, chiffres tabulaires, alignés à droite, formatés par `src/lib/format.ts` (fr-FR, espace insécable, vrai signe moins).
- Chaque annotation visuelle a un équivalent texte pour les lecteurs d'écran.
- Mouvement réduit : ne jamais rendre un DOM différent selon `reduced` (le serveur ne connaît pas la préférence : erreur d'hydratation). Seules les transitions et les cibles d'animation changent.

## Direction artistique : « le correcteur au stylo rouge »

Le devis est une copie que Loupe corrige comme un prof : stylo rouge, surligneur, tampon. Esthétique papier, éditoriale, française, reconnaissable sur une capture d'écran.

Tokens (valeurs du brief, mode clair) :

| Token | Valeur | Usage |
| --- | --- | --- |
| `--paper` | `#F6F3EC` | fond (le bureau) |
| `--paper-raised` | `#FFFDF8` | la feuille |
| `--ink` | `#16140F` | texte |
| `--ink-muted` | `#6B655A` | texte secondaire |
| `--pen-red` | `#D7372B` | erreurs, cercles |
| `--highlighter` | `#FFE45C` | lignes suspectes |
| `--stamp-green` | `#1E7F4A` | verdict OK |
| `--stamp-orange` | `#D9822B` | verdict à négocier |
| `--annotation-blue` | `#2C4E9B` | notes de marge |

Tokens dérivés (contraste) : `--pen-red-strong`, `--stamp-green-strong`, `--stamp-orange-strong` pour le petit texte (≥ 4,5:1 sur les deux papiers) ; `--verdict-ok|negotiate|alert` pour le tampon (gros texte, ≥ 3:1) ; `--highlighter-mark` pour le fond surligné. Le test `src/app/tokens.test.ts` vérifie les valeurs et les contrastes.

Mode sombre « bureau de nuit » : le papier devient un gris chaud tamisé, jamais un noir pur. Il suit `prefers-color-scheme`, et `data-theme="light|dark"` sur `<html>` force un thème.

Grain papier : bruit SVG en data URI, opacité ≤ 4 %.

Typographie (`next/font/google`) : titres en **Instrument Serif** (grand, éditorial) ; interface en **Geist** ; montants et lignes de devis en **Geist Mono** (tabulaires, alignés à droite) ; annotations manuscrites en **Caveat**, avec parcimonie.

Composants signature : `<PaperSheet>` (devis reconstruit, jamais l'image originale ; ombre réaliste ; −0,6° au repos), `<RedCircle>` (ellipse tracée à la main, irrégularité initialisée par l'id de la ligne), `<HighlighterMark>` (surlignage jaune derrière la ligne, bords irréguliers), `<Stamp>` (double bordure, majuscules, texture d'encre, rotation entre −8° et −12°), `<MarginNote>` (note bleue reliée à sa ligne par un trait courbe), `<PriceDelta>` (« +340 € au-dessus de la médiane », compteur animé).

**Interdits :** dégradés violets, glassmorphism, fonds noirs néon ; composants shadcn non retouchés ; Inter partout ; illustrations 3D de banque d'images ; emojis utilisés comme icônes ; copier l'identité visuelle d'une app existante (Yuka compris).

## Motion design

Le mouvement raconte la correction dans l'ordre où un humain la ferait. Il sert la lecture et ne la bloque jamais.

- N'animer que `transform` et `opacity`, plus `pathLength` pour les SVG. Objectif 60 fps sur un Android milieu de gamme. (L'ombre qui se resserre = fondu entre deux calques d'ombre, pas d'animation de `box-shadow`.)
- Chorégraphie : dépôt de la feuille (y 40 → 0, rotation 3° → −0,6°, spring `gentle`) ; lecture (faisceau de scan pendant l'étape `reading` réelle, lignes une par une, 40 à 60 ms d'écart) ; vérifications (pour chaque problème : surligneur scaleX 0 → 1 depuis la gauche en 280 ms, puis cercle rouge pathLength 0 → 1 en 450 ms ease-out, puis note de marge en fondu avec léger décalage) ; prix (compteur ≤ 600 ms) ; verdict (tampon scale 1,6 → 1 et opacity 0 → 1, spring `stamp`, micro-secousse de la feuille de 2 px pendant 120 ms, bref éclat d'encre) ; message de négociation affiché d'un bloc en quelques centaines de ms, bouton « Copier » avec retour net.
- `prefers-reduced-motion` : tout devient des fondus de 150 ms. Pas de secousse, pas de balayage.
- Micro-interactions 150 à 250 ms ; chaque séquence ≤ 1,2 s par bloc. Un tap passe l'animation et affiche tout (bouton « Tout afficher » pour le clavier).
- Durées, courbes et springs nommés `gentle`, `snappy`, `stamp` : tout dans `src/lib/motion.ts`.
- Les états de chargement reflètent les vraies étapes du serveur (`received`, `reading`, `checking`, `pricing`, `verdict`), jamais un minuteur factice.

## Pipeline d'analyse (résumé)

`POST /api/analyze` streame les étapes réelles : `received` → `reading` → `checking` → `pricing` → `verdict`.

1. Entrée : 1 à 4 photos ou un PDF, 10 Mo max. Compression côté client. Sur mobile, `capture="environment"`.
2. Extraction (modèle vision) : `category`, `issuer` (booléens uniquement), `meta` (date, validité, acompte %, délai, département = 2 premiers chiffres du code postal du chantier, `isDoorToDoorSale`), `lines[]` (`label`, `quantity`, `unit`, `unitPriceHT`, `totalHT`, `vatRate`, `canonicalItem`), `totals`, `confidence` par champ. `canonicalItem` vient de la taxonomie `src/config/taxonomy.ts` (ex. `plomberie.chauffe-eau.remplacement.200l`).
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
2. Landing avec la démo animée (données dans `src/fixtures/`).
3. Extraction : route streamée, schémas Zod, appel LLM, refus santé, rate limit ; 5 devis PDF fictifs (pdf-lib), dont 2 avec erreurs connues, et leur vérité terrain JSON ; `npm run eval:extraction` (précision champ par champ).
4. Vérifications et prix : règles déterministes (au moins un test qui passe et un qui échoue par règle), taxonomie, médianes, verdict.
5. Écran de résultat : chorégraphie complète, version reduced-motion, message de négociation.
6. Partage et mesure : page publique, image OG, événements, bouton rapport détaillé, `/admin`.
7. Durcissement : pages légales, erreurs (photo floue + conseil), accessibilité (contrastes, focus visibles, équivalent texte des annotations), Lighthouse mobile ≥ 90, déploiement Vercel.
