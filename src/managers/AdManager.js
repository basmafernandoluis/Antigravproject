import { Capacitor } from '@capacitor/core';
import { AdMob, AdmobConsentStatus } from '@capacitor-community/admob';
import { AD_RULES, AD_UNIT_IDS, IS_TESTING_ADS } from '../config/ads.js';
import { storageManager } from './StorageManager.js';

class AdManager {
  constructor() {
    this.initialized = false;
    this.appStartTime = Date.now();
    this.lastInterstitialTime = 0;
    this.interstitialReady = false;
    this.rewardedReady = false;
    this.isShowingAd = false;
  }

  isNative() {
    return Capacitor.isNativePlatform();
  }

  async init() {
    if (this.initialized) return;
    this.initialized = true;

    if (!this.isNative()) {
      // Web preview mode: simulate ready ads for testing UI flows
      this.interstitialReady = true;
      this.rewardedReady = true;
      return;
    }

    try {
      await AdMob.initialize({
        initializeForTesting: IS_TESTING_ADS,
      });

      await this.handleConsentUMP();

      // Preload ads in background
      this.preloadInterstitial();
      this.preloadRewarded();
    } catch (err) {
      console.warn('[AdManager] Init error:', err);
    }
  }

  async handleConsentUMP() {
    try {
      const consentInfo = await AdMob.requestConsentInfo();
      if (
        consentInfo.isConsentFormAvailable &&
        consentInfo.status === AdmobConsentStatus.REQUIRED
      ) {
        await AdMob.showConsentForm();
      }
    } catch (err) {
      console.warn('[AdManager] UMP consent error:', err);
    }
  }

  async showPrivacyOptions() {
    if (!this.isNative()) return;
    try {
      await AdMob.showPrivacyOptionsForm();
    } catch (err) {
      console.warn('[AdManager] Privacy options form unavailable:', err);
    }
  }

  async preloadInterstitial() {
    if (!this.isNative() || storageManager.isNoAds()) return;
    try {
      this.interstitialReady = false;
      await AdMob.prepareInterstitial({
        adId: AD_UNIT_IDS.interstitial,
        isTesting: IS_TESTING_ADS,
      });
      this.interstitialReady = true;
    } catch (err) {
      this.interstitialReady = false;
      console.warn('[AdManager] Interstitial preload failed:', err);
    }
  }

  async preloadRewarded() {
    if (!this.isNative()) return;
    try {
      this.rewardedReady = false;
      await AdMob.prepareRewardVideoAd({
        adId: AD_UNIT_IDS.rewarded,
        isTesting: IS_TESTING_ADS,
      });
      this.rewardedReady = true;
    } catch (err) {
      this.rewardedReady = false;
      console.warn('[AdManager] Rewarded preload failed:', err);
    }
  }

  canShowInterstitial() {
    if (storageManager.isNoAds()) return false;
    if (!this.interstitialReady || this.isShowingAd) return false;

    const now = Date.now();
    // Never show ads in the first 60 seconds
    if (now - this.appStartTime < AD_RULES.MIN_FIRST_INTERSTITIAL_MS) return false;

    // Cooldown between interstitials
    if (
      this.lastInterstitialTime > 0 &&
      now - this.lastInterstitialTime < AD_RULES.INTERSTITIAL_COOLDOWN_MS
    ) {
      return false;
    }

    // Frequency cap: every N games
    const gamesPlayed = storageManager.getGamesPlayed();
    if (gamesPlayed === 0 || gamesPlayed % AD_RULES.INTERSTITIAL_EVERY_N_GAMES !== 0) {
      return false;
    }

    return true;
  }

  async showInterstitialIfEligible({ onStart, onDismiss } = {}) {
    if (!this.canShowInterstitial()) {
      onDismiss?.();
      return false;
    }

    this.isShowingAd = true;
    onStart?.();

    if (!this.isNative()) {
      // Web simulation
      this.lastInterstitialTime = Date.now();
      setTimeout(() => {
        this.isShowingAd = false;
        onDismiss?.();
      }, 300);
      return true;
    }

    try {
      this.interstitialReady = false;
      await AdMob.showInterstitial();
      this.lastInterstitialTime = Date.now();
    } catch (err) {
      console.warn('[AdManager] Interstitial show failed:', err);
    } finally {
      this.isShowingAd = false;
      this.preloadInterstitial();
      onDismiss?.();
    }
    return true;
  }

  async showRewarded({ onStart, onReward, onDismiss, onError } = {}) {
    if (this.isShowingAd) return false;

    this.isShowingAd = true;
    onStart?.();

    if (!this.isNative()) {
      // Web simulation: reward granted after short delay
      setTimeout(() => {
        this.isShowingAd = false;
        onReward?.();
        onDismiss?.();
      }, 350);
      return true;
    }

    try {
      if (!this.rewardedReady) {
        await this.preloadRewarded();
      }
      if (!this.rewardedReady) {
        throw new Error('Rewarded ad not ready');
      }

      this.rewardedReady = false;
      const rewardItem = await AdMob.showRewardVideoAd();
      if (rewardItem) {
        onReward?.(rewardItem);
      }
    } catch (err) {
      console.warn('[AdManager] Rewarded show failed:', err);
      onError?.(err);
    } finally {
      this.isShowingAd = false;
      this.preloadRewarded();
      onDismiss?.();
    }
    return true;
  }
}

export const adManager = new AdManager();
