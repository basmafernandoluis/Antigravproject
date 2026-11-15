import Phaser from 'phaser';
import { FRUITS, MAX_SPAWN_TIER } from '../config/fruits.js';
import { generateGameTextures } from '../utils/textures.js';
import { soundFX } from '../utils/sound.js';

const GAME_WIDTH = 480;
const GAME_HEIGHT = 854;

// Container / Jar geometry
const JAR_LEFT = 36;
const JAR_RIGHT = 444;
const JAR_TOP = 215;
const JAR_BOTTOM = 770;
const WALL_THICKNESS = 24;
const DANGER_Y = 245;
const DROP_Y = 165;

const CONFETTI_COLORS = [0xff3b5c, 0xffd166, 0x06d6a0, 0x118ab2, 0x9b5de5, 0xff7b00];

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    generateGameTextures(this);

    this.score = 0;
    this.bestScore = Number(localStorage.getItem('juicy_drop_best') || 0);
    this.isGameOver = false;
    this.canDrop = true;
    this.comboCount = 0;
    this.lastMergeTime = 0;
    this.dangerTimer = 0;
    this.fruits = [];

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
      .text(28, 26, 'JUICY DROP!', {
        fontSize: '24px',
        fontStyle: '900',
        color: '#ffffff',
        stroke: '#ff3b5c',
        strokeThickness: 4,
      })
      .setOrigin(0, 0);

    // Score Card
    const scoreBg = this.add.graphics();
    scoreBg.fillStyle(0xffffff, 0.08);
    scoreBg.fillRoundedRect(26, 62, 160, 56, 14);
    scoreBg.lineStyle(1.5, 0xffffff, 0.15);
    scoreBg.strokeRoundedRect(26, 62, 160, 56, 14);

    this.add.text(40, 70, 'SCORE', {
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#a5b4fc',
    });

    this.scoreText = this.add.text(40, 86, '0', {
      fontSize: '24px',
      fontStyle: '900',
      color: '#ffffff',
    });

    this.bestText = this.add
      .text(176, 70, `MAX ${this.bestScore}`, {
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#ffd166',
      })
      .setOrigin(1, 0);

    // Next Fruit Card
    const nextBg = this.add.graphics();
    nextBg.fillStyle(0xffffff, 0.08);
    nextBg.fillRoundedRect(GAME_WIDTH - 134, 48, 108, 72, 14);
    nextBg.lineStyle(1.5, 0xffffff, 0.15);
    nextBg.strokeRoundedRect(GAME_WIDTH - 134, 48, 108, 72, 14);

    this.add
      .text(GAME_WIDTH - 80, 56, 'SUIVANT', {
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#a5b4fc',
      })
      .setOrigin(0.5, 0);

    this.nextPreviewSprite = this.add.image(GAME_WIDTH - 80, 92, 'fruit_0').setScale(0.75);

    // Sound Mute Button
    this.muteBtn = this.add
      .text(GAME_WIDTH - 156, 56, soundFX.muted ? '🔇' : '🔊', {
        fontSize: '22px',
      })
      .setOrigin(0.5, 0)
      .setInteractive({ useHandCursor: true });

    this.muteBtn.on('pointerdown', (pointer) => {
      pointer.event?.stopPropagation?.();
      const muted = soundFX.toggleMute();
      this.muteBtn.setText(muted ? '🔇' : '🔊');
    });

    // Aiming Guide Line + Preview Fruit
    this.aimLine = this.add.graphics();
    this.dropperFruit = this.add.image(GAME_WIDTH / 2, DROP_Y, 'fruit_0').setDepth(5);

    // Bottom Evolution Legend (11 fruits mini-bar)
    this.createEvolutionBar();
  }

  createEvolutionBar() {
    const barY = 812;
    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 0.06);
    bg.fillRoundedRect(24, barY - 22, GAME_WIDTH - 48, 44, 14);

    const startX = 46;
    const stepX = (GAME_WIDTH - 92) / (FRUITS.length - 1);
    FRUITS.forEach((f, idx) => {
      const x = startX + idx * stepX;
      const icon = this.add.image(x, barY, `fruit_${f.tier}`);
      const targetSize = 22 + idx * 0.8;
      icon.setDisplaySize(targetSize, targetSize);
    });
  }

  setupInput() {
    this.aimX = GAME_WIDTH / 2;

    const updateAim = (pointerX) => {
      if (this.isGameOver || !this.canDrop) return;
      const r = FRUITS[this.currentTier].radius;
      this.aimX = Phaser.Math.Clamp(pointerX, JAR_LEFT + r + 4, JAR_RIGHT - r - 4);
      this.dropperFruit.x = this.aimX;
      this.drawAimLine();
    };

    this.input.on('pointermove', (pointer) => {
      updateAim(pointer.x);
    });

    this.input.on('pointerdown', (pointer) => {
      if (this.isGameOver || !this.canDrop) return;
      // Ignore if clicking mute button area
      if (pointer.y < 100 && pointer.x > GAME_WIDTH - 180 && pointer.x < GAME_WIDTH - 130) return;
      updateAim(pointer.x);
    });

    this.input.on('pointerup', (pointer) => {
      if (this.isGameOver || !this.canDrop) return;
      if (pointer.y < 100 && pointer.x > GAME_WIDTH - 180 && pointer.x < GAME_WIDTH - 130) return;
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
    this.matter.world.on('collisionstart', (event) => {
      if (this.isGameOver) return;

      for (const pair of event.pairs) {
        const objA = pair.bodyA.gameObject;
        const objB = pair.bodyB.gameObject;

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
      scale: 1.18,
      duration: 90,
      yoyo: true,
    });

    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      this.bestText.setText(`MAX ${this.bestScore}`);
      localStorage.setItem('juicy_drop_best', String(this.bestScore));
    }

    // Spawn upgraded fruit
    this.spawnPhysicsFruit(midX, midY, nextTier, true);

    // --- GAME FEEL: Audio, Screen Shake, Shockwave, Particles, Confetti ---
    soundFX.playMerge(nextTier, this.comboCount);

    // 1. Screen Shake scaled by tier & combo
    const shakeIntensity = Math.min(0.022, 0.004 + nextTier * 0.0018 + (this.comboCount - 1) * 0.002);
    const shakeDuration = Math.min(260, 90 + nextTier * 15);
    this.cameras.main.shake(shakeDuration, shakeIntensity);

    // 2. Expanding Shockwave Ring
    const ring = this.add.circle(midX, midY, FRUITS[tier].radius, FRUITS[nextTier].color, 0);
    ring.setStrokeStyle(4, 0xffffff, 0.9);
    ring.setDepth(6);
    this.tweens.add({
      targets: ring,
      scale: 2.2,
      alpha: 0,
      duration: 280,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });

    // 3. Juicy Fruit Particles
    const burstCount = 12 + nextTier * 3;
    const emitter = this.add.particles(midX, midY, 'particle_dot', {
      speed: { min: 70, max: 220 + nextTier * 18 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.75, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: { min: 260, max: 520 },
      tint: [FRUITS[nextTier].color, FRUITS[nextTier].highlight, 0xffffff],
      gravityY: 240,
      emitting: false,
    });
    emitter.setDepth(7);
    emitter.explode(burstCount);
    this.time.delayedCall(600, () => emitter.destroy());

    // 4. Confetti Explosion on big merges (tier >= 4) or combos (>= x2)
    if (nextTier >= 4 || this.comboCount >= 2) {
      this.spawnConfetti(midX, midY, 18 + nextTier * 4);
    }

    // 5. Floating Score / Combo Text
    const label = this.comboCount > 1 ? `+${gained}  COMBO x${this.comboCount}!` : `+${gained}`;
    const floatTxt = this.add
      .text(midX, midY - 10, label, {
        fontSize: this.comboCount > 1 ? '20px' : '16px',
        fontStyle: '900',
        color: this.comboCount > 1 ? '#ffd166' : '#ffffff',
        stroke: '#13152e',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(10);

    this.tweens.add({
      targets: floatTxt,
      y: midY - 58,
      alpha: 0,
      scale: this.comboCount > 1 ? 1.25 : 1.05,
      duration: 750,
      ease: 'Cubic.easeOut',
      onComplete: () => floatTxt.destroy(),
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

  triggerGameOver() {
    this.isGameOver = true;
    this.canDrop = false;
    this.aimLine.clear();
    this.dropperFruit.setVisible(false);
    this.dangerBarBg.setVisible(false);
    this.dangerBarFill.setVisible(false);

    soundFX.playGameOver();
    this.cameras.main.shake(300, 0.015);

    // Darken backdrop
    const overlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x090a1a, 0).setDepth(20);
    this.tweens.add({
      targets: overlay,
      fillAlpha: 0.78,
      duration: 220,
    });

    // Modal Card
    const card = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2).setDepth(25).setScale(0.6).setAlpha(0);

    const cardBg = this.add.graphics();
    cardBg.fillStyle(0x1b1e3f, 1);
    cardBg.fillRoundedRect(-165, -145, 330, 290, 24);
    cardBg.lineStyle(3, 0xff3b5c, 0.8);
    cardBg.strokeRoundedRect(-165, -145, 330, 290, 24);

    const title = this.add
      .text(0, -102, 'GAME OVER !', {
        fontSize: '30px',
        fontStyle: '900',
        color: '#ff3b5c',
      })
      .setOrigin(0.5);

    const scoreLbl = this.add
      .text(0, -45, 'SCORE FINAL', {
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#a5b4fc',
      })
      .setOrigin(0.5);

    const scoreVal = this.add
      .text(0, -10, String(this.score), {
        fontSize: '42px',
        fontStyle: '900',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    const bestVal = this.add
      .text(0, 32, `RECORD : ${this.bestScore}`, {
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#ffd166',
      })
      .setOrigin(0.5);

    // Instant "REJOUER" Button
    const btnBg = this.add.graphics();
    btnBg.fillStyle(0x06d6a0, 1);
    btnBg.fillRoundedRect(-115, 62, 230, 56, 28);
    btnBg.lineStyle(2, 0xffffff, 0.35);
    btnBg.strokeRoundedRect(-115, 62, 230, 56, 28);

    const btnText = this.add
      .text(0, 90, '↻  REJOUER', {
        fontSize: '22px',
        fontStyle: '900',
        color: '#0b132b',
      })
      .setOrigin(0.5);

    const hitZone = this.add.zone(0, 90, 230, 56).setInteractive({ useHandCursor: true });
    hitZone.on('pointerdown', () => {
      this.scene.restart();
    });

    card.add([cardBg, title, scoreLbl, scoreVal, bestVal, btnBg, btnText, hitZone]);

    this.tweens.add({
      targets: card,
      scale: 1,
      alpha: 1,
      duration: 240,
      ease: 'Back.easeOut',
    });

    // Celebrate if score > 0 with a celebratory confetti burst
    if (this.score > 0 && this.score >= this.bestScore) {
      this.spawnConfetti(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 120, 40);
    }
  }
}
