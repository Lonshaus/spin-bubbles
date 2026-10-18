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

const DEFAULT_SETTINGS = { lang: 'auto', sfx: true, music: true, quality: 'auto', dir: 'cw', pearlWin: true, classicBombs: false };

export const loadSettings = () => ({ ...DEFAULT_SETTINGS, ...read('settings', {}) });
export const saveSettings = (settings) => write('settings', settings);
export const loadBest = (mode) => read(`best.${mode}`, 0);
export const saveBest = (mode, score) => write(`best.${mode}`, score);
