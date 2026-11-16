const STORAGE_KEY = 'juicy_drop_save_v1';
const LEGACY_BEST_KEY = 'juicy_drop_best';

const DEFAULT_DATA = {
  bestScore: 0,
  maxTierReached: 0,
  gamesPlayed: 0,
  noAds: false,
  selectedTheme: 'cosmic',
  dailyStreak: 0,
  lastCompletedDate: '',
  dailyChallenge: {
    date: '',
    completed: false,
    gamesToday: 0,
  },
};

const DAILY_POOL = [
  { id: 'score_2000', title: 'Atteindre 2 000 pts en une partie', type: 'score', target: 2000 },
  { id: 'tier_7', title: 'Créer une Pêche (palier 8)', type: 'tier', target: 7 },
  { id: 'combo_3', title: 'Réaliser un combo ×3 ou plus', type: 'combo', target: 3 },
  { id: 'games_3', title: 'Jouer 3 parties aujourd’hui', type: 'games', target: 3 },
];

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

  getSelectedTheme() {
    return this.data.selectedTheme || 'cosmic';
  }

  setSelectedTheme(themeId) {
    this.data.selectedTheme = themeId;
    this.save();
  }

  _todayStr() {
    return new Date().toISOString().slice(0, 10);
  }

  _yesterdayStr() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  }

  getDailyChallenge() {
    const today = this._todayStr();
    if (!this.data.dailyChallenge || this.data.dailyChallenge.date !== today) {
      this.data.dailyChallenge = { date: today, completed: false, gamesToday: 0 };
      if (this.data.lastCompletedDate && this.data.lastCompletedDate !== this._yesterdayStr() && this.data.lastCompletedDate !== today) {
        this.data.dailyStreak = 0;
      }
      this.save();
    }
    const dayNum = Math.floor(new Date(today).getTime() / 86400000);
    const def = DAILY_POOL[Math.abs(dayNum) % DAILY_POOL.length];
    return {
      ...def,
      completed: Boolean(this.data.dailyChallenge.completed),
      gamesToday: this.data.dailyChallenge.gamesToday || 0,
      streak: this.data.dailyStreak || 0,
    };
  }

  recordDailyProgress({ score = 0, maxTier = 0, combo = 0, gameEnded = false } = {}) {
    const challenge = this.getDailyChallenge();
    if (gameEnded) {
      this.data.dailyChallenge.gamesToday = (this.data.dailyChallenge.gamesToday || 0) + 1;
      this.save();
    }
    if (challenge.completed) return false;

    let achieved = false;
    if (challenge.type === 'score' && score >= challenge.target) achieved = true;
    if (challenge.type === 'tier' && maxTier >= challenge.target) achieved = true;
    if (challenge.type === 'combo' && combo >= challenge.target) achieved = true;
    if (challenge.type === 'games' && this.data.dailyChallenge.gamesToday >= challenge.target) achieved = true;

    if (achieved) {
      const today = this._todayStr();
      this.data.dailyChallenge.completed = true;
      this.data.dailyStreak = this.data.lastCompletedDate === this._yesterdayStr()
        ? (this.data.dailyStreak || 0) + 1
        : Math.max(1, this.data.dailyStreak || 0);
      this.data.lastCompletedDate = today;
      this.save();
      return true;
    }
    return false;
  }
}

export const storageManager = new StorageManager();
