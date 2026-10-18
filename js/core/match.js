// 配對偵測：
//  - 群組：三顆互相相鄰（三角形）的同色球，重疊的三角形合併成一個群組；直線三顆不算
//  - 星星群組：三顆互相相鄰的星星，不論顏色都會消除（高分）
//  - 花環：某格周圍 6 顆同色 → 中心變星星
//  - 珍珠環：某格周圍 6 顆星星 → 中心變黑珍珠
//  - 珍珠群組（設定開啟時）：三顆互相相鄰的黑珍珠 → 破關
//
// opts.pearlWin：黑珍珠是否參與三角形配對

// 可參與顏色配對的棋子回傳顏色，其餘（星星、珍珠、空格）回傳 -1
export function matchColor(piece) {
  return piece && (piece.kind === 'ball' || piece.kind === 'bomb') ? piece.color : -1;
}

// 星星、黑珍珠群組的「顏色」
export const STAR = -2;
export const PEARL = -3;

// 三角形配對用的分類：球／炸彈看顏色，星星自成一類，黑珍珠只在破關規則開啟時參與
function matchKey(piece, opts) {
  if (piece?.kind === 'star') return STAR;
  if (piece?.kind === 'pearl') return opts.pearlWin ? PEARL : -1;
  return matchColor(piece);
}

function sameColorTriangle(pieces, cells, opts) {
  const key = matchKey(pieces[cells[0]], opts);
  return key !== -1 && matchKey(pieces[cells[1]], opts) === key && matchKey(pieces[cells[2]], opts) === key;
}

function fullRing(grid, i) {
  const ring = grid.neighbors[i];
  return ring.includes(-1) ? null : ring;
}

function isFlower(grid, pieces, i) {
  const ring = fullRing(grid, i);
  if (!ring || !pieces[i] || pieces[i].kind === 'pearl') return false;
  const color = matchColor(pieces[ring[0]]);
  return color >= 0 && ring.every((j) => matchColor(pieces[j]) === color);
}

function isPearlRing(grid, pieces, i) {
  const ring = fullRing(grid, i);
  if (!ring || !pieces[i] || pieces[i].kind === 'pearl') return false;
  return ring.every((j) => pieces[j]?.kind === 'star');
}

export function findMatches(grid, pieces, opts = {}) {
  const parent = new Map();
  const find = (a) => {
    while (parent.get(a) !== a) {
      parent.set(a, parent.get(parent.get(a)));
      a = parent.get(a);
    }
    return a;
  };
  const union = (a, b) => {
    for (const x of [a, b]) if (!parent.has(x)) parent.set(x, x);
    parent.set(find(a), find(b));
  };

  for (const t of grid.triangles) {
    if (!sameColorTriangle(pieces, t.cells, opts)) continue;
    union(t.cells[0], t.cells[1]);
    union(t.cells[0], t.cells[2]);
  }

  const groups = new Map();
  for (const i of parent.keys()) {
    const root = find(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(i);
  }
  const clusters = [...groups.values()].map((cells) => ({ cells, color: matchKey(pieces[cells[0]], opts) }));

  const flowers = [];
  const pearls = [];
  for (let i = 0; i < grid.size; i++) {
    if (isFlower(grid, pieces, i)) flowers.push({ center: i, ring: grid.neighbors[i], color: matchColor(pieces[grid.neighbors[i][0]]) });
    if (isPearlRing(grid, pieces, i)) pearls.push({ center: i, ring: grid.neighbors[i] });
  }

  return { clusters, flowers, pearls, any: clusters.length + flowers.length + pearls.length > 0 };
}

// 差一顆就成環：某格周圍 6 格裡有 5 顆同色（→ 星星），或 5 顆星星（→ 黑珍珠）
export function findNearRings(grid, pieces) {
  const list = [];
  for (let i = 0; i < grid.size; i++) {
    const ring = fullRing(grid, i);
    if (!ring || !pieces[i] || pieces[i].kind === 'pearl') continue;
    const counts = new Map();
    for (const j of ring) {
      const c = matchColor(pieces[j]);
      if (c >= 0) counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    for (const [color, n] of counts) {
      if (n !== 5) continue;
      const cells = ring.filter((j) => matchColor(pieces[j]) === color);
      list.push({ type: 'star', center: i, color, cells, missing: ring.find((j) => !cells.includes(j)) });
    }
    const stars = ring.filter((j) => pieces[j]?.kind === 'star');
    if (stars.length === 5) list.push({ type: 'pearl', center: i, cells: stars, missing: ring.find((j) => !stars.includes(j)) });
  }
  return list;
}

// 只判斷有沒有配對（找可走步時大量呼叫，提早結束）
export function hasMatch(grid, pieces, opts = {}) {
  for (const t of grid.triangles) if (sameColorTriangle(pieces, t.cells, opts)) return true;
  for (let i = 0; i < grid.size; i++) {
    if (isFlower(grid, pieces, i) || isPearlRing(grid, pieces, i)) return true;
  }
  return false;
}
