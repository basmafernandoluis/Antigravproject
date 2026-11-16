import Phaser from 'phaser';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { FRUITS, MAX_SPAWN_TIER } from '../config/fruits.js';
import { AD_RULES } from '../config/ads.js';
import { generateGameTextures } from '../utils/textures.js';
import { soundFX } from '../utils/sound.js';
import { haptics } from '../utils/haptics.js';
import { adManager } from '../managers/AdManager.js';
import { storageManager } from '../managers/StorageManager.js';
import { firebaseManager } from '../managers/FirebaseManager.js';
import { THEMES, getThemeById } from '../config/themes.js';
import { t, getFruitName, SUPPORTED_LANGS } from '../config/i18n.js';
import { getLevelConfig } from '../config/levels.js';
import { getLeagueForPoints, buildWeeklyLeaderboard } from '../config/leagues.js';

const GAME_WIDTH = 480;
const GAME_HEIGHT = 854;
const FONT_FAMILY = 'Fredoka, "Arial Rounded MT Bold", "Trebuchet MS", sans-serif';

// Container / Jar geometry (calibrated for 2-4 min Sweet Spot)
const JAR_LEFT = 62;
const JAR_RIGHT = 418;
const JAR_TOP = 262;
const JAR_BOTTOM = 758;
const WALL_THICKNESS = 24;
const DANGER_Y = 290;
const DROP_Y = 212;

const CONFETTI_COLORS = [0xff3b5c, 0xffd166, 0x06d6a0, 0x118ab2, 0x9b5de5, 0xff7b00];

