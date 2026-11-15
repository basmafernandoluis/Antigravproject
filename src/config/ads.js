// Configuration AdMob (IDs de test Google en dev, IDs de production en release)
export const IS_TESTING_ADS = import.meta.env.DEV;

export const ADMOB_TEST_IDS = {
  interstitial: 'ca-app-pub-3940256099942544/1033173712',
  rewardedInterstitial: 'ca-app-pub-3940256099942544/5354046379',
  rewarded: 'ca-app-pub-3940256099942544/5224354917',
};

export const ADMOB_PROD_IDS = {
  appId: 'ca-app-pub-7435856398879419~2712207989',
  interstitial: 'ca-app-pub-7435856398879419/6483932030',
  rewardedInterstitial: 'ca-app-pub-7435856398879419/4872622413',
};

export const AD_UNIT_IDS = IS_TESTING_ADS ? ADMOB_TEST_IDS : ADMOB_PROD_IDS;

export const AD_RULES = {
  MIN_FIRST_INTERSTITIAL_MS: 60_000, // Jamais de pub dans les 60 premières secondes
  INTERSTITIAL_EVERY_N_GAMES: 2,     // Max 1 interstitial toutes les 2 parties
  INTERSTITIAL_COOLDOWN_MS: 90_000,  // Cooldown minimum 90s entre deux interstitials
  MAX_CONTINUES_PER_GAME: 1,         // Max 1 Continue par partie
};
