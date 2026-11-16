import { detectSystemLang, setLang as applyI18nLang, t, getFruitName } from '../config/i18n.js';

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
  xp: 0,
  level: 1,
  freeTokens: 1,
  lang: '',
  hapticsEnabled: true,
  gameMode: 'levels',
  campaignLevel: 1,
  levelStars: {},
  seasonPoints: 0,
  claimedCareerQuests: [],
  bestComboEver: 0,
  dailyChallenge: {
    date: '',
    completed: false,
    gamesToday: 0,
    bestScoreToday: 0,
    maxTierToday: 0,
    bestComboToday: 0,
    claimedIds: [],
  },
};

const RANKS = [
  { minLvl: 11, label: '🍉 Légende Pastèque' },
  { minLvl: 8, label: '🍍 Maître Juicy' },
  { minLvl: 5, label: '🍊 Chef Fruitier' },
  { minLvl: 3, label: '🍒 Apprenti' },
  { minLvl: 1, label: '🌱 Graine' },
];

class StorageManager {
  constructor() {
    this.data = this.load();
    const lang = this.data.lang || detectSystemLang();
    this.data.lang = lang;
    applyI18nLang(lang);
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          ...DEFAULT_DATA,
          ...parsed,
          dailyChallenge: {
            ...DEFAULT_DATA.dailyChallenge,
            ...(parsed.dailyChallenge || {}),
          },
        };
      }
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

  getLang() {
    return this.data.lang || 'fr';
  }

  setLang(lang) {
    this.data.lang = lang;
    applyI18nLang(lang);
    this.save();
  }

  isHapticsEnabled() {
    return this.data.hapticsEnabled !== false;
  }

  setHapticsEnabled(val) {
    this.data.hapticsEnabled = Boolean(val);
    this.save();
  }

  getGameMode() {
    return this.data.gameMode === 'endless' ? 'endless' : 'levels';
  }

  setGameMode(mode) {
    this.data.gameMode = mode === 'endless' ? 'endless' : 'levels';
    this.save();
  }

  getCampaignLevel() {
    return Math.max(1, this.data.campaignLevel || 1);
  }

  completeCampaignLevel(levelNum, stars) {
    const prev = this.data.levelStars?.[levelNum] || 0;
    if (!this.data.levelStars) this.data.levelStars = {};
    if (stars > prev) {
      this.data.levelStars[levelNum] = stars;
    }
    if (levelNum >= (this.data.campaignLevel || 1)) {
      this.data.campaignLevel = levelNum + 1;
    }
    this.data.seasonPoints = (this.data.seasonPoints || 0) + 120 + stars * 40;
    this.save();
  }

  getSeasonPoints() {
    return this.data.seasonPoints || 0;
  }

  addSeasonPoints(pts) {
    if (pts <= 0) return;
    this.data.seasonPoints = (this.data.seasonPoints || 0) + pts;
    this.save();
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

  _ensureDailyToday() {
    const today = this._todayStr();
    if (!this.data.dailyChallenge || this.data.dailyChallenge.date !== today) {
      this.data.dailyChallenge = {
        date: today,
        completed: false,
        gamesToday: 0,
        bestScoreToday: 0,
        maxTierToday: 0,
        bestComboToday: 0,
        claimedIds: [],
      };
      if (
        this.data.lastCompletedDate &&
        this.data.lastCompletedDate !== this._yesterdayStr() &&
        this.data.lastCompletedDate !== today
      ) {
        this.data.dailyStreak = 0;
      }
      this.save();
    }
    return this.data.dailyChallenge;
  }

  getDailyChallenge() {
    const dc = this._ensureDailyToday();
    return {
      id: 'daily_score_1500',
      title: t('questDailyScore', { target: '1 500' }),
      completed: Boolean(dc.completed),
      gamesToday: dc.gamesToday || 0,
      streak: this.data.dailyStreak || 0,
    };
  }

  recordDailyProgress({ score = 0, maxTier = 0, combo = 0, gameEnded = false } = {}) {
    const dc = this._ensureDailyToday();
    let changed = false;

    if (gameEnded) {
      dc.gamesToday = (dc.gamesToday || 0) + 1;
      changed = true;
    }
    if (score > (dc.bestScoreToday || 0)) {
      dc.bestScoreToday = score;
      changed = true;
    }
    if (maxTier > (dc.maxTierToday || 0)) {
      dc.maxTierToday = maxTier;
      changed = true;
    }
    if (combo > (dc.bestComboToday || 0)) {
      dc.bestComboToday = combo;
      changed = true;
    }
    if (combo > (this.data.bestComboEver || 0)) {
      this.data.bestComboEver = combo;
      changed = true;
    }

    if (!dc.completed && dc.bestScoreToday >= 1500) {
      const today = this._todayStr();
      dc.completed = true;
      this.data.dailyStreak =
        this.data.lastCompletedDate === this._yesterdayStr()
          ? (this.data.dailyStreak || 0) + 1
          : Math.max(1, this.data.dailyStreak || 0);
      this.data.lastCompletedDate = today;
      changed = true;
    }

    if (changed) this.save();
    return dc.completed;
  }

  getQuests() {
    const dc = this._ensureDailyToday();
    const claimedDaily = dc.claimedIds || [];
    const claimedCareer = this.data.claimedCareerQuests || [];

    const list = [
      {
        id: 'daily_score_1500',
        scope: 'daily',
        title: t('questDailyScore', { target: '1 500' }),
        progress: Math.min(1500, dc.bestScoreToday || 0),
        target: 1500,
        completed: (dc.bestScoreToday || 0) >= 1500,
        claimed: claimedDaily.includes('daily_score_1500'),
        rewardXp: 180,
        rewardSeason: 200,
        rewardToken: 1,
      },
      {
        id: 'daily_tier_6',
        scope: 'daily',
        title: t('questDailyTier', { fruit: getFruitName(6) }),
        progress: Math.min(1, (dc.maxTierToday || 0) >= 6 ? 1 : 0),
        target: 1,
        completed: (dc.maxTierToday || 0) >= 6,
        claimed: claimedDaily.includes('daily_tier_6'),
        rewardXp: 150,
        rewardSeason: 180,
        rewardToken: 0,
      },
      {
        id: 'daily_combo_3',
        scope: 'daily',
        title: t('questDailyCombo', { target: 3 }),
        progress: Math.min(3, dc.bestComboToday || 0),
        target: 3,
        completed: (dc.bestComboToday || 0) >= 3,
        claimed: claimedDaily.includes('daily_combo_3'),
        rewardXp: 140,
        rewardSeason: 150,
        rewardToken: 1,
      },
      {
        id: 'career_lvl_3',
        scope: 'career',
        title: t('questCareerLevel', { target: 3 }),
        progress: Math.min(3, this.getCampaignLevel() - 1),
        target: 3,
        completed: this.getCampaignLevel() > 3,
        claimed: claimedCareer.includes('career_lvl_3'),
        rewardXp: 250,
        rewardSeason: 300,
        rewardToken: 1,
      },
      {
        id: 'career_games_5',
        scope: 'career',
        title: t('questCareerGames', { target: 5 }),
        progress: Math.min(5, this.data.gamesPlayed || 0),
        target: 5,
        completed: (this.data.gamesPlayed || 0) >= 5,
        claimed: claimedCareer.includes('career_games_5'),
        rewardXp: 200,
        rewardSeason: 250,
        rewardToken: 1,
      },
    ];
    return list;
  }

  hasClaimableQuests() {
    return this.getQuests().some((q) => q.completed && !q.claimed);
  }

  claimQuest(id) {
    const quest = this.getQuests().find((q) => q.id === id);
    if (!quest || !quest.completed || quest.claimed) return null;

    if (quest.scope === 'daily') {
      const dc = this._ensureDailyToday();
      if (!dc.claimedIds) dc.claimedIds = [];
      dc.claimedIds.push(id);
    } else {
      if (!this.data.claimedCareerQuests) this.data.claimedCareerQuests = [];
      this.data.claimedCareerQuests.push(id);
    }

    if (quest.rewardToken > 0) {
      this.data.freeTokens = (this.data.freeTokens || 0) + quest.rewardToken;
    }
    this.data.seasonPoints = (this.data.seasonPoints || 0) + (quest.rewardSeason || 0);
    this.save();
    const rankRes = this.addXp(quest.rewardXp || 0);
    return { quest, rankRes };
  }

  getXpNeeded(level) {
    return 400 + (level - 1) * 250;
  }

  getRankInfo() {
    const level = this.data.level || 1;
    const xp = this.data.xp || 0;
    const needed = this.getXpNeeded(level);
    const rankObj = RANKS.find((r) => level >= r.minLvl) || RANKS[RANKS.length - 1];
    return {
      level,
      xp,
      needed,
      ratio: Math.min(1, xp / needed),
      rankLabel: rankObj.label,
      freeTokens: this.data.freeTokens ?? 0,
    };
  }

  addXp(amount) {
    if (amount <= 0) return { leveledUp: false, levelsGained: 0, ...this.getRankInfo() };
    this.data.xp = (this.data.xp || 0) + amount;
    this.data.level = this.data.level || 1;
    let levelsGained = 0;

    while (this.data.xp >= this.getXpNeeded(this.data.level)) {
      this.data.xp -= this.getXpNeeded(this.data.level);
      this.data.level += 1;
      this.data.freeTokens = (this.data.freeTokens || 0) + 1;
      levelsGained += 1;
    }
    this.save();
    return { leveledUp: levelsGained > 0, levelsGained, ...this.getRankInfo() };
  }

  getFreeTokens() {
    return this.data.freeTokens ?? 0;
  }

  consumeFreeToken() {
    if ((this.data.freeTokens || 0) > 0) {
      this.data.freeTokens -= 1;
      this.save();
      return true;
    }
    return false;
  }
}

export const storageManager = new StorageManager();
