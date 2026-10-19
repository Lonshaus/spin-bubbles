// localStorage：設定與最高分。無痕模式或被封鎖時安靜地退回預設值。

const PREFIX = 'spin-bubbles.';

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // 存不了就算了
  }
}

const DEFAULT_SETTINGS = { lang: 'auto', sfx: true, music: true, quality: 'auto', dir: 'cw' };

export const loadSettings = () => ({ ...DEFAULT_SETTINGS, ...read('settings', {}) });
export const saveSettings = (settings) => write('settings', settings);
// 以前分經典／炸彈兩個模式，合併成一種後取兩者較高的當最高分
export const loadBest = () => read('best', Math.max(read('best.classic', 0), read('best.bomb', 0)));
export const saveBest = (score) => write('best', score);
