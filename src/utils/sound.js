// Relaxed 16-bar (~43s) multi-section casual marimba & warm pad loop (frequencies in Hz)
// Sections: A (Cmaj7-Am7-Fmaj7-G6) -> A' (Em7-Am7-Dm7-G6) -> B (Fmaj7-G6-Em7-Am7) -> C (Dm7-G6-Cmaj7-Cmaj9)
const BGM_BASS = [
  // Section A (bars 1-4)
  130.81, 0, 0, 0, 196.0, 0, 0, 0,
  110.0, 0, 0, 0, 164.81, 0, 0, 0,
  87.31, 0, 0, 0, 130.81, 0, 0, 0,
  98.0, 0, 0, 0, 146.83, 0, 0, 0,
  // Section A' (bars 5-8)
  164.81, 0, 0, 0, 246.94, 0, 0, 0,
  110.0, 0, 0, 0, 164.81, 0, 0, 0,
  146.83, 0, 0, 0, 220.0, 0, 0, 0,
  98.0, 0, 0, 0, 146.83, 0, 0, 0,
  // Section B (bars 9-12, dreamy bridge)
  87.31, 0, 0, 0, 130.81, 0, 174.61, 0,
  98.0, 0, 0, 0, 146.83, 0, 196.0, 0,
  164.81, 0, 0, 0, 196.0, 0, 246.94, 0,
  110.0, 0, 0, 0, 164.81, 0, 0, 0,
  // Section C (bars 13-16, calm resolution with breathing room)
  146.83, 0, 0, 0, 220.0, 0, 0, 0,
  98.0, 0, 0, 0, 146.83, 0, 0, 0,
  130.81, 0, 0, 0, 196.0, 0, 0, 0,
  130.81, 0, 0, 0, 0, 0, 0, 0,
];

const BGM_MELODY = [
  // Section A
  523.25, 0, 659.25, 783.99, 0, 659.25, 587.33, 0,
  440.0, 0, 523.25, 659.25, 0, 523.25, 493.88, 0,
  349.23, 0, 440.0, 523.25, 0, 659.25, 523.25, 0,
  392.0, 0, 493.88, 587.33, 0, 523.25, 493.88, 0,
  // Section A'
  659.25, 0, 783.99, 987.77, 0, 783.99, 659.25, 0,
  523.25, 0, 659.25, 880.0, 0, 659.25, 587.33, 0,
  587.33, 0, 659.25, 698.46, 0, 659.25, 523.25, 0,
  493.88, 0, 587.33, 783.99, 0, 0, 587.33, 0,
  // Section B (sparse, gentle)
  698.46, 0, 0, 659.25, 0, 523.25, 0, 440.0,
  587.33, 0, 0, 523.25, 0, 493.88, 0, 392.0,
  659.25, 0, 783.99, 0, 659.25, 0, 493.88, 0,
  523.25, 0, 0, 440.0, 0, 0, 0, 0,
  // Section C (resolution + space)
  587.33, 0, 698.46, 880.0, 0, 783.99, 659.25, 0,
  587.33, 0, 493.88, 587.33, 0, 659.25, 587.33, 0,
  523.25, 0, 659.25, 783.99, 0, 587.33, 523.25, 0,
  523.25, 0, 0, 0, 0, 0, 0, 0,
];

// Soft warm pad chord roots played gently at the start of each bar (every 8 steps)
const BGM_PAD = [
  261.63, 220.0, 174.61, 196.0,
  329.63, 220.0, 293.66, 196.0,
  174.61, 196.0, 329.63, 220.0,
  293.66, 196.0, 261.63, 261.63,
];

