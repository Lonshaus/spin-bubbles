// 盤面與棋子的 3D 物件：底座、泡泡球、星星、黑珍珠、炸彈、選取外框
import * as THREE from 'three';
import { BALL_COLORS } from './palette.js';
import { SQRT3 } from '../core/hexgrid.js';

const BALL_RADIUS = 0.8;

export class BoardView {
  constructor(stage) {
    this.stage = stage;
    this.group = new THREE.Group();
    stage.root.add(this.group);
    this.entries = new Map(); // piece id → { group, body, piece, label }
    this.time = 0;

    // 新球從盤面上方掉進來，超出上緣的部分切掉
    this.clip = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
    const clip = [this.clip];

    this.geo = {
      ball: new THREE.SphereGeometry(BALL_RADIUS, 40, 28),
      star: makeStarGeometry(),
      band: new THREE.TorusGeometry(BALL_RADIUS * 0.99, 0.08, 10, 48),
      fuse: new THREE.CylinderGeometry(0.07, 0.09, 0.32, 10),
      edge: new THREE.BoxGeometry(1, 0.13, 0.13),
    };

    this.mat = {
      balls: BALL_COLORS.map(
        (color) =>
          new THREE.MeshPhysicalMaterial({
            color,
            roughness: 0.3,
            metalness: 0,
            clearcoat: 1,
            clearcoatRoughness: 0.04,
            emissive: color,
            emissiveIntensity: 0.04,
            clippingPlanes: clip,
          }),
      ),
      star: new THREE.MeshPhysicalMaterial({
        color: 0xfff4d6,
        metalness: 1,
        roughness: 0.15,
        clearcoat: 1,
        emissive: 0xffe08a,
        emissiveIntensity: 0.6,
        clippingPlanes: clip,
      }),
      pearl: new THREE.MeshPhysicalMaterial({
        color: 0x0c0c14,
        metalness: 0.4,
        roughness: 0.12,
        clearcoat: 1,
        clearcoatRoughness: 0.02,
        iridescence: 1,
        iridescenceIOR: 1.8,
        iridescenceThicknessRange: [200, 700],
        clippingPlanes: clip,
      }),
      metal: new THREE.MeshStandardMaterial({ color: 0x2b2b33, metalness: 0.9, roughness: 0.3, clippingPlanes: clip }),
      edge: new THREE.MeshBasicMaterial({ color: 0xfff3c4, toneMapped: false, transparent: true }),
      hint: new THREE.MeshBasicMaterial({ color: 0x7ef9ff, toneMapped: false, transparent: true }),
    };
    this.glowTexture = makeGlowTexture();
    this.rimTexture = makeRimTexture();
    this.arrows = { cw: makeArrowTexture(false), ccw: makeArrowTexture(true) };
    this.direction = 'cw';

    this.highlight = new THREE.Group();
    this.hint = new THREE.Group();
    this.near = new THREE.Group(); // 差一顆成環的發光提示
    this.group.add(this.highlight, this.hint, this.near);
  }

  // 新的一局：重建底座與所有棋子
  build(game) {
    this.game = game;
    this.grid = game.grid;
    for (const e of this.entries.values()) this.group.remove(e.group);
    this.entries.clear();
    if (this.base) this.group.remove(this.base);
    this.base = makeBase(this.grid);
    this.group.add(this.base);

    const { bounds, center } = this.grid;
    this.center = center;
    this.clip.constant = center.y - bounds.minY + 0.05;
    this.stage.setFit(bounds.maxX - bounds.minX + 1.2, bounds.maxY - bounds.minY + 1.2);

    game.pieces.forEach((piece, cell) => this.add(piece, cell));
    this.setHighlight(null);
    this.setHint(null);
  }

  // 邏輯座標 → 世界座標
  world(x, y, out = new THREE.Vector3()) {
    return out.set(x - this.center.x, -(y - this.center.y), 0);
  }

  cellPos(cell, out) {
    const c = this.grid.cells[cell];
    return this.world(c.x, c.y, out);
  }

