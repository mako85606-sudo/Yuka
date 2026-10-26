/**
 * Limites d'une analyse : ce qu'on accepte à l'envoi et combien d'analyses
 * par jour.
 */
export const limits = {
  /** Analyses par jour et par adresse IP (jour calendaire, heure de Paris). */
  analysesPerDay: 5,
  /** Photos d'un même devis, une par page. */
  maxPhotos: 4,
  /**
   * Poids maximal de l'envoi, toutes pages comprises. Le brief dit 10 Mo, mais
   * l'hébergeur refuse avant nous un corps de plus de 4,5 Mo
   * (`HOSTING_BODY_LIMIT_BYTES`) : 4 Mo, enveloppe de l'envoi comprise, passent.
   * Quatre photos compressées pèsent bien moins ; seul un gros PDF scanné bute.
   */
  maxUploadBytes: 4 * 1024 * 1024,
  /** Largeur des photos après compression dans le navigateur. */
  photoMaxWidth: 1600,
  /** Hauteur maximale, pour les photos très allongées (tickets, captures). */
  photoMaxHeight: 2400,
  /** Qualité JPEG après compression. */
  photoQuality: 0.82,
  /**
   * Netteté minimale d'une photo (90e centile de la variance du laplacien par
   * zone, mesurée à `sharpnessWidth` px de large). En dessous, on prévient
   * avant l'envoi : la photo semble floue.
   * TODO: vérifier — seuil calé sur la photo de test (nette : 5 759 ; floutée
   * à 1 px : 114 ; à 1,5 px : 40 ; à 2 px : 9) ; à recaler sur de vraies photos
   * de devis prises au téléphone. Ce n'est qu'un avertissement : on peut
   * toujours envoyer.
   */
  blurThreshold: 60,
  /** Largeur de l'image sur laquelle la netteté est mesurée. */
  sharpnessWidth: 800,
  /** Une analyse reste accessible par son lien pendant 30 jours, puis elle est effacée. */
  analysisRetentionDays: 30,
  /**
   * Temps accordé à une analyse complète, lecture et prix compris : un peu
   * moins que `maxDuration` de la route (120 s). L'estimation des prix prend
   * ce qui reste après la lecture.
   */
  analysisBudgetMs: 110_000,
  /** Essais de mot de passe sur `/admin`, par jour et par adresse IP. */
  adminAttemptsPerDay: 10,
  /** Essais de mot de passe sur `/admin`, par jour, toutes adresses confondues. */
  adminAttemptsGlobalPerDay: 50,
  /** Durée d'une session `/admin`, en heures. */
  adminSessionHours: 12,
  /** Pages d'un PDF au plus : un devis en compte rarement plus. */
  maxPdfPages: 8,
  /**
   * Flux compressé d'un PDF décompressé par pdf-lib au chargement (table
   * d'objets `/ObjStm`, table des références `/XRef`) : octets décompressés
   * acceptés, par flux puis au total. Au-delà, le PDF est refusé avant même
   * que pdf-lib ne l'ouvre (bombe de décompression : un petit fichier qui se
   * gonfle en mémoire). Un vrai devis de huit pages reste très en deçà ; les
   * images (jamais décompressées au chargement) ne comptent pas.
   */
  maxPdfInflatedBytesPerStream: 8 * 1024 * 1024,
  maxPdfInflatedBytesTotal: 32 * 1024 * 1024,
  /**
   * Plafond de dépense quotidienne de l'API Claude, en dollars, toutes
   * analyses comprises (lectures réussies ou non, estimations de prix). Au-delà,
   * l'analyse s'arrête jusqu'au lendemain.
   * TODO: vérifier — plafond à fixer par l'éditeur selon son budget ; fixer
   * aussi une limite de dépense dans la console Anthropic.
   */
  dailyLlmBudgetUsd: 20,
  /**
   * Montant réservé sur le plafond du jour au début de chaque analyse, avant
   * tout appel au modèle, puis rendu en partie une fois le vrai coût connu.
   * La réservation est atomique : N analyses simultanées ne peuvent pas
   * dépasser le plafond en lisant toutes un total à 0 $ avant d'y ajouter leur
   * coût (sans elle, la course laissait passer tout le monde).
   *
   * Pire cas d'une analyse, au tarif le plus cher de `MODEL_PRICING`
   * (claude-opus-5-5 : 4 $/M en entrée, 20 $/M en sortie, 5 $/M en cache) :
   * - lecture, deux tentatives (`MAX_ATTEMPTS`) : sortie 2 × `maxTokens`
   *   (16 000) = 32 000 tokens → 0,64 $ ; entrée (consignes en cache + quatre
   *   photos ou huit pages) majorée à 2 × 40 000 tokens au tarif cache =
   *   0,40 $ ;
   * - estimation des prix, deux tentatives : sortie 2 × 4 000 = 0,16 $ ;
   *   entrée 2 × 8 000 au tarif cache = 0,08 $.
   * Soit ≈ 1,28 $, arrondi à 1,50 $. Le coût réel d'un devis bien lu est de
   * quelques centimes ; le reste est rendu au règlement.
   * TODO: vérifier — à recaler si `maxTokens`, le nombre de pages ou les tarifs
   * changent.
   */
  llmSpendReservationUsd: 1.5,
  /** Événements de mesure acceptés par jour et par adresse IP. */
  eventsPerDay: 300,
  /** Inscriptions (ou désinscriptions) par jour et par adresse IP. */
  signupsPerDay: 5,
  /**
   * Une adresse inscrite aux nouvelles est effacée au plus tard 3 ans après
   * l'inscription (guide des durées de conservation de la CNIL : 3 ans après
   * le dernier contact venant de la personne).
   */
  signupRetentionYears: 3,
} as const;

/** Formats d'image acceptés par le modèle (les photos sont recompressées en JPEG). */
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type AcceptedImageType = (typeof ACCEPTED_IMAGE_TYPES)[number];

export const PDF_TYPE = "application/pdf";

/**
 * Plafond de taille du corps d'une requête chez l'hébergeur.
 *
 * TODO: vérifier — d'après la documentation de Vercel (non consultable depuis
 * l'environnement de développement), le corps d'une requête vers une fonction
 * est limité à 4,5 Mo. Au-delà, l'envoi est refusé avant d'atteindre Loupe,
 * d'où `limits.maxUploadBytes` à 4 Mo. Si l'hébergeur accepte plus, la limite
 * peut remonter jusqu'aux 10 Mo du brief.
 */
export const HOSTING_BODY_LIMIT_BYTES = 4.5 * 1024 * 1024;
