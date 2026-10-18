// 平頂六角格（odd-q：奇數欄往下偏移半格），六角形外接圓半徑 = 1
// 邏輯座標 y 軸朝下，與畫面方向一致；依角度遞增排序即為畫面上的順時針。

export const SQRT3 = Math.sqrt(3);

// 鄰居方向依序為 N, NE, SE, S, SW, NW（畫面上的順時針）
const DIRS_EVEN = [[0, -1], [1, -1], [1, 0], [0, 1], [-1, 0], [-1, -1]];
const DIRS_ODD = [[0, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]];

export class HexGrid {
  constructor(cols = 10, rows = 9) {
    this.cols = cols;
    this.rows = rows;
    this.cells = [];
    this.columns = []; // 每欄由上到下的格子索引

    const lookup = new Map();
    for (let c = 0; c < cols; c++) {
      const column = [];
      for (let r = 0; r < this.columnHeight(c); r++) {
        const i = this.cells.length;
        this.cells.push({ i, c, r, x: c * 1.5, y: r * SQRT3 + (c & 1 ? SQRT3 / 2 : 0) });
        lookup.set(`${c},${r}`, i);
        column.push(i);
      }
      this.columns.push(column);
    }
    this.size = this.cells.length;

    this.neighbors = this.cells.map(({ c, r }) =>
      (c & 1 ? DIRS_ODD : DIRS_EVEN).map(([dc, dr]) => lookup.get(`${c + dc},${r + dr}`) ?? -1),
    );

    // 三格交會的頂點 = 可旋轉的三角形
    const seen = new Set();
    this.triangles = [];
    for (const { i } of this.cells) {
      for (let d = 0; d < 6; d++) {
        const j = this.neighbors[i][d];
        const k = this.neighbors[i][(d + 1) % 6];
        if (j < 0 || k < 0) continue;
        const key = [i, j, k].sort((a, b) => a - b).join(',');
        if (seen.has(key)) continue;
        seen.add(key);
        const x = (this.cells[i].x + this.cells[j].x + this.cells[k].x) / 3;
        const y = (this.cells[i].y + this.cells[j].y + this.cells[k].y) / 3;
        this.triangles.push({ cells: this.clockwise([i, j, k], x, y), x, y });
      }
    }

    this.bounds = {
      minX: -1,
      maxX: (cols - 1) * 1.5 + 1,
      minY: -SQRT3 / 2,
      maxY: (rows - 1) * SQRT3 + SQRT3 / 2,
    };
    this.center = {
      x: (this.bounds.minX + this.bounds.maxX) / 2,
      y: (this.bounds.minY + this.bounds.maxY) / 2,
    };
  }

  columnHeight(c) {
    return c & 1 ? this.rows - 1 : this.rows;
  }

  // 存在的鄰居（依順時針順序）
  ringOf(i) {
    return this.neighbors[i].filter((j) => j >= 0);
  }

  // 依繞 (x, y) 的角度排序 → 畫面上的順時針
  clockwise(cells, x, y) {
    const angle = (i) => Math.atan2(this.cells[i].y - y, this.cells[i].x - x);
    return [...cells].sort((a, b) => angle(a) - angle(b));
  }

  // 六角形頂點（平頂，從 0° 開始）
  corners(i, radius = 1) {
    const { x, y } = this.cells[i];
    return Array.from({ length: 6 }, (_, k) => ({
      x: x + radius * Math.cos((Math.PI / 3) * k),
      y: y + radius * Math.sin((Math.PI / 3) * k),
    }));
  }
}