  add(piece, cell, offsetRows = 0) {
    const group = new THREE.Group();
    const body = new THREE.Group();
    group.add(body);
    let label = null;

    if (piece.kind === 'ball' || piece.kind === 'bomb') {
      body.add(new THREE.Mesh(this.geo.ball, this.mat.balls[piece.color]));
    }
    if (piece.kind === 'bomb') {
      const band = new THREE.Mesh(this.geo.band, this.mat.metal);
      band.rotation.x = Math.PI / 2;
      band.scale.set(1, 1, 1.4);
      const band2 = band.clone();
      band2.rotation.set(0, 0, 0);
      const fuse = new THREE.Mesh(this.geo.fuse, this.mat.metal);
      fuse.position.set(0.25, 0.78, 0.1);
      fuse.rotation.z = -0.35;
      const spark = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: this.glowTexture, color: 0xffa040, toneMapped: false, transparent: true, depthWrite: false, clippingPlanes: [this.clip] }),
      );
      spark.position.set(0.33, 0.98, 0.1);
      spark.scale.setScalar(0.5);
      spark.userData.spark = true;
      label = makeLabel(this.clip);
      label.sprite.position.set(0, 0, BALL_RADIUS + 0.12);
      body.add(band, band2, fuse, spark, label.sprite);
      label.set(piece.timer);
    }
    if (piece.kind === 'star') {
      const glow = this.makeGlow(0xfff0b0, 3, 1);
      body.add(glow, new THREE.Mesh(this.geo.star, this.mat.star));
    }
    if (piece.kind === 'pearl') {
      const glow = this.makeGlow(0xb48cff, 3.2, 1);
      const pearl = new THREE.Mesh(this.geo.ball, this.mat.pearl);
      pearl.scale.setScalar(1.05);
      body.add(glow, pearl);
    }

    this.cellPos(cell, group.position);
    group.position.y += offsetRows * SQRT3;
    this.group.add(group);
    const entry = { group, body, piece: { ...piece }, label, phase: Math.random() * Math.PI * 2 };
    this.entries.set(piece.id, entry);
    return entry;
  }

  makeGlow(color, size, opacity) {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.glowTexture,
        color,
        transparent: true,
        opacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        clippingPlanes: [this.clip],
      }),
    );
    sprite.scale.setScalar(size);
    sprite.position.z = -0.3;
    return sprite;
  }

  remove(id) {
    const e = this.entries.get(id);
    if (!e) return;
    this.group.remove(e.group);
    e.label?.dispose();
    this.entries.delete(id);
  }

  get(id) {
    return this.entries.get(id);
  }

  // 用螢幕座標（NDC）找對應的樞紐
  pick(ndc, pivots) {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(ndc, this.stage.camera);
    const hit = new THREE.Vector3();
    if (!raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), hit)) return null;
    const x = hit.x + this.center.x;
    const y = -hit.y + this.center.y;
    return pickPivot(pivots, x, y);
  }

  setHighlight(pivot) {
    this.highlightPivot = pivot;
    this.buildOutline(this.highlight, pivot, this.mat.edge);
    if (!pivot) return;
    // 中間的箭頭顯示目前的旋轉方向
    const arrow = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: this.arrows[this.direction], transparent: true, depthWrite: false, depthTest: false, toneMapped: false }),
    );
    this.world(pivot.x, pivot.y, arrow.position);
    arrow.position.z = 1.2;
    arrow.scale.setScalar(pivot.type === 'tri' ? 1.5 : 1.8);
    arrow.renderOrder = 10;
    this.highlight.add(arrow);
  }

  setDirection(dir) {
    this.direction = dir;
    if (this.grid) this.setHighlight(this.highlightPivot ?? null);
  }

  // 差一顆就成環：那 5 顆周圍發光，缺的那格用需要的顏色框起來
  setNear(list) {
    this.near.clear();
    for (const n of list) {
      const color = n.type === 'pearl' ? 0xfff0b0 : BALL_COLORS[n.color];
      const rimColor = new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.35);
      for (const cell of n.cells) {
        // 疊在球前面的一圈光環，只亮在球的外緣
        const rim = new THREE.Sprite(
          new THREE.SpriteMaterial({ map: this.rimTexture, color: rimColor, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, toneMapped: false }),
        );
        // 放在球心深度、不做深度測試，才不會因為鏡頭傾斜而跟球錯位
        rim.scale.setScalar(2.1);
        rim.renderOrder = 5;
        this.cellPos(cell, rim.position);
        this.near.add(rim);
      }
      const material = new THREE.MeshBasicMaterial({ color, toneMapped: false, transparent: true });
      for (const seg of outerEdges(this.grid, [n.missing])) {
        const a = this.world(seg[0].x, seg[0].y);
        const b = this.world(seg[1].x, seg[1].y);
        const mesh = new THREE.Mesh(this.geo.edge, material);
        mesh.position.copy(a).add(b).multiplyScalar(0.5);
        mesh.position.z = 0.5;
        mesh.scale.x = a.distanceTo(b) + 0.13;
        mesh.rotation.z = Math.atan2(b.y - a.y, b.x - a.x);
        this.near.add(mesh);
      }
    }
  }

  setHint(pivot) {
    this.buildOutline(this.hint, pivot, this.mat.hint);
  }

  buildOutline(group, pivot, material) {
    group.clear();
    group.userData.key = pivot?.key ?? null;
    if (!pivot) return;
    const cells = pivot.center !== undefined ? [pivot.center, ...pivot.cells] : pivot.cells;
    for (const seg of outerEdges(this.grid, cells)) {
      const a = this.world(seg[0].x, seg[0].y);
      const b = this.world(seg[1].x, seg[1].y);
      const mesh = new THREE.Mesh(this.geo.edge, material);
      mesh.position.copy(a).add(b).multiplyScalar(0.5);
      mesh.position.z = 0.55;
      mesh.scale.x = a.distanceTo(b) + 0.13;
      mesh.rotation.z = Math.atan2(b.y - a.y, b.x - a.x);
      group.add(mesh);
    }
    const dot = this.makeGlow(material.color.getHex(), 1.1, 0.9);
    this.world(pivot.x, pivot.y, dot.position);
    dot.position.z = 1.0;
    group.add(dot);
  }

  update(dt) {
    this.time += dt;
    const pulse = 0.65 + 0.35 * Math.sin(this.time * 6);
    this.mat.edge.opacity = pulse;
    this.mat.hint.opacity = 0.5 + 0.5 * Math.sin(this.time * 9);
    const breathe = 0.5 + 0.5 * Math.sin(this.time * 3.5);
    for (const obj of this.near.children) obj.material.opacity = 0.35 + 0.65 * breathe;
    for (const e of this.entries.values()) {
      const kind = e.piece.kind;
      if (kind === 'star') {
        const star = e.body.children[1];
        star.rotation.z = this.time * 0.9 + e.phase;
        star.rotation.y = Math.sin(this.time * 2 + e.phase) * 0.45;
      }
      if (kind === 'pearl') e.body.children[1].rotation.y = this.time * 0.8;
      if (kind === 'bomb') {
        const spark = e.body.children.find((c) => c.userData.spark);
        spark.scale.setScalar(0.4 + 0.2 * Math.sin(this.time * 25 + e.phase));
        const danger = e.piece.timer <= 3;
        e.label.sprite.material.color.setHex(danger && Math.sin(this.time * 12) > 0 ? 0xff5050 : 0xffffff);
      }
    }
  }
}

