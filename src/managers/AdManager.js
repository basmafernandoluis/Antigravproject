import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { AdMob, AdmobConsentStatus, RewardAdPluginEvents } from '@capacitor-community/admob';
import { AD_RULES, AD_UNIT_IDS, IS_TESTING_ADS } from '../config/ads.js';
import { storageManager } from './StorageManager.js';
import { firebaseManager } from './FirebaseManager.js';

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

    const cooldownMs = firebaseManager.getNumber('interstitial_cooldown_ms', AD_RULES.INTERSTITIAL_COOLDOWN_MS);
    if (this.lastInterstitialTime > 0 && now - this.lastInterstitialTime < cooldownMs) {
      return false;
    }

    // Frequency cap: every N games
    const everyN = Math.max(1, firebaseManager.getNumber('interstitial_min_games', AD_RULES.INTERSTITIAL_EVERY_N_GAMES));
    const gamesPlayed = storageManager.getGamesPlayed();
    if (gamesPlayed === 0 || gamesPlayed % everyN !== 0) {
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
      firebaseManager.logEvent('ad_interstitial', { native: false });
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
      firebaseManager.logEvent('ad_interstitial', { native: true });
    } catch (err) {
      console.warn('[AdManager] Interstitial show failed:', err);
    } finally {
      this.isShowingAd = false;
      this.preloadInterstitial();
      onDismiss?.();
    }
    return true;
  }

  async showRewarded({ onStart, onReward, onDismiss, onNoReward, onError } = {}) {
    if (this.isShowingAd) return false;

    this.isShowingAd = true;
    onStart?.();

    if (!this.isNative()) {
      // Web simulation: reward granted after short delay
      setTimeout(() => {
        this.isShowingAd = false;
        try {
          firebaseManager.logEvent('ad_rewarded', { native: false });
        } catch {
          // Ignore
        }
        onReward?.();
        onDismiss?.();
      }, 350);
      return true;
    }

    let earnedReward = null;
    let rewardHandle = null;
    let dismissHandle = null;
    let failHandle = null;
    let appStateHandle = null;
    let onVisibility = null;
    let onFocus = null;
    let safetyTimer = null;
    let postRewardTimer = null;
    let hadError = false;
    let closeReason = 'unknown';

    try {
      if (!this.rewardedReady) {
        await this.preloadRewarded();
      }
      if (!this.rewardedReady) {
        throw new Error('Rewarded ad not ready');
      }

      this.rewardedReady = false;

      let closed = false;
      let resolveClosed;
      const closedPromise = new Promise((resolve) => {
        resolveClosed = (reason = 'unknown') => {
          if (closed) return;
          closed = true;
          closeReason = reason;
          resolve();
        };
      });

      const markEarned = (reward, source) => {
        console.info('[AdManager] Reward earned via', source, reward);
        if (!earnedReward) {
          earnedReward = reward || { type: 'reward', amount: 1 };
        }
        if (!postRewardTimer) {
          postRewardTimer = setTimeout(() => resolveClosed('post_reward_timer'), 1500);
        }
      };

      const adShownAt = Date.now();
      let sawBackground = false;

      rewardHandle = await AdMob.addListener(RewardAdPluginEvents.Rewarded, (reward) => {
        markEarned(reward, 'event_Rewarded');
      });
      dismissHandle = await AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
        resolveClosed('event_Dismissed');
      });
      failHandle = await AdMob.addListener(RewardAdPluginEvents.FailedToShow, () => {
        resolveClosed('event_FailedToShow');
      });

      // Fallbacks when returning from native AdActivity
      appStateHandle = await App.addListener('appStateChange', ({ isActive }) => {
        if (!isActive) {
          sawBackground = true;
        } else if (sawBackground || Date.now() - adShownAt > 800) {
          setTimeout(() => resolveClosed('appStateChange'), 250);
        }
      });

      onVisibility = () => {
        if (document.hidden) {
          sawBackground = true;
        } else if (sawBackground || Date.now() - adShownAt > 800) {
          setTimeout(() => resolveClosed('visibilitychange'), 250);
        }
      };
      document.addEventListener('visibilitychange', onVisibility);

      onFocus = () => {
        if (Date.now() - adShownAt > 800) {
          setTimeout(() => resolveClosed('window_focus'), 250);
        }
      };
      window.addEventListener('focus', onFocus);

      console.info('[AdManager] Calling AdMob.showRewardVideoAd()');
      AdMob.showRewardVideoAd()
        .then((rewardItem) => {
          console.info('[AdManager] showRewardVideoAd resolved:', rewardItem);
          if (rewardItem) {
            markEarned(rewardItem, 'promise_resolve');
          }
        })
        .catch((err) => {
          console.warn('[AdManager] showRewardVideoAd rejected:', err);
          resolveClosed('promise_rejected');
        });

      await Promise.race([
        closedPromise,
        new Promise((resolve) => {
          safetyTimer = setTimeout(() => {
            closeReason = 'safety_timeout';
            resolve();
          }, 90000);
        }),
      ]);

      // Give Capacitor bridge up to 800ms to flush Rewarded if Dismissed/Focus arrived first
      if (!earnedReward) {
        await new Promise((resolve) => setTimeout(resolve, 800));
      }

      if (earnedReward) {
        try {
          firebaseManager.logEvent('ad_rewarded', { native: true });
        } catch {
          // Ignore analytics failure
        }
      }
    } catch (err) {
      hadError = true;
      console.warn('[AdManager] Rewarded show failed:', err);
      onError?.(err);
    } finally {
      if (safetyTimer) clearTimeout(safetyTimer);
      if (postRewardTimer) clearTimeout(postRewardTimer);
      rewardHandle?.remove?.();
      dismissHandle?.remove?.();
      failHandle?.remove?.();
      appStateHandle?.remove?.();
      if (onVisibility) document.removeEventListener('visibilitychange', onVisibility);
      if (onFocus) window.removeEventListener('focus', onFocus);
      this.isShowingAd = false;
      this.preloadRewarded();
      console.info('[AdManager] Rewarded finally:', { earned: !!earnedReward, hadError, closeReason });
      onDismiss?.();
      if (earnedReward) {
        onReward?.(earnedReward);
      } else if (!hadError) {
        onNoReward?.(closeReason);
      }
    }
    return true;
  }
}

export const adManager = new AdManager();
