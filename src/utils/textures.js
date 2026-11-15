import { FRUITS } from '../config/fruits.js';

export function generateGameTextures(scene) {
  if (scene.textures.exists('particle_dot')) return;

  // 1. Soft glowing particle dot
  const pGfx = scene.make.graphics({ x: 0, y: 0, add: false });
  pGfx.fillStyle(0xffffff, 1);
  pGfx.fillCircle(12, 12, 10);
  pGfx.fillStyle(0xffffff, 0.35);
  pGfx.fillCircle(12, 12, 12);
  pGfx.generateTexture('particle_dot', 24, 24);
  pGfx.destroy();

  // 2. Confetti rectangle
  const cGfx = scene.make.graphics({ x: 0, y: 0, add: false });
  cGfx.fillStyle(0xffffff, 1);
  cGfx.fillRoundedRect(0, 0, 14, 8, 2);
  cGfx.generateTexture('confetti_rect', 14, 8);
  cGfx.destroy();

  // 3. Star spark
  const sGfx = scene.make.graphics({ x: 0, y: 0, add: false });
  sGfx.fillStyle(0xffffff, 1);
  sGfx.fillCircle(10, 10, 4);
  sGfx.fillRect(9, 1, 2, 18);
  sGfx.fillRect(1, 9, 18, 2);
  sGfx.generateTexture('spark_star', 20, 20);
  sGfx.destroy();

  // 4. Generate each fruit tier texture
  FRUITS.forEach((fruit) => {
    const r = fruit.radius;
    const pad = 12;
    const size = (r + pad) * 2;
    const cx = size / 2;
    const cy = size / 2 + 3; // slight offset for top stem/leaf

    const g = scene.make.graphics({ x: 0, y: 0, add: false });

    // Outer subtle glow / shadow rim
    g.fillStyle(fruit.shadow, 1);
    g.fillCircle(cx, cy, r);

    // Main vibrant body
    g.fillStyle(fruit.color, 1);
    g.fillCircle(cx - r * 0.04, cy - r * 0.05, r * 0.94);

    // Watermelon / Melon stripes
    if (fruit.stripes) {
      g.lineStyle(Math.max(3, r * 0.08), fruit.shadow, 0.45);
      for (let i = -2; i <= 2; i++) {
        g.beginPath();
        g.arc(cx + i * r * 0.32, cy, r * 0.72, -Math.PI * 0.38, Math.PI * 0.38);
        g.strokePath();
      }
    }

    // Seeds for Strawberry / Pineapple
    if (fruit.seeds) {
      g.fillStyle(0xffe599, 0.85);
      const seedCount = fruit.tier === 1 ? 5 : 9;
      for (let i = 0; i < seedCount; i++) {
        const angle = (i / seedCount) * Math.PI * 2;
        const dist = r * 0.56;
        const sx = cx + Math.cos(angle) * dist;
        const sy = cy + Math.sin(angle) * dist;
        g.fillCircle(sx, sy, Math.max(1.5, r * 0.06));
      }
    }

    // Top-left glossy highlight
    g.fillStyle(fruit.highlight, 0.65);
    g.fillEllipse(cx - r * 0.28, cy - r * 0.3, r * 0.46, r * 0.28);
    g.fillStyle(0xffffff, 0.55);
    g.fillCircle(cx - r * 0.38, cy - r * 0.38, Math.max(2, r * 0.11));

    // Stem / Leaf / Crown
    if (fruit.stem) {
      g.lineStyle(Math.max(2, r * 0.1), 0x6b4226, 1);
      g.beginPath();
      g.moveTo(cx, cy - r + 2);
      g.lineTo(cx + r * 0.12, cy - r - Math.min(10, r * 0.32));
      g.strokePath();
    }
    if (fruit.leaf) {
      g.fillStyle(0x4cc948, 1);
      g.fillEllipse(cx + r * 0.24, cy - r - 2, Math.max(8, r * 0.42), Math.max(5, r * 0.22));
    }
    if (fruit.crown) {
      g.fillStyle(0x2ec44d, 1);
      g.fillTriangle(cx - 12, cy - r + 2, cx, cy - r - 12, cx + 12, cy - r + 2);
      g.fillTriangle(cx - 22, cy - r + 6, cx - 10, cy - r - 8, cx, cy - r + 4);
      g.fillTriangle(cx + 22, cy - r + 6, cx + 10, cy - r - 8, cx, cy - r + 4);
    }

    // Cute kawaii face (eyes + rosy cheeks + smile)
    const eyeOffsetX = r * 0.28;
    const eyeY = cy - r * 0.04;
    const eyeR = Math.max(2, r * 0.11);

    // Rosy cheeks
    g.fillStyle(0xff8fab, 0.55);
    g.fillCircle(cx - eyeOffsetX * 1.35, eyeY + eyeR * 1.4, eyeR * 1.15);
    g.fillCircle(cx + eyeOffsetX * 1.35, eyeY + eyeR * 1.4, eyeR * 1.15);

    // Eyes
    g.fillStyle(0x1e1b2e, 1);
    g.fillCircle(cx - eyeOffsetX, eyeY, eyeR);
    g.fillCircle(cx + eyeOffsetX, eyeY, eyeR);

    // Eye catchlights
    g.fillStyle(0xffffff, 1);
    g.fillCircle(cx - eyeOffsetX - eyeR * 0.28, eyeY - eyeR * 0.28, Math.max(1, eyeR * 0.38));
    g.fillCircle(cx + eyeOffsetX - eyeR * 0.28, eyeY - eyeR * 0.28, Math.max(1, eyeR * 0.38));

    // Smile
    g.lineStyle(Math.max(1.5, r * 0.07), 0x1e1b2e, 1);
    g.beginPath();
    g.arc(cx, eyeY + eyeR * 0.6, Math.max(3, r * 0.16), 0.15 * Math.PI, 0.85 * Math.PI);
    g.strokePath();

    // Subtle crisp outline
    g.lineStyle(2, 0xffffff, 0.22);
    g.strokeCircle(cx, cy, r - 1);

    g.generateTexture(`fruit_${fruit.tier}`, size, size);
    g.destroy();
  });
}
