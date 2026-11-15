# MONETIZATION.md — Stratégie, Revenus & Conformité

## 1. Philosophie & Hiérarchie des formats
Principe directeur : **Rewarded > Interstitial > Aucun Banner**.
* **Zéro Banner** : Les bannières sur Android génèrent un eCPM très faible (0,20–0,50 €), grignotent l'espace vertical précieux du bocal 9:16 et causent des clics accidentels frustrants.
* **Zéro pub dans les 60 premières secondes** : Le joueur doit d'abord ressentir le *Game Feel* (fusions, confettis, screen shake) avant toute interruption.

## 2. Emplacements & Fréquences retenus

| Format | Emplacement | Fréquence / Garde-fou | Justification |
| :--- | :--- | :--- | :--- |
| **Rewarded Video** | **Continue** (Game Over) | Max **1 fois par partie** (détruit les 4 fruits du haut) | Meilleur taux d'opt-in (~25–40 %) quand la partie dure 2–4 min et que le joueur est proche d'un record. |
| **Rewarded Video** | **Boosters** (*Secouer*, *Épingle*) | À la demande (1 pub = 1 usage) | Monétise les joueurs bloqués sans imposer de pub forcée. |
| **Rewarded Video** | **Score x2** (Game Over) | Optionnel en fin de partie (si non continué ou après défaite) | Augmente les impressions Rewarded sans friction. |
| **Interstitial** | Clic sur **↻ REJOUER** | Jamais < 60s ; **1 partie sur 2** + cooldown min **90s** | Un cap strict évite la chute de rétention D1 tout en monétisant les joueurs qui ne cliquent pas sur les Rewarded. |
| **IAP (Phase 2)** | Réglages : **"Retirer les pubs"** | Achat unique **2,49 €** | Supprime les Interstitials tout en laissant les Rewarded volontaires (boosters/Continue). |

---

## 3. Estimation des revenus & Test UA
Pour un jeu puzzle/merge hyper-casual Android en trafic mixte (Europe / Amérique du Nord / Reste du monde) :
* **eCPM réalistes (AdMob seul)** :
  * *Rewarded* : **6 € – 12 €** (Tier 1) | **2,50 € – 5 €** (moyenne globale)
  * *Interstitial* : **3 € – 6 €** (Tier 1) | **1,20 € – 2,50 €** (moyenne globale)
* **ARPDAU estimé** : **0,015 € à 0,035 €** (base : ~1,2 Rewarded + ~0,8 Interstitial par DAU/jour).
* **Seuil pour l'objectif (50 € – 200 €/mois)** :
  * À **0,025 € d'ARPDAU**, il faut **~70 DAU** pour atteindre **52 €/mois** et **~265 DAU** pour atteindre **200 €/mois**.
* **Budget UA test (50 € – 300 €)** : Avec un CPI cible de **0,15 € – 0,35 €**, ce budget achète **~300 à 1 500 installations**. L'objectif de ce test n'est pas le ROI immédiat mais de mesurer la **rétention D1 (cible ≥ 30 %)** et l'**eCPM réel** avant d'investir davantage ou de miser sur le viral TikTok.

---

## 4. Plan de Test A/B (Post-lancement)
Ne tester qu'**une seule variable à la fois** sur des cohortes de ≥ 500 utilisateurs :
1. **Test A/B #1 — Fréquence Interstitial** : `1 partie sur 2 (cooldown 90s)` vs `1 partie sur 3 (cooldown 120s)`. KPI : *Rétention D1 vs Revenu total*.
2. **Test A/B #2 — Prix "Retirer les pubs" (Phase 2)** : `1,99 €` vs `2,99 €`. KPI : *Taux de conversion IAP*.

---

## 5. Checklist de conformité obligatoire
* [ ] **Google UMP SDK** actif et testé (consentement RGPD Europe/UK avant toute requête pub).
* [ ] **Politique de confidentialité** à jour sur ton site (mentionnant AdMob, identifiant publicitaire Android et données collectées) + lien renseigné dans la Play Console.
* [ ] **`app-ads.txt`** déposé à la racine de ton domaine (`https://ton-domaine.com/app-ads.txt`) avec la ligne exacte fournie par AdMob.
* [ ] **Play Console Data Safety** & **App Content** : déclarer *"Contient des annonces"* et l'utilisation de l'ID publicitaire.
* [ ] **Respect des règles AdMob** : jamais de clics incités sur les Interstitials ; boutons Rewarded clairement étiquetés (*"Regarder une pub"* / icône 🎬).
