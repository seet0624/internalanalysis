// Roblox 风格的 3D 员工：方块身体、大头、可换肤色 / 发型 / 衣服 / 耳机 / 眼镜，有膝盖、手肘，可以坐着打字、站着说话、走路。
// 纯 three.js，老板仪表板和客服仪表板共用。
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { Look } from '../types';

const BOX = new THREE.BoxGeometry(1, 1, 1);
const HEAD = new RoundedBoxGeometry(1, 1, 1, 3, 0.18);
const ROUND = new RoundedBoxGeometry(1, 1, 1, 2, 0.12);
const CYL = new THREE.CylinderGeometry(0.5, 0.5, 1, 14);
const ARC = new THREE.TorusGeometry(0.2, 0.016, 6, 20, Math.PI);
const matCache = new Map<string, THREE.MeshStandardMaterial>();
const mat = (c: string, rough = 0.6) => {
  const k = c + rough;
  let m = matCache.get(k);
  if (!m) { m = new THREE.MeshStandardMaterial({ color: c, roughness: rough, metalness: 0.02 }); matCache.set(k, m); }
  return m;
};
function part(geo: THREE.BufferGeometry, m: THREE.Material, sx: number, sy: number, sz: number, x: number, y: number, z: number, parent: THREE.Object3D) {
  const o = new THREE.Mesh(geo, m); o.scale.set(sx, sy, sz); o.position.set(x, y, z); o.castShadow = true; parent.add(o); return o;
}

// 脸：眼睛、眉毛、笑容（透明贴图贴在头的正面）
const faceCache = new Map<number, THREE.MeshBasicMaterial>();
function faceMat(variant: number) {
  let m = faceCache.get(variant);
  if (m) return m;
  const c = document.createElement('canvas'); c.width = 128; c.height = 110;
  const g = c.getContext('2d') as CanvasRenderingContext2D;
  g.fillStyle = '#202124';
  const ey = 48;
  g.beginPath(); g.ellipse(40, ey, 7, 9, 0, 0, Math.PI * 2); g.ellipse(88, ey, 7, 9, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#FFFFFF'; g.beginPath(); g.arc(42, ey - 3, 2.4, 0, Math.PI * 2); g.arc(90, ey - 3, 2.4, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#3C2A20'; g.lineWidth = 4; g.lineCap = 'round';
  const brow = variant % 3;
  g.beginPath(); g.moveTo(30, 30 - brow); g.lineTo(50, 28 + brow); g.moveTo(78, 28 + brow); g.lineTo(98, 30 - brow); g.stroke();
  g.strokeStyle = '#202124'; g.lineWidth = 4.5;
  g.beginPath();
  if (variant % 4 === 3) { g.moveTo(52, 80); g.lineTo(76, 80); } else g.arc(64, 70, 16 + (variant % 2) * 3, 0.18 * Math.PI, 0.82 * Math.PI);
  g.stroke();
  if (variant % 5 === 1) { g.fillStyle = 'rgba(234,67,53,.18)'; g.beginPath(); g.arc(28, 66, 8, 0, Math.PI * 2); g.arc(100, 66, 8, 0, Math.PI * 2); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  m = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false });
  faceCache.set(variant, m);
  return m;
}

export type Rig = {
  root: THREE.Group; body: THREE.Group; head: THREE.Group;
  hipL: THREE.Group; hipR: THREE.Group; kneeL: THREE.Group; kneeR: THREE.Group;
  shL: THREE.Group; shR: THREE.Group; elL: THREE.Group; elR: THREE.Group;
};

const HIP_Y = 0.62;

