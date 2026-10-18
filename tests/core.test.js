import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HexGrid, SQRT3 } from '../js/core/hexgrid.js';
import { findMatches, hasMatch } from '../js/core/match.js';
import { Game } from '../js/core/rules.js';

const dist = (g, a, b) => Math.hypot(g.cells[a].x - g.cells[b].x, g.cells[a].y - g.cells[b].y);

// 把盤面填成不會配對的棋盤格花紋，方便手動擺出測試情境
function blankBoard(game) {
  const { grid } = game;
  for (let i = 0; i < grid.size; i++) {
    const { c, r } = grid.cells[i];
    game.pieces[i] = game.newPiece('ball', 10 + ((c % 3) + 3 * (r % 2)));
  }
  assert.equal(hasMatch(grid, game.pieces), false);
}

test('盤面大小：10 欄、偶數欄 9 格、奇數欄 8 格，共 85 格', () => {
  const g = new HexGrid(10, 9);
  assert.equal(g.size, 85);
  assert.equal(g.columns[0].length, 9);
  assert.equal(g.columns[1].length, 8);
});

test('鄰居關係對稱，而且距離都是 √3', () => {
  const g = new HexGrid();
  for (let i = 0; i < g.size; i++) {
    g.neighbors[i].forEach((j, d) => {
      if (j < 0) return;
      assert.equal(g.neighbors[j][(d + 3) % 6], i);
      assert.ok(Math.abs(dist(g, i, j) - SQRT3) < 1e-9);
    });
  }
});

test('每個三角形三格互相相鄰，且依順時針排列', () => {
  const g = new HexGrid();
  assert.ok(g.triangles.length > 100);
  for (const t of g.triangles) {
    const [a, b, c] = t.cells;
    for (const [p, q] of [[a, b], [b, c], [a, c]]) assert.ok(g.neighbors[p].includes(q));
    // 畫面座標（y 朝下）的外積 > 0 代表順時針
    const A = g.cells[a], B = g.cells[b], C = g.cells[c];
    assert.ok((B.x - A.x) * (C.y - A.y) - (B.y - A.y) * (C.x - A.x) > 0);
  }
});

test('三角形同色才算配對，直線三顆不算', () => {
  const game = new Game({ seed: 1 });
  const { grid } = game;
  blankBoard(game);
  // 直線：同一欄連續三格
  const col = grid.columns[4];
  for (const i of col.slice(2, 5)) game.pieces[i].color = 0;
  assert.equal(hasMatch(grid, game.pieces), false);

  blankBoard(game);
  const t = grid.triangles[40];
  for (const i of t.cells) game.pieces[i].color = 0;
  const m = findMatches(grid, game.pieces);
  assert.equal(m.clusters.length, 1);
  assert.deepEqual([...m.clusters[0].cells].sort(), [...t.cells].sort());
});

test('重疊的三角形合併成一個群組', () => {
  const game = new Game({ seed: 2 });
  const { grid } = game;
  blankBoard(game);
  const i = grid.columns[4][4];
  const [n0, n1, n2] = grid.neighbors[i];
  for (const k of [i, n0, n1, n2]) game.pieces[k].color = 0;
  const m = findMatches(grid, game.pieces);
  assert.equal(m.clusters.length, 1);
  assert.equal(m.clusters[0].cells.length, 4);
});

test('順時針再逆時針轉回原狀', () => {
  const game = new Game({ seed: 3 });
  const before = game.pieces.map((p) => p.id);
  const t = game.grid.triangles[10];
  game.cycle(t.cells, 'cw');
  assert.notDeepEqual(game.pieces.map((p) => p.id), before);
  game.cycle(t.cells, 'ccw');
  assert.deepEqual(game.pieces.map((p) => p.id), before);
});

test('開局沒有配對、而且有步可走', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const game = new Game({ seed });
    assert.equal(hasMatch(game.grid, game.pieces), false);
    assert.ok(game.findMove());
  }
});

test('同一個種子產生同樣的盤面', () => {
  const a = new Game({ seed: 42 });
  const b = new Game({ seed: 42 });
  assert.deepEqual(a.pieces.map((p) => p.color), b.pieces.map((p) => p.color));
});

test('提示給的那一步真的會消除', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const game = new Game({ seed });
    const { pivot, dir } = game.findMove();
    const events = game.rotate(pivot, dir);
    assert.ok(events.some((e) => e.type === 'clear'), `seed ${seed}`);
  }
});

