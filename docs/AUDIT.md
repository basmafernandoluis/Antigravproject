# AUDIT.md — État des lieux & Écarts Monétisation

## 1. État des lieux du code existant
Le prototype **Juicy Drop** est fonctionnel sur navigateur et appareil Android via **Capacitor 8** + **Phaser 3** + **Matter.js** + **Vite**.

### Points forts actuels
* **Core Loop complet** ([GameScene.js](file:///home/antigravity/basmafernandoluis/Antigravproject/src/scenes/GameScene.js)) : visée tactile/souris, chute physique Matter.js, fusion des 11 paliers de fruits ([fruits.js](file:///home/antigravity/basmafernandoluis/Antigravproject/src/config/fruits.js)), système de combos, score + record persisté en `localStorage` (`juicy_drop_best`).
* **Game Feel solide** : *screen shake* proportionnel au palier, ondes de choc, particules colorées, confettis sur combos/gros fruits, audio synthétisé Web Audio API ([sound.js](file:///home/antigravity/basmafernandoluis/Antigravproject/src/utils/sound.js)) avec bouton mute.
* **Zéro dépendance d'assets externes** : textures générées en Canvas ([textures.js](file:///home/antigravity/basmafernandoluis/Antigravproject/src/utils/textures.js)), bundle léger et chargement instantané.
* **Projet Android opérationnel** : `minSdkVersion = 24`, `targetSdkVersion = 36` ([variables.gradle](file:///home/antigravity/basmafernandoluis/Antigravproject/android/variables.gradle)).

### Limites techniques identifiées
1. **Identifiant applicatif provisoire** : [capacitor.config.json](file:///home/antigravity/basmafernandoluis/Antigravproject/capacitor.config.json) et les fichiers Android utilisent `com.antigrav.juicydrop` au lieu de **`com.appwizards.juicydrop`**.
2. **Scène unique monolithique** : `GameScene.js` gère à la fois le jeu, le HUD et la modale Game Over (pas de `BootScene` ni d'overlay UI modulaire pour les boosters/Continue/Réglages).
3. **Sauvegarde minimale** : uniquement `juicy_drop_best` dans `localStorage` (aucun suivi du nombre de parties jouées, du palier max atteint ou des préférences utilisateur).

---

## 2. Ce qui manque pour la monétisation & la publication

| Domaine | Manque identifié | Impact |
| :--- | :--- | :--- |
| **Identité Android** | Migration vers `com.appwizards.juicydrop` (Java, Gradle, Manifest) | **Bloquant Play Store / AdMob** |
| **SDK Publicitaire** | Plugin `@capacitor-community/admob` non installé + `APPLICATION_ID` absent du `AndroidManifest.xml` | **Bloquant monétisation** |
| **Conformité RGPD** | Intégration **Google UMP SDK** absente (obligatoire en Europe/UK) | **Bloquant AdMob** |
| **Logique Pub & Garde-fous** | Aucun `AdManager` (préchargement, délai > 60s, frequency cap interstitial, fallback web) | Risque de rejet ou mauvaise UX |
| **Emplacements Rewarded** | Pas de **Continue** (1x/partie), pas de **Boosters** (*Secouer*, *Épingle*), pas de **Score x2** | Perte de ~60–70 % du potentiel de revenus |
| **Rétention & Équilibrage** | Pas d'affichage du palier max atteint ni de suivi de session/parties | Rétention D1 sous-optimale |
| **Assets Store & Conformité** | Icône 512×512, Splash Screen personnalisé, `app-ads.txt` sur le domaine | **Bloquant Play Store** |
| **Phase 2 (IAP)** | Écran Réglages + achat "Retirer les pubs" (~2,49 €) | Prévu en P1 après validation V1 |
