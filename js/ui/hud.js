// 分數列、飄字、大字提示
import { t } from './i18n.js';

const $ = (id) => document.getElementById(id);

export class Hud {
  constructor(stage) {
    this.stage = stage;
    this.shown = 0;
    this.target = 0;
    this.colors = 0;
    this.layer = $('float-layer');
    this.calloutEl = $('callout');
  }

  reset(game, best) {
    this.shown = this.target = game.score;
    this.colors = game.colors;
    $('score').textContent = game.score.toLocaleString();
    this.setBest(best);
    this.setLevel(game);
  }

  setScore(score) {
    this.target = score;
  }

  setBest(best) {
    $('best').textContent = best.toLocaleString();
  }

  setLevel(game) {
    $('level').textContent = game.level;
    $('progress').style.width = `${Math.min(100, (game.levelProgress / game.levelGoal) * 100)}%`;
  }

  // 在 3D 位置上方冒出分數
  floatText(worldPos, text, cls = '') {
    const v = worldPos.clone().project(this.stage.camera);
    const el = document.createElement('div');
    el.className = `float ${cls}`;
    el.textContent = text;
    el.style.left = `${((v.x + 1) / 2) * 100}%`;
    el.style.top = `${((1 - v.y) / 2) * 100}%`;
    el.addEventListener('animationend', () => el.remove());
    this.layer.appendChild(el);
  }

  callout(key, params, sub = '') {
    const el = this.calloutEl;
    el.textContent = t(key, params);
    if (sub) {
      const small = document.createElement('small');
      small.textContent = sub;
      el.appendChild(small);
    }
    el.classList.remove('show');
    void el.offsetWidth; // 重新觸發動畫
    el.classList.add('show');
  }

  levelUp(level, colors) {
    const sub = colors > this.colors ? t('newcolor') : '';
    this.colors = colors;
    $('level').textContent = level;
    this.callout('levelup', { n: level }, sub);
  }

  update(dt) {
    if (this.shown === this.target) return;
    const step = Math.max(1, Math.ceil((this.target - this.shown) * Math.min(1, dt * 8)));
    this.shown = Math.min(this.target, this.shown + step);
    $('score').textContent = this.shown.toLocaleString();
  }
}