test('沒有配對的旋轉會轉滿一圈回到原位', () => {
  const game = new Game({ seed: 5 });
  const before = game.pieces.map((p) => p.id);
  for (const pivot of game.pivots()) {
    game.cycle(pivot.cells, 'cw');
    const ok = hasMatch(game.grid, game.pieces);
    game.cycle(pivot.cells, 'ccw');
    if (ok) continue;
    game.cycle(pivot.cells, 'cw');
    game.cycle(pivot.cells, 'cw');
    const ok2 = hasMatch(game.grid, game.pieces);
    game.cycle(pivot.cells, 'cw');
    if (ok2) continue;
    const events = game.rotate(pivot, 'cw');
    assert.equal(events.filter((e) => e.type === 'rotate').length, 3);
    assert.ok(!events.some((e) => e.type === 'clear'));
    assert.deepEqual(game.pieces.map((p) => p.id), before);
    return;
  }
  assert.fail('找不到不會配對的樞紐');
});

test('消除後盤面補滿、分數增加', () => {
  const game = new Game({ seed: 7 });
  const { pivot, dir } = game.findMove();
  game.rotate(pivot, dir);
  assert.ok(game.score > 0);
  assert.ok(game.pieces.every(Boolean));
  assert.equal(hasMatch(game.grid, game.pieces), false);
  assert.equal(new Set(game.pieces.map((p) => p.id)).size, game.grid.size);
});

test('周圍 6 顆同色 → 中心變星星', () => {
  const game = new Game({ seed: 8 });
  const { grid } = game;
  blankBoard(game);
  const center = grid.columns[4][4];
  for (const j of grid.neighbors[center]) game.pieces[j].color = 1;
  const events = [];
  game.resolve(events);
  const clear = events.find((e) => e.type === 'clear');
  assert.equal(clear.flowers, 1);
  assert.equal(clear.transforms[0].piece.kind, 'star');
  assert.ok(game.pieces.some((p) => p.kind === 'star'));
});

test('差一顆成環時找得到，並指出缺的那一格', () => {
  const game = new Game({ seed: 13 });
  const { grid } = game;
  blankBoard(game);
  assert.equal(game.nearRings().length, 0);
  const center = grid.columns[4][4];
  const ring = grid.neighbors[center];
  for (const j of ring.slice(0, 5)) game.pieces[j].color = 1;
  const near = game.nearRings();
  assert.equal(near.length, 1);
  assert.equal(near[0].type, 'star');
  assert.equal(near[0].center, center);
  assert.equal(near[0].missing, ring[5]);

  blankBoard(game);
  for (const j of ring.slice(1)) game.pieces[j] = game.newPiece('star');
  const pearl = game.nearRings().find((n) => n.type === 'pearl');
  assert.equal(pearl.missing, ring[0]);
});

test('周圍 6 顆星星 → 中心變黑珍珠', () => {
  const game = new Game({ seed: 9 });
  const { grid } = game;
  blankBoard(game);
  const center = grid.columns[4][4];
  for (const j of grid.neighbors[center]) game.pieces[j] = game.newPiece('star');
  const events = [];
  game.resolve(events);
  const clear = events.find((e) => e.type === 'clear');
  assert.equal(clear.pearls, 1);
  assert.ok(game.pieces.some((p) => p.kind === 'pearl'));
  assert.ok(!game.pieces.some((p) => p.kind === 'star'));
});

test('3 顆互相相鄰的星星不論顏色都會消除，直線三顆不算', () => {
  const game = new Game({ seed: 14 });
  const { grid } = game;
  blankBoard(game);
  for (const i of grid.columns[4].slice(2, 5)) game.pieces[i] = game.newPiece('star');
  assert.equal(hasMatch(grid, game.pieces), false);

  blankBoard(game);
  const t = grid.triangles[40];
  for (const i of t.cells) game.pieces[i] = game.newPiece('star');
  const events = [];
  game.resolve(events);
  const clear = events.find((e) => e.type === 'clear');
  assert.equal(clear.starClusters, 1);
  assert.ok(clear.points >= 1500, `星星群組分數應該很高，實際 ${clear.points}`);
  assert.equal(game.stats.starsCleared, 3);
});

