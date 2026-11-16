export const SUPPORTED_LANGS = [
  { code: 'fr', label: 'Français', short: 'FR' },
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'de', label: 'Deutsch', short: 'DE' },
  { code: 'ja', label: '日本語', short: 'JA' },
  { code: 'ar', label: 'العربية', short: 'AR' },
];

const FRUIT_NAMES = {
  fr: ['Cerise', 'Fraise', 'Raisin', 'Clémentine', 'Orange', 'Pomme', 'Poire', 'Pêche', 'Ananas', 'Melon', 'Pastèque'],
  en: ['Cherry', 'Strawberry', 'Grape', 'Clementine', 'Orange', 'Apple', 'Pear', 'Peach', 'Pineapple', 'Melon', 'Watermelon'],
  de: ['Kirsche', 'Erdbeere', 'Traube', 'Clementine', 'Orange', 'Apfel', 'Birne', 'Pfirsich', 'Ananas', 'Melone', 'Wassermelone'],
  ja: ['サクランボ', 'イチゴ', 'ブドウ', 'ミカン', 'オレンジ', 'リンゴ', 'ナシ', 'モモ', 'パイナップル', 'メロン', 'スイカ'],
  ar: ['كرز', 'فراولة', 'عنب', 'مندرين', 'برتقال', 'تفاح', 'كمثرى', 'خوخ', 'أناناس', 'شمام', 'بطيخ'],
};