class SoundFX {
  constructor() {
    this.ctx = null;
    this.muted = false; // SFX mute
    this.musicEnabled = true;
    this.musicPaused = false;
    this.musicTimer = null;
    this.musicStep = 0;
    this.musicGain = null;

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.stopMusicLoop();
        } else if (this.musicEnabled && !this.musicPaused) {
          this.startMusicLoop();
        }
      });
    }
  }

  _initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (this.ctx && !this.musicGain) {
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicEnabled && !this.musicPaused ? 0.5 : 0;
      this.musicGain.connect(this.ctx.destination);
    }
    if (this.ctx && this.musicEnabled && !this.musicPaused && !this.musicTimer) {
      this.startMusicLoop();
    }
    return this.ctx;
  }

  ensureContext() {
    const ctx = this._initContext();
    if (this.muted) return null;
    return ctx;
  }

  setSfxEnabled(enabled) {
    this.muted = !enabled;
    return !this.muted;
  }

  setMusicEnabled(enabled) {
    this.musicEnabled = Boolean(enabled);
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(
        this.musicEnabled && !this.musicPaused ? 0.5 : 0,
        this.ctx.currentTime,
        0.05
      );
    }
    if (this.musicEnabled && !this.musicPaused) {
      this._initContext();
      this.startMusicLoop();
    } else {
      this.stopMusicLoop();
    }
    return this.musicEnabled;
  }

  pauseAllForAd() {
    this.wasSfxMutedBeforeAd = this.muted;
    this.muted = true;
    this.musicPaused = true;
    this.stopMusicLoop();
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.02);
    }
  }

  resumeAllFromAd() {
    this.muted = this.wasSfxMutedBeforeAd ?? false;
    this.musicPaused = false;
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(this.musicEnabled ? 0.5 : 0, this.ctx.currentTime, 0.05);
    }
    if (this.musicEnabled) {
      this.startMusicLoop();
    }
  }

  startMusicLoop() {
    if (this.musicTimer || !this.musicEnabled || this.musicPaused) return;
    if (!this.ctx || !this.musicGain) return;
    if (typeof document !== 'undefined' && document.hidden) return;

    const stepMs = 340; // ~88 BPM relaxed eighth notes (128 steps = ~43.5s per full cycle)
    const tick = () => {
      if (!this.musicEnabled || this.musicPaused || !this.ctx || this.ctx.state !== 'running') return;
      const len = BGM_MELODY.length;
      const idx = this.musicStep % len;
      const cycle = Math.floor(this.musicStep / len);
      this.musicStep += 1;

      const now = this.ctx.currentTime;

      // 1. Warm sustained pad on bar downbeats (every 8 steps)
      if (idx % 8 === 0) {
        const padFreq = BGM_PAD[Math.floor(idx / 8) % BGM_PAD.length];
        if (padFreq > 0) {
          const osc = this.ctx.createOscillator();
          const g = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(padFreq, now);
          g.gain.setValueAtTime(0.001, now);
          g.gain.linearRampToValueAtTime(0.022, now + 0.35);
          g.gain.exponentialRampToValueAtTime(0.0008, now + 2.4);
          osc.connect(g);
          g.connect(this.musicGain);
          osc.start(now);
          osc.stop(now + 2.45);
        }
      }

      // 2. Soft bass pulse
      const bassFreq = BGM_BASS[idx];
      if (bassFreq > 0) {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(bassFreq, now);
        g.gain.setValueAtTime(0.001, now);
        g.gain.linearRampToValueAtTime(0.036, now + 0.04);
        g.gain.exponentialRampToValueAtTime(0.0008, now + 0.65);
        osc.connect(g);
        g.connect(this.musicGain);
        osc.start(now);
        osc.stop(now + 0.68);
      }

      // 3. Gentle marimba melody with subtle cycle-based variation
      let melFreq = BGM_MELODY[idx];
      if (melFreq > 0) {
        // Subtle variation on subsequent passes so it stays fresh
        if (cycle % 2 === 1 && idx % 16 === 6) {
          melFreq = 0; // Leave extra breathing room on odd cycles
        } else if (cycle % 3 === 2 && idx % 16 === 10) {
          melFreq *= 1.5; // Occasional gentle fifth shimmer
        }
      }
      if (melFreq > 0) {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(melFreq, now);
        g.gain.setValueAtTime(0.001, now);
        g.gain.linearRampToValueAtTime(0.026, now + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0008, now + 0.36);
        osc.connect(g);
        g.connect(this.musicGain);
        osc.start(now);
        osc.stop(now + 0.38);
      }
    };

    this.musicTimer = setInterval(tick, stepMs);
  }

  stopMusicLoop() {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  playDrop() {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(160, now + 0.09);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  playClick() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(680, now + 0.045);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.055);
  }

  playImpact(speed = 5) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const vol = Math.min(0.14, 0.03 + speed * 0.01);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(65, now + 0.06);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  playMerge(tier, combo = 1) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Pentatonic-ish ascending pitch based on tier + combo
    const baseFreq = 260 + tier * 48 + Math.min(combo - 1, 5) * 35;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(baseFreq, now);
    osc1.frequency.exponentialRampToValueAtTime(baseFreq * 1.45, now + 0.14);

    gain1.gain.setValueAtTime(0.22, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.19);

    if (tier >= 4 || combo >= 2) {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(baseFreq * 1.5, now + 0.04);
      osc2.frequency.exponentialRampToValueAtTime(baseFreq * 2.0, now + 0.22);

      gain2.gain.setValueAtTime(0.14, now + 0.04);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.04);
      osc2.stop(now + 0.25);
    }
  }

  playGameOver() {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [330, 277, 220];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      const t = now + i * 0.12;
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.88, t + 0.14);

      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.17);
    });
  }

  playDangerTick() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(760, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.035);
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.045);
  }

  playComboBanner() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const t = now + i * 0.045;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.11, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.17);
    });
  }

  playLevelWin() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const t = now + i * 0.085;
      const dur = i === notes.length - 1 ? 0.36 : 0.14;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.16, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    });
  }
}

export const soundFX = new SoundFX();
