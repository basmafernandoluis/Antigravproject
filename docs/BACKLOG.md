# BACKLOG.md — Backlog produit priorisé

Estimations indicatives en **Points / Heures** (`S` = 1–2h, `M` = 3–4h, `L` = 5–8h).

## P0 — Indispensables pour la V1 monétisable

| ID | User Story | Critères d'acceptation | Est. |
| :--- | :--- | :--- | :--- |
| **P0-1** | **Migrer l'`appId` vers `com.appwizards.juicydrop`** | `capacitor.config.json`, `build.gradle`, `AndroidManifest.xml`, et `MainActivity.java` utilisent `com.appwizards.juicydrop`. Build Android OK. | S |
| **P0-2** | **Installer & configurer `@capacitor-community/admob`** | Plugin installé, `cap sync android` OK, `APPLICATION_ID` configuré dans `AndroidManifest.xml` (ID test en dev). | S |
| **P0-3** | **Implémenter le consentement RGPD (Google UMP)** | Au 1er lancement en zone EEA/test, le formulaire UMP s'affiche avant toute requête publicitaire ; statut sauvegardé. | M |
| **P0-4** | **Créer `AdManager.js` avec garde-fous** | Singleton gérant `init()`, préchargement Interstitial/Rewarded, blocage < 60s de jeu, cap 1 interstitial / 2 parties, fallback propre sur navigateur web. | M |
| **P0-5** | **Ajouter le Rewarded "Continue" (1x/partie)** | Au Game Over, bouton *"🎬 Continuer"* (si non utilisé dans la partie) : lance Rewarded → détruit les 4 fruits les plus hauts + réinitialise `dangerTimer`. | M |
| **P0-6** | **Ajouter 2 Boosters Rewarded (*Secouer* & *Épingle*)** | 2 boutons discrets en bas/haut : *Secouer* applique une impulsion physique ; *Épingle* permet de cliquer un fruit pour le supprimer. 1 pub = 1 utilisation. | L |
| **P0-7** | **Ajouter l'Interstitial au Game Over & Rewarded Score x2** | Sur Game Over (après clic "Rejouer" ou délai), affiche Interstitial si éligible (>60s, cap respecté). Option *"🎬 Score x2"* avant de valider le record. | M |
| **P0-8** | **Calibrage physique "Sweet Spot" (2–4 min)** | Ajuster gravité, restitution et seuils pour garantir des parties nerveuses de 2–4 min menant naturellement à l'usage du *Continue*. | S |

---

## P1 — Rétention, Packaging & Hybride (Phase 2 / Post-lancement)

| ID | User Story | Critères d'acceptation | Est. |
| :--- | :--- | :--- | :--- |
| **P1-1** | **Rétention minimaliste (Palier Max & Stats)** | Sauvegarder et afficher le fruit le plus élevé atteint (ex: badge Pastèque) et le nombre de parties jouées dans `localStorage`. | S |
| **P1-2** | **Assets Store (Icône, Splash, Captures)** | Icône adaptative Android générée, Splash Screen *Juicy Drop* configuré, 4+ captures 9:16 + vidéo courte pour le Play Store. | M |
| **P1-3** | **Analytics léger (Événements clés)** | Tracer `session_start`, `game_over`, `ad_rewarded_complete`, `ad_interstitial_shown` (Firebase léger ou équivalent) pour suivre le test UA. | M |
| **P1-4** | **Écran Réglages + IAP "Retirer les pubs" (~2,49 €)** | Bouton ⚙️ ouvrant une modale (Son, Restaurer achats, Politique de confidentialité, Acheter "No Ads"). Désactive les Interstitials de façon persistante. | L |

---

## P2 — Optimisations futures (Si traction validée)

| ID | User Story | Critères d'acceptation | Est. |
| :--- | :--- | :--- | :--- |
| **P2-1** | **Médiation AdMob (AppLovin / Unity Ads)** | Ajout des adaptateurs de médiation dans Gradle si DAU > 500 pour augmenter le fill-rate et l'eCPM. | L |
| **P2-2** | **Thèmes visuels déblocables par Rewarded** | 2–3 palettes (Néon, Bonbon, Océan) débloquées temporairement ou définitivement via Rewarded Ads. | M |