// 指標位置 → 最接近的樞紐。星星／珍珠的格子中心優先。
export function pickPivot(pivots, x, y) {
  let best = null;
  let bestDist = Infinity;
  for (const p of pivots) {
    if (p.type === 'tri') continue;
    const d = Math.hypot(p.x - x, p.y - y);
    if (d > 0.55) continue;
    if (p.type === 'star') return p;
    // 珍珠：依指標所在方向選 Y 字形
    const angle = Math.atan2(y - p.y, x - p.x);
    const spoke = Math.min(...p.cells.map((c, k) => angleDiff(angle, spokeAngle(p, k))));
    if (spoke < bestDist) {
      best = p;
      bestDist = spoke;
    }
  }
  if (best) return best;
  for (const p of pivots) {
    if (p.type !== 'tri') continue;
    const d = Math.hypot(p.x - x, p.y - y);
    if (d < bestDist) {
      best = p;
      bestDist = d;
    }
  }
  return bestDist < 1.4 ? best : null;
}

// 珍珠 Y 字形第 k 支的方向（N=-90°，每支差 120°）
function spokeAngle(p, k) {
  return -Math.PI / 2 + (p.spokes * Math.PI) / 3 + (k * 2 * Math.PI) / 3;
}

function angleDiff(a, b) {
  const d = Math.abs(a - b) % (2 * Math.PI);
  return d > Math.PI ? 2 * Math.PI - d : d;
}