export function buildCharacter(look: Look, faceVariant = 0): Rig {
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  const skin = mat(look.skin, 0.75), top = mat(look.top, 0.7), bottom = mat(look.bottom, 0.8), shoe = mat('#3C4043', 0.6), hairM = mat(look.hairColor, 0.85);
  // 腿：大腿 + 小腿（有膝盖）
  const leg = (side: number) => {
    const hip = new THREE.Group(); hip.position.set(side * 0.11, HIP_Y, 0); body.add(hip);
    part(BOX, bottom, 0.18, 0.32, 0.2, 0, -0.16, 0, hip);
    const knee = new THREE.Group(); knee.position.y = -0.32; hip.add(knee);
    part(BOX, bottom, 0.17, 0.26, 0.19, 0, -0.13, 0, knee);
    part(ROUND, shoe, 0.19, 0.06, 0.26, 0, -0.28, 0.03, knee);
    return { hip, knee };
  };
  const L = leg(-1), R = leg(1);
  // 身体（衣服）、领带
  part(ROUND, top, 0.48, 0.5, 0.27, 0, HIP_Y + 0.25, 0, body);
  part(BOX, bottom, 0.46, 0.06, 0.26, 0, HIP_Y + 0.02, 0, body);
  if (look.tie) part(BOX, mat('#1A73E8'), 0.06, 0.3, 0.02, 0, HIP_Y + 0.28, 0.14, body);
  else part(BOX, mat(look.top === '#FFFFFF' ? '#E8EAED' : '#FFFFFF'), 0.16, 0.05, 0.02, 0, HIP_Y + 0.47, 0.14, body);
  // 手臂：上臂 + 前臂（有手肘）+ 手
  const arm = (side: number) => {
    const sh = new THREE.Group(); sh.position.set(side * 0.32, HIP_Y + 0.46, 0); body.add(sh);
    part(ROUND, top, 0.15, 0.26, 0.17, 0, -0.12, 0, sh);
    const el = new THREE.Group(); el.position.y = -0.25; sh.add(el);
    part(BOX, skin, 0.13, 0.2, 0.14, 0, -0.1, 0, el);
    part(ROUND, skin, 0.14, 0.08, 0.15, 0, -0.22, 0, el);
    return { sh, el };
  };
  const AL = arm(-1), AR = arm(1);
  // 头：大方头 + 脸 + 头发 + 耳机 / 眼镜
  const head = new THREE.Group(); head.position.y = HIP_Y + 0.56; body.add(head);
  part(BOX, skin, 0.12, 0.06, 0.12, 0, 0.02, 0, head);
  part(HEAD, skin, 0.36, 0.34, 0.33, 0, 0.21, 0, head);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.24), faceMat(faceVariant)); face.position.set(0, 0.2, 0.167); head.add(face);
  const hy = 0.21;
  switch (look.hair) {
    case 'bald': break;
    case 'spiky':
      part(BOX, hairM, 0.38, 0.08, 0.35, 0, hy + 0.17, 0, head);
      for (let i = 0; i < 4; i++) { const sp = part(BOX, hairM, 0.08, 0.1, 0.08, -0.13 + i * 0.087, hy + 0.24, 0.02 * (i % 2), head); sp.rotation.z = (i - 1.5) * 0.25; }
      break;
    case 'bun':
      part(ROUND, hairM, 0.38, 0.12, 0.35, 0, hy + 0.15, -0.01, head);
      part(HEAD, hairM, 0.16, 0.14, 0.16, 0, hy + 0.28, -0.08, head);
      break;
    case 'ponytail':
      part(ROUND, hairM, 0.38, 0.12, 0.36, 0, hy + 0.15, -0.01, head);
      part(ROUND, hairM, 0.1, 0.3, 0.1, 0, hy - 0.05, -0.2, head);
      break;
    case 'long':
      part(ROUND, hairM, 0.39, 0.12, 0.36, 0, hy + 0.15, -0.01, head);
      part(ROUND, hairM, 0.39, 0.42, 0.09, 0, hy - 0.08, -0.15, head);
      part(BOX, hairM, 0.05, 0.34, 0.24, -0.185, hy - 0.04, -0.03, head);
      part(BOX, hairM, 0.05, 0.34, 0.24, 0.185, hy - 0.04, -0.03, head);
      break;
    case 'bob':
      part(ROUND, hairM, 0.4, 0.14, 0.37, 0, hy + 0.14, -0.01, head);
      part(ROUND, hairM, 0.4, 0.24, 0.1, 0, hy, -0.15, head);
      part(BOX, hairM, 0.05, 0.22, 0.26, -0.19, hy + 0.02, -0.02, head);
      part(BOX, hairM, 0.05, 0.22, 0.26, 0.19, hy + 0.02, -0.02, head);
      break;
    case 'side':
      part(ROUND, hairM, 0.38, 0.11, 0.35, 0, hy + 0.16, -0.01, head);
      part(BOX, hairM, 0.24, 0.07, 0.06, 0.06, hy + 0.12, 0.15, head);
      break;
    default:
      part(ROUND, hairM, 0.38, 0.1, 0.35, 0, hy + 0.16, -0.01, head);
      part(BOX, hairM, 0.36, 0.06, 0.05, 0, hy + 0.12, 0.15, head);
  }
  if (look.glasses) {
    const gm = mat('#3C4043', 0.4);
    part(BOX, gm, 0.11, 0.07, 0.01, -0.075, 0.21, 0.172, head); part(BOX, gm, 0.11, 0.07, 0.01, 0.075, 0.21, 0.172, head);
    part(BOX, gm, 0.04, 0.012, 0.01, 0, 0.225, 0.172, head);
  }
  if (look.headset) {
    const hm = mat('#3C4043', 0.45);
    const band = new THREE.Mesh(ARC, hm); band.position.set(0, hy + 0.02, 0); band.rotation.set(0, Math.PI / 2, 0); band.scale.set(1, 1.05, 1); head.add(band);
    for (const sx of [-1, 1]) { const cup = part(CYL, hm, 0.1, 0.05, 0.1, sx * 0.2, hy - 0.01, 0, head); cup.rotation.z = Math.PI / 2; }
    const boom = part(BOX, hm, 0.015, 0.015, 0.16, -0.19, hy - 0.08, 0.08, head); boom.rotation.y = 0.35;
    part(ROUND, mat('#1A73E8', 0.4), 0.03, 0.03, 0.03, -0.16, hy - 0.08, 0.16, head);
  }
  return { root, body, head, hipL: L.hip, hipR: R.hip, kneeL: L.knee, kneeR: R.knee, shL: AL.sh, shR: AR.sh, elL: AL.el, elR: AR.el };
}