const RUN_MISSIONS = [
  { type: 'tier', target: 4, reward: 150 },
  { type: 'combo', target: 2, reward: 200 },
  { type: 'tier', target: 5, reward: 250 },
  { type: 'score', target: 1500, reward: 300 },
  { type: 'tier', target: 7, reward: 400 },
  { type: 'combo', target: 3, reward: 450 },
  { type: 'score', target: 4000, reward: 600 },
  { type: 'tier', target: 9, reward: 800 },
  { type: 'tier', target: 10, reward: 1500 },
];

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    generateGameTextures(this);
    adManager.init();
    firebaseManager.init();
    haptics.setEnabled(storageManager.isHapticsEnabled());

    this.score = 0;
    this.bestScore = storageManager.getBestScore();
    this.gameMode = storageManager.getGameMode();
    this.campaignLevel = storageManager.getCampaignLevel();
    this.levelCfg = getLevelConfig(this.campaignLevel);
    const extraMoves = firebaseManager.getNumber('extra_moves_bonus', 0);
    this.movesLeft = Math.max(8, this.levelCfg.maxMoves + extraMoves);
    firebaseManager.logEvent('level_start', {
      mode: this.gameMode,
      level: this.campaignLevel,
    });
    this.isGameOver = false;
    this.canDrop = true;
    this.pinMode = false;
    this.continuesUsed = 0;
    this.scoreDoubled = false;
    this.comboCount = 0;
    this.lastMergeTime = 0;
    this.dangerTimer = 0;
    this.lastDangerTick = 0;
    this.missionIndex = 0;
    this.eliteGoalScore = 6000;
    this.fruits = [];
    this.gameOverObjects = [];

    // World bounds (walls)
    this.matter.world.setBounds(0, -200, GAME_WIDTH, GAME_HEIGHT + 300, 32, false, false, false, false);

    this.drawBackground();
    this.createJar();
    this.createUI();
    this.setupInput();
    this.setupCollisions();

    // Pick initial current & next fruit
    this.spawnTierStage = 0;
    this.nextTier = this.pickNextSpawnTier();
    this.prepareNextDrop();

    // First-time micro-tutorial
    if (storageManager.getGamesPlayed() === 0) {
      this.tutorialHint = this.add
        .text(GAME_WIDTH / 2, JAR_TOP + 120, t('tutorialHint'), {
          fontFamily: FONT_FAMILY,
          fontSize: '16px',
          fontStyle: 'bold',
          color: '#ffffff',
          align: 'center',
          backgroundColor: '#1b1e3fcc',
          padding: { x: 16, y: 10 },
        })
        .setOrigin(0.5)
        .setDepth(14);
      this.tweens.add({
        targets: this.tutorialHint,
        alpha: 0.65,
        duration: 700,
        yoyo: true,
        repeat: -1,
      });
    }
  }

  drawBackground() {
    this.bgGraphics = this.add.graphics();
    this.renderThemeBackground();

    // Subtle ambient bokeh circles
    for (let i = 0; i < 10; i++) {
      const bx = Phaser.Math.Between(20, GAME_WIDTH - 20);
      const by = Phaser.Math.Between(40, GAME_HEIGHT - 40);
      const br = Phaser.Math.Between(24, 70);
      const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
      const circle = this.add.circle(bx, by, br, color, 0.05);
      this.tweens.add({
        targets: circle,
        y: by - Phaser.Math.Between(12, 28),
        alpha: 0.09,
        duration: Phaser.Math.Between(2500, 4500),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  renderThemeBackground() {
    if (!this.bgGraphics) return;
    const theme = getThemeById(storageManager.getSelectedTheme());
    this.bgGraphics.clear();
    this.bgGraphics.fillGradientStyle(theme.bgTop, theme.bgTop, theme.bgBottom, theme.bgBottom, 1);
    this.bgGraphics.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Sync outer HTML body background so 20:9 phones (S22) have zero letterbox seam
    if (typeof document !== 'undefined' && document.body) {
      const topHex = `#${theme.bgTop.toString(16).padStart(6, '0')}`;
      const botHex = `#${theme.bgBottom.toString(16).padStart(6, '0')}`;
      document.body.style.background = `linear-gradient(180deg, ${topHex} 0%, ${botHex} 100%)`;
    }

    // Warm ambient spotlight behind jar for depth
    this.bgGraphics.fillStyle(theme.glowColor, 0.12);
    this.bgGraphics.fillCircle(GAME_WIDTH / 2, JAR_TOP + 220, 230);
    this.bgGraphics.fillStyle(0xffffff, 0.04);
    this.bgGraphics.fillCircle(GAME_WIDTH / 2, JAR_TOP + 220, 145);

    if (!this.dangerVignette) {
      this.dangerVignette = this.add.graphics().setDepth(18).setAlpha(0);
      this.dangerVignette.lineStyle(18, 0xff3b5c, 0.75);
      this.dangerVignette.strokeRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    }
  }

  createJar() {
    const jarWidth = JAR_RIGHT - JAR_LEFT;
    const jarHeight = JAR_BOTTOM - JAR_TOP;

    this.jarGlass = this.add.graphics();
    this.renderThemeJar();

    // Static Matter walls (left, right, bottom)
    const wallOpts = {
      isStatic: true,
      friction: 0.1,
      restitution: 0.2,
      label: 'wall',
    };

    this.matter.add.rectangle(
      JAR_LEFT - WALL_THICKNESS / 2,
      JAR_TOP + jarHeight / 2,
      WALL_THICKNESS,
      jarHeight + 120,
      wallOpts
    );
    this.matter.add.rectangle(
      JAR_RIGHT + WALL_THICKNESS / 2,
      JAR_TOP + jarHeight / 2,
      WALL_THICKNESS,
      jarHeight + 120,
      wallOpts
    );
    this.matter.add.rectangle(
      GAME_WIDTH / 2,
      JAR_BOTTOM + WALL_THICKNESS / 2,
      jarWidth + WALL_THICKNESS * 2,
      WALL_THICKNESS,
      wallOpts
    );

    // Danger line (neon dashed + pill badge)
    this.dangerLine = this.add.graphics();
    this.drawDangerLine(0.55);

    this.dangerBadge = this.add.container(JAR_RIGHT - 42, DANGER_Y - 14).setAlpha(0.85);
    const badgeBg = this.add.graphics();
    badgeBg.fillStyle(0xff3b5c, 0.28);
    badgeBg.fillRoundedRect(-34, -10, 68, 20, 10);
    badgeBg.lineStyle(1.5, 0xff4d6d, 0.85);
    badgeBg.strokeRoundedRect(-34, -10, 68, 20, 10);
    this.dangerLabel = this.add
      .text(0, 0, t('limit'), {
        fontFamily: FONT_FAMILY,
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#ffccd5',
      })
      .setOrigin(0.5);
    this.dangerBadge.add([badgeBg, this.dangerLabel]);

    // Danger countdown bar (hidden unless overflowing)
    this.dangerBarBg = this.add.rectangle(GAME_WIDTH / 2, DANGER_Y - 26, 180, 10, 0x0b0726, 0.7).setVisible(false);
    this.dangerBarFill = this.add.rectangle(GAME_WIDTH / 2 - 90, DANGER_Y - 26, 0, 10, 0xff3b5c, 1).setOrigin(0, 0.5).setVisible(false);
  }

  drawDangerLine(alpha) {
    this.dangerLine.clear();
    this.dangerLine.lineStyle(4, 0xff3b5c, alpha * 0.35);
    this.dangerLine.lineBetween(JAR_LEFT + 10, DANGER_Y, JAR_RIGHT - 10, DANGER_Y);
    this.dangerLine.lineStyle(2.5, 0xff758f, alpha);
    const dashLen = 12;
    const gapLen = 8;
    for (let x = JAR_LEFT + 10; x < JAR_RIGHT - 10; x += dashLen + gapLen) {
      this.dangerLine.lineBetween(x, DANGER_Y, Math.min(x + dashLen, JAR_RIGHT - 10), DANGER_Y);
    }
  }

  renderThemeJar() {
    if (!this.jarGlass) return;
    const theme = getThemeById(storageManager.getSelectedTheme());
    const jarWidth = JAR_RIGHT - JAR_LEFT;
    const jarHeight = JAR_BOTTOM - JAR_TOP;
    const glass = this.jarGlass;
    glass.clear();

    // 3D Pedestal base under jar
    glass.fillStyle(0x000000, 0.35);
    glass.fillRoundedRect(JAR_LEFT - 8, JAR_BOTTOM + 6, jarWidth + 16, 16, 8);
    glass.fillStyle(theme.jarBaseLip, 1);
    glass.fillRoundedRect(JAR_LEFT - 10, JAR_BOTTOM + 2, jarWidth + 20, 14, 7);
    glass.fillStyle(theme.jarBase, 1);
    glass.fillRoundedRect(JAR_LEFT - 10, JAR_BOTTOM - 2, jarWidth + 20, 12, 6);
    glass.fillStyle(0xffffff, 0.22);
    glass.fillRoundedRect(JAR_LEFT, JAR_BOTTOM, jarWidth, 3, 2);

    // Glass interior
    glass.fillStyle(0xffffff, theme.glassAlpha);
    glass.fillRoundedRect(JAR_LEFT, JAR_TOP, jarWidth, jarHeight, { tl: 8, tr: 8, bl: 24, br: 24 });

    // Subtle diagonal glass shine
    glass.fillStyle(0xffffff, 0.045);
    glass.beginPath();
    glass.moveTo(JAR_LEFT + 22, JAR_TOP + 20);
    glass.lineTo(JAR_LEFT + 68, JAR_TOP + 20);
    glass.lineTo(JAR_LEFT + 28, JAR_BOTTOM - 30);
    glass.lineTo(JAR_LEFT + 12, JAR_BOTTOM - 30);
    glass.closePath();
    glass.fillPath();

    // Outer neon halo + crisp glass border
    glass.lineStyle(8, theme.jarLip, 0.2);
    glass.strokeRoundedRect(JAR_LEFT, JAR_TOP, jarWidth, jarHeight, { tl: 8, tr: 8, bl: 24, br: 24 });

    glass.lineStyle(4, theme.jarStroke, 0.8);
    glass.beginPath();
    glass.moveTo(JAR_LEFT, JAR_TOP);
    glass.lineTo(JAR_LEFT, JAR_BOTTOM - 18);
    glass.arc(JAR_LEFT + 18, JAR_BOTTOM - 18, 18, Math.PI, Math.PI * 0.5, true);
    glass.lineTo(JAR_RIGHT - 18, JAR_BOTTOM);
    glass.arc(JAR_RIGHT - 18, JAR_BOTTOM - 18, 18, Math.PI * 0.5, 0, true);
    glass.lineTo(JAR_RIGHT, JAR_TOP);
    glass.strokePath();

    // Flared 3D Jar Rim / Collar at top
    glass.fillStyle(theme.jarLip, 0.45);
    glass.fillRoundedRect(JAR_LEFT - 8, JAR_TOP - 8, 22, 12, 6);
    glass.fillRoundedRect(JAR_RIGHT - 14, JAR_TOP - 8, 22, 12, 6);
    glass.lineStyle(2, 0xffffff, 0.55);
    glass.strokeRoundedRect(JAR_LEFT - 8, JAR_TOP - 8, 22, 12, 6);
    glass.strokeRoundedRect(JAR_RIGHT - 14, JAR_TOP - 8, 22, 12, 6);

    // Inner left specular edge
    glass.lineStyle(3, 0xffffff, 0.22);
    glass.lineBetween(JAR_LEFT + 9, JAR_TOP + 14, JAR_LEFT + 9, JAR_BOTTOM - 32);
  }

  createUI() {
    // Juicy 3D Arcade Title
    this.add
      .text(24, 24, 'JUICY DROP!', {
        fontFamily: FONT_FAMILY,
        fontSize: '29px',
        fontStyle: 'bold',
        color: '#ffd166',
        stroke: '#9d0246',
        strokeThickness: 7,
      })
      .setOrigin(0, 0)
      .setShadow(0, 4, '#2b0938', 4, true, true);

    // 3D Candy Icon Buttons (Collection/Challenges, Sound, Settings)
    const makeIconBtn = (x, y, iconText, fillCol, lipCol, onClick) => {
      const container = this.add.container(x, y).setDepth(12);
      const bg = this.add.graphics();
      bg.fillStyle(lipCol, 1);
      bg.fillRoundedRect(-21, -18, 42, 42, 14);
      bg.fillStyle(fillCol, 1);
      bg.fillRoundedRect(-21, -21, 42, 42, 14);
      bg.fillStyle(0xffffff, 0.28);
      bg.fillRoundedRect(-15, -18, 30, 10, 5);
      bg.lineStyle(1.5, 0xffffff, 0.45);
      bg.strokeRoundedRect(-21, -21, 42, 42, 14);

      const txt = this.add.text(0, -1, iconText, { fontSize: '20px' }).setOrigin(0.5);
      const zone = this.add.zone(0, 0, 44, 44).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', (pointer) => {
        pointer.event?.stopPropagation?.();
        soundFX.playClick();
        this.tweens.add({ targets: container, scale: 0.86, duration: 65, yoyo: true, ease: 'Back.easeOut' });
        onClick(txt);
      });
      container.add([bg, txt, zone]);
      return { container, txt };
    };

    const trophyObj = makeIconBtn(GAME_WIDTH - 142, 40, '🏆', 0x06d6a0, 0x048a66, () => {
      if (!this.isGameOver) {
        this.openRetentionModal();
      }
    });
    this.questBadgeDot = this.add.circle(16, -16, 6, 0xff3b5c, 1).setStrokeStyle(1.5, 0xffffff, 1);
    trophyObj.container.add(this.questBadgeDot);
    this.refreshQuestBadge();

    const muteObj = makeIconBtn(GAME_WIDTH - 92, 40, soundFX.muted ? '🔇' : '🔊', 0x4361ee, 0x243496, (txt) => {
      const muted = soundFX.toggleMute();
      txt.setText(muted ? '🔇' : '🔊');
    });
    this.muteBtn = muteObj.txt;

    makeIconBtn(GAME_WIDTH - 42, 40, '⚙️', 0x7209b7, 0x42056e, () => {
      if (!this.isGameOver) {
        this.openSettingsModal();
      }
    });

    // 3D Glossy Score Card
    const scoreBg = this.add.graphics();
    scoreBg.fillStyle(0x0b0824, 0.6);
    scoreBg.fillRoundedRect(24, 78, 166, 68, 18);
    scoreBg.fillStyle(0x23295e, 0.96);
    scoreBg.fillRoundedRect(24, 74, 166, 68, 18);
    scoreBg.fillStyle(0xffffff, 0.08);
    scoreBg.fillRoundedRect(32, 77, 150, 14, 7);
    scoreBg.lineStyle(2, 0x9bf6ff, 0.65);
    scoreBg.strokeRoundedRect(24, 74, 166, 68, 18);

    this.add.text(36, 82, t('score'), {
      fontFamily: FONT_FAMILY,
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#9bf6ff',
    });

    this.scoreText = this.add.text(36, 98, '0', {
      fontFamily: FONT_FAMILY,
      fontSize: '31px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#0d0e22',
      strokeThickness: 4,
    });

    this.bestText = this.add
      .text(178, 82, `👑 ${this.bestScore}`, {
        fontFamily: FONT_FAMILY,
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#ffd166',
      })
      .setOrigin(1, 0);

    // 3D Glossy Next Fruit Card
    const nextBg = this.add.graphics();
    nextBg.fillStyle(0x0b0824, 0.6);
    nextBg.fillRoundedRect(GAME_WIDTH - 122, 78, 98, 68, 18);
    nextBg.fillStyle(0x23295e, 0.96);
    nextBg.fillRoundedRect(GAME_WIDTH - 122, 74, 98, 68, 18);
    nextBg.fillStyle(0xffffff, 0.08);
    nextBg.fillRoundedRect(GAME_WIDTH - 114, 77, 82, 14, 7);
    nextBg.lineStyle(2, 0xff8fab, 0.65);
    nextBg.strokeRoundedRect(GAME_WIDTH - 122, 74, 98, 68, 18);

    this.add
      .text(GAME_WIDTH - 73, 81, t('next'), {
        fontFamily: FONT_FAMILY,
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#ffccd5',
      })
      .setOrigin(0.5, 0);

    this.add.circle(GAME_WIDTH - 73, 117, 19, 0xffffff, 0.08);
    this.nextPreviewSprite = this.add.image(GAME_WIDTH - 73, 117, 'fruit_0').setScale(0.75);

    // Rewarded Booster Pills (aligned neatly between Score & Next)
    this.createBoosterButtons();

    // Live Level Goal / Mission Pill (right below HUD, safely above DROP_Y)
    this.missionPillBg = this.add.graphics();
    this.missionText = this.add
      .text(GAME_WIDTH / 2, 158, '', {
        fontFamily: FONT_FAMILY,
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#ffd166',
      })
      .setOrigin(0.5);
    this.updateMissionPill();

    // Pin Mode Hint Banner
    this.pinBanner = this.add
      .text(GAME_WIDTH / 2, DROP_Y - 26, t('pinModeBanner'), {
        fontFamily: FONT_FAMILY,
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#ffd166',
        backgroundColor: '#1b1e3f',
        padding: { x: 14, y: 7 },
      })
      .setOrigin(0.5)
      .setDepth(15)
      .setVisible(false);

    // Aiming Guide Line + Preview Fruit
    this.aimLine = this.add.graphics();
    this.dropperFruit = this.add.image(GAME_WIDTH / 2, DROP_Y, 'fruit_0').setDepth(5);

    // Bottom Evolution Legend (11 fruits mini-bar)
    this.createEvolutionBar();
  }

  refreshQuestBadge() {
    if (!this.questBadgeDot) return;
    this.questBadgeDot.setVisible(storageManager.hasClaimableQuests());
  }

  updateMissionPill() {
    if (!this.missionText || !this.missionPillBg) return;

    const isLowMoves = this.gameMode === 'levels' && this.movesLeft <= 4;
    this.missionPillBg.clear();
    this.missionPillBg.fillStyle(isLowMoves ? 0x590d22 : 0x1e224d, 0.92);
    this.missionPillBg.fillRoundedRect(24, 146, GAME_WIDTH - 48, 24, 12);
    this.missionPillBg.lineStyle(1.5, isLowMoves ? 0xff4d6d : 0xffd166, 0.75);
    this.missionPillBg.strokeRoundedRect(24, 146, GAME_WIDTH - 48, 24, 12);

    if (this.gameMode === 'levels') {
      const fruitName = getFruitName(this.levelCfg.targetTier);
      const scorePart = this.levelCfg.minScore > 0 ? ` · ${this.score}/${this.levelCfg.minScore}` : '';
      this.missionText.setColor(isLowMoves ? '#ffccd5' : '#ffd166');
      this.missionText.setText(
        `${t('levelShort')} ${this.campaignLevel} · ${t('goalFruitMoves', {
          fruit: fruitName,
          moves: this.movesLeft,
        })}${scorePart}`
      );
      return;
    }

    const m = RUN_MISSIONS[this.missionIndex];
    this.missionText.setColor('#ffd166');
    if (!m) {
      this.missionText.setText(`👑 ${t('endless')} · ${t('goalScore', { score: this.eliteGoalScore })}`);
      return;
    }
    let label = '';
    if (m.type === 'tier') label = getFruitName(m.target);
    else if (m.type === 'combo') label = `Combo ×${m.target}`;
    else label = `${m.target} pts`;
    this.missionText.setText(`♾️ ${t('endless')} · 🎯 ${label} (+${m.reward})`);
  }

  ensureBoosterTextures() {
    if (!this.textures.exists('booster_shake')) {
      const tex = this.textures.createCanvas('booster_shake', 140, 140);
      const ctx = tex.getContext();
      ctx.clearRect(0, 0, 140, 140);

      // Soft aura glow
      const glow = ctx.createRadialGradient(70, 70, 10, 70, 70, 62);
      glow.addColorStop(0, 'rgba(128, 255, 219, 0.55)');
      glow.addColorStop(1, 'rgba(128, 255, 219, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(70, 70, 62, 0, Math.PI * 2);
      ctx.fill();

      // Dynamic shake motion arcs (left & right)
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(70, 70, 52, Math.PI * 0.78, Math.PI * 1.18);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(70, 70, 52, -Math.PI * 0.22, Math.PI * 0.18);
      ctx.stroke();

      // Cartoon whirlwind / swirl funnel (thick outline + bright gradient)
      const drawSwirlRibbon = (y, rx, ry, fillTop, fillBot) => {
        const grad = ctx.createLinearGradient(70 - rx, y - ry, 70 + rx, y + ry);
        grad.addColorStop(0, fillTop);
        grad.addColorStop(1, fillBot);
        ctx.fillStyle = grad;
        ctx.strokeStyle = '#240046';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.ellipse(70, y, rx, ry, -0.08, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Glossy highlight
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.beginPath();
        ctx.ellipse(70 - rx * 0.22, y - ry * 0.28, rx * 0.48, ry * 0.26, -0.08, 0, Math.PI * 2);
        ctx.fill();
      };

      drawSwirlRibbon(102, 16, 7, '#80ffdb', '#4ea8de');
      drawSwirlRibbon(82, 27, 10, '#a0f0ff', '#5e60ce');
      drawSwirlRibbon(58, 38, 12, '#e0fbfc', '#48bfe3');
      drawSwirlRibbon(36, 44, 13, '#ffffff', '#80ffdb');

      // Cute 4-point sparkles
      const drawSpark = (cx, cy, r, color) => {
        ctx.fillStyle = color;
        ctx.strokeStyle = '#240046';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const rad = i % 2 === 0 ? r : r * 0.36;
          const a = (i * Math.PI) / 4;
          const px = cx + Math.cos(a) * rad;
          const py = cy + Math.sin(a) * rad;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      };
      drawSpark(28, 34, 11, '#ffd166');
      drawSpark(114, 96, 10, '#ffd166');
      tex.refresh();
    }

    if (!this.textures.exists('booster_pin')) {
      const tex = this.textures.createCanvas('booster_pin', 140, 140);
      const ctx = tex.getContext();
      ctx.clearRect(0, 0, 140, 140);

      // Soft warm glow
      const glow = ctx.createRadialGradient(70, 70, 10, 70, 70, 62);
      glow.addColorStop(0, 'rgba(255, 209, 102, 0.55)');
      glow.addColorStop(1, 'rgba(255, 59, 92, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(70, 70, 62, 0, Math.PI * 2);
      ctx.fill();

      // Starburst pop at tip (bottom-left)
      ctx.fillStyle = '#ffd166';
      ctx.strokeStyle = '#3d0814';
      ctx.lineWidth = 4;
      ctx.beginPath();
      for (let i = 0; i < 12; i++) {
        const rad = i % 2 === 0 ? 24 : 11;
        const a = (i * Math.PI) / 6;
        const px = 42 + Math.cos(a) * rad;
        const py = 98 + Math.sin(a) * rad;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Tilted cartoon dart / magic popper
      ctx.save();
      ctx.translate(74, 66);
      ctx.rotate(-Math.PI / 4);

      // Silver tip
      ctx.fillStyle = '#edf2f4';
      ctx.strokeStyle = '#2b2d42';
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.moveTo(-42, 0);
      ctx.lineTo(-16, -9);
      ctx.lineTo(-16, 9);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Gold collar ring
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.roundRect(-18, -11, 10, 22, 4);
      ctx.fill();
      ctx.stroke();

      // Juicy ruby candy body
      const bodyGrad = ctx.createLinearGradient(0, -16, 0, 16);
      bodyGrad.addColorStop(0, '#ff8fab');
      bodyGrad.addColorStop(0.5, '#ff3b5c');
      bodyGrad.addColorStop(1, '#b5173c');
      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      ctx.roundRect(-8, -14, 34, 28, 10);
      ctx.fill();
      ctx.stroke();

      // Glossy body highlight
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath();
      ctx.ellipse(9, -6, 12, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Feathered fins (gold/aqua)
      ctx.fillStyle = '#48bfe3';
      ctx.beginPath();
      ctx.moveTo(24, -10);
      ctx.lineTo(44, -22);
      ctx.lineTo(38, 0);
      ctx.lineTo(44, 22);
      ctx.lineTo(24, 10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.restore();
      tex.refresh();
    }
  }

  createBoosterButtons() {
    this.ensureBoosterTextures();

    const makeIconTile = (x, y, textureKey, fillColor, lipColor, onClick) => {
      const container = this.add.container(x, y).setDepth(12);
      const w = 68;
      const h = 62;
      const bg = this.add.graphics();
      // Drop shadow
      bg.fillStyle(0x000000, 0.35);
      bg.fillRoundedRect(-w / 2, -h / 2 + 6, w, h, 20);
      // 3D bottom lip
      bg.fillStyle(lipColor, 1);
      bg.fillRoundedRect(-w / 2, -h / 2 + 4, w, h, 20);
      // Main candy tile body
      bg.fillStyle(fillColor, 1);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, 20);
      // Glossy top cushion highlight
      bg.fillStyle(0xffffff, 0.28);
      bg.fillRoundedRect(-w / 2 + 7, -h / 2 + 3, w - 14, 16, 8);
      // Crisp cream-white border
      bg.lineStyle(2.5, 0xffffff, 0.85);
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 20);

      const iconImg = this.add.image(0, -5, textureKey).setDisplaySize(48, 48);

      // Overlapping bottom pill badge
      const badgeGroup = this.add.container(0, 26);
      const badgeBg = this.add.graphics();
      const videoIcon = this.add.graphics();
      const badgeTxt = this.add
        .text(0, 0, '', {
          fontFamily: FONT_FAMILY,
          fontSize: '11px',
          fontStyle: 'bold',
          color: '#ffffff',
          stroke: '#1b1e3f',
          strokeThickness: 2.5,
        })
        .setOrigin(0.5);

      badgeGroup.add([badgeBg, videoIcon, badgeTxt]);

      const zone = this.add.zone(0, 0, w + 6, h + 10).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', (pointer) => {
        pointer.event?.stopPropagation?.();
        soundFX.playClick();
        this.tweens.add({ targets: container, scale: 0.9, duration: 65, yoyo: true });
        onClick();
      });

      container.add([bg, iconImg, badgeGroup, zone]);
      return { container, badgeBg, videoIcon, txt: badgeTxt };
    };

    const shakeObj = makeIconTile(236, 106, 'booster_shake', 0x7209b7, 0x3c096c, () => this.triggerShakeBooster());
    const pinObj = makeIconTile(312, 106, 'booster_pin', 0xf72585, 0x9e0059, () => this.triggerPinBooster());
    this.shakeContainer = shakeObj.container;
    this.pinContainer = pinObj.container;
    this.shakeBadge = shakeObj;
    this.pinBadge = pinObj;
    this.shakeNudged = false;
    this.pinNudged = false;
    this.refreshBoosterLabels();
  }

  drawBoosterBadge(badgeObj, { mode, tokens, nudgeText }) {
    if (!badgeObj) return;
    const { badgeBg, videoIcon, txt } = badgeObj;
    badgeBg.clear();
    videoIcon.clear();

    const w = 56;
    const h = 20;
    let fill = 0xff9f1c;
    if (mode === 'nudge') fill = 0x39e5b6;
    else if (mode === 'token') fill = 0x06d6a0;

    // Pill shadow + body + white border
    badgeBg.fillStyle(0x000000, 0.35);
    badgeBg.fillRoundedRect(-w / 2, -h / 2 + 2, w, h, 10);
    badgeBg.fillStyle(fill, 1);
    badgeBg.fillRoundedRect(-w / 2, -h / 2, w, h, 10);
    badgeBg.lineStyle(2, 0xffffff, 0.95);
    badgeBg.strokeRoundedRect(-w / 2, -h / 2, w, h, 10);

    if (mode === 'nudge') {
      txt.setX(0);
      txt.setColor('#0b132b');
      txt.setStroke('#ffffff', 0);
      txt.setText(nudgeText);
    } else if (mode === 'token') {
      txt.setX(0);
      txt.setColor('#ffffff');
      txt.setStroke('#064e3b', 3);
      txt.setText(`×${tokens}`);
    } else {
      // Draw mini video clapper/play icon on the left + localized AD/PUB label
      videoIcon.fillStyle(0x1b1e3f, 0.9);
      videoIcon.fillRoundedRect(-21, -6, 15, 12, 3);
      videoIcon.fillStyle(0xffffff, 1);
      videoIcon.fillTriangle(-16, -3.5, -16, 3.5, -9.5, 0);

      txt.setX(10);
      txt.setColor('#ffffff');
      txt.setStroke('#7c2d12', 3);
      txt.setText(t('adBadge'));
    }
  }

  refreshBoosterLabels() {
    const tokens = storageManager.getFreeTokens();
    this.drawBoosterBadge(this.shakeBadge, {
      mode: this.shakeNudged ? 'nudge' : tokens > 0 ? 'token' : 'ad',
      tokens,
      nudgeText: '⚡ AUTO!',
    });
    this.drawBoosterBadge(this.pinBadge, {
      mode: this.pinNudged ? 'nudge' : tokens > 0 ? 'token' : 'ad',
      tokens,
      nudgeText: '🆘 SOS!',
    });
  }

  setBoosterNudge(which, active) {
    const isShake = which === 'shake';
    const current = isShake ? this.shakeNudged : this.pinNudged;
    if (current === active) return;

    if (isShake) {
      this.shakeNudged = active;
      if (this.shakeNudgeTween) {
        this.shakeNudgeTween.stop();
        this.shakeNudgeTween = null;
      }
      if (active && this.shakeContainer) {
        this.shakeNudgeTween = this.tweens.add({
          targets: this.shakeContainer,
          scale: 1.07,
          duration: 380,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      } else if (this.shakeContainer) {
        this.shakeContainer.setScale(1);
      }
    } else {
      this.pinNudged = active;
      if (this.pinNudgeTween) {
        this.pinNudgeTween.stop();
        this.pinNudgeTween = null;
      }
      if (active && this.pinContainer) {
        this.pinNudgeTween = this.tweens.add({
          targets: this.pinContainer,
          scale: 1.07,
          duration: 320,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      } else if (this.pinContainer) {
        this.pinContainer.setScale(1);
      }
    }
    this.refreshBoosterLabels();
  }

  createEvolutionBar() {
    const barY = 812;
    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 0.06);
    bg.fillRoundedRect(24, barY - 22, GAME_WIDTH - 48, 44, 14);

    const maxTier = storageManager.getMaxTierReached();
    this.evolutionIcons = [];

    const startX = 46;
    const stepX = (GAME_WIDTH - 92) / (FRUITS.length - 1);
    FRUITS.forEach((f, idx) => {
      const x = startX + idx * stepX;
      const icon = this.add.image(x, barY, `fruit_${f.tier}`);
      const targetSize = 22 + idx * 0.8;
      icon.setDisplaySize(targetSize, targetSize);
      icon.setAlpha(idx <= maxTier ? 1 : 0.28);
      this.evolutionIcons.push(icon);
    });
  }

  setupInput() {
    this.aimX = GAME_WIDTH / 2;

    const updateAim = (pointerX) => {
      if (this.isGameOver || !this.canDrop || this.pinMode) return;
      const r = FRUITS[this.currentTier].radius;
      this.aimX = Phaser.Math.Clamp(pointerX, JAR_LEFT + r + 4, JAR_RIGHT - r - 4);
      this.dropperFruit.x = this.aimX;
      this.drawAimLine();
    };

    this.input.on('pointermove', (pointer) => {
      updateAim(pointer.x);
    });

    this.input.on('pointerdown', (pointer) => {
      if (this.isGameOver) return;
      if (pointer.y < 146) return; // Ignore top HUD & booster clicks

      if (this.pinMode) {
        this.tryPopFruitAt(pointer.x, pointer.y);
        return;
      }

      if (!this.canDrop) return;
      updateAim(pointer.x);
    });

    this.input.on('pointerup', (pointer) => {
      if (this.isGameOver || this.pinMode || !this.canDrop) return;
      if (pointer.y < 128) return;
      updateAim(pointer.x);
      this.dropCurrentFruit();
    });
  }

  drawAimLine() {
    this.aimLine.clear();
    if (!this.canDrop || this.isGameOver) return;
    this.aimLine.lineStyle(2, 0xffffff, 0.25);
    const startY = DROP_Y + FRUITS[this.currentTier].radius + 6;
    for (let y = startY; y < JAR_BOTTOM - 10; y += 14) {
      this.aimLine.lineBetween(this.aimX, y, this.aimX, Math.min(y + 7, JAR_BOTTOM - 10));
    }
  }

  pickNextSpawnTier() {
    let maxTier = MAX_SPAWN_TIER;
    const pearUnlock = firebaseManager.getNumber('pear_unlock_score', 1800);
    const appleUnlock = firebaseManager.getNumber('apple_unlock_score', 600);
    if (this.score >= pearUnlock) {
      maxTier = Math.min(FRUITS.length - 1, MAX_SPAWN_TIER + 2);
      if (this.spawnTierStage < 2) {
        this.spawnTierStage = 2;
        this.showToast(t('unlockPear'));
      }
    } else if (this.score >= appleUnlock) {
      maxTier = Math.min(FRUITS.length - 1, MAX_SPAWN_TIER + 1);
      if (this.spawnTierStage < 1) {
        this.spawnTierStage = 1;
        this.showToast(t('unlockApple'));
      }
    }
    if (this.score >= 1200 && Math.random() < 0.7) {
      return Phaser.Math.Between(1, maxTier);
    }
    return Phaser.Math.Between(0, maxTier);
  }

  prepareNextDrop() {
    if (this.isGameOver) return;
    if (this.gameMode === 'levels' && this.movesLeft <= 0) return;

    this.currentTier = this.nextTier;
    this.nextTier = this.pickNextSpawnTier();

    const fruitCfg = FRUITS[this.currentTier];
    this.dropperFruit.setTexture(`fruit_${this.currentTier}`);
    this.dropperFruit.setScale(0.2);
    this.dropperFruit.setVisible(true);

    this.aimX = Phaser.Math.Clamp(
      this.aimX,
      JAR_LEFT + fruitCfg.radius + 4,
      JAR_RIGHT - fruitCfg.radius - 4
    );
    this.dropperFruit.x = this.aimX;
    this.dropperFruit.y = DROP_Y;

    this.tweens.add({
      targets: this.dropperFruit,
      scale: 1,
      duration: 160,
      ease: 'Back.easeOut',
    });

    // Update next preview
    this.nextPreviewSprite.setTexture(`fruit_${this.nextTier}`);
    const nextR = FRUITS[this.nextTier].radius;
    const previewScale = Math.min(0.85, 22 / nextR);
    this.nextPreviewSprite.setScale(previewScale);

    this.canDrop = true;
    this.drawAimLine();
  }

  dropCurrentFruit() {
    this.canDrop = false;
    this.dropperFruit.setVisible(false);
    this.aimLine.clear();

    if (this.tutorialHint) {
      const hint = this.tutorialHint;
      this.tutorialHint = null;
      this.tweens.add({
        targets: hint,
        alpha: 0,
        duration: 200,
        onComplete: () => hint.destroy(),
      });
    }

    soundFX.playDrop();
    haptics.drop();
    this.spawnPhysicsFruit(this.aimX, DROP_Y, this.currentTier, false);

    if (this.gameMode === 'levels') {
      this.movesLeft = Math.max(0, this.movesLeft - 1);
      this.updateMissionPill();
      if (this.movesLeft === 0) {
        this.time.delayedCall(1200, () => {
          if (!this.isGameOver) {
            this.triggerGameOver('out_of_moves');
          }
        });
        return;
      }
    }

    this.time.delayedCall(420, () => {
      if (!this.isGameOver) {
        this.prepareNextDrop();
      }
    });
  }

  spawnPhysicsFruit(x, y, tier, isMerge = false) {
    const cfg = FRUITS[tier];
    const fruit = this.matter.add.image(x, y, `fruit_${tier}`, null, {
      shape: { type: 'circle', radius: cfg.radius },
      restitution: 0.28,
      friction: 0.08,
      frictionAir: 0.008,
      density: 0.0022,
      label: `fruit_${tier}`,
    });

    fruit.setData('tier', tier);
    fruit.setData('merging', false);
    fruit.setData('spawnTime', this.time.now);
    fruit.setDepth(3);

    if (isMerge) {
      fruit.setScale(0.35);
      this.tweens.add({
        targets: fruit,
        scale: 1,
        duration: 210,
        ease: 'Back.easeOut',
      });
      // Slight upward hop on merge
      fruit.setVelocity(Phaser.Math.FloatBetween(-0.8, 0.8), -2.4);
    }

    this.fruits.push(fruit);
    return fruit;
  }

  setupCollisions() {
    this.lastImpactTime = 0;

    this.matter.world.on('collisionstart', (event) => {
      if (this.isGameOver) return;

      for (const pair of event.pairs) {
        const objA = pair.bodyA.gameObject;
        const objB = pair.bodyB.gameObject;

        // Impact feedback when a fruit lands hard
        const now = this.time.now;
        if (now - this.lastImpactTime > 90) {
          const vA = pair.bodyA.velocity ? Math.hypot(pair.bodyA.velocity.x, pair.bodyA.velocity.y) : 0;
          const vB = pair.bodyB.velocity ? Math.hypot(pair.bodyB.velocity.x, pair.bodyB.velocity.y) : 0;
          const speed = Math.max(vA, vB);
          if (speed > 4.2) {
            this.lastImpactTime = now;
            soundFX.playImpact(speed);
            const targetObj = (objA && objA.active && objA.getData('tier') !== undefined) ? objA : objB;
            if (targetObj && targetObj.active && targetObj.getData('tier') !== undefined) {
              this.tweens.add({
                targets: targetObj,
                scaleX: 1.14,
                scaleY: 0.86,
                duration: 65,
                yoyo: true,
              });
            }
          }
        }

        if (!objA || !objB || !objA.active || !objB.active) continue;
        if (objA.getData('merging') || objB.getData('merging')) continue;

        const tierA = objA.getData('tier');
        const tierB = objB.getData('tier');

        if (tierA !== undefined && tierA === tierB) {
          objA.setData('merging', true);
          objB.setData('merging', true);
          this.handleMerge(objA, objB, tierA);
        }
      }
    });
  }

  flashScreen(color = 0xffffff, maxAlpha = 0.28) {
    const flash = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, color, maxAlpha)
      .setDepth(25);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 220,
      ease: 'Cubic.easeOut',
      onComplete: () => flash.destroy(),
    });
  }

  showCallout(text, color = '#ffd166') {
    const txt = this.add
      .text(GAME_WIDTH / 2, JAR_TOP + 62, text, {
        fontFamily: FONT_FAMILY,
        fontSize: '26px',
        fontStyle: 'bold',
        color,
        stroke: '#0d0e22',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(16)
      .setScale(0.5)
      .setAlpha(0);

    this.tweens.add({
      targets: txt,
      scale: 1.08,
      alpha: 1,
      duration: 180,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.time.delayedCall(520, () => {
          this.tweens.add({
            targets: txt,
            y: txt.y - 28,
            alpha: 0,
            duration: 260,
            onComplete: () => txt.destroy(),
          });
        });
      },
    });
  }

  handleMerge(objA, objB, tier) {
    const midX = (objA.x + objB.x) / 2;
    const midY = (objA.y + objB.y) / 2;

    // Remove old fruits
    this.fruits = this.fruits.filter((f) => f !== objA && f !== objB);
    objA.destroy();
    objB.destroy();

    // Combo calculation
    const now = this.time.now;
    if (now - this.lastMergeTime < 1400) {
      this.comboCount += 1;
    } else {
      this.comboCount = 1;
    }
    this.lastMergeTime = now;

    // Mythic Watermelon Explosion (2 Pastèques -> +5000 pts & clear space!)
    if (tier >= FRUITS.length - 1) {
      const bonus = 5000 * this.comboCount;
      this.score += bonus;
      this.scoreText.setText(String(this.score));
      if (storageManager.updateBestScore(this.score)) {
        this.bestScore = this.score;
        this.bestText.setText(`👑 ${this.bestScore}`);
      }
      soundFX.playLevelWin();
      haptics.levelWin();
      this.flashScreen(0xffd166, 0.42);
      this.cameras.main.shake(360, 0.024);
      this.spawnConfetti(midX, midY, 55);
      this.showToast(t('mythicToast', { bonus }));
      this.showCallout(t('calloutLegend'), '#80ffdb');
      storageManager.recordDailyProgress({ score: this.score, maxTier: tier, combo: this.comboCount });
      this.refreshQuestBadge();
      this.checkRunMission({ tier, combo: this.comboCount, score: this.score });
      this.checkLevelWin(tier);
      return;
    }

    const nextTier = tier + 1;

    // Score update
    const mult = Math.max(1, firebaseManager.getNumber('score_multiplier', 1));
    const gained = Math.round(FRUITS[nextTier].score * this.comboCount * mult);
    this.score += gained;
    this.scoreText.setText(String(this.score));

    // Pop score text
    this.tweens.add({
      targets: this.scoreText,
      scale: 1.24,
      duration: 95,
      yoyo: true,
    });

    if (storageManager.updateBestScore(this.score)) {
      this.bestScore = this.score;
      this.bestText.setText(`👑 ${this.bestScore}`);
    }
    storageManager.recordDailyProgress({ score: this.score, maxTier: nextTier, combo: this.comboCount });
    this.refreshQuestBadge();
    this.checkRunMission({ tier: nextTier, combo: this.comboCount, score: this.score });
    if (this.gameMode === 'levels') {
      this.updateMissionPill();
    }
    if (storageManager.updateMaxTier(nextTier)) {
      const unlockedIcon = this.evolutionIcons?.[nextTier];
      if (unlockedIcon) {
        unlockedIcon.setAlpha(1);
        this.tweens.add({
          targets: unlockedIcon,
          scale: unlockedIcon.scale * 1.45,
          duration: 220,
          yoyo: true,
          ease: 'Back.easeOut',
        });
      }
      this.showNewFruitBanner(FRUITS[nextTier]);
    }

    // Spawn upgraded fruit
    this.spawnPhysicsFruit(midX, midY, nextTier, true);

    // --- GAME FEEL: Audio, Haptics, Flash, Screen Shake, Shockwaves, Particles, Confetti ---
    soundFX.playMerge(nextTier, this.comboCount);
    haptics.merge(nextTier, this.comboCount);

    if (nextTier >= 6 || this.comboCount >= 3) {
      this.flashScreen(FRUITS[nextTier].highlight, nextTier >= 8 ? 0.3 : 0.16);
    }
    if (this.comboCount >= 4) {
      soundFX.playComboBanner();
      this.showCallout(t('calloutLegend'), '#ff8fab');
    } else if (this.comboCount === 3) {
      soundFX.playComboBanner();
      this.showCallout(t('calloutMega'), '#ffd166');
    } else if (this.comboCount === 2 && nextTier >= 4) {
      this.showCallout(t('calloutSuper'), '#9bf6ff');
    }

    // Check Campaign Level Victory
    if (this.checkLevelWin(nextTier)) {
      return;
    }

    // 1. Screen Shake scaled by tier & combo
    const shakeIntensity = Math.min(0.026, 0.005 + nextTier * 0.002 + (this.comboCount - 1) * 0.0025);
    const shakeDuration = Math.min(280, 100 + nextTier * 16);
    this.cameras.main.shake(shakeDuration, shakeIntensity);

    // 2. Soft local Merge Glow (tinted to fruit color, no full-screen flash)
    const glow = this.add
      .circle(midX, midY, FRUITS[nextTier].radius * 0.85, FRUITS[nextTier].highlight, 0.45)
      .setDepth(6);
    this.tweens.add({
      targets: glow,
      scale: 1.45,
      alpha: 0,
      duration: 160,
      ease: 'Cubic.easeOut',
      onComplete: () => glow.destroy(),
    });

    // 3. Expanding Double Shockwave Ring
    const ring = this.add.circle(midX, midY, FRUITS[tier].radius, FRUITS[nextTier].color, 0);
    ring.setStrokeStyle(5, 0xffffff, 0.95);
    ring.setDepth(6);
    this.tweens.add({
      targets: ring,
      scale: 2.35,
      alpha: 0,
      duration: 300,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });

    // 4. Juicy Fruit Particles + Star Sparks
    const burstCount = 16 + nextTier * 3;
    const emitter = this.add.particles(midX, midY, 'particle_dot', {
      speed: { min: 90, max: 250 + nextTier * 20 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.85, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: { min: 280, max: 560 },
      tint: [FRUITS[nextTier].color, FRUITS[nextTier].highlight, 0xffffff],
      gravityY: 260,
      emitting: false,
    });
    emitter.setDepth(7);
    emitter.explode(burstCount);
    this.time.delayedCall(620, () => emitter.destroy());

    const sparks = this.add.particles(midX, midY, 'spark_star', {
      speed: { min: 110, max: 280 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.9, end: 0 },
      rotate: { min: 0, max: 180 },
      alpha: { start: 1, end: 0 },
      lifespan: { min: 220, max: 420 },
      tint: [0xffffff, 0xffd166, FRUITS[nextTier].highlight],
      emitting: false,
    });
    sparks.setDepth(8);
    sparks.explode(8 + nextTier);
    this.time.delayedCall(480, () => sparks.destroy());

    // 5. Confetti Explosion on big merges (tier >= 3) or combos (>= x2)
    if (nextTier >= 3 || this.comboCount >= 2) {
      this.spawnConfetti(midX, midY, 20 + nextTier * 4);
    }

    // 6. Floating Score / Combo Text (bigger & punchier for S22)
    const label = this.comboCount > 1 ? `+${gained}  🔥x${this.comboCount}!` : `+${gained}`;
    const floatTxt = this.add
      .text(midX, midY - 12, label, {
        fontSize: this.comboCount > 1 ? '24px' : '19px',
        fontStyle: '900',
        color: this.comboCount > 1 ? '#ffd166' : '#ffffff',
        stroke: '#0d0e22',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(10);

    this.tweens.add({
      targets: floatTxt,
      y: midY - 64,
      alpha: 0,
      scale: this.comboCount > 1 ? 1.3 : 1.1,
      duration: 800,
      ease: 'Cubic.easeOut',
      onComplete: () => floatTxt.destroy(),
    });
  }

  showNewFruitBanner(fruit) {
    const banner = this.add
      .text(GAME_WIDTH / 2, JAR_TOP + 45, t('newFruitBanner', { fruit: getFruitName(fruit.tier).toUpperCase() }), {
        fontFamily: FONT_FAMILY,
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#ffd166',
        backgroundColor: '#1b1e3f',
        padding: { x: 14, y: 7 },
        stroke: '#13152e',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(16)
      .setScale(0.5)
      .setAlpha(0);

    this.tweens.add({
      targets: banner,
      scale: 1,
      alpha: 1,
      duration: 220,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.time.delayedCall(1200, () => {
          this.tweens.add({
            targets: banner,
            y: banner.y - 24,
            alpha: 0,
            duration: 300,
            onComplete: () => banner.destroy(),
          });
        });
      },
    });
  }

  spawnConfetti(x, y, count = 28) {
    const confetti = this.add.particles(x, y, 'confetti_rect', {
      speed: { min: 120, max: 340 },
      angle: { min: 200, max: 340 },
      rotate: { min: 0, max: 360 },
      scale: { start: 1.0, end: 0.4 },
      alpha: { start: 1, end: 0 },
      lifespan: { min: 700, max: 1250 },
      tint: CONFETTI_COLORS,
      gravityY: 420,
      emitting: false,
    });
    confetti.setDepth(12);
    confetti.explode(count);
    this.time.delayedCall(1350, () => confetti.destroy());
  }

  update(_time, delta) {
    if (this.isGameOver || this.isPausedForAd || this.pinMode || this.settingsOpen) return;

    const now = this.time.now;
    let overflowing = false;
    let highRisk = false;
    let settledCount = 0;

    for (const fruit of this.fruits) {
      if (!fruit.active) continue;
      // Only check fruits that have been in play > 1.1s so newly dropped ones don't trigger immediately
      if (now - fruit.getData('spawnTime') < 1100) continue;
      settledCount += 1;

      const tier = fruit.getData('tier');
      const r = FRUITS[tier].radius;
      if (fruit.y - r < DANGER_Y) {
        overflowing = true;
        highRisk = true;
        break;
      }
      if (fruit.y - r < DANGER_Y + 95) {
        highRisk = true;
      }
    }

    this.setBoosterNudge('pin', highRisk);
    this.setBoosterNudge('shake', !highRisk && settledCount >= 9 && now - this.lastMergeTime > 4500);

    if (overflowing) {
      this.dangerTimer += delta;
      const ratio = Phaser.Math.Clamp(this.dangerTimer / 1200, 0, 1);

      this.drawDangerLine(0.5 + 0.5 * Math.sin(now * 0.02));
      this.dangerBadge.setAlpha(1);
      this.dangerBarBg.setVisible(true);
      this.dangerBarFill.setVisible(true);
      this.dangerBarFill.width = 180 * ratio;
      if (this.dangerVignette) {
        this.dangerVignette.setAlpha(0.25 + 0.45 * Math.abs(Math.sin(now * 0.014)));
      }
      if (now - this.lastDangerTick > 320) {
        this.lastDangerTick = now;
        soundFX.playDangerTick();
        haptics.dangerTick();
      }

      if (this.dangerTimer >= 1200) {
        this.triggerGameOver('overflow');
      }
    } else {
      if (this.dangerTimer > 0) {
        this.dangerTimer = Math.max(0, this.dangerTimer - delta * 2);
      }
      if (this.dangerTimer === 0) {
        this.drawDangerLine(0.55);
        this.dangerBadge.setAlpha(0.85);
        this.dangerBarBg.setVisible(false);
        this.dangerBarFill.setVisible(false);
        if (this.dangerVignette) this.dangerVignette.setAlpha(0);
      }
    }
  }

  checkRunMission({ tier = 0, combo = 0, score = 0 }) {
    if (this.gameMode !== 'endless') return;
    const m = RUN_MISSIONS[this.missionIndex];
    if (!m) {
      if (score >= this.eliteGoalScore) {
        this.score += 500;
        this.scoreText.setText(String(this.score));
        this.eliteGoalScore += 3000;
        this.spawnConfetti(GAME_WIDTH / 2, JAR_TOP + 30, 24);
        this.showToast('👑 +500 pts');
        this.updateMissionPill();
      }
      return;
    }

    let done = false;
    if (m.type === 'tier' && tier >= m.target) done = true;
    if (m.type === 'combo' && combo >= m.target) done = true;
    if (m.type === 'score' && score >= m.target) done = true;

    if (done) {
      this.score += m.reward;
      this.scoreText.setText(String(this.score));
      if (storageManager.updateBestScore(this.score)) {
        this.bestScore = this.score;
        this.bestText.setText(`👑 ${this.bestScore}`);
      }
      this.showToast(`🎯 +${m.reward} pts`);
      this.spawnConfetti(GAME_WIDTH / 2, JAR_TOP + 30, 22);
      this.missionIndex += 1;
      this.updateMissionPill();
    }
  }

  checkLevelWin(createdTier) {
    if (this.gameMode !== 'levels' || this.isGameOver) return false;
    if (createdTier >= this.levelCfg.targetTier && this.score >= this.levelCfg.minScore) {
      this.triggerLevelWin();
      return true;
    }
    return false;
  }

  triggerLevelWin() {
    this.isGameOver = true;
    this.canDrop = false;
    this.pinMode = false;
    this.pinBanner.setVisible(false);
    this.aimLine.clear();
    this.dropperFruit.setVisible(false);
    if (this.dangerVignette) this.dangerVignette.setAlpha(0);

    const stars =
      this.movesLeft >= this.levelCfg.star3Left
        ? 3
        : this.movesLeft >= this.levelCfg.star2Left
        ? 2
        : 1;

    storageManager.completeCampaignLevel(this.campaignLevel, stars);
    storageManager.incrementGamesPlayed();
    storageManager.addXp(100 + stars * 40);
    storageManager.recordDailyProgress({ score: this.score, maxTier: this.levelCfg.targetTier, gameEnded: true });
    firebaseManager.logEvent('level_complete', {
      level: this.campaignLevel,
      stars,
      moves_left: this.movesLeft,
      score: this.score,
    });
    firebaseManager.submitScore({
      seasonPoints: storageManager.getSeasonPoints(),
      bestScore: storageManager.getBestScore(),
      campaignLevel: storageManager.getCampaignLevel(),
    });
    this.refreshQuestBadge();
    this.refreshBoosterLabels();

    soundFX.playLevelWin();
    haptics.levelWin();
    this.flashScreen(0xffd166, 0.45);
    this.spawnConfetti(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 80, 55);

    const overlay = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x090a1a, 0.8)
      .setDepth(20);

    const card = this.add
      .container(GAME_WIDTH / 2, GAME_HEIGHT / 2)
      .setDepth(22)
      .setScale(0.65)
      .setAlpha(0);

    const cardBg = this.add.graphics();
    cardBg.fillStyle(0x1b1e3f, 1);
    cardBg.fillRoundedRect(-175, -220, 350, 446, 26);
    cardBg.lineStyle(3, 0xffd166, 0.95);
    cardBg.strokeRoundedRect(-175, -220, 350, 446, 26);

    const starsStr = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
    const starsTxt = this.add.text(0, -168, starsStr, { fontSize: '42px' }).setOrigin(0.5);

    const title = this.add
      .text(0, -112, t('levelWinTitle', { n: this.campaignLevel }), {
        fontFamily: FONT_FAMILY,
        fontSize: '25px',
        fontStyle: 'bold',
        color: '#06d6a0',
      })
      .setOrigin(0.5);

    const sub = this.add
      .text(0, -72, t('levelWinSub', { left: this.movesLeft }), {
        fontFamily: FONT_FAMILY,
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#cbd5ff',
        wordWrap: { width: 300 },
        align: 'center',
      })
      .setOrigin(0.5);

    const scoreVal = this.add
      .text(0, -22, t('finalScore', { score: this.score }), {
        fontFamily: FONT_FAMILY,
        fontSize: '24px',
        fontStyle: 'bold',
        color: '#ffd166',
      })
      .setOrigin(0.5);

    const nextBtn = this.makeModalButton(0, 48, t('nextLevelBtn'), 0x06d6a0, '#0b132b', () => {
      adManager.showInterstitialIfEligible({
        onStart: () => this.pauseForAd(),
        onDismiss: () => {
          this.resumeFromAd();
          this.scene.restart();
        },
      });
    });

    const replayBtn = this.makeModalButton(0, 108, t('replayBtn'), 0x3a0ca3, '#ffffff', () => {
      this.scene.restart();
    });

    const quitBtn = this.makeModalButton(0, 168, t('quitBtn'), 0x2b2d42, '#ffffff', () => {
      this.quitGame();
    });

    card.add([cardBg, starsTxt, title, sub, scoreVal, nextBtn, replayBtn, quitBtn]);
    this.gameOverObjects = [overlay, card];

    this.tweens.add({
      targets: card,
      scale: 1,
      alpha: 1,
      duration: 240,
      ease: 'Back.easeOut',
    });
  }

  quitGame() {
    if (Capacitor.isNativePlatform()) {
      App.exitApp();
      return;
    }
    if (typeof window !== 'undefined') {
      window.close();
    }
    this.showToast('👋');
  }

  pauseForAd() {
    this.isPausedForAd = true;
    this.matter.world.pause();
    this.wasMutedBeforeAd = soundFX.muted;
    if (!this.wasMutedBeforeAd) {
      soundFX.muted = true;
    }
  }

  resumeFromAd() {
    this.isPausedForAd = false;
    this.dangerTimer = 0;
    this.matter.world.resume();
    soundFX.muted = this.wasMutedBeforeAd ?? false;
  }

  _executeShake() {
    this.setBoosterNudge('shake', false);
    this.cameras.main.shake(280, 0.016);
    for (const fruit of this.fruits) {
      if (!fruit.active) continue;
      fruit.setVelocity(
        Phaser.Math.FloatBetween(-6, 6),
        Phaser.Math.FloatBetween(-9, -4)
      );
    }

    // Magnetize the highest-tier matching pair toward each other to guarantee a juicy merge
    let bestPair = null;
    let bestTier = -1;
    let bestDist = Infinity;
    for (let i = 0; i < this.fruits.length; i += 1) {
      const a = this.fruits[i];
      if (!a.active) continue;
      const tierA = a.getData('tier');
      for (let j = i + 1; j < this.fruits.length; j += 1) {
        const b = this.fruits[j];
        if (!b.active) continue;
        if (b.getData('tier') !== tierA) continue;
        const d = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
        if (tierA > bestTier || (tierA === bestTier && d < bestDist)) {
          bestTier = tierA;
          bestDist = d;
          bestPair = [a, b];
        }
      }
    }

    if (bestPair && bestDist > 1) {
      const [a, b] = bestPair;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      const pull = 10.5;
      a.setVelocity((dx / len) * pull, (dy / len) * pull - 2);
      b.setVelocity((-dx / len) * pull, (-dy / len) * pull - 2);
    }

    this.spawnConfetti(GAME_WIDTH / 2, JAR_TOP + 60, 20);
  }

  triggerShakeBooster() {
    if (this.isGameOver || this.fruits.length === 0 || adManager.isShowingAd) return;

    if (storageManager.consumeFreeToken()) {
      this.refreshBoosterLabels();
      this._executeShake();
      return;
    }

    adManager.showRewarded({
      onStart: () => this.pauseForAd(),
      onReward: () => this._executeShake(),
      onDismiss: () => this.resumeFromAd(),
      onNoReward: () => this.showToast('⚠️ Pub fermée trop tôt'),
      onError: () => this.showToast('⚠️ Pub indisponible'),
    });
  }

  _executePin() {
    this.pinMode = true;
    this.canDrop = false;
    this.aimLine.clear();
    this.dropperFruit.setVisible(false);
    this.pinBanner.setVisible(true);
  }

  triggerPinBooster() {
    if (this.isGameOver || this.fruits.length === 0 || this.pinMode || adManager.isShowingAd) return;

    if (storageManager.consumeFreeToken()) {
      this.refreshBoosterLabels();
      this._executePin();
      return;
    }

    adManager.showRewarded({
      onStart: () => this.pauseForAd(),
      onReward: () => this._executePin(),
      onDismiss: () => this.resumeFromAd(),
      onNoReward: () => this.showToast('⚠️ Pub fermée trop tôt'),
      onError: () => this.showToast('⚠️ Pub indisponible'),
    });
  }

  tryPopFruitAt(px, py) {
    let target = null;
    let minDist = Infinity;

    for (const fruit of this.fruits) {
      if (!fruit.active) continue;
      const tier = fruit.getData('tier');
      const r = FRUITS[tier].radius;
      const d = Phaser.Math.Distance.Between(px, py, fruit.x, fruit.y);
      if (d <= r + 14 && d < minDist) {
        minDist = d;
        target = fruit;
      }
    }

    if (!target) return;

    const fx = target.x;
    const fy = target.y;
    const tier = target.getData('tier');

    this.fruits = this.fruits.filter((f) => f !== target);
    target.destroy();

    const bonus = 150;
    this.score += bonus;
    this.scoreText.setText(String(this.score));
    this.tweens.add({
      targets: this.scoreText,
      scale: 1.24,
      duration: 95,
      yoyo: true,
    });
    if (storageManager.updateBestScore(this.score)) {
      this.bestScore = this.score;
      this.bestText.setText(`👑 ${this.bestScore}`);
    }
    this.checkRunMission({ score: this.score });

    const floatTxt = this.add
      .text(fx, fy - 10, `+${bonus} 📌`, {
        fontSize: '21px',
        fontStyle: '900',
        color: '#ffd166',
        stroke: '#0d0e22',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(12);
    this.tweens.add({
      targets: floatTxt,
      y: fy - 58,
      alpha: 0,
      duration: 720,
      ease: 'Cubic.easeOut',
      onComplete: () => floatTxt.destroy(),
    });

    soundFX.playMerge(tier, 1);
    this.cameras.main.shake(150, 0.01);
    this.spawnConfetti(fx, fy, 18);

    this.setBoosterNudge('pin', false);
    this.pinMode = false;
    this.pinBanner.setVisible(false);
    this.canDrop = true;
    this.dropperFruit.setVisible(true);
    this.drawAimLine();
  }

  triggerGameOver(reason = 'overflow') {
    if (this.isGameOver) return;
    this.isGameOver = true;
    this.canDrop = false;
    this.pinMode = false;
    this.pinBanner.setVisible(false);
    this.aimLine.clear();
    this.dropperFruit.setVisible(false);
    this.dangerBarBg.setVisible(false);
    this.dangerBarFill.setVisible(false);
    if (this.dangerVignette) this.dangerVignette.setAlpha(0);

    storageManager.incrementGamesPlayed();
    storageManager.addSeasonPoints(Math.round(this.score / 25));
    storageManager.recordDailyProgress({ score: this.score, gameEnded: true });
    firebaseManager.logEvent('game_over', {
      mode: this.gameMode,
      level: this.campaignLevel,
      reason,
      score: this.score,
    });
    firebaseManager.submitScore({
      seasonPoints: storageManager.getSeasonPoints(),
      bestScore: storageManager.getBestScore(),
      campaignLevel: storageManager.getCampaignLevel(),
    });
    const xpEarned = Math.max(25, Math.round(this.score / 12));
    const rankRes = storageManager.addXp(xpEarned);
    this.refreshQuestBadge();
    if (rankRes.leveledUp) {
      this.refreshBoosterLabels();
    }
    soundFX.playGameOver();
    haptics.gameOver();
    this.cameras.main.shake(300, 0.015);

    // Darken backdrop
    const overlay = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x090a1a, 0)
      .setDepth(20);
    this.tweens.add({
      targets: overlay,
      fillAlpha: 0.78,
      duration: 220,
    });

    const isOutOfMoves = reason === 'out_of_moves';
    const canContinue =
      this.continuesUsed < AD_RULES.MAX_CONTINUES_PER_GAME && (isOutOfMoves || this.fruits.length > 0);
    const canDoubleScore = !this.scoreDoubled && this.score > 0;

    // Modal Card
    const card = this.add
      .container(GAME_WIDTH / 2, GAME_HEIGHT / 2)
      .setDepth(25)
      .setScale(0.6)
      .setAlpha(0);

    const cardH = (canContinue ? 491 : 436) + (canDoubleScore ? 0 : -50);
    const cardTop = -cardH / 2;

    const cardBg = this.add.graphics();
    cardBg.fillStyle(0x1b1e3f, 1);
    cardBg.fillRoundedRect(-170, cardTop, 340, cardH, 24);
    cardBg.lineStyle(3, 0xff3b5c, 0.8);
    cardBg.strokeRoundedRect(-170, cardTop, 340, cardH, 24);

    const title = this.add
      .text(0, cardTop + 38, isOutOfMoves ? t('outOfMovesTitle') : t('gameOverTitle'), {
        fontFamily: FONT_FAMILY,
        fontSize: '26px',
        fontStyle: 'bold',
        color: '#ff3b5c',
      })
      .setOrigin(0.5);

    const scoreLbl = this.add
      .text(0, cardTop + 76, t('score'), {
        fontFamily: FONT_FAMILY,
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#a5b4fc',
      })
      .setOrigin(0.5);

    const scoreVal = this.add
      .text(0, cardTop + 108, String(this.score), {
        fontFamily: FONT_FAMILY,
        fontSize: '38px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    const bestVal = this.add
      .text(0, cardTop + 142, `👑 ${t('bestScore', { best: this.bestScore })}`, {
        fontFamily: FONT_FAMILY,
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#ffd166',
      })
      .setOrigin(0.5);

    // Rank & XP Progress Bar
    const rankLabel = rankRes.leveledUp
      ? `🎉 NIV. ${rankRes.level} (${rankRes.rankLabel})  +${rankRes.levelsGained} 🎁`
      : `Niv. ${rankRes.level} • ${rankRes.rankLabel}  (+${xpEarned} XP)`;
    const rankTxt = this.add
      .text(0, cardTop + 172, rankLabel, {
        fontFamily: FONT_FAMILY,
        fontSize: '12px',
        fontStyle: 'bold',
        color: rankRes.leveledUp ? '#06d6a0' : '#9bf6ff',
      })
      .setOrigin(0.5);

    const xpBarBg = this.add.graphics();
    xpBarBg.fillStyle(0x0b0824, 0.9);
    xpBarBg.fillRoundedRect(-120, cardTop + 188, 240, 10, 5);
    xpBarBg.fillStyle(rankRes.leveledUp ? 0x06d6a0 : 0x39e5b6, 1);
    xpBarBg.fillRoundedRect(-120, cardTop + 188, Math.max(10, 240 * rankRes.ratio), 10, 5);

    card.add([cardBg, title, scoreLbl, scoreVal, bestVal, rankTxt, xpBarBg]);

    let nextY = cardTop + 234;

    // 1. Rewarded Continue (1x per game)
    if (canContinue) {
      const contLabel = isOutOfMoves ? t('continueMovesAd') : t('continueShakeAd');
      const contBtn = this.makeModalButton(0, nextY, contLabel, 0xff9f1c, '#0b132b', () => {
        this.handleContinue(reason);
      });
      card.add(contBtn);
      nextY += 58;
    }

    // 2. Rewarded Score x2
    if (canDoubleScore) {
      const x2Btn = this.makeModalButton(0, nextY, t('doubleScoreAd'), 0x7209b7, '#ffffff', () => {
        adManager.showRewarded({
          onStart: () => this.pauseForAd(),
          onReward: () => {
            this.scoreDoubled = true;
            this.score *= 2;
            this.scoreText.setText(String(this.score));
            scoreVal.setText(String(this.score));
            if (storageManager.updateBestScore(this.score)) {
              this.bestScore = this.score;
              this.bestText.setText(`👑 ${this.bestScore}`);
              bestVal.setText(`👑 ${t('bestScore', { best: this.bestScore })}`);
            }
            x2Btn.destroy();
            this.spawnConfetti(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, 35);
          },
          onDismiss: () => this.resumeFromAd(),
        });
      });
      card.add(x2Btn);
      nextY += 58;
    }

    // 3. Instant "REJOUER" Button (triggers Interstitial if eligible)
    const replayBtn = this.makeModalButton(0, nextY, `↻  ${t('replayBtn')}`, 0x06d6a0, '#0b132b', () => {
      adManager.showInterstitialIfEligible({
        onStart: () => this.pauseForAd(),
        onDismiss: () => {
          this.resumeFromAd();
          this.scene.restart();
        },
      });
    });
    card.add(replayBtn);
    nextY += 56;

    // 4. Quit Game Button
    const quitBtn = this.makeModalButton(0, nextY, t('quitBtn'), 0x2b2d42, '#ffffff', () => {
      this.quitGame();
    });
    card.add(quitBtn);

    this.gameOverObjects = [overlay, card];

    this.tweens.add({
      targets: card,
      scale: 1,
      alpha: 1,
      duration: 240,
      ease: 'Back.easeOut',
    });

    // Celebrate if new record
    if (this.score > 0 && this.score >= this.bestScore) {
      this.spawnConfetti(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 120, 40);
    }
  }

  makeModalButton(x, y, label, bgColor, textColor, onClick) {
    const container = this.add.container(x, y);
    const w = 264;
    const h = 50;
    const bg = this.add.graphics();
    // Subtle dark 3D bottom lip
    bg.fillStyle(0x000000, 0.35);
    bg.fillRoundedRect(-w / 2, -h / 2 + 4, w, h, 25);
    // Main button fill
    bg.fillStyle(bgColor, 1);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 25);
    // Top glossy highlight
    bg.fillStyle(0xffffff, 0.2);
    bg.fillRoundedRect(-w / 2 + 10, -h / 2 + 3, w - 20, 12, 6);
    // Border
    bg.lineStyle(2, 0xffffff, 0.38);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 25);

    const txt = this.add
      .text(0, -1, label, {
        fontFamily: FONT_FAMILY,
        fontSize: '16px',
        fontStyle: 'bold',
        color: textColor,
      })
      .setOrigin(0.5);

    const zone = this.add.zone(0, 0, w, h + 4).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => {
      soundFX.playClick();
      this.tweens.add({ targets: container, scale: 0.93, duration: 65, yoyo: true });
      onClick();
    });

    container.add([bg, txt, zone]);
    return container;
  }

  handleContinue(reason = 'overflow') {
    adManager.showRewarded({
      onStart: () => this.pauseForAd(),
      onReward: () => {
        this.continuesUsed += 1;

        if (reason === 'out_of_moves') {
          this.movesLeft += 6;
          this.updateMissionPill();
        } else {
          // Destroy up to 4 highest fruits (smallest Y)
          const sorted = [...this.fruits].filter((f) => f.active).sort((a, b) => a.y - b.y);
          const toRemove = sorted.slice(0, 4);
          for (const f of toRemove) {
            this.spawnConfetti(f.x, f.y, 12);
            this.fruits = this.fruits.filter((item) => item !== f);
            f.destroy();
          }
        }

        // Clear Game Over UI and resume
        for (const obj of this.gameOverObjects) {
          obj.destroy();
        }
        this.gameOverObjects = [];
        this.dangerTimer = 0;
        this.isGameOver = false;
        this.prepareNextDrop();
      },
      onDismiss: () => this.resumeFromAd(),
    });
  }

  openSettingsModal() {
    if (this.settingsOpen || this.isGameOver) return;
    this.settingsOpen = true;
    this.canDrop = false;
    this.matter.world.pause();

    const overlay = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x090a1a, 0.78)
      .setDepth(30)
      .setInteractive();

    const card = this.add
      .container(GAME_WIDTH / 2, GAME_HEIGHT / 2)
      .setDepth(35)
      .setScale(0.75)
      .setAlpha(0);

    const cardBg = this.add.graphics();
    cardBg.fillStyle(0x1b1e3f, 1);
    cardBg.fillRoundedRect(-175, -245, 350, 490, 24);
    cardBg.lineStyle(2.5, 0x8ecae6, 0.75);
    cardBg.strokeRoundedRect(-175, -245, 350, 490, 24);

    const title = this.add
      .text(0, -206, t('settingsTitle'), {
        fontFamily: FONT_FAMILY,
        fontSize: '22px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    const closeModal = () => {
      overlay.destroy();
      card.destroy();
      this.settingsOpen = false;
      this.canDrop = true;
      this.matter.world.resume();
    };

    // 1. Game Mode Switcher (Levels vs Endless)
    const isLevels = storageManager.getGameMode() === 'levels';
    const modeBtn = this.makeModalButton(
      0,
      -140,
      `${t('modeSwitchTitle')} : ${isLevels ? t('modeLevels') : t('modeEndless')}`,
      0xff9f1c,
      '#0b132b',
      () => {
        const nextMode = storageManager.getGameMode() === 'levels' ? 'endless' : 'levels';
        storageManager.setGameMode(nextMode);
        closeModal();
        this.scene.restart();
      }
    );

    // 2. Sound Toggle
    const soundBtn = this.makeModalButton(
      0,
      -78,
      `${t('soundLabel')} : ${soundFX.muted ? t('off') : t('on')}`,
      0x3a0ca3,
      '#ffffff',
      () => {
        const muted = soundFX.toggleMute();
        this.muteBtn.setText(muted ? '🔇' : '🔊');
        soundBtn.getAt(1).setText(`${t('soundLabel')} : ${muted ? t('off') : t('on')}`);
      }
    );

    // 3. Haptics / Vibration Toggle
    const hapticsBtn = this.makeModalButton(
      0,
      -16,
      `${t('hapticsLabel')} : ${storageManager.isHapticsEnabled() ? t('on') : t('off')}`,
      0x4361ee,
      '#ffffff',
      () => {
        const next = !storageManager.isHapticsEnabled();
        storageManager.setHapticsEnabled(next);
        haptics.setEnabled(next);
        if (next) haptics.drop();
        hapticsBtn.getAt(1).setText(`${t('hapticsLabel')} : ${next ? t('on') : t('off')}`);
      }
    );

    // 4. Language Cycler (FR -> EN -> DE -> JA -> AR)
    const curLangObj = SUPPORTED_LANGS.find((l) => l.code === storageManager.getLang()) || SUPPORTED_LANGS[0];
    const langBtn = this.makeModalButton(
      0,
      46,
      `${t('langLabel')} : ${curLangObj.label}`,
      0x7209b7,
      '#ffffff',
      () => {
        const idx = SUPPORTED_LANGS.findIndex((l) => l.code === storageManager.getLang());
        const nextLang = SUPPORTED_LANGS[(idx + 1) % SUPPORTED_LANGS.length];
        storageManager.setLang(nextLang.code);
        closeModal();
        this.scene.restart();
      }
    );

    // 5. Privacy (RGPD)
    const privacyBtn = this.makeModalButton(0, 108, '🔒  RGPD / PRIVACY', 0x2b2d42, '#ffffff', () => {
      if (!adManager.isNative()) {
        this.showToast('🔒 Android only');
        return;
      }
      adManager.showPrivacyOptions();
    });

    // 6. Close / Resume
    const resumeBtn = this.makeModalButton(0, 174, `▶  ${t('close')}`, 0x06d6a0, '#0b132b', closeModal);

    card.add([cardBg, title, modeBtn, soundBtn, hapticsBtn, langBtn, privacyBtn, resumeBtn]);

    this.tweens.add({
      targets: card,
      scale: 1,
      alpha: 1,
      duration: 200,
      ease: 'Back.easeOut',
    });
  }

  showToast(message) {
    const toast = this.add
      .text(GAME_WIDTH / 2, JAR_BOTTOM - 40, message, {
        fontFamily: FONT_FAMILY,
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#ffffff',
        backgroundColor: '#1b1e3f',
        padding: { x: 14, y: 8 },
      })
      .setOrigin(0.5)
      .setDepth(40)
      .setAlpha(0);

    this.tweens.add({
      targets: toast,
      alpha: 1,
      y: toast.y - 10,
      duration: 180,
      onComplete: () => {
        this.time.delayedCall(1500, () => {
          this.tweens.add({
            targets: toast,
            alpha: 0,
            duration: 250,
            onComplete: () => toast.destroy(),
          });
        });
      },
    });
  }

  openRetentionModal() {
    if (this.settingsOpen || this.isGameOver) return;
    this.settingsOpen = true;
    this.canDrop = false;
    this.matter.world.pause();

    const overlay = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x090a1a, 0.8)
      .setDepth(30)
      .setInteractive();

    const card = this.add
      .container(GAME_WIDTH / 2, GAME_HEIGHT / 2)
      .setDepth(35)
      .setScale(0.75)
      .setAlpha(0);

    const cardBg = this.add.graphics();
    cardBg.fillStyle(0x1b1e3f, 1);
    cardBg.fillRoundedRect(-192, -268, 384, 536, 26);
    cardBg.lineStyle(3, 0xffd166, 0.85);
    cardBg.strokeRoundedRect(-192, -268, 384, 536, 26);

    // 3 Spacious Tabs at the top
    let activeTab = 'quests';
    const questsGroup = this.add.container(0, 0);
    const leagueGroup = this.add.container(0, 0).setVisible(false);
    const themesGroup = this.add.container(0, 0).setVisible(false);

    const makeTab = (x, labelText, tabKey) => {
      const tCont = this.add.container(x, -222);
      const bg = this.add.graphics();
      const txt = this.add
        .text(0, 0, labelText, {
          fontFamily: FONT_FAMILY,
          fontSize: '12px',
          fontStyle: 'bold',
          color: '#ffffff',
        })
        .setOrigin(0.5);
      const zone = this.add.zone(0, 0, 114, 38).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', (pointer) => {
        pointer.event?.stopPropagation?.();
        soundFX.playClick();
        activeTab = tabKey;
        refreshTabs();
      });
      tCont.add([bg, txt, zone]);
      return { tCont, bg, txt, tabKey };
    };

    const tab1 = makeTab(-118, t('tabQuests'), 'quests');
    const tab2 = makeTab(0, t('tabLeague'), 'league');
    const tab3 = makeTab(118, t('tabThemes'), 'themes');

    const refreshTabs = () => {
      [tab1, tab2, tab3].forEach(({ bg, txt, tabKey }) => {
        const isOn = activeTab === tabKey;
        bg.clear();
        bg.fillStyle(isOn ? 0xff9f1c : 0x262b59, 1);
        bg.fillRoundedRect(-56, -19, 112, 38, 19);
        bg.lineStyle(2, isOn ? 0xfff3b0 : 0x4a528a, isOn ? 1 : 0.6);
        bg.strokeRoundedRect(-56, -19, 112, 38, 19);
        txt.setColor(isOn ? '#0b132b' : '#cbd5ff');
      });
      questsGroup.setVisible(activeTab === 'quests');
      leagueGroup.setVisible(activeTab === 'league');
      themesGroup.setVisible(activeTab === 'themes');
    };
    refreshTabs();

    // --- TAB 1: CLAIMABLE QUESTS ---
    const buildQuests = () => {
      questsGroup.removeAll(true);
      const quests = storageManager.getQuests();
      quests.forEach((q, idx) => {
        const qy = -152 + idx * 66;
        const rowBg = this.add.graphics();
        rowBg.fillStyle(q.claimed ? 0x171933 : 0x262b59, 1);
        rowBg.fillRoundedRect(-170, qy - 26, 340, 56, 14);
        rowBg.lineStyle(1.8, q.completed && !q.claimed ? 0x06d6a0 : 0x4a528a, 0.8);
        rowBg.strokeRoundedRect(-170, qy - 26, 340, 56, 14);

        const qTitle = this.add.text(-156, qy - 16, q.title, {
          fontFamily: FONT_FAMILY,
          fontSize: '13px',
          fontStyle: 'bold',
          color: q.claimed ? '#8d99ae' : '#ffffff',
        });

        const rewardStr = `+${q.rewardXp} XP${q.rewardToken ? '  +1 🎁' : ''}`;
        const qProg = this.add.text(-156, qy + 6, `${q.progress}/${q.target}  •  ${rewardStr}`, {
          fontFamily: FONT_FAMILY,
          fontSize: '11px',
          fontStyle: 'bold',
          color: '#ffd166',
        });

        questsGroup.add([rowBg, qTitle, qProg]);

        if (q.completed && !q.claimed) {
          const btnBg = this.add.graphics();
          btnBg.fillStyle(0x06d6a0, 1);
          btnBg.fillRoundedRect(76, qy - 16, 84, 32, 16);
          const btnTxt = this.add
            .text(118, qy, t('claim'), {
              fontFamily: FONT_FAMILY,
              fontSize: '12px',
              fontStyle: 'bold',
              color: '#0b132b',
            })
            .setOrigin(0.5);
          const zone = this.add.zone(118, qy, 84, 34).setInteractive({ useHandCursor: true });
          zone.on('pointerdown', (pointer) => {
            pointer.event?.stopPropagation?.();
            soundFX.playLevelWin();
            haptics.levelWin();
            storageManager.claimQuest(q.id);
            firebaseManager.logEvent('quest_claimed', { quest_id: q.id });
            this.spawnConfetti(GAME_WIDTH / 2, GAME_HEIGHT / 2, 24);
            this.refreshQuestBadge();
            this.refreshBoosterLabels();
            buildQuests();
          });
          questsGroup.add([btnBg, btnTxt, zone]);
        } else {
          const stTxt = this.add
            .text(154, qy, q.claimed ? t('claimed') : t('inProgress'), {
              fontFamily: FONT_FAMILY,
              fontSize: '11px',
              fontStyle: 'bold',
              color: q.claimed ? '#06d6a0' : '#9bf6ff',
            })
            .setOrigin(1, 0.5);
          questsGroup.add(stTxt);
        }
      });
    };
    buildQuests();

    // --- TAB 2: BEST SCORE LEAGUE RANKING (Firestore Live + Offline Fallback) ---
    const bestPts = storageManager.getBestScore();
    const { current: curLeague, next: nextLeague } = getLeagueForPoints(bestPts);

    const renderLeagueBoard = (board, isLive = false) => {
      leagueGroup.removeAll(true);
      const playerRow = board.find((r) => r.isPlayer) || { rank: 1 };

      const leagueHdrBg = this.add.graphics();
      leagueHdrBg.fillStyle(0x262b59, 1);
      leagueHdrBg.fillRoundedRect(-170, -182, 340, 62, 16);
      leagueHdrBg.lineStyle(2, 0xffd166, 0.75);
      leagueHdrBg.strokeRoundedRect(-170, -182, 340, 62, 16);

      const liveTag = isLive ? ' 🌍' : '';
      const leagueTitle = this.add
        .text(0, -162, `${curLeague.icon}  ${t('leagueTitle', { name: curLeague.name })}${liveTag}`, {
          fontFamily: FONT_FAMILY,
          fontSize: '18px',
          fontStyle: 'bold',
          color: curLeague.color,
        })
        .setOrigin(0.5);

      const leagueSub = this.add
        .text(
          0,
          -136,
          `${t('yourRank', { rank: playerRow.rank })}  •  ${bestPts} pts${
            nextLeague ? `  (➜ ${nextLeague.icon} ${nextLeague.minPts})` : ''
          }`,
          {
            fontFamily: FONT_FAMILY,
            fontSize: '12px',
            fontStyle: 'bold',
            color: '#cbd5ff',
          }
        )
        .setOrigin(0.5);

      leagueGroup.add([leagueHdrBg, leagueTitle, leagueSub]);

      board.forEach((row, idx) => {
        const ry = -96 + idx * 34;
        const rBg = this.add.graphics();
        rBg.fillStyle(row.isPlayer ? 0x3a0ca3 : 0x20244a, row.isPlayer ? 1 : 0.85);
        rBg.fillRoundedRect(-170, ry - 14, 340, 28, 10);
        if (row.isPlayer) {
          rBg.lineStyle(1.5, 0x06d6a0, 1);
          rBg.strokeRoundedRect(-170, ry - 14, 340, 28, 10);
        }
        const rTxt = this.add
          .text(-156, ry, `#${row.rank}   ${row.isPlayer ? t('youLabel') : row.name}`, {
            fontFamily: FONT_FAMILY,
            fontSize: '13px',
            fontStyle: 'bold',
            color: row.isPlayer ? '#06d6a0' : '#ffffff',
          })
          .setOrigin(0, 0.5);
        const pTxt = this.add
          .text(156, ry, `${row.pts} pts`, {
            fontFamily: FONT_FAMILY,
            fontSize: '13px',
            fontStyle: 'bold',
            color: '#ffd166',
          })
          .setOrigin(1, 0.5);
        leagueGroup.add([rBg, rTxt, pTxt]);
      });
    };

    renderLeagueBoard(buildWeeklyLeaderboard(bestPts), false);
    firebaseManager.fetchLeaderboard(bestPts, 8).then(({ rows, isLive }) => {
      if (!card.scene) return;
      renderLeagueBoard(rows, isLive);
    });

    // --- TAB 3: VISUAL THEMES ---
    const themeObjs = [];
    const saveData = storageManager.data;

    const refreshThemes = () => {
      const currentId = storageManager.getSelectedTheme();
      themeObjs.forEach(({ theme, bg, titleTxt, subTxt }) => {
        const unlocked = theme.isUnlocked(saveData);
        const selected = theme.id === currentId;
        bg.clear();
        bg.fillStyle(selected ? 0x3a0ca3 : unlocked ? 0x262b59 : 0x171933, 1);
        bg.fillRoundedRect(-168, -32, 336, 64, 16);
        bg.lineStyle(2.5, selected ? 0x39e5b6 : unlocked ? 0x8ecae6 : 0x4a4e69, selected ? 1 : 0.55);
        bg.strokeRoundedRect(-168, -32, 336, 64, 16);

        titleTxt.setText(`${theme.icon}  ${theme.name}`);
        subTxt.setText(selected ? t('activeTheme') : unlocked ? t('tapToUse') : `🔒 ${theme.unlockDesc}`);
        subTxt.setColor(selected ? '#39e5b6' : unlocked ? '#cbd5ff' : '#ffd166');
      });
    };

    THEMES.forEach((theme, idx) => {
      const ty = -142 + idx * 78;
      const tContainer = this.add.container(0, ty);
      const bg = this.add.graphics();
      const titleTxt = this.add
        .text(-148, -12, '', {
          fontFamily: FONT_FAMILY,
          fontSize: '16px',
          fontStyle: 'bold',
          color: '#ffffff',
        })
        .setOrigin(0, 0.5);
      const subTxt = this.add
        .text(-148, 12, '', {
          fontFamily: FONT_FAMILY,
          fontSize: '12px',
          fontStyle: 'bold',
          color: '#cbd5ff',
        })
        .setOrigin(0, 0.5);
      const zone = this.add.zone(0, 0, 336, 64).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', (pointer) => {
        pointer.event?.stopPropagation?.();
        soundFX.playClick();
        if (!theme.isUnlocked(saveData)) {
          this.showToast(`🔒 ${theme.unlockDesc}`);
          return;
        }
        storageManager.setSelectedTheme(theme.id);
        this.renderThemeBackground();
        this.renderThemeJar();
        refreshThemes();
      });
      tContainer.add([bg, titleTxt, subTxt, zone]);
      themeObjs.push({ theme, tContainer, bg, titleTxt, subTxt });
    });
    refreshThemes();
    themesGroup.add(themeObjs.map((o) => o.tContainer));

    const closeModal = () => {
      overlay.destroy();
      card.destroy();
      this.settingsOpen = false;
      this.canDrop = true;
      this.matter.world.resume();
    };

    const closeBtn = this.makeModalButton(0, 218, `▶  ${t('close')}`, 0x06d6a0, '#0b132b', closeModal);

    card.add([cardBg, tab1.tCont, tab2.tCont, tab3.tCont, questsGroup, leagueGroup, themesGroup, closeBtn]);

    this.tweens.add({
      targets: card,
      scale: 1,
      alpha: 1,
      duration: 200,
      ease: 'Back.easeOut',
    });
  }
}
