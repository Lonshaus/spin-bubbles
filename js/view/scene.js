// three.js 場景：renderer、鏡頭、燈光、環境貼圖、後製光暈、背景泡泡
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const TILT = THREE.MathUtils.degToRad(15);
const FOV = 30;

export class Stage {
  constructor(container) {
    this.container = container;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.95;
    this.renderer.localClippingEnabled = true;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = makeBackground();
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.55;

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
    this.composer = null;
    this.resize();
    new ResizeObserver(() => this.resize()).observe(container);
  }

  setQuality(level) {
    this.quality = level;
    const dpr = window.devicePixelRatio || 1;
    this.renderer.setPixelRatio(level === 'high' ? Math.min(dpr, 2) : Math.min(dpr, 1.5));
    if (level === 'high' && !this.composer) {
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.35, 0.45, 0.93);
      this.composer.addPass(this.bloom);
      this.composer.addPass(new OutputPass());
    }
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
    this.composer?.setPixelRatio(this.renderer.getPixelRatio());
    this.composer?.setSize(w, h);
    this.camera.aspect = w / h;
    const t = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const margin = 1.06;
    this.distance = Math.max(this.fit.height / 2 / t, this.fit.width / 2 / (t * this.camera.aspect)) * margin + 1;
    this.camera.updateProjectionMatrix();
    this.placeCamera();
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
    if (this.quality === 'high' && this.composer) this.composer.render(dt);
    else this.renderer.render(this.scene, this.camera);
  }
}

function makeBackground() {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 512;
  const g = canvas.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#1b1446');
  grad.addColorStop(0.55, '#0d1b3d');
  grad.addColorStop(1, '#06101f');
  g.fillStyle = grad;
  g.fillRect(0, 0, 16, 512);
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
    color: 0x6f8cff,
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
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
