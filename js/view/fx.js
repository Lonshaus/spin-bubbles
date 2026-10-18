// 粒子特效：消除爆開、星星／珍珠誕生的閃光、炸彈爆炸
import * as THREE from 'three';
import { makeDotTexture } from './scene.js';

export class Fx {
  constructor(parent) {
    this.parent = parent;
    this.bursts = [];
    this.texture = makeDotTexture();
  }

  // points: [{ pos: Vector3, color: hex }]
  burst(points, { count = 16, speed = 6, life = 0.75, size = 0.45, gravity = -9 } = {}) {
    const n = points.length * count;
    if (!n) return;
    const positions = new Float32Array(n * 3);
    const colors = new Float32Array(n * 3);
    const velocities = new Float32Array(n * 3);
    const c = new THREE.Color();
    let k = 0;
    for (const p of points) {
      c.setHex(p.color);
      for (let j = 0; j < count; j++, k++) {
        const a = Math.random() * Math.PI * 2;
        const s = speed * (0.35 + Math.random() * 0.65);
        positions.set([p.pos.x, p.pos.y, p.pos.z + 0.3], k * 3);
        velocities.set([Math.cos(a) * s, Math.sin(a) * s, Math.random() * s * 0.6], k * 3);
        colors.set([c.r, c.g, c.b], k * 3);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({
      size,
      map: this.texture,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    const obj = new THREE.Points(geo, mat);
    this.parent.add(obj);
    this.bursts.push({ obj, velocities, age: 0, life, gravity });
  }

  // 一圈擴散的光環
  flash(pos, color, size = 3, life = 0.5) {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: this.texture, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
    );
    sprite.position.copy(pos);
    sprite.position.z += 0.8;
    this.parent.add(sprite);
    this.bursts.push({ obj: sprite, age: 0, life, size });
  }

  update(dt) {
    for (const b of this.bursts) {
      b.age += dt;
      const k = Math.min(1, b.age / b.life);
      if (b.velocities) {
        const pos = b.obj.geometry.attributes.position.array;
        for (let i = 0; i < pos.length; i += 3) {
          b.velocities[i] *= 1 - dt * 2;
          b.velocities[i + 1] = b.velocities[i + 1] * (1 - dt * 2) + b.gravity * dt;
          pos[i] += b.velocities[i] * dt;
          pos[i + 1] += b.velocities[i + 1] * dt;
          pos[i + 2] += b.velocities[i + 2] * dt;
        }
        b.obj.geometry.attributes.position.needsUpdate = true;
        b.obj.material.opacity = 1 - k * k;
      } else {
        b.obj.scale.setScalar(b.size * (0.3 + k));
        b.obj.material.opacity = 1 - k;
      }
    }
    const dead = this.bursts.filter((b) => b.age >= b.life);
    for (const b of dead) {
      this.parent.remove(b.obj);
      if (b.velocities) b.obj.geometry.dispose(); // Sprite 的 geometry 是共用的，不能丟
      b.obj.material.dispose();
    }
    if (dead.length) this.bursts = this.bursts.filter((b) => b.age < b.life);
  }
}
