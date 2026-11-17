import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const { chromium } = require('/tmp/pw/node_modules/playwright-core');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function toDataUri(filePath) {
  const buf = fs.readFileSync(filePath);
  return `data:image/png;base64,${buf.toString('base64')}`;
}

const COSMIC_STARS_CSS = `
  background:
    radial-gradient(circle at 18% 20%, rgba(255, 71, 126, 0.28), transparent 42%),
    radial-gradient(circle at 82% 22%, rgba(0, 229, 255, 0.24), transparent 44%),
    radial-gradient(circle at 50% 85%, rgba(139, 92, 246, 0.26), transparent 50%),
    linear-gradient(160deg, #09061d 0%, #13152e 52%, #0c0a24 100%);
`;

async function renderHtmlToPng(browser, html, width, height, outFile) {
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: 1,
  });
  await page.setContent(html, { waitUntil: 'load' });
  await page.screenshot({ path: outFile, type: 'png' });
  await page.close();
  const sizeKb = (fs.statSync(outFile).size / 1024).toFixed(1);
  console.log(`Generated ${path.basename(outFile)} (${width}x${height}, ${sizeKb} KB)`);
}

function buildIconHtml(iconUri) {
  return `<!DOCTYPE html><html><head><style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 512px; height: 512px; overflow: hidden;
      background: #0b0726;
      display: flex; align-items: center; justify-content: center;
    }
    .wrap {
      width: 512px; height: 512px;
      background: radial-gradient(circle at 50% 50%, #18113d 0%, #0b0726 78%);
      display: flex; align-items: center; justify-content: center;
    }
    img {
      width: 492px; height: 492px;
      border-radius: 96px;
      object-fit: cover;
    }
  </style></head><body><div class="wrap"><img src="${iconUri}"/></div></body></html>`;
}

function buildFeatureGraphicHtml(iconUri) {
  return `<!DOCTYPE html><html><head><style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 1024px; height: 500px; overflow: hidden;
      font-family: 'Segoe UI', Roboto, Arial, sans-serif;
      color: #fff;
      ${COSMIC_STARS_CSS}
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .dots {
      position: absolute; inset: 0;
      background-image:
        radial-gradient(2px 2px at 120px 80px, rgba(255,255,255,0.6), transparent),
        radial-gradient(3px 3px at 310px 410px, rgba(0,229,255,0.7), transparent),
        radial-gradient(2px 2px at 640px 70px, rgba(255,214,10,0.8), transparent),
        radial-gradient(3px 3px at 890px 390px, rgba(255,71,126,0.7), transparent),
        radial-gradient(2px 2px at 510px 440px, rgba(255,255,255,0.5), transparent);
    }
    /* Safe zone: 100px horizontal, 60px vertical margin */
    .safe {
      position: relative; z-index: 2;
      width: 824px; height: 380px;
      display: flex; align-items: center; justify-content: space-between;
      gap: 36px;
    }
    .icon-box {
      width: 270px; height: 270px; flex-shrink: 0;
      border-radius: 56px;
      padding: 8px;
      background: linear-gradient(135deg, #00e5ff, #ff477e, #ffd166);
      box-shadow: 0 0 48px rgba(0, 229, 255, 0.35), 0 18px 36px rgba(0,0,0,0.55);
    }
    .icon-box img {
      width: 100%; height: 100%; border-radius: 48px; display: block;
    }
    .copy {
      flex: 1;
      display: flex; flex-direction: column; justify-content: center;
    }
    .logo {
      font-size: 64px; font-weight: 900; letter-spacing: 1px; line-height: 1.05;
      color: #ffffff;
      text-shadow: 0 5px 0 #d91e5b, 0 12px 28px rgba(255, 71, 126, 0.55);
      margin-bottom: 14px;
    }
    .tagline {
      font-size: 26px; font-weight: 700; color: #dbe7ff;
      margin-bottom: 24px;
      text-shadow: 0 2px 10px rgba(0,0,0,0.6);
    }
    .pills { display: flex; gap: 12px; flex-wrap: wrap; }
    .pill {
      padding: 10px 18px; border-radius: 999px;
      font-size: 17px; font-weight: 800; letter-spacing: 0.4px;
      background: rgba(255,255,255,0.1);
      border: 2px solid rgba(255,255,255,0.28);
      box-shadow: 0 6px 18px rgba(0,0,0,0.3);
    }
    .pill.c1 { border-color: #ff477e; background: rgba(255, 71, 126, 0.22); }
    .pill.c2 { border-color: #ffd166; background: rgba(255, 209, 102, 0.20); color: #fff4cc; }
    .pill.c3 { border-color: #06d6a0; background: rgba(6, 214, 160, 0.20); color: #d4fff2; }
  </style></head><body>
    <div class="dots"></div>
    <div class="safe">
      <div class="icon-box"><img src="${iconUri}" /></div>
      <div class="copy">
        <div class="logo">JUICY DROP!</div>
        <div class="tagline">Fusionnez les fruits kawaii jusqu'à la pastèque !</div>
        <div class="pills">
          <div class="pill c1">🍒 FUSIONS</div>
          <div class="pill c2">🔥 COMBOS</div>
          <div class="pill c3">🍉 PASTÈQUE</div>
        </div>
      </div>
    </div>
  </body></html>`;
}

