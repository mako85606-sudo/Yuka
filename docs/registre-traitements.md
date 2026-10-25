# Registre des activités de traitement de Loupe

Document interne (RGPD, art. 30), à tenir à jour et à présenter à la CNIL sur demande. Modèle : registre simplifié de la CNIL (https://www.cnil.fr/fr/RGPD-le-registre-des-activites-de-traitement).

L'exemption des structures de moins de 250 personnes ne s'applique pas : ces traitements ne sont pas occasionnels.

Les durées citées viennent de la configuration du code (`src/config/limits.ts`, `src/config/pricing.ts`, `src/config/analytics.ts`, `src/config/legal.ts`). Si elles changent, ce registre et la page `/confidentialite` changent avec elles.

**À compléter avant la mise en ligne** (marqué « à compléter » ci-dessous) : identité de l'éditeur, contact, hébergeur de la base, garanties de transfert de chaque prestataire, durée des journaux de Vercel, durée de conservation des demandes d'exercice des droits. Joindre les accords de traitement acceptés (Anthropic, Vercel, PostHog, base de données) et l'analyse d'impact des transferts (guide CNIL).

## Responsable du traitement

- Éditeur : à compléter (nom ou dénomination, adresse, SIREN).
- Contact pour les données : à compléter.
- Délégué à la protection des données : aucun (désignation non obligatoire, art. 37).

## Mesures de sécurité communes

- Le devis (image ou PDF) n'est jamais écrit : il reste en mémoire le temps de la requête.
- Photos réencodées dans le navigateur (métadonnées EXIF et GPS effacées) ; métadonnées des PDF effacées sur le serveur avant la lecture.
- Le modèle ne renvoie que des booléens de présence pour les données de l'émetteur et du client ; libellés et objet filtrés par `anonymizeText`.
- Adresse IP jamais enregistrée en clair : HMAC du jour et de l'adresse (`IP_HASH_SECRET`), compteurs effacés après deux jours.
- Identifiants d'analyse et de partage aléatoires (128 bits), distincts ; analyses expirées après 30 jours.
- En-têtes de sécurité (CSP sans ressource tierce, HSTS, `frame-ancestors 'none'`), connexion TLS exigée vers une base distante.
- `/admin` : mot de passe d'au moins 16 caractères, session signée `httpOnly` de 12 heures, limite d'essais par adresse et globale.
- Journaux sans donnée personnelle (`errorSummary` : noms et codes d'erreur seulement ; emails masqués).
- Purges automatiques après chaque analyse et chaque nuit (`/api/purge`).

## Fiches

### 1. Analyse d'un devis

- **Finalité** : lire le devis envoyé et en tirer les lignes, les totaux et la présence des mentions.
- **Base légale** : exécution du service demandé (art. 6.1.b) ; consentement explicite pour une éventuelle donnée sensible incidente (art. 9.2.a, case à cocher).
- **Personnes concernées** : utilisateurs ; personnes citées sur le devis (artisan, client).
- **Données** : image ou PDF du devis, qui peut porter noms, adresses, téléphones, numéros.
- **Destinataires** : Anthropic (Anthropic Ireland, Limited pour l'Europe ; traitement par Anthropic, PBC et ses sous-traitants).
- **Transferts** : États-Unis (stockage) ; calcul dans toute zone où Anthropic dispose de capacités. Garantie : clauses contractuelles types de l'accord de traitement d'Anthropic. Data Privacy Framework : à vérifier.
- **Durée** : aucune chez Loupe. Chez Anthropic : rien par défaut ; jusqu'à 2 ans pour un contenu signalé par ses contrôles de sécurité ; 30 jours si un « Covered Model » est utilisé (Loupe n'en utilise pas : `modelRetainsContent`, `src/config/llm.ts`).

### 2. Résultat de l'analyse

- **Finalité** : montrer le résultat à l'utilisateur par un lien privé.
- **Base légale** : exécution du service (art. 6.1.b).
- **Personnes concernées** : utilisateurs.
- **Données** : verdict, constats, avis de prix, lignes et objet filtrés, catégorie, département, région, coût de l'analyse.
- **Destinataires** : hébergeur de la base (à compléter).
- **Durée** : 30 jours (`limits.analysisRetentionDays`), ou jusqu'à l'effacement par l'utilisateur.

### 3. Base de comparaison des prix

- **Finalité** : comparer les prix d'un devis à des devis semblables.
- **Base légale** : intérêt légitime de Loupe (art. 6.1.f).
- **Personnes concernées** : aucune identifiable (lignes filtrées, détachées de l'analyse).
- **Données** : libellé filtré, prestation de la nomenclature, unité, prix, catégorie, département, région, empreinte du devis.
- **Destinataires** : hébergeur de la base (à compléter).
- **Durée** : 24 mois (`pricingConfig.windowMonths`).

### 4. Limite d'usage et protection contre les abus

- **Finalité** : 5 analyses par jour et par adresse, plafonds des inscriptions, des désinscriptions, des événements et des essais de connexion.
- **Base légale** : intérêt légitime (art. 6.1.f).
- **Personnes concernées** : visiteurs.
- **Données** : HMAC du jour et de l'adresse IP, compteur.
- **Destinataires** : hébergeur de la base (à compléter).
- **Durée** : 2 jours.

### 5. Hébergement et sécurité

- **Finalité** : servir le site, le protéger.
- **Base légale** : intérêt légitime (art. 6.1.f).
- **Personnes concernées** : visiteurs.
- **Données** : journaux techniques de Vercel (adresse IP, date, page demandée).
- **Destinataires** : Vercel Inc. ; fonctions exécutées à Francfort.
- **Transferts** : États-Unis possible. Garanties : à compléter (accord de traitement de Vercel).
- **Durée** : à compléter (selon l'offre Vercel).

### 6. Mesure d'audience

- **Finalité** : statistiques de fréquentation et de conversion propres à Loupe.
- **Base légale** : intérêt légitime (art. 6.1.f) ; exemption de consentement de la CNIL pour la mesure d'audience ; droit d'opposition offert sur `/confidentialite` (refus gardé dans le navigateur, signal Global Privacy Control respecté).
- **Personnes concernées** : visiteurs.
- **Données** : identifiant de visite aléatoire (en mémoire, oublié au rechargement), nom de l'événement, propriétés fermées sans texte libre (catégorie, verdict, étape).
- **Destinataires** : hébergeur de la base ; PostHog Inc. (hébergement en Union européenne, sans adresse IP ni géolocalisation, sans profil de personne).
- **Transferts** : accès possible depuis les États-Unis pour le support de PostHog. Garanties : à compléter.
- **Durée** : 13 mois dans la base (`analyticsConfig.eventsRetentionMonths`) ; réglage de PostHog à aligner.

### 7. Liste des nouvelles

- **Finalité** : prévenir des nouveautés et de la sortie du rapport détaillé.
- **Base légale** : consentement (art. 6.1.a).
- **Personnes concernées** : inscrits.
- **Données** : email, source de l'inscription, date.
- **Destinataires** : hébergeur de la base ; prestataire d'envoi d'emails (à choisir, avec lien de désinscription dans chaque email).
- **Durée** : jusqu'à la désinscription (`/desinscription`), et au plus 3 ans après l'inscription (`limits.signupRetentionYears`).

### 8. Partage public

- **Finalité** : permettre à l'utilisateur de montrer la correction.
- **Base légale** : exécution du service (art. 6.1.b).
- **Personnes concernées** : utilisateurs.
- **Données** : identifiant public, version réduite de l'analyse (région, aucune date, aucun libellé lu, aucun rappel personnel).
- **Durée** : celle de l'analyse.

### 9. Exercice des droits

- **Finalité** : répondre aux demandes d'accès, d'effacement, d'opposition…
- **Base légale** : obligation légale (art. 6.1.c).
- **Personnes concernées** : demandeurs.
- **Données** : message, réponse, preuve de la réponse.
- **Durée** : à compléter.

### 10. Administration

- **Finalité** : accès de l'éditeur au tableau de bord.
- **Base légale** : intérêt légitime (art. 6.1.f).
- **Personnes concernées** : l'éditeur.
- **Données** : cookie de session `loupe_admin` (12 heures), compteurs d'essais chiffrés.
- **Durée** : 12 heures (session) ; 2 jours (compteurs).

## Analyse d'impact (AIPD)

Probablement non obligatoire (un seul critère certain sur les neuf de la CNIL : usage innovant de l'IA ; un possible : données sensibles incidentes). Une AIPD légère est recommandée et à garder ici : anonymisation par `anonymizeText`, refus des devis de santé, transfert vers Anthropic. À confirmer par un juriste.

## Historique

- 24 octobre 2026 : création, d'après l'audit juridique de la même date.
