const STORAGE_KEY = 'juicy_drop_save_v1';
const LEGACY_BEST_KEY = 'juicy_drop_best';

const DEFAULT_DATA = {
  bestScore: 0,
  maxTierReached: 0,
  gamesPlayed: 0,
  noAds: false,
};

class StorageManager {
  constructor() {
    this.data = this.load();
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return { ...DEFAULT_DATA, ...JSON.parse(raw) };
      }
      // Migrate legacy best score if present
      const legacyBest = Number(localStorage.getItem(LEGACY_BEST_KEY) || 0);
      const initial = { ...DEFAULT_DATA, bestScore: legacyBest };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    } catch {
      return { ...DEFAULT_DATA };
    }
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      // Ignore storage quota errors
    }
  }

  getBestScore() {
    return this.data.bestScore;
  }

  updateBestScore(score) {
    if (score > this.data.bestScore) {
      this.data.bestScore = score;
      this.save();
      return true;
    }
    return false;
  }

  getMaxTierReached() {
    return this.data.maxTierReached;
  }

  updateMaxTier(tier) {
    if (tier > this.data.maxTierReached) {
      this.data.maxTierReached = tier;
      this.save();
      return true;
    }
    return false;
  }

  getGamesPlayed() {
    return this.data.gamesPlayed;
  }

  incrementGamesPlayed() {
    this.data.gamesPlayed += 1;
    this.save();
    return this.data.gamesPlayed;
  }

  isNoAds() {
    return Boolean(this.data.noAds);
  }

  setNoAds(value) {
    this.data.noAds = Boolean(value);
    this.save();
  }
}

export const storageManager = new StorageManager();