test('星星可以轉周圍一圈，黑珍珠有兩種 Y 字形', () => {
  const game = new Game({ seed: 10 });
  const { grid } = game;
  const a = grid.columns[2][4];
  const b = grid.columns[6][4];
  game.pieces[a] = game.newPiece('star');
  game.pieces[b] = game.newPiece('pearl');
  const pivots = game.pivots();
  const star = pivots.find((p) => p.type === 'star');
  assert.equal(star.cells.length, 6);
  const ys = pivots.filter((p) => p.type === 'pearl');
  assert.equal(ys.length, 2);
  assert.ok(ys.every((y) => y.cells.length === 3 && !y.cells.includes(b)));
});

test('炸彈模式：炸彈倒數歸零就結束', () => {
  const game = new Game({ mode: 'bomb', seed: 11 });
  const i = game.grid.columns[3][3];
  game.pieces[i] = game.newPiece('bomb', game.pieces[i].color, 1);
  const pivot = game.pivots().find((p) => !p.cells.includes(i) && (() => {
    game.cycle(p.cells, 'cw'); const a = hasMatch(game.grid, game.pieces);
    game.cycle(p.cells, 'cw'); const b = hasMatch(game.grid, game.pieces);
    game.cycle(p.cells, 'cw');
    return !a && !b;
  })());
  const events = game.rotate(pivot, 'cw');
  assert.ok(game.over);
  assert.equal(game.overReason, 'bomb');
  assert.equal(events.at(-1).type, 'gameOver');
});

test('消除炸彈可以拆除', () => {
  const game = new Game({ mode: 'bomb', seed: 12 });
  const { grid } = game;
  blankBoard(game);
  const t = grid.triangles[30];
  game.pieces[t.cells[0]] = game.newPiece('bomb', 2, 5);
  game.pieces[t.cells[1]].color = 2;
  game.pieces[t.cells[2]].color = 2;
  const events = [];
  game.resolve(events);
  assert.equal(events[0].defused, 1);
});

test('自動玩很多步不會出錯', () => {
  for (const mode of ['classic', 'bomb']) {
    const game = new Game({ mode, seed: 99 });
    for (let k = 0; k < 300 && !game.over; k++) {
      const move = game.findMove();
      game.rotate(move.pivot, move.dir);
      assert.ok(game.pieces.every(Boolean));
      assert.equal(new Set(game.pieces.map((p) => p.id)).size, game.grid.size);
    }
    assert.ok(game.score > 0);
    assert.ok(game.level > 1);
  }
});

test('3 顆互相相鄰的黑珍珠 → 破關', () => {
  const game = new Game({ seed: 21 });
  const { grid } = game;
  blankBoard(game);
  const t = grid.triangles[40];
  game.pieces[t.cells[0]] = game.newPiece('pearl');
  game.pieces[t.cells[1]] = game.newPiece('pearl');
  // 第三顆放在旁邊，轉一下就湊成三角形
  const pivot = game.pivots().find((p) => p.type === 'tri' && p.cells.includes(t.cells[2]) && !p.cells.includes(t.cells[0]) && !p.cells.includes(t.cells[1]));
  const src = pivot.cells.find((c) => c !== t.cells[2]);
  game.pieces[src] = game.newPiece('pearl');
  const dir = pivot.cells[(pivot.cells.indexOf(src) + 1) % 3] === t.cells[2] ? 'cw' : 'ccw';
  const events = game.rotate(pivot, dir);
  assert.ok(game.over);
  assert.equal(game.overReason, 'win');
  assert.equal(events.find((e) => e.type === 'clear').pearlClusters, 1);
  assert.ok(game.score >= 30000);
});

test('關掉黑珍珠破關時，3 顆黑珍珠相鄰也不會消除', () => {
  const game = new Game({ seed: 22, pearlWin: false });
  const { grid } = game;
  blankBoard(game);
  for (const i of grid.triangles[40].cells) game.pieces[i] = game.newPiece('pearl');
  assert.equal(hasMatch(grid, game.pieces, game.rules), false);
});

test('經典模式開啟炸彈後，從第 3 級開始會出現炸彈', () => {
  const off = new Game({ seed: 23 });
  const on = new Game({ seed: 23, classicBombs: true });
  for (const game of [off, on]) {
    for (let k = 0; k < 400 && !game.over; k++) {
      const move = game.findMove();
      game.rotate(move.pivot, move.dir);
      if (game.pieces.some((p) => p.kind === 'bomb')) break;
    }
  }
  assert.ok(!off.pieces.some((p) => p.kind === 'bomb'));
  assert.ok(on.pieces.some((p) => p.kind === 'bomb') || on.overReason === 'bomb');
  assert.ok(on.level >= 3);
});
