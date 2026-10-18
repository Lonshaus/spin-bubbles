// 補間動畫：add() 回傳 Promise，方便用 await 依序播放事件

export const ease = {
  linear: (k) => k,
  inOut: (k) => (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2),
  out: (k) => 1 - (1 - k) ** 3,
  in: (k) => k * k,
  back: (k) => 1 + 2.70158 * (k - 1) ** 3 + 1.70158 * (k - 1) ** 2,
  // 往下掉，落地時輕彈一下
  drop: (k) => {
    if (k < 0.75) return (k / 0.75) ** 2;
    const b = (k - 0.75) / 0.25;
    return 1 - Math.sin(b * Math.PI) * 0.06;
  },
};

export class Tweens {
  constructor() {
    this.time = 0;
    this.list = [];
    this.speed = 1;
  }

  add(duration, update, easing = ease.out, delay = 0) {
    return new Promise((resolve) => {
      this.list.push({ start: this.time + delay, duration: Math.max(duration, 1e-4), update, easing, resolve });
    });
  }

  wait(seconds) {
    return this.add(seconds, () => {}, ease.linear);
  }

  update(dt) {
    this.time += dt * this.speed;
    const done = [];
    for (const t of this.list) {
      if (this.time < t.start) continue;
      const k = Math.min(1, (this.time - t.start) / t.duration);
      t.update(t.easing(k), k);
      if (k >= 1) done.push(t);
    }
    if (!done.length) return;
    this.list = this.list.filter((t) => !done.includes(t));
    for (const t of done) t.resolve();
  }

  // 換盤面時丟掉進行中的動畫（尚未完成的 Promise 就不會再繼續）
  clear() {
    this.list = [];
  }

  get busy() {
    return this.list.length > 0;
  }
}
