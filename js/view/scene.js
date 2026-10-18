// three.js 場景：renderer、鏡頭、燈光、環境貼圖、後製光暈、背景泡泡
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const TILT = THREE.MathUtils.degToRad(15);
const FOV = 30;

export class Stage {
  // container：整個畫面大小的 canvas 容器；area：盤面要置中的區域（扣掉上下的按鈕列）
  constructor(container, area = container) {
    this.container = container;
    this.area = area;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.95;
    this.renderer.localClippingEnabled = true;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.5;

    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(-6, 10, 14);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x88aaff, 0.8);
    rim.position.set(8, -6, 6);
    this.scene.add(rim);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.25));

    this.camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 200);
    this.target = new THREE.Vector3();
    this.parallax = new THREE.Vector2();
    this.parallaxGoal = new THREE.Vector2();
    this.shake = 0;
    this.fit = { width: 18, height: 18 };

    this.root = new THREE.Group(); // 盤面與棋子都掛在這裡
    this.scene.add(this.root);
    this.bubbles = makeBackgroundBubbles();
    this.scene.add(this.bubbles);

    this.quality = 'high';
    this.resize();
    const observer = new ResizeObserver(() => this.resize());
    observer.observe(container);
    observer.observe(area);
  }

  setQuality(level) {
    this.quality = level;
    const dpr = window.devicePixelRatio || 1;
    this.renderer.setPixelRatio(level === 'high' ? Math.min(dpr, 2) : Math.min(dpr, 1.5));
    this.resize();
  }

  // 讓整個盤面（width × height）塞進畫面
  setFit(width, height) {
    this.fit = { width, height };
    this.resize();
  }

  resize() {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.renderer.setSize(w, h);
    const aspect = w / h;
    if (Math.abs(aspect - (this.bgAspect ?? 0)) > 0.05) {
      this.scene.background?.dispose();
      this.scene.background = makeBackground(aspect);
      this.bgAspect = aspect;
    }

    // canvas 鋪滿整個畫面，但盤面要置中在 area 裡：
    // 用一個以 area 中心為中心的虛擬畫框（高 hv）算投影，再用 setViewOffset 只畫 canvas 那一塊
    const box = this.container.getBoundingClientRect();
    const rect = this.area.getBoundingClientRect();
    const areaW = Math.max(1, rect.width);
    const areaH = Math.max(1, rect.height);
    const cy = rect.top - box.top + areaH / 2;
    const hv = 2 * Math.max(cy, h - cy, 1);
    const t = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const margin = 1.06;
    this.distance =
      Math.max((this.fit.height * hv) / (2 * t * areaH), (this.fit.width * hv) / (2 * t * areaW)) * margin + 1;
    this.camera.aspect = w / hv;
    this.camera.setViewOffset(w, hv, 0, hv / 2 - cy, w, h);
    this.camera.updateProjectionMatrix();
    this.placeCamera();
    this.reportLayout(w);
  }

  // 盤面最寬處（靠近鏡頭的下緣）在螢幕上的像素寬度
  reportLayout(viewWidth) {
    if (!this.onLayout) return;
    this.camera.updateMatrixWorld();
    const half = (this.fit.width - 0.8) / 2;
    const y = this.target.y - (this.fit.height - 1.2) / 2;
    const left = new THREE.Vector3(-half, y, 0).project(this.camera);
    const right = new THREE.Vector3(half, y, 0).project(this.camera);
    this.onLayout(((right.x - left.x) / 2) * viewWidth);
  }

  placeCamera() {
    const d = this.distance;
    const sx = this.shake ? (Math.random() - 0.5) * this.shake : 0;
    const sy = this.shake ? (Math.random() - 0.5) * this.shake : 0;
    this.camera.position.set(
      this.parallax.x * 0.9 + sx,
      -Math.sin(TILT) * d + this.parallax.y * 0.9 + sy,
      Math.cos(TILT) * d,
    );
    this.camera.lookAt(this.target.x + sx * 0.5, this.target.y + sy * 0.5, 0);
  }

  // 滑鼠位置（-1..1）→ 鏡頭輕微跟著動
  setPointer(nx, ny) {
    this.parallaxGoal.set(nx, ny);
  }

  render(dt) {
    this.parallax.lerp(this.parallaxGoal, 1 - Math.exp(-dt * 3));
    this.shake = Math.min(2, Math.max(0, this.shake - dt * 2.5));
    this.placeCamera();
    this.bubbles.userData.update(dt);
    this.renderer.render(this.scene, this.camera);
  }
}

// 原版那種淺藍底加六角形花紋。依畫面比例重畫，花紋才不會被拉長。
function makeBackground(aspect = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = Math.round(768 / aspect);
  const { width: w, height: h } = canvas;
  const g = canvas.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#d9f0ff');
  grad.addColorStop(0.5, '#a6d6fb');
  grad.addColorStop(1, '#6fb4ec');
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  const glow = g.createRadialGradient(w / 2, h * 0.45, 0, w / 2, h * 0.45, Math.max(w, h) * 0.6);
  glow.addColorStop(0, 'rgba(255,255,255,0.45)');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, w, h);
  const r = 34;
  g.strokeStyle = 'rgba(255,255,255,0.35)';
  g.lineWidth = 2;
  for (let col = -1; col * r * 1.5 < w + r; col++) {
    for (let row = -1; row * r * Math.sqrt(3) < h + r; row++) {
      const cx = col * r * 1.5;
      const cy = row * r * Math.sqrt(3) + (col & 1 ? (r * Math.sqrt(3)) / 2 : 0);
      g.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = (Math.PI / 3) * k;
        g[k ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * (r - 3), cy + Math.sin(a) * (r - 3));
      }
      g.closePath();
      g.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function makeDotTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const g = canvas.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.4, 'rgba(255,255,255,0.6)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// 背景緩緩上飄的模糊泡泡
function makeBackgroundBubbles() {
  const count = 40;
  const positions = new Float32Array(count * 3);
  const speeds = new Float32Array(count);
  const reset = (k, anyY) => {
    positions[k * 3] = (Math.random() - 0.5) * 60;
    positions[k * 3 + 1] = anyY ? (Math.random() - 0.5) * 50 : -25;
    positions[k * 3 + 2] = -10 - Math.random() * 25;
    speeds[k] = 0.4 + Math.random() * 1.2;
  };
  for (let k = 0; k < count; k++) reset(k, true);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    size: 1.6,
    map: makeDotTexture(),
    color: 0xffffff,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  });
  const points = new THREE.Points(geo, mat);
  points.userData.update = (dt) => {
    for (let k = 0; k < count; k++) {
      positions[k * 3 + 1] += speeds[k] * dt;
      positions[k * 3] += Math.sin(positions[k * 3 + 1] * 0.3 + k) * dt * 0.2;
      if (positions[k * 3 + 1] > 25) reset(k, false);
    }
    geo.attributes.position.needsUpdate = true;
  };
  return points;
}
