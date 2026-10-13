/**
 * Limites d'une analyse : ce qu'on accepte à l'envoi et combien d'analyses
 * par jour.
 */
export const limits = {
  /** Analyses par jour et par adresse IP (jour calendaire, heure de Paris). */
  analysesPerDay: 5,
  /** Photos d'un même devis, une par page. */
  maxPhotos: 4,
  /** Poids maximal de l'envoi, toutes pages comprises. */
  maxUploadBytes: 10 * 1024 * 1024,
  /** Largeur des photos après compression dans le navigateur. */
  photoMaxWidth: 1600,
  /** Hauteur maximale, pour les photos très allongées (tickets, captures). */
  photoMaxHeight: 2400,
  /** Qualité JPEG après compression. */
  photoQuality: 0.82,
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
  /** Durée d'une session `/admin`, en heures. */
  adminSessionHours: 12,
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
 * est limité à 4,5 Mo. Au-delà, l'envoi est refusé avant d'atteindre Loupe :
 * un PDF de 4,5 à 10 Mo passera en local mais pas une fois déployé. Les photos
 * compressées (quelques centaines de Ko chacune) ne sont pas concernées.
 */
export const HOSTING_BODY_LIMIT_BYTES = 4.5 * 1024 * 1024;
