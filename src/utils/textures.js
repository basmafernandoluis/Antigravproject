import { FRUITS } from '../config/fruits.js';

function hexCss(num) {
  return `#${num.toString(16).padStart(6, '0')}`;
}

export function generateGameTextures(scene) {
  if (scene.textures.exists('particle_dot')) return;

  // 1. Soft glowing particle dot
  const pGfx = scene.make.graphics({ x: 0, y: 0, add: false });
  pGfx.fillStyle(0xffffff, 1);
  pGfx.fillCircle(12, 12, 9);
  pGfx.fillStyle(0xffffff, 0.35);
  pGfx.fillCircle(12, 12, 12);
  pGfx.generateTexture('particle_dot', 24, 24);
  pGfx.destroy();

  // 2. Confetti rectangle
  const cGfx = scene.make.graphics({ x: 0, y: 0, add: false });
  cGfx.fillStyle(0xffffff, 1);
  cGfx.fillRoundedRect(0, 0, 14, 8, 3);
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

  // 4. Generate glossy 3D kawaii fruit textures using HTML5 Canvas 2D
  FRUITS.forEach((fruit) => {
    const r = fruit.radius;
    const pad = 14;
    const size = Math.ceil((r + pad) * 2);
    const cx = size / 2;
    const cy = size / 2 + 3;

    const canvasTex = scene.textures.createCanvas(`fruit_${fruit.tier}`, size, size);
    const ctx = canvasTex.getContext();

    const colMain = hexCss(fruit.color);
    const colHigh = hexCss(fruit.highlight);
    const colShad = hexCss(fruit.shadow);

    // Subtle outer drop-halo for separation
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy + 2, r + 1.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(10, 8, 28, 0.28)';
    ctx.fill();
    ctx.restore();

    // Main 3D Radial Gradient Body
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(
      cx - r * 0.3,
      cy - r * 0.34,
      r * 0.08,
      cx,
      cy,
      r
    );
    grad.addColorStop(0, colHigh);
    grad.addColorStop(0.45, colMain);
    grad.addColorStop(1, colShad);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.clip();

    // Stripes (Melon / Watermelon)
    if (fruit.stripes) {
      ctx.strokeStyle = colShad;
      ctx.globalAlpha = 0.52;
      ctx.lineWidth = Math.max(3, r * 0.11);
      ctx.lineCap = 'round';
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.arc(cx + i * r * 0.34, cy, r * 0.85, -Math.PI * 0.42, Math.PI * 0.42);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // Seeds (Strawberry / Pineapple)
    if (fruit.seeds) {
      ctx.fillStyle = '#fff0a8';
      const seedCount = fruit.tier === 1 ? 6 : 10;
      for (let i = 0; i < seedCount; i++) {
        const angle = (i / seedCount) * Math.PI * 2 + 0.3;
        const dist = r * 0.62;
        const sx = cx + Math.cos(angle) * dist;
        const sy = cy + Math.sin(angle) * dist;
        ctx.beginPath();
        ctx.ellipse(sx, sy, Math.max(1.4, r * 0.05), Math.max(2, r * 0.075), angle, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Bottom rim bounce light
    ctx.beginPath();
    ctx.arc(cx, cy + r * 0.15, r * 0.88, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = Math.max(2, r * 0.08);
    ctx.stroke();

    // Glossy top-left candy specular shine
    ctx.save();
    ctx.translate(cx - r * 0.3, cy - r * 0.34);
    ctx.rotate(-0.55);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.48)';
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.32, r * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
    ctx.beginPath();
    ctx.arc(cx - r * 0.46, cy - r * 0.14, Math.max(1.5, r * 0.075), 0, Math.PI * 2);
    ctx.fill();

    ctx.restore(); // end clip

    // Crisp dark cartoon outline around fruit
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(22, 16, 46, 0.68)';
    ctx.lineWidth = Math.max(2, Math.min(4, r * 0.06));
    ctx.stroke();

    // Stem / Leaf / Crown
    if (fruit.stem) {
      ctx.save();
      ctx.strokeStyle = '#5c3317';
      ctx.lineWidth = Math.max(2.5, r * 0.11);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx, cy - r + 2);
      ctx.quadraticCurveTo(cx + r * 0.06, cy - r - r * 0.22, cx + r * 0.18, cy - r - Math.min(11, r * 0.34));
      ctx.stroke();
      ctx.restore();
    }

    if (fruit.leaf) {
      ctx.save();
      ctx.translate(cx + r * 0.24, cy - r - 1);
      ctx.rotate(-0.35);
      const lw = Math.max(6, r * 0.28);
      const lh = Math.max(3.5, r * 0.14);
      ctx.fillStyle = '#4ade80';
      ctx.strokeStyle = '#166534';
      ctx.lineWidth = Math.max(1.2, r * 0.04);
      ctx.beginPath();
      ctx.ellipse(0, 0, lw, lh, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    if (fruit.crown) {
      ctx.save();
      ctx.fillStyle = '#22c55e';
      ctx.strokeStyle = '#14532d';
      ctx.lineWidth = 2;
      const spikes = [
        [-14, 2, -22, -10, -4, 0],
        [14, 2, 22, -10, 4, 0],
        [-10, 2, 0, -15, 10, 2],
      ];
      spikes.forEach(([x1, y1, x2, y2, x3, y3]) => {
        ctx.beginPath();
        ctx.moveTo(cx + x1, cy - r + y1);
        ctx.lineTo(cx + x2, cy - r + y2);
        ctx.lineTo(cx + x3, cy - r + y3);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      });
      ctx.restore();
    }

    // Varied Kawaii Faces by tier
    const eyeOffsetX = r * 0.29;
    const eyeY = cy + r * 0.02;
    const eyeR = Math.max(2, r * 0.115);
    const expr = fruit.tier % 4;

    // Rosy glowing cheeks
    ctx.fillStyle = 'rgba(255, 117, 159, 0.62)';
    ctx.beginPath();
    ctx.ellipse(cx - eyeOffsetX * 1.4, eyeY + eyeR * 1.35, eyeR * 1.35, eyeR * 0.85, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + eyeOffsetX * 1.4, eyeY + eyeR * 1.35, eyeR * 1.35, eyeR * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();

    const drawSparkleEye = (ex, ey) => {
      ctx.fillStyle = '#1b1433';
      ctx.beginPath();
      ctx.arc(ex, ey, eyeR, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex - eyeR * 0.3, ey - eyeR * 0.3, Math.max(0.9, eyeR * 0.4), 0, Math.PI * 2);
      ctx.fill();
      if (r >= 28) {
        ctx.beginPath();
        ctx.arc(ex + eyeR * 0.32, ey + eyeR * 0.3, eyeR * 0.18, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    ctx.strokeStyle = '#1b1433';
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(1.6, r * 0.075);

    if (expr === 0) {
      // Sparkling eyes + cute ω smile
      drawSparkleEye(cx - eyeOffsetX, eyeY);
      drawSparkleEye(cx + eyeOffsetX, eyeY);
      const mw = Math.max(2.5, r * 0.11);
      const my = eyeY + eyeR * 0.9;
      ctx.beginPath();
      ctx.arc(cx - mw, my, mw, 0, Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx + mw, my, mw, 0, Math.PI);
      ctx.stroke();
    } else if (expr === 1) {
      // Playful wink + happy D-mouth
      drawSparkleEye(cx - eyeOffsetX, eyeY);
      ctx.beginPath();
      ctx.moveTo(cx + eyeOffsetX - eyeR, eyeY - eyeR * 0.4);
      ctx.lineTo(cx + eyeOffsetX + eyeR * 0.5, eyeY);
      ctx.lineTo(cx + eyeOffsetX - eyeR, eyeY + eyeR * 0.4);
      ctx.stroke();

      ctx.fillStyle = '#ff4d6d';
      ctx.beginPath();
      ctx.arc(cx, eyeY + eyeR * 0.8, Math.max(3, r * 0.16), 0, Math.PI);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (expr === 2) {
      // Joyful ^ ^ crescent eyes + big smile
      [cx - eyeOffsetX, cx + eyeOffsetX].forEach((ex) => {
        ctx.beginPath();
        ctx.arc(ex, eyeY + eyeR * 0.3, eyeR * 1.05, Math.PI * 1.15, Math.PI * 1.85);
        ctx.stroke();
      });
      ctx.beginPath();
      ctx.arc(cx, eyeY + eyeR * 0.7, Math.max(3, r * 0.17), 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    } else {
      // Sparkling eyes + sweet smile
      drawSparkleEye(cx - eyeOffsetX, eyeY);
      drawSparkleEye(cx + eyeOffsetX, eyeY);
      ctx.beginPath();
      ctx.arc(cx, eyeY + eyeR * 0.65, Math.max(3, r * 0.16), 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    }

    canvasTex.refresh();
  });
}
