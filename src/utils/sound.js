// Relaxed 4-bar Cmaj7 -> Am7 -> Fmaj7 -> G6 casual marimba loop (frequencies in Hz)
const BGM_BASS = [
  130.81, 0, 0, 0, 196.0, 0, 0, 0, // C3 -> G3
  110.0, 0, 0, 0, 164.81, 0, 0, 0, // A2 -> E3
  87.31, 0, 0, 0, 130.81, 0, 0, 0, // F2 -> C3
  98.0, 0, 0, 0, 146.83, 0, 0, 0, // G2 -> D3
];

const BGM_MELODY = [
  523.25, 0, 659.25, 783.99, 0, 659.25, 587.33, 0, // C5 E5 G5 E5 D5
  440.0, 0, 523.25, 659.25, 0, 523.25, 493.88, 0, // A4 C5 E5 C5 B4
  349.23, 0, 440.0, 523.25, 0, 659.25, 523.25, 0, // F4 A4 C5 E5 C5
  392.0, 0, 493.88, 587.33, 0, 659.25, 587.33, 0, // G4 B4 D5 E5 D5
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
      this.musicGain.gain.value = this.musicEnabled && !this.musicPaused ? 0.55 : 0;
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
        this.musicEnabled && !this.musicPaused ? 0.55 : 0,
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
      this.musicGain.gain.setTargetAtTime(this.musicEnabled ? 0.55 : 0, this.ctx.currentTime, 0.05);
    }
    if (this.musicEnabled) {
      this.startMusicLoop();
    }
  }

  startMusicLoop() {
    if (this.musicTimer || !this.musicEnabled || this.musicPaused) return;
    if (!this.ctx || !this.musicGain) return;
    if (typeof document !== 'undefined' && document.hidden) return;

    const stepMs = 320; // ~93 BPM eighth notes
    const tick = () => {
      if (!this.musicEnabled || this.musicPaused || !this.ctx || this.ctx.state !== 'running') return;
      const idx = this.musicStep % BGM_MELODY.length;
      this.musicStep += 1;

      const now = this.ctx.currentTime;
      const bassFreq = BGM_BASS[idx];
      if (bassFreq > 0) {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(bassFreq, now);
        g.gain.setValueAtTime(0.001, now);
        g.gain.linearRampToValueAtTime(0.045, now + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0008, now + 0.58);
        osc.connect(g);
        g.connect(this.musicGain);
        osc.start(now);
        osc.stop(now + 0.6);
      }

      const melFreq = BGM_MELODY[idx];
      if (melFreq > 0) {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(melFreq, now);
        g.gain.setValueAtTime(0.001, now);
        g.gain.linearRampToValueAtTime(0.032, now + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0008, now + 0.28);
        osc.connect(g);
        g.connect(this.musicGain);
        osc.start(now);
        osc.stop(now + 0.3);
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
