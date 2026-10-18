// 計分、關卡與炸彈參數

export const FLOWER_POINTS = 250;
export const PEARL_POINTS = 2500;
export const BOMB_POINTS = 50;

// 群組大小 n：3 → 15、4 → 40、5 → 75 …
export const clusterPoints = (n) => 5 * n * (n - 2);

// 原版開局就是 6 色；之後逐關加色，8 色以上經典模式才會真的走到無步可走
export const MAX_COLORS = 9;
export const colorsForLevel = (level) => (level < 4 ? 6 : level < 7 ? 7 : level < 10 ? 8 : 9);

// 每關要完成的配對次數（原版 HUD 的「剩餘目標」）
export const levelGoal = (level) => 25 + level * 5;

// 炸彈模式
export const BOMB_FIRST_MOVE = 3;
export const bombTimer = (level) => Math.max(10, 22 - level);
export const maxBombs = (level) => Math.min(1 + Math.floor((level - 1) / 2), 4);
export const bombInterval = (level) => Math.max(3, 9 - level);
