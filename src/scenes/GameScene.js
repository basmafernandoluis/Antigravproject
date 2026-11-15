import Phaser from 'phaser';
import { FRUITS, MAX_SPAWN_TIER } from '../config/fruits.js';
import { AD_RULES } from '../config/ads.js';
import { generateGameTextures } from '../utils/textures.js';
import { soundFX } from '../utils/sound.js';
import { adManager } from '../managers/AdManager.js';
import { storageManager } from '../managers/StorageManager.js';

const GAME_WIDTH = 480;
const GAME_HEIGHT = 854;

// Container / Jar geometry
const JAR_LEFT = 36;
const JAR_RIGHT = 444;
const JAR_TOP = 246;
const JAR_BOTTOM = 776;
const WALL_THICKNESS = 24;
const DANGER_Y = 276;
const DROP_Y = 196;

const CONFETTI_COLORS = [0xff3b5c, 0xffd166, 0x06d6a0, 0x118ab2, 0x9b5de5, 0xff7b00];

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    generateGameTextures(this);
    adManager.init();

    this.score = 0;
    this.bestScore = storageManager.getBestScore();
    this.isGameOver = false;
    this.canDrop = true;
    this.pinMode = false;
    this.continuesUsed = 0;
    this.scoreDoubled = false;
    this.comboCount = 0;
    this.lastMergeTime = 0;
    this.dangerTimer = 0;
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
    this.nextTier = Phaser.Math.Between(0, MAX_SPAWN_TIER);
    this.prepareNextDrop();

    // First-time micro-tutorial
    if (storageManager.getGamesPlayed() === 0) {
      this.tutorialHint = this.add
        .text(GAME_WIDTH / 2, JAR_TOP + 120, '👆 GLISSE POUR VISER\nRELÂCHE POUR LÂCHER !', {
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
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x13152e, 0x13152e, 0x1e1640, 0x261447, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

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

  createJar() {
    const jarWidth = JAR_RIGHT - JAR_LEFT;
    const jarHeight = JAR_BOTTOM - JAR_TOP;

    // Glass interior
    const glass = this.add.graphics();
    glass.fillStyle(0xffffff, 0.06);
    glass.fillRoundedRect(JAR_LEFT, JAR_TOP, jarWidth, jarHeight, { tl: 6, tr: 6, bl: 22, br: 22 });

    // Glowing glass border
    glass.lineStyle(4, 0x8ecae6, 0.55);
    glass.beginPath();
    glass.moveTo(JAR_LEFT, JAR_TOP);
    glass.lineTo(JAR_LEFT, JAR_BOTTOM - 16);
    glass.arc(JAR_LEFT + 16, JAR_BOTTOM - 16, 16, Math.PI, Math.PI * 0.5, true);
    glass.lineTo(JAR_RIGHT - 16, JAR_BOTTOM);
    glass.arc(JAR_RIGHT - 16, JAR_BOTTOM - 16, 16, Math.PI * 0.5, 0, true);
    glass.lineTo(JAR_RIGHT, JAR_TOP);
    glass.strokePath();

    // Inner specular highlight
    glass.lineStyle(2, 0xffffff, 0.14);
    glass.lineBetween(JAR_LEFT + 8, JAR_TOP + 10, JAR_LEFT + 8, JAR_BOTTOM - 28);

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

    // Danger line (dashed)
    this.dangerLine = this.add.graphics();
    this.drawDangerLine(0.35);

    this.dangerLabel = this.add
      .text(JAR_RIGHT - 8, DANGER_Y - 14, 'LIMITE', {
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#ff4d6d',
      })
      .setOrigin(1, 0.5)
      .setAlpha(0.55);

    // Danger countdown bar (hidden unless overflowing)
    this.dangerBarBg = this.add.rectangle(GAME_WIDTH / 2, DANGER_Y - 26, 180, 8, 0x000000, 0.45).setVisible(false);
    this.dangerBarFill = this.add.rectangle(GAME_WIDTH / 2 - 90, DANGER_Y - 26, 0, 8, 0xff3b5c, 1).setOrigin(0, 0.5).setVisible(false);
  }

  drawDangerLine(alpha) {
    this.dangerLine.clear();
    this.dangerLine.lineStyle(2, 0xff3b5c, alpha);
    const dashLen = 10;
    const gapLen = 8;
    for (let x = JAR_LEFT + 8; x < JAR_RIGHT - 8; x += dashLen + gapLen) {
      this.dangerLine.lineBetween(x, DANGER_Y, Math.min(x + dashLen, JAR_RIGHT - 8), DANGER_Y);
    }
  }

  createUI() {
    // Top Header Bar
    this.add
      .text(24, 22, 'JUICY DROP!', {
        fontSize: '28px',
        fontStyle: '900',
        color: '#ffffff',
        stroke: '#ff3b5c',
        strokeThickness: 5,
      })
      .setOrigin(0, 0);

    // Glass Icon Buttons (Settings & Sound)
    const makeIconBtn = (x, y, iconText, onClick) => {
      const container = this.add.container(x, y).setDepth(12);
      const bg = this.add.graphics();
      bg.fillStyle(0xffffff, 0.1);
      bg.fillRoundedRect(-21, -21, 42, 42, 12);
      bg.lineStyle(1.5, 0x8ecae6, 0.45);
      bg.strokeRoundedRect(-21, -21, 42, 42, 12);

      const txt = this.add.text(0, 0, iconText, { fontSize: '20px' }).setOrigin(0.5);
      const zone = this.add.zone(0, 0, 42, 42).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', (pointer) => {
        pointer.event?.stopPropagation?.();
        soundFX.playClick();
        this.tweens.add({ targets: container, scale: 0.88, duration: 60, yoyo: true });
        onClick(txt);
      });
      container.add([bg, txt, zone]);
      return { container, txt };
    };

    const muteObj = makeIconBtn(GAME_WIDTH - 92, 40, soundFX.muted ? '🔇' : '🔊', (txt) => {
      const muted = soundFX.toggleMute();
      txt.setText(muted ? '🔇' : '🔊');
    });
    this.muteBtn = muteObj.txt;

    makeIconBtn(GAME_WIDTH - 42, 40, '⚙️', () => {
      if (!this.isGameOver) {
        this.openSettingsModal();
      }
    });

    // Score Card (Glossy Glass)
    const scoreBg = this.add.graphics();
    scoreBg.fillStyle(0x1e224d, 0.85);
    scoreBg.fillRoundedRect(24, 74, 166, 68, 16);
    scoreBg.lineStyle(2, 0x8ecae6, 0.45);
    scoreBg.strokeRoundedRect(24, 74, 166, 68, 16);

    this.add.text(36, 82, 'SCORE', {
      fontSize: '13px',
      fontStyle: '900',
      color: '#a5b4fc',
    });

    this.scoreText = this.add.text(36, 100, '0', {
      fontSize: '30px',
      fontStyle: '900',
      color: '#ffffff',
      stroke: '#0d0e22',
      strokeThickness: 3,
    });

    this.bestText = this.add
      .text(178, 82, `TOP ${this.bestScore}`, {
        fontSize: '13px',
        fontStyle: '900',
        color: '#ffd166',
      })
      .setOrigin(1, 0);

    // Next Fruit Card (Glossy Glass)
    const nextBg = this.add.graphics();
    nextBg.fillStyle(0x1e224d, 0.85);
    nextBg.fillRoundedRect(GAME_WIDTH - 122, 74, 98, 68, 16);
    nextBg.lineStyle(2, 0x8ecae6, 0.45);
    nextBg.strokeRoundedRect(GAME_WIDTH - 122, 74, 98, 68, 16);

    this.add
      .text(GAME_WIDTH - 73, 81, 'SUIVANT', {
        fontSize: '12px',
        fontStyle: '900',
        color: '#a5b4fc',
      })
      .setOrigin(0.5, 0);

    this.nextPreviewSprite = this.add.image(GAME_WIDTH - 73, 117, 'fruit_0').setScale(0.75);

    // Rewarded Booster Pills (aligned neatly between Score & Next)
    this.createBoosterButtons();

    // Pin Mode Hint Banner
    this.pinBanner = this.add
      .text(GAME_WIDTH / 2, DROP_Y - 26, '📌 TOUCHEZ UN FRUIT À DÉTRUIRE', {
        fontSize: '15px',
        fontStyle: '900',
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

  createBoosterButtons() {
    const makeArcadePill = (x, y, label, fillColor, lipColor, onClick) => {
      const container = this.add.container(x, y).setDepth(12);
      const w = 148;
      const h = 31;
      const bg = this.add.graphics();
      // 3D bottom lip
      bg.fillStyle(lipColor, 1);
      bg.fillRoundedRect(-w / 2, -h / 2 + 3, w, h, 15);
      // Main pill body
      bg.fillStyle(fillColor, 1);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, 15);
      // Subtle top glossy highlight
      bg.fillStyle(0xffffff, 0.14);
      bg.fillRoundedRect(-w / 2 + 8, -h / 2 + 2, w - 16, 7, 3);
      // Crisp border
      bg.lineStyle(1.5, 0xffffff, 0.4);
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 15);

      const txt = this.add
        .text(0, 0, label, {
          fontSize: '14px',
          fontStyle: '900',
          color: '#ffffff',
        })
        .setOrigin(0.5);

      const zone = this.add.zone(0, 0, w, h + 4).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', (pointer) => {
        pointer.event?.stopPropagation?.();
        soundFX.playClick();
        this.tweens.add({ targets: container, scale: 0.92, duration: 65, yoyo: true });
        onClick();
      });

      container.add([bg, txt, zone]);
      return container;
    };

    makeArcadePill(274, 88, '🎬 SECOUER', 0x7b2cbf, 0x3c096c, () => this.triggerShakeBooster());
    makeArcadePill(274, 125, '🎬 ÉPINGLE', 0xff3b5c, 0xa4133c, () => this.triggerPinBooster());
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
      if (pointer.y < 128) return; // Ignore top HUD & booster clicks

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

  prepareNextDrop() {
    if (this.isGameOver) return;
    this.currentTier = this.nextTier;
    this.nextTier = Phaser.Math.Between(0, MAX_SPAWN_TIER);

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
    this.spawnPhysicsFruit(this.aimX, DROP_Y, this.currentTier, false);

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
                scaleX: 1.12,
                scaleY: 0.88,
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

        if (tierA !== undefined && tierA === tierB && tierA < FRUITS.length - 1) {
          objA.setData('merging', true);
          objB.setData('merging', true);
          this.handleMerge(objA, objB, tierA);
        }
      }
    });
  }

  handleMerge(objA, objB, tier) {
    const midX = (objA.x + objB.x) / 2;
    const midY = (objA.y + objB.y) / 2;
    const nextTier = tier + 1;

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

    // Score update
    const gained = FRUITS[nextTier].score * this.comboCount;
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
      this.bestText.setText(`TOP ${this.bestScore}`);
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
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(nextTier >= 4 ? [18, 25, 22] : 16);
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
      .text(GAME_WIDTH / 2, JAR_TOP + 45, `🌟 NOUVEAU FRUIT : ${fruit.name.toUpperCase()} !`, {
        fontSize: '15px',
        fontStyle: '900',
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
    if (this.isGameOver) return;

    const now = this.time.now;
    let overflowing = false;

    for (const fruit of this.fruits) {
      if (!fruit.active) continue;
      // Only check fruits that have been in play > 1.1s so newly dropped ones don't trigger immediately
      if (now - fruit.getData('spawnTime') < 1100) continue;

      const tier = fruit.getData('tier');
      const r = FRUITS[tier].radius;
      if (fruit.y - r < DANGER_Y) {
        overflowing = true;
        break;
      }
    }

    if (overflowing) {
      this.dangerTimer += delta;
      const ratio = Phaser.Math.Clamp(this.dangerTimer / 1500, 0, 1);

      this.drawDangerLine(0.5 + 0.5 * Math.sin(now * 0.02));
      this.dangerLabel.setAlpha(1);
      this.dangerBarBg.setVisible(true);
      this.dangerBarFill.setVisible(true);
      this.dangerBarFill.width = 180 * ratio;

      if (this.dangerTimer >= 1500) {
        this.triggerGameOver();
      }
    } else {
      if (this.dangerTimer > 0) {
        this.dangerTimer = Math.max(0, this.dangerTimer - delta * 2);
      }
      if (this.dangerTimer === 0) {
        this.drawDangerLine(0.35);
        this.dangerLabel.setAlpha(0.55);
        this.dangerBarBg.setVisible(false);
        this.dangerBarFill.setVisible(false);
      }
    }
  }

  pauseForAd() {
    this.matter.world.pause();
    this.wasMutedBeforeAd = soundFX.muted;
    if (!this.wasMutedBeforeAd) {
      soundFX.muted = true;
    }
  }

  resumeFromAd() {
    this.matter.world.resume();
    soundFX.muted = this.wasMutedBeforeAd ?? false;
  }

  triggerShakeBooster() {
    if (this.isGameOver || this.fruits.length === 0 || adManager.isShowingAd) return;

    adManager.showRewarded({
      onStart: () => this.pauseForAd(),
      onReward: () => {
        this.cameras.main.shake(280, 0.016);
        for (const fruit of this.fruits) {
          if (!fruit.active) continue;
          fruit.setVelocity(
            Phaser.Math.FloatBetween(-6, 6),
            Phaser.Math.FloatBetween(-9, -4)
          );
        }
        this.spawnConfetti(GAME_WIDTH / 2, JAR_TOP + 60, 20);
      },
      onDismiss: () => this.resumeFromAd(),
    });
  }

  triggerPinBooster() {
    if (this.isGameOver || this.fruits.length === 0 || this.pinMode || adManager.isShowingAd) return;

    adManager.showRewarded({
      onStart: () => this.pauseForAd(),
      onReward: () => {
        this.pinMode = true;
        this.canDrop = false;
        this.aimLine.clear();
        this.dropperFruit.setVisible(false);
        this.pinBanner.setVisible(true);
      },
      onDismiss: () => this.resumeFromAd(),
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

    soundFX.playMerge(tier, 1);
    this.cameras.main.shake(150, 0.01);
    this.spawnConfetti(fx, fy, 18);

    this.pinMode = false;
    this.pinBanner.setVisible(false);
    this.canDrop = true;
    this.dropperFruit.setVisible(true);
    this.drawAimLine();
  }

  triggerGameOver() {
    this.isGameOver = true;
    this.canDrop = false;
    this.pinMode = false;
    this.pinBanner.setVisible(false);
    this.aimLine.clear();
    this.dropperFruit.setVisible(false);
    this.dangerBarBg.setVisible(false);
    this.dangerBarFill.setVisible(false);

    storageManager.incrementGamesPlayed();
    soundFX.playGameOver();
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

    const canContinue =
      this.continuesUsed < AD_RULES.MAX_CONTINUES_PER_GAME && this.fruits.length > 0;
    const canDoubleScore = !this.scoreDoubled && this.score > 0;

    // Modal Card
    const card = this.add
      .container(GAME_WIDTH / 2, GAME_HEIGHT / 2)
      .setDepth(25)
      .setScale(0.6)
      .setAlpha(0);

    const cardH = canContinue ? 385 : 330;
    const cardTop = -cardH / 2;

    const cardBg = this.add.graphics();
    cardBg.fillStyle(0x1b1e3f, 1);
    cardBg.fillRoundedRect(-170, cardTop, 340, cardH, 24);
    cardBg.lineStyle(3, 0xff3b5c, 0.8);
    cardBg.strokeRoundedRect(-170, cardTop, 340, cardH, 24);

    const title = this.add
      .text(0, cardTop + 42, 'GAME OVER !', {
        fontSize: '30px',
        fontStyle: '900',
        color: '#ff3b5c',
      })
      .setOrigin(0.5);

    const scoreLbl = this.add
      .text(0, cardTop + 88, 'SCORE FINAL', {
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#a5b4fc',
      })
      .setOrigin(0.5);

    const scoreVal = this.add
      .text(0, cardTop + 122, String(this.score), {
        fontSize: '40px',
        fontStyle: '900',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    const bestVal = this.add
      .text(0, cardTop + 160, `RECORD : ${this.bestScore}`, {
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#ffd166',
      })
      .setOrigin(0.5);

    card.add([cardBg, title, scoreLbl, scoreVal, bestVal]);

    let nextY = cardTop + 205;

    // 1. Rewarded Continue (1x per game)
    if (canContinue) {
      const contBtn = this.makeModalButton(0, nextY, '🎬  CONTINUER (1x)', 0xff9f1c, '#0b132b', () => {
        this.handleContinue();
      });
      card.add(contBtn);
      nextY += 58;
    }

    // 2. Rewarded Score x2
    if (canDoubleScore) {
      const x2Btn = this.makeModalButton(0, nextY, '🎬  SCORE x2', 0x7209b7, '#ffffff', () => {
        adManager.showRewarded({
          onStart: () => this.pauseForAd(),
          onReward: () => {
            this.scoreDoubled = true;
            this.score *= 2;
            this.scoreText.setText(String(this.score));
            scoreVal.setText(String(this.score));
            if (storageManager.updateBestScore(this.score)) {
              this.bestScore = this.score;
              this.bestText.setText(`MAX ${this.bestScore}`);
              bestVal.setText(`RECORD : ${this.bestScore}`);
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
    const replayBtn = this.makeModalButton(0, nextY, '↻  REJOUER', 0x06d6a0, '#0b132b', () => {
      adManager.showInterstitialIfEligible({
        onStart: () => this.pauseForAd(),
        onDismiss: () => {
          this.resumeFromAd();
          this.scene.restart();
        },
      });
    });
    card.add(replayBtn);

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
        fontSize: '18px',
        fontStyle: '900',
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

  handleContinue() {
    adManager.showRewarded({
      onStart: () => this.pauseForAd(),
      onReward: () => {
        this.continuesUsed += 1;

        // Destroy up to 4 highest fruits (smallest Y)
        const sorted = [...this.fruits].filter((f) => f.active).sort((a, b) => a.y - b.y);
        const toRemove = sorted.slice(0, 4);
        for (const f of toRemove) {
          this.spawnConfetti(f.x, f.y, 12);
          this.fruits = this.fruits.filter((item) => item !== f);
          f.destroy();
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
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x090a1a, 0.75)
      .setDepth(30)
      .setInteractive();

    const card = this.add
      .container(GAME_WIDTH / 2, GAME_HEIGHT / 2)
      .setDepth(35)
      .setScale(0.75)
      .setAlpha(0);

    const cardBg = this.add.graphics();
    cardBg.fillStyle(0x1b1e3f, 1);
    cardBg.fillRoundedRect(-170, -185, 340, 370, 24);
    cardBg.lineStyle(2.5, 0x8ecae6, 0.7);
    cardBg.strokeRoundedRect(-170, -185, 340, 370, 24);

    const title = this.add
      .text(0, -145, 'RÉGLAGES', {
        fontSize: '24px',
        fontStyle: '900',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    const maxFruitName = FRUITS[storageManager.getMaxTierReached()]?.name || 'Cerise';
    const statsText = this.add
      .text(
        0,
        -98,
        `Parties : ${storageManager.getGamesPlayed()}   •   Fruit max : ${maxFruitName}`,
        {
          fontSize: '13px',
          fontStyle: 'bold',
          color: '#ffd166',
        }
      )
      .setOrigin(0.5);

    const closeModal = () => {
      overlay.destroy();
      card.destroy();
      this.settingsOpen = false;
      this.canDrop = true;
      this.matter.world.resume();
    };

    const soundBtn = this.makeModalButton(
      0,
      -40,
      soundFX.muted ? '🔇  SON : COUPÉ' : '🔊  SON : ACTIVÉ',
      0x3a0ca3,
      '#ffffff',
      () => {
        const muted = soundFX.toggleMute();
        this.muteBtn.setText(muted ? '🔇' : '🔊');
        const labelObj = soundBtn.getAt(1);
        labelObj.setText(muted ? '🔇  SON : COUPÉ' : '🔊  SON : ACTIVÉ');
      }
    );

    const restartBtn = this.makeModalButton(0, 22, '↻  RECOMMENCER', 0xff9f1c, '#0b132b', () => {
      closeModal();
      this.scene.restart();
    });

    const privacyBtn = this.makeModalButton(
      0,
      84,
      '🔒  CONFIDENTIALITÉ (RGPD)',
      0x2b2d42,
      '#ffffff',
      () => {
        adManager.showPrivacyOptions();
      }
    );

    const resumeBtn = this.makeModalButton(0, 146, '▶  REPRENDRE', 0x06d6a0, '#0b132b', closeModal);

    card.add([cardBg, title, statsText, soundBtn, restartBtn, privacyBtn, resumeBtn]);

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
}
