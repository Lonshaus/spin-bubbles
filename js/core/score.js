// 計分、關卡與炸彈參數（數值對照 MSN 原版錄影）

// 一般群組：3 顆是 5 × 等級（原版第 1 關顯示 5、第 2 關 10……第 7 關 35），每多一顆再加一份
export const clusterPoints = (n, level) => 5 * level * (n - 2);
// 群組裡每顆彩色星星寶石讓分數 ×2（原版顯示「10x2」）
export const BONUS_MULTIPLIER = 2;
// 做出金色星星：1000 × 等級；做出黑珍珠：10000 × 等級（原版第 7 關顯示 7000、70000）
export const flowerPoints = (level) => 1000 * level;
export const pearlPoints = (level) => 10000 * level;
// 3 顆金色星星消除、3 顆黑珍珠破關、拆除炸彈
export const starClusterPoints = (n, level) => 500 * n * level;
export const pearlClusterPoints = (n, level) => 10000 * n * level;
export const bombPoints = (level) => 50 * level;

// 顏色：第 1～3 關 5 色，第 4 關加淺藍，第 6 關加深綠（黃色留給星星）
export const colorsForLevel = (level) => (level < 4 ? 5 : level < 6 ? 6 : 7);

// 剩餘目標：第 1 關 50，每關多 10；第 7 關是最後一關，沒有目標、一直玩到結束
export const FINAL_LEVEL = 7;
export const levelGoal = (level) => (level >= FINAL_LEVEL ? Infinity : 50 + (level - 1) * 10);

// 彩色星星寶石：第 2 關起隨新寶石掉下來
export const BONUS_LEVEL = 2;
export const BONUS_CHANCE = 0.03;

// 炸彈：第 3 關起偶爾出現，倒數第 3～4 關 8 步、之後每關少 1，最少 5 步
export const BOMB_LEVEL = 3;
export const bombTimer = (level) => (level <= 4 ? 8 : Math.max(5, 12 - level));
export const maxBombs = (level) => (level < 5 ? 1 : 2);
export const BOMB_COOLDOWN = 25; // 上一顆炸彈出現後至少隔幾步
export const BOMB_CHANCE = 0.25;
