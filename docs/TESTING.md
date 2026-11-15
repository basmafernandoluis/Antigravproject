# TESTING.md — Stratégie de test & Checklist pré-build

## 1. Stratégie de test
* **Règle d'or AdMob** : Toujours utiliser les **IDs de test officiels Google** pendant tout le développement et les tests APK internes. Ne jamais cliquer sur ses propres annonces en production (risque de suspension du compte AdMob).
* **Test multi-plateforme** :
  * **Navigateur PC (Vite)** : Valider rapidement la physique Matter.js, les fusions, les combos et les fallbacks simulés de `AdManager`.
  * **Appareil Android physique** : Valider le tactile, les performances à 60 FPS, le cycle de vie audio/pause pendant les pubs, et le SDK Google UMP.

---

## 2. Scénarios de test critiques
1. **Consentement RGPD (UMP)** : Vérifier que la boîte de dialogue de consentement apparaît au premier lancement (simuler une IP EEA dans les options de debug UMP) et que les pubs se chargent après validation.
2. **Garde-fou 60 secondes** : Lancer l'app, perdre volontairement en < 30 secondes, cliquer sur *Rejouer* $\to$ **aucun Interstitial** ne doit s'afficher.
3. **Rewarded Continue (1x/partie)** :
   * Perdre $\to$ cliquer *"🎬 Continuer"* $\to$ regarder la pub de test jusqu'au bout $\to$ vérifier que les 4 fruits du haut explosent, `dangerTimer` est à 0, et le bouton *Continue* n'est plus proposé sur la 2e défaite de la même partie.
   * Fermer la pub Rewarded avant la fin $\to$ vérifier que la récompense n'est **pas** accordée et que le jeu reste stable.
4. **Pause Audio & Physique pendant les pubs** : Vérifier que le son et la gravité sont en pause durant la vidéo pub et reprennent proprement à la fermeture.
5. **Mode hors-ligne (Avion)** : Lancer le jeu sans réseau $\to$ les boutons Rewarded doivent afficher un état indisponible/grisé ou un message propre sans bloquer le Game Over.

---

## 3. Checklist obligatoire avant chaque build Android

- [ ] `npm run build` passe sans erreur ni warning critique.
- [ ] `npx cap sync android` exécuté après toute modification dans `src/`.
- [ ] `appId` vérifié : **`com.appwizards.juicydrop`** dans [capacitor.config.json](file:///home/antigravity/basmafernandoluis/Antigravproject/capacitor.config.json) et `android/app/build.gradle`.
- [ ] **IDs AdMob** : IDs de **test** pour les builds debug/internes ; IDs de **production** uniquement pour le build Release AAB.
- [ ] `versionCode` incrémenté et `versionName` mis à jour avant chaque export Play Store.
- [ ] Test rapide sur appareil physique : chute, fusion, *screen shake*, confettis, Game Over, *Rejouer*.
