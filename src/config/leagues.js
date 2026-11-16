export const LEAGUES = [
  { id: 'bronze', name: 'Bronze', icon: '🥉', minPts: 0, color: '#cd7f32' },
  { id: 'silver', name: 'Argent', icon: '🥈', minPts: 600, color: '#c0d6df' },
  { id: 'gold', name: 'Or', icon: '🥇', minPts: 1800, color: '#ffd166' },
  { id: 'diamond', name: 'Diamant', icon: '💎', minPts: 4000, color: '#4cc9f0' },
  { id: 'legend', name: 'Légende', icon: '👑', minPts: 8000, color: '#ff477e' },
];

const RIVAL_NAMES = [
  'KawaiiMochi',
  'YuzuDrop',
  'SakuraPop',
  'MelonKing',
  'FruitNinja99',
  'LinaPlay',
  'TaroMix',
  'NekoJuice',
  'LeoArcade',
  'PixelPeach',
  'MinaStar',
  'SoraWave',
];

export function getLeagueForPoints(pts) {
  let current = LEAGUES[0];
  let next = LEAGUES[1];
  for (let i = 0; i < LEAGUES.length; i += 1) {
    if (pts >= LEAGUES[i].minPts) {
      current = LEAGUES[i];
      next = LEAGUES[i + 1] || null;
    }
  }
  return { current, next };
}

export function buildWeeklyLeaderboard(playerPts) {
  const base = Math.max(250, playerPts);
  const rows = [];
  for (let i = 0; i < 7; i += 1) {
    const offset = (3 - i) * Math.max(120, Math.round(base * 0.14)) + ((i * 53) % 90);
    const pts = Math.max(50, base + offset);
    rows.push({
      name: RIVAL_NAMES[(i + Math.floor(playerPts / 500)) % RIVAL_NAMES.length],
      pts,
      isPlayer: false,
    });
  }
  rows.push({ name: 'TOI', pts: playerPts, isPlayer: true });
  rows.sort((a, b) => b.pts - a.pts);
  return rows.map((r, idx) => ({ ...r, rank: idx + 1 }));
}