const DICT = {
  fr: {
    score: 'SCORE',
    next: 'SUIVANT',
    moves: 'COUPS',
    levelShort: 'NIV.',
    endless: 'INFINI',
    limit: '⚠ LIMITE',
    shake: 'SECOUER',
    pin: 'ÉPINGLE',
    autoMerge: 'FUSION AUTO !',
    saveMe: 'SAUVE-TOI !',
    pinModeBanner: '📌 TOUCHE UN FRUIT À ÉCLATER',
    tutorialHint: '👆 GLISSE POUR VISER\nRELÂCHE POUR LÂCHER !',
    goalFruitMoves: '🎯 {fruit} · {moves} coups',
    goalScore: '🎯 {score} pts',
    levelWinTitle: 'NIVEAU {n} RÉUSSI !',
    levelWinSub: 'Objectif atteint avec {left} coups restants !',
    nextLevelBtn: 'NIVEAU SUIVANT ➜',
    replayBtn: 'REJOUER',
    outOfMovesTitle: 'COUPS ÉPUISÉS !',
    gameOverTitle: 'DÉBORDEMENT !',
    continueMovesAd: '▶ +6 COUPS GRATUITS',
    continueShakeAd: '▶ SAUVER & SECOUER',
    doubleScoreAd: '▶ DOUBLER SCORE (×2)',
    finalScore: 'Score : {score}',
    bestScore: 'Record : {best}',
    modalTitle: '🏆 QUÊTES & LIGUE',
    tabQuests: '🎯 QUÊTES',
    tabLeague: '🏅 LIGUE',
    tabThemes: '🎨 THÈMES',
    tabFruits: '🍉 FRUITS',
    claim: 'RÉCLAMER',
    claimed: '✓ RÉCLAMÉ',
    inProgress: 'En cours',
    leagueTitle: 'Ligue {name}',
    yourRank: 'Ta position : #{rank}',
    modeSwitchTitle: 'MODE DE JEU',
    modeLevels: '🎯 NIVEAUX',
    modeEndless: '♾️ INFINI',
    settingsTitle: '⚙️ RÉGLAGES',
    soundLabel: '🔊 Effets sonores',
    hapticsLabel: '📳 Vibrations',
    langLabel: '🌐 Langue',
    on: 'ACTIVÉ',
    off: 'COUPÉ',
    close: 'FERMER',
    calloutCool: 'COOL !',
    calloutSuper: 'SUPER !',
    calloutMega: 'MÉGA COMBO !',
    calloutLegend: 'LÉGENDAIRE !',
    unlockApple: '🍎 Pomme débloquée !',
    unlockPear: '⚡ Poire débloquée !',
    questReadyToast: '🎁 Quête prête à réclamer !',
    mythicToast: '🍉 EXPLOSION MYTHIQUE ! +{bonus}',
    questDailyScore: 'Marquer {target} pts en 1 partie',
    questDailyTier: 'Créer : {fruit}',
    questDailyCombo: 'Combo ×{target} ou plus',
    questCareerGames: 'Jouer {target} parties',
    questCareerLevel: 'Atteindre le niveau {target}',
  },
  en: {
    score: 'SCORE',
    next: 'NEXT',
    moves: 'MOVES',
    levelShort: 'LVL',
    endless: 'ENDLESS',
    limit: '⚠ LIMIT',
    shake: 'SHAKE',
    pin: 'PIN POP',
    autoMerge: 'AUTO MERGE!',
    saveMe: 'SAVE ME!',
    pinModeBanner: '📌 TAP A FRUIT TO POP IT',
    tutorialHint: '👆 DRAG TO AIM\nRELEASE TO DROP!',
    goalFruitMoves: '🎯 {fruit} · {moves} moves',
    goalScore: '🎯 {score} pts',
    levelWinTitle: 'LEVEL {n} CLEAR!',
    levelWinSub: 'Goal reached with {left} moves left!',
    nextLevelBtn: 'NEXT LEVEL ➜',
    replayBtn: 'PLAY AGAIN',
    outOfMovesTitle: 'OUT OF MOVES!',
    gameOverTitle: 'OVERFLOW!',
    continueMovesAd: '▶ +6 FREE MOVES',
    continueShakeAd: '▶ RESCUE & SHAKE',
    doubleScoreAd: '▶ DOUBLE SCORE (×2)',
    finalScore: 'Score: {score}',
    bestScore: 'Best: {best}',
    modalTitle: '🏆 QUESTS & LEAGUE',
    tabQuests: '🎯 QUESTS',
    tabLeague: '🏅 LEAGUE',
    tabThemes: '🎨 THEMES',
    tabFruits: '🍉 FRUITS',
    claim: 'CLAIM',
    claimed: '✓ CLAIMED',
    inProgress: 'In progress',
    leagueTitle: '{name} League',
    yourRank: 'Your rank: #{rank}',
    modeSwitchTitle: 'GAME MODE',
    modeLevels: '🎯 LEVELS',
    modeEndless: '♾️ ENDLESS',
    settingsTitle: '⚙️ SETTINGS',
    soundLabel: '🔊 Sound FX',
    hapticsLabel: '📳 Vibration',
    langLabel: '🌐 Language',
    on: 'ON',
    off: 'OFF',
    close: 'CLOSE',
    calloutCool: 'COOL!',
    calloutSuper: 'SUPER!',
    calloutMega: 'MEGA COMBO!',
    calloutLegend: 'LEGENDARY!',
    unlockApple: '🍎 Apple unlocked!',
    unlockPear: '⚡ Pear unlocked!',
    questReadyToast: '🎁 Quest reward ready!',
    mythicToast: '🍉 MYTHIC BLAST! +{bonus}',
    questDailyScore: 'Score {target} pts in 1 run',
    questDailyTier: 'Merge: {fruit}',
    questDailyCombo: 'Combo ×{target} or higher',
    questCareerGames: 'Play {target} games',
    questCareerLevel: 'Reach Level {target}',
  },
  de: {
    score: 'PUNKTE',
    next: 'NÄCHSTE',
    moves: 'ZÜGE',
    levelShort: 'LVL',
    endless: 'ENDLOS',
    limit: '⚠ LIMIT',
    shake: 'SCHÜTTELN',
    pin: 'PIN',
    autoMerge: 'AUTO FUSION!',
    saveMe: 'RETTE DICH!',
    pinModeBanner: '📌 FRUCHT ANTIPPEN',
    tutorialHint: '👆 ZIEHEN ZUM ZIELEN\nLOSLASSEN!',
    goalFruitMoves: '🎯 {fruit} · {moves} Züge',
    goalScore: '🎯 {score} Pkt',
    levelWinTitle: 'LEVEL {n} GESCHAFFT!',
    levelWinSub: 'Ziel mit {left} Zügen übrig erreicht!',
    nextLevelBtn: 'NÄCHSTES LEVEL ➜',
    replayBtn: 'NOCHMAL',
    outOfMovesTitle: 'KEINE ZÜGE MEHR!',
    gameOverTitle: 'ÜBERLAUF!',
    continueMovesAd: '▶ +6 GRATIS ZÜGE',
    continueShakeAd: '▶ RETTEN & MIXEN',
    doubleScoreAd: '▶ PUNKTE ×2',
    finalScore: 'Punkte: {score}',
    bestScore: 'Rekord: {best}',
    modalTitle: '🏆 QUESTS & LIGA',
    tabQuests: '🎯 QUESTS',
    tabLeague: '🏅 LIGA',
    tabThemes: '🎨 THEMEN',
    tabFruits: '🍉 FRÜCHTE',
    claim: 'HOLEN',
    claimed: '✓ GEHOLT',
    inProgress: 'Aktiv',
    leagueTitle: '{name}-Liga',
    yourRank: 'Dein Rang: #{rank}',
    modeSwitchTitle: 'SPIELMODUS',
    modeLevels: '🎯 LEVEL',
    modeEndless: '♾️ ENDLOS',
    settingsTitle: '⚙️ OPTIONEN',
    soundLabel: '🔊 Soundeffekte',
    hapticsLabel: '📳 Vibration',
    langLabel: '🌐 Sprache',
    on: 'AN',
    off: 'AUS',
    close: 'SCHLIESSEN',
    calloutCool: 'COOL!',
    calloutSuper: 'SUPER!',
    calloutMega: 'MEGA KOMBO!',
    calloutLegend: 'LEGENDÄR!',
    unlockApple: '🍎 Apfel freigeschaltet!',
    unlockPear: '⚡ Birne freigeschaltet!',
    questReadyToast: '🎁 Quest-Belohnung bereit!',
    mythicToast: '🍉 MYTHISCHE EXPLOSION! +{bonus}',
    questDailyScore: '{target} Pkt in 1 Runde',
    questDailyTier: 'Fusioniere: {fruit}',
    questDailyCombo: 'Kombo ×{target}+',
    questCareerGames: '{target} Spiele spielen',
    questCareerLevel: 'Level {target} erreichen',
  },
  ja: {
    score: 'スコア',
    next: 'つぎ',
    moves: 'のこり',
    levelShort: 'LVL',
    endless: 'エンドレス',
    limit: '⚠ ライン',
    shake: 'シェイク',
    pin: 'ピン',
    autoMerge: '自動合体！',
    saveMe: 'ピンチ回避！',
    pinModeBanner: '📌 消したいフルーツをタップ',
    tutorialHint: '👆 ドラッグでねらう\nはなしてドロップ！',
    goalFruitMoves: '🎯 {fruit} · {moves}手',
    goalScore: '🎯 {score} pts',
    levelWinTitle: 'LEVEL {n} クリア！',
    levelWinSub: 'のこり {left} 手で達成！',
    nextLevelBtn: 'つぎのレベル ➜',
    replayBtn: 'もういちど',
    outOfMovesTitle: '手数ぎれ！',
    gameOverTitle: 'オーバーフロー！',
    continueMovesAd: '▶ +6手 ゲット',
    continueShakeAd: '▶ たすけてシェイク',
    doubleScoreAd: '▶ スコア 2倍',
    finalScore: 'スコア: {score}',
    bestScore: 'ベスト: {best}',
    modalTitle: '🏆 クエスト＆リーグ',
    tabQuests: '🎯 クエスト',
    tabLeague: '🏅 リーグ',
    tabThemes: '🎨 テーマ',
    tabFruits: '🍉 フルーツ',
    claim: 'うけとる',
    claimed: '✓ 受取済',
    inProgress: '進行中',
    leagueTitle: '{name} リーグ',
    yourRank: '順位: #{rank}',
    modeSwitchTitle: 'モード',
    modeLevels: '🎯 ステージ',
    modeEndless: '♾️ エンドレス',
    settingsTitle: '⚙️ せってい',
    soundLabel: '🔊 サウンド',
    hapticsLabel: '📳 バイブ',
    langLabel: '🌐 言語',
    on: 'ON',
    off: 'OFF',
    close: 'とじる',
    calloutCool: 'COOL!',
    calloutSuper: 'SUPER!',
    calloutMega: 'MEGA COMBO!',
    calloutLegend: 'LEGEND!',
    unlockApple: '🍎 リンゴ解放！',
    unlockPear: '⚡ ナシ解放！',
    questReadyToast: '🎁 クエスト報酬あり！',
    mythicToast: '🍉 スイカ爆発！ +{bonus}',
    questDailyScore: '1回で {target} pts',
    questDailyTier: '合体: {fruit}',
    questDailyCombo: 'コンボ ×{target}+',
    questCareerGames: '{target} 回プレイ',
    questCareerLevel: 'ステージ {target} 到達',
  },
  ar: {
    score: 'النقاط',
    next: 'التالي',
    moves: 'حركات',
    levelShort: 'مستوى',
    endless: 'لانهائي',
    limit: '⚠ الحد',
    shake: 'رجّ',
    pin: 'دبوس',
    autoMerge: 'دمج تلقائي!',
    saveMe: 'أنقذني!',
    pinModeBanner: '📌 المس فاكهة لتفجيرها',
    tutorialHint: '👆 اسحب للتصويب\nاترك للإفلات!',
    goalFruitMoves: '🎯 {fruit} · {moves} حركة',
    goalScore: '🎯 {score} نقطة',
    levelWinTitle: 'نجحت في المستوى {n}!',
    levelWinSub: 'تبقى {left} حركات!',
    nextLevelBtn: 'المستوى التالي ➜',
    replayBtn: 'إعادة اللعب',
    outOfMovesTitle: 'انتهت الحركات!',
    gameOverTitle: 'تجاوزت الحد!',
    continueMovesAd: '▶ +6 حركات مجانية',
    continueShakeAd: '▶ إنقاذ ورجّ',
    doubleScoreAd: '▶ مضاعفة النقاط ×2',
    finalScore: 'النقاط: {score}',
    bestScore: 'الأفضل: {best}',
    modalTitle: '🏆 المهام والدوري',
    tabQuests: '🎯 المهام',
    tabLeague: '🏅 الدوري',
    tabThemes: '🎨 السمات',
    tabFruits: '🍉 الفواكه',
    claim: 'استلام',
    claimed: '✓ مستلم',
    inProgress: 'قيد التقدم',
    leagueTitle: 'دوري {name}',
    yourRank: 'ترتيبك: #{rank}',
    modeSwitchTitle: 'وضع اللعب',
    modeLevels: '🎯 مراحل',
    modeEndless: '♾️ لانهائي',
    settingsTitle: '⚙️ الإعدادات',
    soundLabel: '🔊 المؤثرات الصوتية',
    hapticsLabel: '📳 الاهتزاز',
    langLabel: '🌐 اللغة',
    on: 'مفعّل',
    off: 'مغلق',
    close: 'إغلاق',
    calloutCool: 'رائع!',
    calloutSuper: 'ممتاز!',
    calloutMega: 'كومبو خارق!',
    calloutLegend: 'أسطوري!',
    unlockApple: '🍎 تم فتح التفاح!',
    unlockPear: '⚡ تم فتح الكمثرى!',
    questReadyToast: '🎁 مكافأة مهمة جاهزة!',
    mythicToast: '🍉 انفجار أسطوري! +{bonus}',
    questDailyScore: 'احصل على {target} نقطة',
    questDailyTier: 'ادمج: {fruit}',
    questDailyCombo: 'كومبو ×{target}+',
    questCareerGames: 'العب {target} جولات',
    questCareerLevel: 'صل للمستوى {target}',
    activeTheme: '✓ نشط',
    tapToUse: 'اضغط للتفعيل',
    youLabel: 'أنت',
    newFruitBanner: '🌟 فاكهة جديدة: {fruit}!',
  },
};

