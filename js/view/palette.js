// 寶石顏色，照原版依出現順序：第 1 關 5 色，第 4 關加淺藍，第 6 關加深綠（黃色留給星星）
export const BALL_COLORS = [
  0xe8202e, // 紅
  0xff7a00, // 橘
  0x3fd14a, // 綠
  0x1f5cf0, // 藍
  0x9a3cf0, // 紫
  0x3fc8ff, // 淺藍
  0x0f7a2a, // 深綠
];

export const cssColor = (hex) => `#${hex.toString(16).padStart(6, '0')}`;
