# ROADMAP.md — Plan de développement en 3 phases

## Definition of Done (DoD) globale
Une fonctionnalité ou version est considérée **Done** uniquement si :
1. Elle fonctionne sur **appareil Android physique** (build via Android Studio, `minSdk 24`) sans crash ni fuite mémoire.
2. Elle respecte le principe UX : **aucune pub dans les 60 premières secondes**, *Rewarded > Interstitial*, zéro bannière.
3. Les tests manuels de [TESTING.md](file:///home/antigravity/basmafernandoluis/Antigravproject/docs/TESTING.md) passent (avec IDs de test AdMob).
4. Le code est propre, léger et versionné sur `main`.

---

## Phase 1 : Fondations, Monétisation V1 & Boosters (MVP Commercial)
**Objectif** : Avoir une V1 100 % AdMob prête à générer des impressions sans casser le plaisir de jeu.

* **Jalon 1.1 — Identité & SDK**
  * Migration complète vers `com.appwizards.juicydrop`.
  * Installation de `@capacitor-community/admob` + configuration `AndroidManifest.xml`.
  * Intégration du consentement **Google UMP SDK** au démarrage.
* **Jalon 1.2 — `AdManager` & Emplacements V1**
  * Création de `AdManager.js` (préchargement, fallback web, timer 60s, cap interstitial).
  * **Rewarded Continue** (1x/partie : détruit les 4 fruits les plus hauts).
  * **Rewarded Boosters** : *Secouer le bocal* + *Épingle/Bombe* (supprimer 1 fruit).
  * **Rewarded Score x2** au Game Over + **Interstitial** (1 partie sur 2 ou 3, après 60s).
* **Critères de "Done" Phase 1** : Flux complet testable avec les IDs de test AdMob ; consentement UMP fonctionnel ; sessions moyennes calibrées à 2–4 min ("Sweet Spot").

---

## Phase 2 : Polish, Rétention & Préparation Publication
**Objectif** : Finaliser le packaging Play Store, la conformité et lancer un premier test organique + petit budget UA (50–300 €).

* **Jalon 2.1 — Polish & Rétention minimaliste**
  * Suivi du palier max atteint (collection/badge Pastèque) + meilleur score.
  * Équilibrage final de la physique (*Sweet Spot* gravité/rebond).
  * Icône adaptative, Splash Screen *Juicy Drop*, et écran de chargement propre.
* **Jalon 2.2 — Conformité & Analytics léger**
  * Déploiement du fichier `app-ads.txt` à la racine du domaine existant.
  * Événements basiques (Firebase Analytics léger ou logs de session) : début de partie, fusion max, pub vue, Game Over.
* **Critères de "Done" Phase 2** : AAB signé généré dans Android Studio ; fiche Play Store prête ; tests internes validés sur 2+ appareils.

---

## Phase 3 : Lancement, Test UA & Optimisation Hybride (Post-V1)
**Objectif** : Valider l'eCPM et la rétention D1/D7, puis activer l'IAP "Retirer les pubs".

* **Jalon 3.1 — Lancement & Test UA**
  * Publication en production sur le Google Play Store.
  * Campagne test UA (50–300 €) + vidéos organiques TikTok/Reels.
  * Analyse des premiers KPIs (eCPM, ARPDAU, rétention D1, taux de clic *Continue*).
* **Jalon 3.2 — Évolution Hybride (P1)**
  * Ajout d'un écran **Réglages** minimaliste + **IAP "Retirer les publicités"** (~2,49 €) désactivant les Interstitials (tout en gardant les Rewarded optionnels).
  * Évaluation d'une médiation (AppLovin/Unity Ads) uniquement si DAU > 500.
