import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported as isAnalyticsSupported, logEvent as fbLogEvent } from 'firebase/analytics';
import { getRemoteConfig, fetchAndActivate, getValue } from 'firebase/remote-config';
import { getAuth, signInAnonymously } from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { buildWeeklyLeaderboard } from '../config/leagues.js';

const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyAEIZESgBVVdICCKFUQ61kmIbnkDGnoK28',
  authDomain: 'juicy-drop-ac732.firebaseapp.com',
  projectId: 'juicy-drop-ac732',
  storageBucket: 'juicy-drop-ac732.firebasestorage.app',
  messagingSenderId: '90643269212',
  appId: '1:90643269212:android:28d2cef98bc5f2ee5d8899',
};

const REMOTE_DEFAULTS = {
  interstitial_cooldown_ms: 120000,
  interstitial_min_games: 2,
  extra_moves_bonus: 0,
  score_multiplier: 1,
  apple_unlock_score: 600,
  pear_unlock_score: 1800,
};

const PLAYER_ID_KEY = 'juicy_drop_player_id';
const PLAYER_NAME_KEY = 'juicy_drop_player_name';
const LAST_BEST_KEY = 'juicy_drop_last_fb_best';

class FirebaseManager {
  constructor() {
    this.initialized = false;
    this.app = null;
    this.analytics = null;
    this.remoteConfig = null;
    this.auth = null;
    this.db = null;
    this.uid = null;
    this.cachedBoard = null;
  }

  _getLocalPlayerId() {
    try {
      let id = localStorage.getItem(PLAYER_ID_KEY);
      if (!id) {
        id = `p_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
        localStorage.setItem(PLAYER_ID_KEY, id);
      }
      return id;
    } catch {
      return `p_${Date.now().toString(36)}`;
    }
  }

  getPlayerName() {
    try {
      let name = localStorage.getItem(PLAYER_NAME_KEY);
      if (!name) {
        const num = Math.floor(1000 + Math.random() * 9000);
        name = `Juicy#${num}`;
        localStorage.setItem(PLAYER_NAME_KEY, name);
      }
      return name;
    } catch {
      return 'JuicyPlayer';
    }
  }

  async init() {
    if (this.initialized) return;
    this.initialized = true;
    this.uid = this._getLocalPlayerId();

    try {
      this.app = initializeApp(FIREBASE_CONFIG);

      // 1. Analytics (safe in WebView/browser)
      isAnalyticsSupported()
        .then((supported) => {
          if (supported) {
            this.analytics = getAnalytics(this.app);
          }
        })
        .catch(() => {});

      // 2. Remote Config
      try {
        this.remoteConfig = getRemoteConfig(this.app);
        this.remoteConfig.settings = { minimumFetchIntervalMillis: 3600000 };
        this.remoteConfig.defaultConfig = REMOTE_DEFAULTS;
        fetchAndActivate(this.remoteConfig).catch(() => {});
      } catch {
        // Ignore if Remote Config is unavailable offline
      }

      // 3. Anonymous Auth + Firestore
      try {
        this.auth = getAuth(this.app);
        this.db = getFirestore(this.app);
        signInAnonymously(this.auth)
          .then((cred) => {
            if (cred?.user?.uid) {
              this.uid = cred.user.uid;
            }
          })
          .catch(() => {});
      } catch {
        // Ignore if Auth/Firestore unavailable
      }
    } catch {
      // Never block gameplay if Firebase fails to init
    }
  }

  logEvent(eventName, params = {}) {
    if (!this.analytics) return;
    try {
      fbLogEvent(this.analytics, eventName, params);
    } catch {
      // Ignore analytics errors
    }
  }

  getNumber(key, fallback) {
    const def = fallback !== undefined ? fallback : REMOTE_DEFAULTS[key] ?? 0;
    if (!this.remoteConfig) return def;
    try {
      const val = getValue(this.remoteConfig, key).asNumber();
      return Number.isFinite(val) ? val : def;
    } catch {
      return def;
    }
  }

  async submitScore({ bestScore = 0, campaignLevel = 1 }) {
    if (!this.db || !this.uid || bestScore <= 0) return false;
    try {
      const lastBest = Number(localStorage.getItem(LAST_BEST_KEY) || 0);
      if (bestScore <= lastBest) return false;

      const ref = doc(this.db, 'leaderboard', this.uid);
      await setDoc(
        ref,
        {
          name: this.getPlayerName(),
          bestScore,
          campaignLevel,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      localStorage.setItem(LAST_BEST_KEY, String(bestScore));
      return true;
    } catch {
      return false;
    }
  }

  async fetchLeaderboard(playerBestScore = 0, maxRows = 8) {
    if (!this.db) {
      return { rows: buildWeeklyLeaderboard(playerBestScore), isLive: false };
    }
    try {
      const q = query(
        collection(this.db, 'leaderboard'),
        orderBy('bestScore', 'desc'),
        limit(maxRows)
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        return { rows: buildWeeklyLeaderboard(playerBestScore), isLive: false };
      }

      const rows = [];
      let playerIncluded = false;
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        const isPlayer = docSnap.id === this.uid;
        if (isPlayer) playerIncluded = true;
        rows.push({
          name: d.name || 'Player',
          pts: d.bestScore || 0,
          isPlayer,
        });
      });

      if (!playerIncluded) {
        rows.push({
          name: this.getPlayerName(),
          pts: playerBestScore,
          isPlayer: true,
        });
      }

      rows.sort((a, b) => b.pts - a.pts);
      const ranked = rows.slice(0, maxRows).map((r, idx) => ({ ...r, rank: idx + 1 }));
      this.cachedBoard = ranked;
      return { rows: ranked, isLive: true };
    } catch {
      return {
        rows: this.cachedBoard || buildWeeklyLeaderboard(playerBestScore),
        isLive: Boolean(this.cachedBoard),
      };
    }
  }
}

export const firebaseManager = new FirebaseManager();
