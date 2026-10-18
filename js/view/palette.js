// 球的顏色，依出現順序排列（前 6 色開局就有，之後逐關加入）
export const BALL_COLORS = [
  0xe0102e, // 紅（偏深，跟橘色拉開）
  0xffe414, // 黃（檸檬黃，跟橘色拉開）
  0x3fd14a, // 綠
  0x2f6bff, // 藍
  0xa245ff, // 紫
  0xff6200, // 橘（偏紅的深橘）
  0xf4f4f4, // 白
  0x22d3ee, // 青
  0xff5fc1, // 粉
];

export const cssColor = (hex) => `#${hex.toString(16).padStart(6, '0')}`;
