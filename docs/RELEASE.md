# RELEASE.md — Checklist Publication Google Play Store

## 1. Pré-requis techniques & Identité
* [ ] Package définitif migré vers **`com.appwizards.juicydrop`** (`capacitor.config.json`, `android/app/build.gradle`, `AndroidManifest.xml`, `MainActivity.java`).
* [ ] `minSdkVersion = 24` et `targetSdkVersion = 36` vérifiés dans [variables.gradle](file:///home/antigravity/basmafernandoluis/Antigravproject/android/variables.gradle).
* [ ] `APPLICATION_ID` AdMob de production renseigné dans `AndroidManifest.xml` et blocs d'annonces (Interstitial + Rewarded) de production activés dans `src/config/ads.js`.

## 2. Keystore & Signature manuelle (Android Studio)
* [ ] **Créer le Keystore de production** (à faire une seule fois) :
  * Android Studio $\to$ *Build* $\to$ *Generate Signed Bundle / APK* $\to$ *Android App Bundle (AAB)* $\to$ *Create new...*
  * Sauvegarder le fichier `.jks` et ses mots de passe dans un coffre-fort sécurisé (et **jamais** sur GitHub).
* [ ] Activer **Play App Signing** lors de la première mise en ligne sur la Play Console.
* [ ] Générer le fichier **`app-release.aab`** signé.

## 3. Versioning (`android/app/build.gradle`)
* [ ] `versionCode` : entier incrémenté à chaque envoi sur la Play Console (`1`, `2`, `3`...).
* [ ] `versionName` : format sémantique (`"1.0.0"`, `"1.0.1"`...).

## 4. Assets graphiques & Fiche Play Store
* [ ] **Icône haute résolution** : 512×512 px (PNG 32 bits) + icônes adaptatives dans `android/app/src/main/res/mipmap-*`.
* [ ] **Image de présentation (Feature Graphic)** : 1024×500 px.
* [ ] **Captures d'écran** : minimum 4 captures portrait (1080×1920 px) montrant le gameplay, les fusions/confettis et les boosters.
* [ ] **Splash Screen** : personnalisé aux couleurs de *Juicy Drop* (`#13152e`).
* [ ] **Description ASO** : titre court + mots-clés (*merge, fruit, puzzle, physique, hyper-casual*).

## 5. Déclarations AdMob & Play Console
* [ ] **Contient des annonces** : cocher *Oui* dans *Contenu de l'application*.
* [ ] **Confidentialité & Sécurité des données** : lien vers la politique de confidentialité déjà hébergée + déclaration de l'ID publicitaire (AdMob).
* [ ] **Fichier `app-ads.txt`** : publié à la racine du domaine développeur et vérifié dans le tableau de bord AdMob (*Statut : Vérifié*).
* [ ] **Test fermé / interne** : valider l'AAB via la piste *Test interne* avant de passer en *Production*.
