// 計分、關卡與炸彈參數

export const FLOWER_POINTS = 250;
export const PEARL_POINTS = 2500;
export const BOMB_POINTS = 50;

// 群組大小 n：3 → 15、4 → 40、5 → 75 …
export const clusterPoints = (n) => 5 * n * (n - 2);

// 顏色越多越難找到配對；8 色以上經典模式才會真的走到無步可走
export const MAX_COLORS = 9;
export const colorsForLevel = (level) => (level < 3 ? 5 : level < 5 ? 6 : level < 8 ? 7 : level < 12 ? 8 : 9);

// 升到下一關需要消除的球數
export const levelGoal = (level) => 40 + level * 10;

// 炸彈模式
export const BOMB_FIRST_MOVE = 3;
export const bombTimer = (level) => Math.max(10, 22 - level);
export const maxBombs = (level) => Math.min(1 + Math.floor((level - 1) / 2), 4);
export const bombInterval = (level) => Math.max(3, 9 - level);