export type Pose = 'type' | 'sit' | 'talk' | 'walk' | 'idle' | 'wave';

// 每张画面调一次：t 秒、phase 让大家不同步
export function animate(r: Rig, pose: Pose, t: number, phase = 0) {
  const s = Math.sin, tp = t + phase;
  const sitting = pose === 'type' || pose === 'sit';
  r.body.position.y = sitting ? -0.14 : pose === 'walk' ? Math.abs(s(tp * 9)) * 0.03 : s(tp * 1.6) * 0.006;
  if (sitting) {
    r.hipL.rotation.x = r.hipR.rotation.x = -Math.PI / 2;
    r.kneeL.rotation.x = r.kneeR.rotation.x = Math.PI / 2;
  } else if (pose === 'walk') {
    const a = s(tp * 9) * 0.55;
    r.hipL.rotation.x = a; r.hipR.rotation.x = -a;
    r.kneeL.rotation.x = Math.max(0, -a) * 0.9; r.kneeR.rotation.x = Math.max(0, a) * 0.9;
  } else {
    r.hipL.rotation.x = r.hipR.rotation.x = 0; r.kneeL.rotation.x = r.kneeR.rotation.x = 0;
  }
  switch (pose) {
    case 'type': {
      r.shL.rotation.set(-1.15 + s(tp * 11) * 0.04, 0, 0.12); r.shR.rotation.set(-1.15 + s(tp * 11 + 1.7) * 0.04, 0, -0.12);
      r.elL.rotation.x = -0.55; r.elR.rotation.x = -0.55;
      r.head.rotation.set(0.08 + s(tp * 0.7) * 0.03, s(tp * 0.4) * 0.12, 0);
      break;
    }
    case 'sit':
      r.shL.rotation.set(-0.5, 0, 0.1); r.shR.rotation.set(-0.5, 0, -0.1); r.elL.rotation.x = r.elR.rotation.x = -0.9;
      r.head.rotation.set(0, s(tp * 0.5) * 0.25, 0);
      break;
    case 'talk':
      r.shL.rotation.set(-0.2 + s(tp * 2.2) * 0.25, 0, 0.15); r.shR.rotation.set(-0.6 + s(tp * 3) * 0.35, 0, -0.2);
      r.elL.rotation.x = -0.4; r.elR.rotation.x = -0.9 + s(tp * 3.3) * 0.3;
      r.head.rotation.set(s(tp * 2.6) * 0.06, s(tp * 0.9) * 0.18, 0);
      break;
    case 'wave':
      r.shL.rotation.set(0, 0, 0.08); r.shR.rotation.set(-2.6, 0, -0.3 + s(tp * 8) * 0.3); r.elL.rotation.x = 0; r.elR.rotation.x = -0.3;
      r.head.rotation.set(0, 0, s(tp * 2) * 0.05);
      break;
    case 'walk': {
      const a = s(tp * 9) * 0.5;
      r.shL.rotation.set(-a, 0, 0.06); r.shR.rotation.set(a, 0, -0.06); r.elL.rotation.x = r.elR.rotation.x = -0.25;
      r.head.rotation.set(0, 0, 0);
      break;
    }
    default:
      r.shL.rotation.set(s(tp * 1.3) * 0.04, 0, 0.08); r.shR.rotation.set(-s(tp * 1.3) * 0.04, 0, -0.08); r.elL.rotation.x = r.elR.rotation.x = -0.1;
      r.head.rotation.set(0, s(tp * 0.6) * 0.3, 0);
  }
}