function buildMockupHtml({ width, height, screenUri, title, subtitle, accent, badge }) {
  const isTablet = width >= 1200;
  const titleSize = isTablet ? Math.round(width * 0.062) : 74;
  const subSize = isTablet ? Math.round(width * 0.032) : 38;
  const phoneW = isTablet ? Math.round(width * 0.62) : 730;
  const phoneRadius = isTablet ? 44 : 58;

  return `<!DOCTYPE html><html><head><style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: ${width}px; height: ${height}px; overflow: hidden;
      font-family: 'Segoe UI', Roboto, Arial, sans-serif;
      color: #fff;
      ${COSMIC_STARS_CSS}
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      padding: ${isTablet ? '78px 60px 0' : '86px 50px 0'};
      position: relative;
    }
    .header {
      text-align: center; z-index: 2;
      display: flex; flex-direction: column; align-items: center; gap: 16px;
    }
    .badge {
      padding: 10px 26px; border-radius: 999px;
      font-size: ${isTablet ? 24 : 22}px; font-weight: 800; letter-spacing: 1px;
      background: rgba(255,255,255,0.1);
      border: 2px solid ${accent};
      color: #ffffff;
      box-shadow: 0 0 24px ${accent}55;
    }
    h1 {
      font-size: ${titleSize}px; font-weight: 900; line-height: 1.08;
      text-shadow: 0 6px 0 rgba(0,0,0,0.45), 0 0 34px ${accent}88;
      letter-spacing: 0.5px;
    }
    p {
      font-size: ${subSize}px; font-weight: 600; color: #cfd9ff;
      text-shadow: 0 2px 10px rgba(0,0,0,0.5);
    }
    .device {
      width: ${phoneW}px;
      border-radius: ${phoneRadius}px ${phoneRadius}px 0 0;
      padding: ${isTablet ? 18 : 16}px ${isTablet ? 18 : 16}px 0;
      background: linear-gradient(180deg, #2d3561 0%, #161a36 100%);
      border: 3px solid rgba(255,255,255,0.22);
      border-bottom: none;
      box-shadow: 0 -10px 70px ${accent}44, 0 24px 60px rgba(0,0,0,0.75);
      overflow: hidden;
      z-index: 2;
    }
    .device img {
      width: 100%; display: block;
      border-radius: ${phoneRadius - 14}px ${phoneRadius - 14}px 0 0;
    }
  </style></head><body>
    <div class="header">
      <div class="badge">${badge}</div>
      <h1>${title}</h1>
      <p>${subtitle}</p>
    </div>
    <div class="device">
      <img src="${screenUri}" />
    </div>
  </body></html>`;
}

async function main() {
  const browser = await chromium.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  const rawIconUri = toDataUri(path.join(ROOT, 'assets/store/icon-512.png'));
  await renderHtmlToPng(browser, buildIconHtml(rawIconUri), 512, 512, path.join(__dirname, 'icon-512.png'));

  const cleanIconUri = toDataUri(path.join(__dirname, 'icon-512.png'));
  await renderHtmlToPng(
    browser,
    buildFeatureGraphicHtml(cleanIconUri),
    1024,
    500,
    path.join(__dirname, 'feature-graphic-1024x500.png')
  );

  const s1 = toDataUri(path.join(__dirname, 'raw-1-start.png'));
  const s2 = toDataUri(path.join(__dirname, 'raw-2-gameplay.png'));
  const s3 = toDataUri(path.join(__dirname, 'raw-3-gameover.png'));

  await renderHtmlToPng(
    browser,
    buildMockupHtml({
      width: 1080,
      height: 1920,
      screenUri: s1,
      badge: '🍓 PUZZLE PHYSIQUE KAWAII',
      title: 'FUSIONNEZ LES FRUITS !',
      subtitle: 'Lâchez, rebondissez et faites évoluer',
      accent: '#00e5ff',
    }),
    1080,
    1920,
    path.join(__dirname, 'mockup-1-merge.png')
  );

  await renderHtmlToPng(
    browser,
    buildMockupHtml({
      width: 1080,
      height: 1920,
      screenUri: s2,
      badge: '🔥 RÉACTIONS EN CHAÎNE',
      title: 'ATTEIGNEZ LA PASTÈQUE !',
      subtitle: 'Enchaînez les combos juteux',
      accent: '#ff477e',
    }),
    1080,
    1920,
    path.join(__dirname, 'mockup-2-combos.png')
  );

  await renderHtmlToPng(
    browser,
    buildMockupHtml({
      width: 1080,
      height: 1920,
      screenUri: s3,
      badge: '⚡ BOOSTERS STRATÉGIQUES',
      title: 'SAUVEZ VOTRE PARTIE !',
      subtitle: 'Secouer • Épingle • Arc-en-ciel',
      accent: '#06d6a0',
    }),
    1080,
    1920,
    path.join(__dirname, 'mockup-3-boosters.png')
  );

  // Captures Tablette 7" (1200x1920) et 10" (1600x2560)
  await renderHtmlToPng(
    browser,
    buildMockupHtml({
      width: 1200,
      height: 1920,
      screenUri: s2,
      badge: '📱 OPTIMISÉ TABLETTE 7"',
      title: 'JUICY DROP!',
      subtitle: 'Le jeu de fusion de fruits le plus juteux',
      accent: '#ffd166',
    }),
    1200,
    1920,
    path.join(__dirname, 'tablet-7-1200x1920.png')
  );

  await renderHtmlToPng(
    browser,
    buildMockupHtml({
      width: 1600,
      height: 2560,
      screenUri: s2,
      badge: '🖥️ OPTIMISÉ TABLETTE 10"',
      title: 'ATTEIGNEZ LA PASTÈQUE !',
      subtitle: 'Physique réaliste • Combos • Boosters',
      accent: '#00e5ff',
    }),
    1600,
    2560,
    path.join(__dirname, 'tablet-10-1600x2560.png')
  );

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
