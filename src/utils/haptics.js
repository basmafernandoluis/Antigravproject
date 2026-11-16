class HapticsManager {
  constructor() {
    this.enabled = true;
  }

  setEnabled(val) {
    this.enabled = Boolean(val);
  }

  vibrate(pattern) {
    if (!this.enabled) return;
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Ignore on unsupported webviews
      }
    }
  }

  drop() {
    this.vibrate(10);
  }

  merge(tier = 0, combo = 1) {
    if (combo >= 3 || tier >= 6) {
      this.vibrate([18, 24, 24]);
    } else if (tier >= 3) {
      this.vibrate(18);
    } else {
      this.vibrate(12);
    }
  }

  dangerTick() {
    this.vibrate(8);
  }

  levelWin() {
    this.vibrate([25, 35, 25, 35, 65]);
  }

  gameOver() {
    this.vibrate([55, 35, 75]);
  }
}

export const haptics = new HapticsManager();