// 一組格子聯集的外框邊（只出現一次的邊）
function outerEdges(grid, cells) {
  const edges = new Map();
  for (const i of cells) {
    const cs = grid.corners(i);
    for (let k = 0; k < 6; k++) {
      const a = cs[k];
      const b = cs[(k + 1) % 6];
      const key = `${Math.round((a.x + b.x) * 50)},${Math.round((a.y + b.y) * 50)}`;
      const e = edges.get(key);
      if (e) e.count++;
      else edges.set(key, { count: 1, seg: [a, b] });
    }
  }
  return [...edges.values()].filter((e) => e.count === 1).map((e) => e.seg);
}

function makeBase(grid) {
  const group = new THREE.Group();
  const hex = (radius, depth) => {
    const g = new THREE.CylinderGeometry(radius, radius, depth, 6, 1, false, Math.PI / 2);
    g.rotateX(Math.PI / 2);
    return g;
  };
  const slots = new THREE.InstancedMesh(
    hex(0.93, 0.3),
    new THREE.MeshStandardMaterial({ color: 0x131c3d, metalness: 0.3, roughness: 0.35 }),
    grid.size,
  );
  const frame = new THREE.InstancedMesh(
    hex(1.22, 0.4),
    new THREE.MeshStandardMaterial({ color: 0x3a4fa8, metalness: 0.75, roughness: 0.28 }),
    grid.size,
  );
  const m = new THREE.Matrix4();
  grid.cells.forEach((c, i) => {
    const x = c.x - grid.center.x;
    const y = -(c.y - grid.center.y);
    m.makeTranslation(x, y, -0.9);
    slots.setMatrixAt(i, m);
    m.makeTranslation(x, y, -1.05);
    frame.setMatrixAt(i, m);
  });
  group.add(frame, slots);
  return group;
}

function makeStarGeometry() {
  const shape = new THREE.Shape();
  const points = 6;
  for (let k = 0; k < points * 2; k++) {
    const r = k % 2 ? 0.4 : 0.86;
    const a = Math.PI / 2 + (k * Math.PI) / points;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (k) shape.lineTo(x, y);
    else shape.moveTo(x, y);
  }
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.22, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.08, bevelSegments: 3 });
  geo.center();
  return geo;
}

function makeGlowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const g = canvas.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// 中間透明、外緣發亮的光環
function makeRimTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const g = canvas.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,0)');
  grad.addColorStop(0.6, 'rgba(255,255,255,0.05)');
  grad.addColorStop(0.76, 'rgba(255,255,255,0.95)');
  grad.addColorStop(0.86, 'rgba(255,255,255,0.45)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// 圓弧箭頭（順時針，ccw 時左右鏡射）
function makeArrowTexture(mirror) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const g = canvas.getContext('2d');
  if (mirror) {
    g.translate(128, 0);
    g.scale(-1, 1);
  }
  const r = 38;
  const start = -Math.PI / 2 + 0.5;
  const end = start + Math.PI * 1.45;
  const tip = { x: 64 + Math.cos(end) * r, y: 64 + Math.sin(end) * r };
  const tangent = { x: -Math.sin(end), y: Math.cos(end) };
  const normal = { x: Math.cos(end), y: Math.sin(end) };
  const draw = (color, width, grow) => {
    g.strokeStyle = g.fillStyle = color;
    g.lineWidth = width;
    g.lineCap = 'round';
    g.beginPath();
    g.arc(64, 64, r, start, end);
    g.stroke();
    g.beginPath();
    g.moveTo(tip.x + tangent.x * (22 + grow), tip.y + tangent.y * (22 + grow));
    g.lineTo(tip.x + normal.x * (17 + grow), tip.y + normal.y * (17 + grow));
    g.lineTo(tip.x - normal.x * (17 + grow), tip.y - normal.y * (17 + grow));
    g.closePath();
    g.fill();
  };
  draw('rgba(20,15,40,0.85)', 20, 5);
  draw('#fff3c4', 11, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// 炸彈上的倒數數字
function makeLabel(clip) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false, clippingPlanes: [clip] }));
  sprite.scale.setScalar(1.0);
  return {
    sprite,
    set(n) {
      ctx.clearRect(0, 0, 128, 128);
      ctx.font = '900 76px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 14;
      ctx.strokeStyle = 'rgba(10,10,20,0.9)';
      ctx.strokeText(String(n), 64, 68);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(String(n), 64, 68);
      tex.needsUpdate = true;
    },
    dispose() {
      tex.dispose();
      sprite.material.dispose();
    },
  };
}
