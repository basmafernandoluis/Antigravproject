import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const { chromium } = require('/tmp/pw/node_modules/playwright-core');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const URL = process.env.GAME_URL || 'http://localhost:4173';

async function main() {
  const browser = await chromium.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  const context = await browser.newContext({
    viewport: { width: 360, height: 640 },
    deviceScaleFactor: 3, // 360x640 @3x = 1080x1920 px (9:16)
    isMobile: true,
    hasTouch: true,
  });

  const page = await context.newPage();
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('canvas', { timeout: 10000 });
  await page.waitForTimeout(1200);

  // 1. Écran d'accueil / Début de partie
  await page.screenshot({ path: path.join(__dirname, 'raw-1-start.png') });
  console.log('Captured raw-1-start.png (1080x1920)');

  // 2. En jeu avec plusieurs fruits et fusions
  const box = await page.locator('canvas').boundingBox();
  const drop = async (nx, waitMs = 480) => {
    const x = box.x + box.width * nx;
    const y = box.y + box.height * 0.45;
    await page.mouse.move(x, y);
    await page.waitForTimeout(60);
    await page.mouse.click(x, y);
    await page.waitForTimeout(waitMs);
  };

  const pattern = [0.32, 0.5, 0.68, 0.42, 0.58, 0.36, 0.64, 0.5, 0.45, 0.55, 0.38, 0.62, 0.5, 0.48, 0.52];
  for (const nx of pattern) {
    await drop(nx, 520);
  }
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(__dirname, 'raw-2-gameplay.png') });
  console.log('Captured raw-2-gameplay.png (1080x1920)');

  // 3. Game Over avec modal Rejouer / Continuer
  for (let i = 0; i < 55; i++) {
    await drop(0.5 + ((i % 3) - 1) * 0.05, 230);
    const hasSave = await page.evaluate(() => {
      try {
        const s = JSON.parse(localStorage.getItem('juicy_drop_save_v1') || '{}');
        return (s.gamesPlayed || 0) >= 1;
      } catch {
        return false;
      }
    });
    if (hasSave) break;
  }
  await page.waitForTimeout(3200);
  await page.screenshot({ path: path.join(__dirname, 'raw-3-gameover.png') });
  console.log('Captured raw-3-gameover.png (1080x1920)');

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
