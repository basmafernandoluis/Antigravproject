import Phaser from 'phaser';
import GameScene from './scenes/GameScene.js';

const config = {
  type: Phaser.AUTO,
  parent: 'app',
  width: 480,
  height: 854,
  backgroundColor: '#13152e',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'matter',
    matter: {
      gravity: { y: 1.38 },
      enableSleeping: false,
    },
  },
  scene: [GameScene],
};

window.__juicyGame = new Phaser.Game(config);