// Ensure all 5 languages have activeTheme, tapToUse, youLabel, newFruitBanner
DICT.fr.activeTheme = '✓ ACTIF';
DICT.fr.tapToUse = 'Toucher pour activer';
DICT.fr.youLabel = 'TOI';
DICT.fr.newFruitBanner = '🌟 NOUVEAU FRUIT : {fruit} !';
DICT.fr.quitBtn = '🚪  QUITTER';

DICT.en.activeTheme = '✓ ACTIVE';
DICT.en.tapToUse = 'Tap to equip';
DICT.en.youLabel = 'YOU';
DICT.en.newFruitBanner = '🌟 NEW FRUIT: {fruit}!';
DICT.en.quitBtn = '🚪  QUIT';

DICT.de.activeTheme = '✓ AKTIV';
DICT.de.tapToUse = 'Tippen zum Aktivieren';
DICT.de.youLabel = 'DU';
DICT.de.newFruitBanner = '🌟 NEUE FRUCHT: {fruit}!';
DICT.de.quitBtn = '🚪  BEENDEN';

DICT.ja.activeTheme = '✓ 使用中';
DICT.ja.tapToUse = 'タップで変更';
DICT.ja.youLabel = 'あなた';
DICT.ja.newFruitBanner = '🌟 新フルーツ: {fruit}！';
DICT.ja.quitBtn = '🚪  おわる';

DICT.ar.quitBtn = '🚪  خروج';

export function detectSystemLang() {
  if (typeof navigator === 'undefined') return 'en';
  const candidates = Array.isArray(navigator.languages) && navigator.languages.length > 0
    ? navigator.languages
    : [navigator.language || navigator.userLanguage || 'en'];

  for (const raw of candidates) {
    if (!raw) continue;
    const code = String(raw).split('-')[0].split('_')[0].toLowerCase();
    if (DICT[code]) return code;
  }
  return 'en';
}

let currentLang = detectSystemLang();

export function setLang(lang) {
  currentLang = DICT[lang] ? lang : 'en';
}

export function getLang() {
  return currentLang;
}

export function getFruitName(tier) {
  const list = FRUIT_NAMES[currentLang] || FRUIT_NAMES.en;
  return list[tier] || list[0];
}

export function t(key, params = {}) {
  const table = DICT[currentLang] || DICT.en;
  let str = table[key] ?? DICT.en[key] ?? key;
  for (const [k, v] of Object.entries(params)) {
    str = str.replaceAll(`{${k}}`, String(v));
  }
  return str;
}
