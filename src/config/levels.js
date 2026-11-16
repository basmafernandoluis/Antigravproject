export const LEVELS = [
  { level: 1, targetTier: 4, maxMoves: 16, minScore: 0 },   // Orange
  { level: 2, targetTier: 5, maxMoves: 20, minScore: 0 },   // Pomme
  { level: 3, targetTier: 5, maxMoves: 18, minScore: 400 }, // Pomme + 400 pts
  { level: 4, targetTier: 6, maxMoves: 24, minScore: 0 },   // Poire
  { level: 5, targetTier: 6, maxMoves: 22, minScore: 700 }, // Poire + 700 pts
  { level: 6, targetTier: 7, maxMoves: 28, minScore: 0 },   // Pêche
  { level: 7, targetTier: 7, maxMoves: 26, minScore: 1100 },
  { level: 8, targetTier: 8, maxMoves: 34, minScore: 0 },   // Ananas
  { level: 9, targetTier: 8, maxMoves: 31, minScore: 1800 },
  { level: 10, targetTier: 9, maxMoves: 40, minScore: 0 },  // Melon
  { level: 11, targetTier: 8, maxMoves: 30, minScore: 2400 },
  { level: 12, targetTier: 9, maxMoves: 38, minScore: 2800 },
  { level: 13, targetTier: 9, maxMoves: 36, minScore: 3400 },
  { level: 14, targetTier: 10, maxMoves: 48, minScore: 0 }, // Pastèque!
  { level: 15, targetTier: 10, maxMoves: 45, minScore: 4500 },
];

export function getLevelConfig(levelNum) {
  const n = Math.max(1, levelNum);
  const preset = LEVELS[n - 1];
  if (preset) {
    return {
      ...preset,
      star3Left: Math.max(4, Math.floor(preset.maxMoves * 0.3)),
      star2Left: Math.max(2, Math.floor(preset.maxMoves * 0.14)),
    };
  }
  // Procedural levels 16+
  const cycle = (n - 16) % 4;
  const targetTier = cycle === 3 ? 10 : 8 + cycle; // Ananas, Melon, Melon, Pastèque
  const maxMoves = Math.max(28, 44 - Math.floor((n - 16) / 4) * 2 + (targetTier === 10 ? 6 : 0));
  const minScore = 3000 + (n - 15) * 450;
  return {
    level: n,
    targetTier,
    maxMoves,
    minScore,
    star3Left: Math.max(4, Math.floor(maxMoves * 0.25)),
    star2Left: Math.max(2, Math.floor(maxMoves * 0.12)),
  };
}
