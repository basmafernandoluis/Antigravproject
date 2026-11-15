# ARCHITECTURE.md — Structure cible & Monétisation

## 1. Principes d'architecture
* **Simplicité hyper-casual** : pas de framework UI externe (React/Vue) inutile ; tout reste dans **Phaser 3** pour garder 60 FPS et un bundle léger.
* **Découplage Web / Natif** : la logique de jeu ne dépend jamais directement de Capacitor. Tout appel natif passe par un service dédié (`AdManager`, `StorageService`) avec fallback propre sur navigateur PC.

## 2. Arborescence cible (`src/`)
```text
src/
├── main.js                 # Config Phaser 3 (480x854, Scale.FIT, Matter.js)
├── config/
│   ├── fruits.js           # 11 paliers (rayons, couleurs, scores)
│   └── ads.js              # IDs AdMob (test vs prod), caps & délais (60s)
├── managers/
│   ├── AdManager.js        # Init AdMob + Google UMP, préchargement, règles
│   └── StorageManager.js   # Wrapper localStorage (bestScore, maxTier, noAds, stats)
├── scenes/
│   ├── BootScene.js        # Génération textures + init AdManager/UMP
│   └── GameScene.js        # Boucle physique, combos, boosters, HUD, Game Over
└── utils/
    ├── textures.js         # Génération procédurale Canvas (fruits, particules)
    └── sound.js            # Synthétiseur Web Audio API
```

---

## 3. Flux d'états et de sauvegarde
* **États de `GameScene`** : `READY` (visée) $\to$ `DROPPING` (cooldown 420ms) $\to$ `PIN_MODE` (booster Épingle actif) $\to$ `AD_PAUSED` (jeu + audio mis en pause pendant une pub) $\to$ `GAME_OVER`.
* **Sauvegarde (`StorageManager`)** : clé JSON unique `juicy_drop_save_v1` dans `localStorage` :
  ```json
  { "bestScore": 0, "maxTierReached": 0, "gamesPlayed": 0, "noAds": false }
  ```

---

## 4. Architecture de monétisation (`AdManager.js`)
`AdManager` est un singleton initialisé dans `BootScene` :

```text
Lancement App
   └─► AdManager.init()
         ├─ 1. Capacitor.isNativePlatform() ? (sinon mode simulation web)
         ├─ 2. AdMob.initialize()
         ├─ 3. Google UMP : requestConsentInfo() -> showConsentForm() si requis
         └─ 4. Préchargement en tâche de fond (prepareInterstitial + prepareRewardVideo)
```

### Points d'appel dans `GameScene`
1. **Pause stricte avant toute pub** : `this.matter.world.pause()` + coupure du son (`soundFX`) avant `AdManager.showRewarded()` ou `showInterstitial()`, puis reprise propre au callback `Dismissed`.
2. **Rewarded Continue** : appelé depuis l'écran `GAME_OVER` (1x/partie). Sur `Rewarded`, supprime les 4 fruits les plus hauts avec explosion de particules, remet `dangerTimer = 0` et repasse en `READY`.
3. **Rewarded Boosters** :
   * *Secouer* : applique une vélocité aléatoire vers le haut/côté à tous les fruits actifs.
   * *Épingle* : active `PIN_MODE` ; le prochain tap sur un fruit le détruit avec confettis.
4. **Interstitial Game Over** : appelé uniquement lorsque le joueur clique sur **↻ REJOUER** (jamais en coupant l'écran de score brutalement) **ET** si :
   * `!StorageManager.isNoAds()`
   * `tempsDepuisLancement >= 60_000 ms`
   * `gamesPlayed % 2 === 0` (ou cooldown >= 90s entre deux interstitials).
