// 遊戲規則：一步旋轉的完整流程，輸出事件序列給繪製層播放。
// 這裡完全不碰畫面，可以直接在 Node 裡測試。

import { HexGrid } from './hexgrid.js';
import { createRng } from './rng.js';
import { STAR, findMatches, findNearRings, hasMatch } from './match.js';
import * as S from './score.js';

export const MODES = ['classic', 'bomb'];

export class Game {
  constructor({ mode = 'classic', seed = Date.now(), cols = 10, rows = 9 } = {}) {
    this.mode = mode;
    this.seed = seed;
    this.grid = new HexGrid(cols, rows);
    this.rng = createRng(seed);
    this.nextId = 1;
    this.score = 0;
    this.level = 1;
    this.levelProgress = 0; // 這一關已完成的配對次數（原版的「剩餘目標」）
    this.colors = S.colorsForLevel(1);
    this.moves = 0;
    this.bombCooldown = 0;
    this.over = false;
    this.overReason = null;
    this.stats = { stars: 0, pearls: 0, bombsDefused: 0, bestChain: 0, cleared: 0, combos: 0, starsCleared: 0 };
    this.pieces = new Array(this.grid.size).fill(null);
    this.generate();
  }

  newPiece(kind, color = -1, timer = 0) {
    return { id: this.nextId++, kind, color, timer };
  }

  // 開局：沒有現成配對，而且至少有一步可走
  generate() {
    for (let attempt = 0; attempt < 200; attempt++) {
      for (let i = 0; i < this.grid.size; i++) this.pieces[i] = this.newPiece('ball', this.rng.int(this.colors));
      for (let guard = 0; guard < 500; guard++) {
        const m = findMatches(this.grid, this.pieces);
        if (!m.any) break;
        const cells = [...m.clusters.flatMap((c) => c.cells), ...m.flowers.flatMap((f) => f.ring)];
        for (const i of cells) this.pieces[i].color = this.rng.int(this.colors);
      }
      if (!hasMatch(this.grid, this.pieces) && this.findMove()) return;
    }
    throw new Error('無法產生盤面');
  }

  // 目前所有可旋轉的樞紐：三角頂點、星星（轉周圍一圈）、黑珍珠（Y 字形兩種）
  pivots() {
    const { grid } = this;
    const list = grid.triangles.map((t, k) => ({ type: 'tri', key: `t${k}`, cells: t.cells, x: t.x, y: t.y }));
    for (let i = 0; i < grid.size; i++) {
      const p = this.pieces[i];
      if (!p || (p.kind !== 'star' && p.kind !== 'pearl')) continue;
      const { x, y } = grid.cells[i];
      if (p.kind === 'star') {
        const ring = grid.ringOf(i);
        if (ring.length >= 3) list.push({ type: 'star', key: `s${i}`, center: i, cells: ring, x, y });
      } else {
        const nb = grid.neighbors[i];
        for (const off of [0, 1]) {
          const cells = [nb[off], nb[off + 2], nb[off + 4]];
          if (cells.every((j) => j >= 0)) list.push({ type: 'pearl', key: `p${i}_${off}`, center: i, cells, x, y, spokes: off });
        }
      }
    }
    return list;
  }

  // 差一顆就能做出星星／黑珍珠的地方（畫面上發光提示用）
  nearRings() {
    return findNearRings(this.grid, this.pieces);
  }

  // 把 cells 上的棋子沿順時針（或逆時針）移一格
  cycle(cells, dir) {
    const n = cells.length;
    const old = cells.map((i) => this.pieces[i]);
    const moves = [];
    for (let k = 0; k < n; k++) {
      const to = dir === 'cw' ? (k + 1) % n : (k + n - 1) % n;
      this.pieces[cells[to]] = old[k];
      moves.push({ id: old[k].id, from: cells[k], to: cells[to] });
    }
    return moves;
  }

  // 玩家旋轉一次。回傳事件陣列。
  rotate(pivot, dir) {
    if (this.over) return [];
    const events = [];
    const n = pivot.cells.length;
    let matched = false;
    for (let s = 1; s <= n; s++) {
      const moves = this.cycle(pivot.cells, dir);
      events.push({ type: 'rotate', center: { x: pivot.x, y: pivot.y }, dir, moves });
      if (s < n && hasMatch(this.grid, this.pieces)) {
        matched = true;
        break;
      }
    }
    this.moves++;
    this.bombCooldown--;

    if (matched) {
      const chain = this.resolve(events);
      this.stats.bestChain = Math.max(this.stats.bestChain, chain);
      this.checkLevel(events);
    }
    this.tickBombs(events);
    if (!this.over && !this.findMove()) this.end(events, 'nomoves');
    return events;
  }

