import * as THREE from 'three';

// 全场共用的几何体：每种只建一次
export const GEO = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 18),
  sph: new THREE.SphereGeometry(0.5, 18, 12),
  capsule: new THREE.CapsuleGeometry(0.17, 0.36, 4, 10),
  aiBody: new THREE.CapsuleGeometry(0.15, 0.42, 4, 12),
  ring: new THREE.TorusGeometry(0.3, 0.025, 6, 28),
  disc: new THREE.CylinderGeometry(0.34, 0.34, 0.02, 24),
  diamond: new THREE.OctahedronGeometry(0.11),
  plane: new THREE.PlaneGeometry(1, 1)
};

export type FloorMats = {
  std: THREE.MeshStandardMaterial;
  glow: THREE.MeshBasicMaterial;
  glass: THREE.MeshStandardMaterial;
  slab: THREE.MeshStandardMaterial;
  person: THREE.MeshStandardMaterial;
  aiBody: THREE.MeshBasicMaterial;
  aiGlow: THREE.MeshBasicMaterial;
  all: THREE.Material[];
};

// 每层楼一组材质：整层淡出 / 淡入时只改这一组的透明度
export function makeFloorMats(): FloorMats {
  const std = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.55, metalness: 0.08 });
  const glow = new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false });
  const glass = new THREE.MeshStandardMaterial({ color: '#F3EAD3', roughness: 0.05, metalness: 0.25, transparent: true, opacity: 0.22, depthWrite: false });
  const slab = new THREE.MeshStandardMaterial({ color: '#E2DCD1', roughness: 0.85, metalness: 0.05 });   // 浅色楼板
  const person = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7 });
  const aiBody = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55, toneMapped: false, depthWrite: false });
  const aiGlow = new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false });
  const all: THREE.Material[] = [std, glow, glass, slab, person, aiBody, aiGlow];
  for (const m of all) m.userData.base = m.opacity;
  return { std, glow, glass, slab, person, aiBody, aiGlow, all };
}

// 整层透明度：1 = 正常，0 = 看不见
export function setFloorOpacity(mats: THREE.Material[], o: number) {
  for (const m of mats) {
    const base = (m.userData.base as number) ?? 1;
    const next = base * o;
    const wantT = next < 0.999 || base < 1;
    if (m.transparent !== wantT) { m.transparent = wantT; m.needsUpdate = true; }
    m.opacity = next;
    m.depthWrite = base >= 1 && o > 0.6;
  }
}

export const damp = (dt: number, speed = 5) => 1 - Math.exp(-dt * speed);
