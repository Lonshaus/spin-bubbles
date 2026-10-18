// 把邏輯層的事件序列依序播成動畫與音效
import * as THREE from 'three';
import { ease } from './animator.js';
import { BALL_COLORS } from './palette.js';

const STAR_COLOR = 0xffd34a;
const PEARL_COLOR = 0xc49bff;

export class Director {
  constructor({ board, fx, tweens, audio, hud, stage }) {
    Object.assign(this, { board, fx, tweens, audio, hud, stage });
  }

  async play(events) {
    for (const e of events) await this[e.type](e);
  }

  async rotate(e) {
    const { grid } = this.board;
    const { x: cx, y: cy } = e.center;
    const paths = e.moves.map((m) => {
      const a = grid.cells[m.from];
      const b = grid.cells[m.to];
      const a0 = Math.atan2(a.y - cy, a.x - cx);
      let delta = Math.atan2(b.y - cy, b.x - cx) - a0;
      if (e.dir === 'cw') while (delta <= 0) delta += Math.PI * 2;
      else while (delta >= 0) delta -= Math.PI * 2;
      return { entry: this.board.get(m.id), a0, delta, r0: Math.hypot(a.x - cx, a.y - cy), r1: Math.hypot(b.x - cx, b.y - cy) };
    });
    this.audio.rotate();
    await this.tweens.add(
      0.17,
      (k) => {
        for (const p of paths) {
          const angle = p.a0 + p.delta * k;
          const r = p.r0 + (p.r1 - p.r0) * k;
          this.board.world(cx + r * Math.cos(angle), cy + r * Math.sin(angle), p.entry.group.position);
          p.entry.group.position.z = Math.sin(Math.PI * k) * 0.6;
        }
      },
      ease.inOut,
    );
  }

  async clear(e) {
    const { board, fx } = this;
    const burst = [];
    const center = new THREE.Vector3();

    for (const r of e.removed) {
      const entry = board.get(r.id);
      const pos = entry.group.position.clone();
      center.add(pos);
      const color = r.kind === 'star' ? STAR_COLOR : BALL_COLORS[r.color];
      burst.push({ pos, color });
      this.tweens
        .add(0.28, (k) => entry.body.scale.setScalar(k < 0.35 ? 1 + k * 0.7 : 1.25 * (1 - (k - 0.35) / 0.65)), ease.linear)
        .then(() => board.remove(r.id));
    }
    if (e.removed.length) center.divideScalar(e.removed.length);

    for (const t of e.transforms) {
      board.remove(t.oldId);
      const entry = board.add(t.piece, t.cell);
      entry.body.scale.setScalar(0.01);
      const color = t.piece.kind === 'pearl' ? PEARL_COLOR : STAR_COLOR;
      fx.flash(entry.group.position, color, t.piece.kind === 'pearl' ? 9 : 6, 0.7);
      fx.burst([{ pos: entry.group.position.clone(), color }], { count: 40, speed: 9, size: 0.5, life: 1 });
      this.tweens.add(0.6, (k) => entry.body.scale.setScalar(Math.max(0.01, k)), ease.back, 0.15);
    }

    fx.burst(burst, { count: e.chain > 1 ? 18 : 14, speed: 5 + e.chain });
    this.audio.clear(e.chain, e.removed.length);
    if (e.flowers || e.starClusters) this.audio.star();
    if (e.pearls) this.audio.pearl();
    if (e.defused) this.audio.defuse();

    this.hud.floatText(center, `+${e.points.toLocaleString()}`, e.chain > 1 ? 'big' : '');
    if (e.chain > 1) this.hud.callout('chain', { n: e.chain });
    if (e.pearls) this.hud.callout('pearl');
    else if (e.starClusters) this.hud.callout('starBlast');
    else if (e.flowers) this.hud.callout('star');
    else if (e.defused) this.hud.callout('defused');
    this.hud.setScore(e.score);
    this.hud.setGoal(e.toGo);
    if (e.pearls) this.stage.shake = 0.5;

    await this.tweens.wait(e.transforms.length ? 0.45 : 0.3);
  }

  async fall(e) {
    const { board } = this;
    const jobs = [];
    const target = new THREE.Vector3();
    const animate = (entry, cell) => {
      const from = entry.group.position.clone();
      board.cellPos(cell, target);
      const to = target.clone();
      const rows = Math.max(0.5, (from.y - to.y) / Math.sqrt(3));
      jobs.push(
        this.tweens.add(0.16 + 0.055 * rows, (k) => entry.group.position.lerpVectors(from, to, k), ease.drop),
      );
    };
    for (const m of e.moves) animate(board.get(m.id), m.to);
    for (const s of e.spawns) animate(board.add(s.piece, s.to, s.drop), s.to);
    await Promise.all(jobs);
    this.audio.land();
  }

  async levelUp(e) {
    this.audio.levelUp();
    this.hud.levelUp(e.level, e.colors);
    this.hud.setGoal(e.toGo);
    await this.tweens.wait(0.2);
  }

  async bombTick(e) {
    let urgent = false;
    for (const b of e.bombs) {
      const entry = this.board.get(b.id);
      if (!entry) continue;
      entry.piece.timer = b.timer;
      entry.label.set(Math.max(0, b.timer));
      if (b.timer <= 3) urgent = true;
      this.tweens.add(0.25, (k) => entry.body.scale.setScalar(1 + Math.sin(k * Math.PI) * 0.15), ease.linear);
    }
    this.audio.bombTick(urgent);
  }

  async gameOver(e) {
    if (e.reason === 'bomb') {
      const entry = this.board.get(e.bomb.id);
      const pos = entry.group.position.clone();
      await this.tweens.add(0.5, (k) => entry.body.scale.setScalar(1 + k * 0.5), ease.in);
      this.board.remove(e.bomb.id);
      this.fx.flash(pos, 0xff7a2a, 14, 0.9);
      this.fx.burst([{ pos, color: 0xff6a00 }, { pos, color: 0xffd040 }, { pos, color: 0x555555 }], { count: 60, speed: 14, size: 0.7, life: 1.3 });
      this.stage.shake = 1.4;
      this.audio.explode();
      await this.tweens.wait(1.1);
    } else {
      this.audio.gameOver();
      await this.tweens.wait(0.6);
    }
  }
}