  // 連鎖消除，直到盤面穩定
  resolve(events) {
    let chain = 0;
    for (;;) {
      const m = findMatches(this.grid, this.pieces);
      if (!m.any) return chain;
      chain++;

      const removed = new Set();
      for (const c of m.clusters) c.cells.forEach((i) => removed.add(i));
      for (const f of m.flowers) f.ring.forEach((i) => removed.add(i));
      const pearlRing = new Set(m.pearls.flatMap((p) => p.ring));
      pearlRing.forEach((i) => removed.add(i));

      // 中心格變身：珍珠優先於星星
      const becomes = new Map();
      for (const f of m.flowers) if (!pearlRing.has(f.center)) becomes.set(f.center, 'star');
      for (const p of m.pearls) becomes.set(p.center, 'pearl');
      for (const i of becomes.keys()) removed.delete(i);

      let defused = 0;
      for (const i of [...removed, ...becomes.keys()]) if (this.pieces[i].kind === 'bomb') defused++;

      const base =
        m.clusters.reduce((sum, c) => sum + (c.color === STAR ? S.starClusterPoints : S.clusterPoints)(c.cells.length), 0) +
        m.flowers.length * S.FLOWER_POINTS +
        m.pearls.length * S.PEARL_POINTS +
        defused * S.BOMB_POINTS;
      const points = base * chain * this.level;

      const removedInfo = [...removed].map((i) => ({ cell: i, ...this.pieces[i] }));
      const transforms = [];
      for (const i of removed) this.pieces[i] = null;
      for (const [i, kind] of becomes) {
        const piece = this.newPiece(kind);
        transforms.push({ cell: i, oldId: this.pieces[i].id, oldColor: this.pieces[i].color, piece: { ...piece } });
        this.pieces[i] = piece;
      }

      this.score += points;
      // 每個群組、花環、珍珠環各算一次配對
      const combos = m.clusters.length + m.flowers.length + m.pearls.length;
      this.levelProgress += combos;
      this.stats.combos += combos;
      this.stats.cleared += removed.size;
      this.stats.stars += [...becomes.values()].filter((k) => k === 'star').length;
      this.stats.pearls += m.pearls.length;
      this.stats.starsCleared += m.clusters.filter((c) => c.color === STAR).reduce((n, c) => n + c.cells.length, 0);
      this.stats.bombsDefused += defused;

      events.push({
        type: 'clear',
        chain,
        points,
        score: this.score,
        removed: removedInfo,
        transforms,
        clusters: m.clusters.map((c) => ({ cells: c.cells, color: c.color })),
        flowers: m.flowers.length,
        pearls: m.pearls.length,
        starClusters: m.clusters.filter((c) => c.color === STAR).length,
        defused,
        toGo: this.combosToGo,
      });
      events.push(this.collapse());
    }
  }

  // 每欄往下掉，空位由上方補新球
  collapse() {
    const moves = [];
    const spawns = [];
    for (const column of this.grid.columns) {
      let write = column.length - 1;
      for (let r = column.length - 1; r >= 0; r--) {
        const p = this.pieces[column[r]];
        if (!p) continue;
        if (r !== write) {
          this.pieces[column[write]] = p;
          this.pieces[column[r]] = null;
          moves.push({ id: p.id, from: column[r], to: column[write] });
        }
        write--;
      }
      const drop = write + 1;
      for (; write >= 0; write--) {
        const piece = this.spawnPiece();
        this.pieces[column[write]] = piece;
        spawns.push({ piece: { ...piece }, to: column[write], drop });
      }
    }
    return { type: 'fall', moves, spawns };
  }

  spawnPiece() {
    const color = this.rng.int(this.colors);
    if (
      this.mode === 'bomb' &&
      this.moves >= S.BOMB_FIRST_MOVE &&
      this.bombCooldown <= 0 &&
      this.pieces.filter((p) => p?.kind === 'bomb').length < S.maxBombs(this.level) &&
      this.rng.next() < 0.5
    ) {
      this.bombCooldown = S.bombInterval(this.level);
      return this.newPiece('bomb', color, S.bombTimer(this.level));
    }
    return this.newPiece('ball', color);
  }

  checkLevel(events) {
    while (this.levelProgress >= S.levelGoal(this.level)) {
      this.levelProgress -= S.levelGoal(this.level);
      this.level++;
      this.colors = S.colorsForLevel(this.level);
      events.push({ type: 'levelUp', level: this.level, colors: this.colors, toGo: this.combosToGo });
    }
  }

  tickBombs(events) {
    const bombs = [];
    this.pieces.forEach((p, cell) => {
      if (p?.kind !== 'bomb') return;
      p.timer--;
      bombs.push({ id: p.id, cell, timer: p.timer });
    });
    if (!bombs.length) return;
    events.push({ type: 'bombTick', bombs });
    const exploded = bombs.find((b) => b.timer <= 0);
    if (exploded) this.end(events, 'bomb', exploded);
  }

  end(events, reason, bomb = null) {
    this.over = true;
    this.overReason = reason;
    events.push({ type: 'gameOver', reason, bomb });
  }

  get levelGoal() {
    return S.levelGoal(this.level);
  }

  get combosToGo() {
    return Math.max(0, this.levelGoal - this.levelProgress);
  }

  // 找出一步可以產生配對的旋轉（同時用來判斷是否無步可走、以及提示）
  findMove() {
    for (const pivot of this.pivots()) {
      const n = pivot.cells.length;
      let found = 0;
      for (let s = 1; s < n && !found; s++) {
        this.cycle(pivot.cells, 'cw');
        if (hasMatch(this.grid, this.pieces)) found = s;
      }
      // 轉回原位
      for (let s = found || n - 1; s < n; s++) this.cycle(pivot.cells, 'cw');
      if (found) return { pivot, dir: found <= n / 2 ? 'cw' : 'ccw' };
    }
    return null;
  }
}
