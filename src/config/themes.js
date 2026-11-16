export const THEMES = [
  {
    id: 'cosmic',
    name: 'Nuit Cosmique',
    icon: '🌌',
    bgTop: 0x13152e,
    bgBottom: 0x261447,
    jarStroke: 0x8ecae6,
    glassAlpha: 0.06,
    unlockDesc: 'Débloqué par défaut',
    isUnlocked: () => true,
  },
  {
    id: 'sakura',
    name: 'Sakura Kawaii',
    icon: '🌸',
    bgTop: 0x2b122c,
    bgBottom: 0x4a1942,
    jarStroke: 0xffb3c6,
    glassAlpha: 0.08,
    unlockDesc: '1 500 pts ou 3 parties',
    isUnlocked: (data) => (data.bestScore || 0) >= 1500 || (data.gamesPlayed || 0) >= 3,
  },
  {
    id: 'tropical',
    name: 'Lagon Tropical',
    icon: '🏝️',
    bgTop: 0x0b2538,
    bgBottom: 0x0f4c5c,
    jarStroke: 0x48cae4,
    glassAlpha: 0.08,
    unlockDesc: 'Pêche ou 6 parties',
    isUnlocked: (data) => (data.maxTierReached || 0) >= 7 || (data.gamesPlayed || 0) >= 6,
  },
  {
    id: 'neon',
    name: 'Galaxie Néon',
    icon: '⚡',
    bgTop: 0x09081f,
    bgBottom: 0x1f0b3d,
    jarStroke: 0x39e5b6,
    glassAlpha: 0.07,
    unlockDesc: 'Pastèque ou 5 000 pts',
    isUnlocked: (data) => (data.maxTierReached || 0) >= 10 || (data.bestScore || 0) >= 5000,
  },
];

export function getThemeById(id) {
  return THEMES.find((t) => t.id === id) || THEMES[0];
}
