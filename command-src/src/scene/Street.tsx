// 大楼前面的街道：人行道、路缘、斑马线、路灯、停着和开过去的车。都是程序画的，不用下载模型（国内打开快）。
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Batch } from './Batch';
import { GEO } from './shared';
import type { Prim } from './layout';
import { D, SLAB } from './constants';

const Y = -SLAB - 0.03;
const ROAD_Z = D / 2 + 11;                 // 马路中线（跟 Building 的马路一样）
const CAR_COLORS = ['#FFFFFF', '#E8EAED', '#202124', '#5F6368', '#1A73E8', '#D93025', '#9AA0A6', '#C5A572'];

const P = (x: number, y: number, z: number, sx: number, sy: number, sz: number, c: string, ry = 0): Prim => ({ p: [x, y + sy / 2, z], s: [sx, sy, sz], c, r: ry ? [0, ry, 0] : undefined });

// 一辆车：车身、车顶、车窗、四个轮子、车灯（方向 +x）
function carPrims(x: number, z: number, ry: number, color: string, out: { box: Prim[]; cyl: Prim[]; glow: Prim[] }) {
  const rot = (dx: number, dz: number) => [x + dx * Math.cos(ry) + dz * Math.sin(ry), z - dx * Math.sin(ry) + dz * Math.cos(ry)] as const;
  const at = (dx: number, dz: number, y: number, sx: number, sy: number, sz: number, c: string) => { const [px, pz] = rot(dx, dz); out.box.push(P(px, Y + y, pz, sx, sy, sz, c, ry)); };
  at(0, 0, 0.28, 4.2, 0.62, 1.78, color);
  at(-0.25, 0, 0.9, 2.3, 0.52, 1.6, color);
  at(-0.25, 0, 0.94, 2.36, 0.4, 1.62, '#3B4A5C');           // 车窗一圈
  for (const [dx, dz] of [[1.35, 0.82], [1.35, -0.82], [-1.3, 0.82], [-1.3, -0.82]]) {
    const [px, pz] = rot(dx, dz);
    out.cyl.push({ p: [px, Y + 0.33, pz], s: [0.66, 0.24, 0.66], c: '#2F3337', r: [Math.PI / 2, ry, 0] });
  }
  const [hx, hz] = rot(2.11, 0.55), [hx2, hz2] = rot(2.11, -0.55), [tx, tz] = rot(-2.11, 0.6), [tx2, tz2] = rot(-2.11, -0.6);
  out.glow.push(P(hx, Y + 0.6, hz, 0.04, 0.12, 0.34, '#FFF6D8', ry), P(hx2, Y + 0.6, hz2, 0.04, 0.12, 0.34, '#FFF6D8', ry));
  out.glow.push(P(tx, Y + 0.62, tz, 0.04, 0.12, 0.34, '#E8453C', ry), P(tx2, Y + 0.62, tz2, 0.04, 0.12, 0.34, '#E8453C', ry));
}

export function Street() {
  const mats = useMemo(() => ({
    std: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.55, metalness: 0.15 }),
    glow: new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false })
  }), []);
  const fixed = useMemo(() => {
    const box: Prim[] = [], cyl: Prim[] = [], glow: Prim[] = [];
    // 人行道（大楼这边、对面）+ 路缘石
    box.push(P(0, Y, ROAD_Z - 5.5, 240, 0.12, 3, '#D4CEC4'), P(0, Y, ROAD_Z + 5.5, 240, 0.12, 3, '#D4CEC4'));
    box.push(P(0, Y, ROAD_Z - 4.05, 240, 0.15, 0.18, '#B9B3A8'), P(0, Y, ROAD_Z + 4.05, 240, 0.15, 0.18, '#B9B3A8'));
    // 斑马线：正门前
    for (let i = 0; i < 9; i++) box.push(P(-8 - 3.2 + i * 0.8, Y + 0.012, ROAD_Z, 0.45, 0.01, 7.4, '#FAFAF7'));
    // 路灯（每 14 公尺，两边错开）
    for (let x = -70; x <= 70; x += 14) for (const side of [-1, 1]) {
      const z = ROAD_Z + side * 5.0, xx = x + (side > 0 ? 7 : 0);
      cyl.push({ p: [xx, Y + 2.6, z], s: [0.14, 5.2, 0.14], c: '#5F6368' });
      box.push(P(xx, Y + 5.1, z - side * 0.55, 0.12, 0.1, 1.2, '#5F6368'));
      glow.push(P(xx, Y + 5.0, z - side * 1.1, 0.4, 0.06, 0.25, '#FFF4D6'));
    }
    // 公车站（对面）
    box.push(P(14, Y + 0.12, ROAD_Z + 5.8, 4.2, 0.08, 1.4, '#9AA0A6'), P(14, Y + 2.5, ROAD_Z + 5.8, 4.4, 0.08, 1.6, '#1A73E8'));
    box.push(P(12.1, Y + 0.12, ROAD_Z + 6.4, 0.08, 2.4, 0.08, '#5F6368'), P(15.9, Y + 0.12, ROAD_Z + 6.4, 0.08, 2.4, 0.08, '#5F6368'));
    // 停着的车：大楼门口的临停位 + 对面路边
    const parked: [number, number, number][] = [[-20, ROAD_Z - 2.9, 0], [-1, ROAD_Z - 2.9, 0], [6, ROAD_Z - 2.9, 0], [24, ROAD_Z + 2.9, Math.PI], [31, ROAD_Z + 2.9, Math.PI], [-30, ROAD_Z + 2.9, Math.PI], [-38, ROAD_Z + 2.9, Math.PI]];
    parked.forEach(([x, z, ry], i) => carPrims(x, z, ry, CAR_COLORS[(i * 3) % CAR_COLORS.length], { box, cyl, glow }));
    return { box, cyl, glow };
  }, []);

  // 开过去的车：两个车道，各自绕圈
  const movers = useMemo(() => Array.from({ length: 6 }, (_, i) => {
    const g = new THREE.Group();
    const parts = { box: [] as Prim[], cyl: [] as Prim[], glow: [] as Prim[] };
    carPrims(0, 0, 0, CAR_COLORS[(i * 5 + 1) % CAR_COLORS.length], parts);
    for (const b of parts.box) { const m = new THREE.Mesh(GEO.box, mats.std.clone()); (m.material as THREE.MeshStandardMaterial).color.set(b.c); m.position.set(...b.p); m.position.y -= Y; m.scale.set(...b.s); m.castShadow = true; g.add(m); }
    for (const c of parts.cyl) { const m = new THREE.Mesh(GEO.cyl, mats.std.clone()); (m.material as THREE.MeshStandardMaterial).color.set(c.c); m.position.set(...c.p); m.position.y -= Y; m.scale.set(...c.s); m.rotation.set(Math.PI / 2, 0, 0); g.add(m); }
    for (const c of parts.glow) { const m = new THREE.Mesh(GEO.box, new THREE.MeshBasicMaterial({ color: c.c, toneMapped: false })); m.position.set(...c.p); m.position.y -= Y; m.scale.set(...c.s); g.add(m); }
    const dir = i % 2 ? -1 : 1;
    g.position.set(-90 + i * 31, Y, ROAD_Z + (dir > 0 ? -1.9 : 1.9));
    g.rotation.y = dir > 0 ? 0 : Math.PI;
    return { g, dir, speed: 5 + (i % 3) * 1.6 };
  }), [mats]);
  const t0 = useRef(0);
  useFrame((_, dt) => {
    t0.current += dt;
    for (const c of movers) {
      c.g.position.x += c.dir * c.speed * Math.min(dt, 0.1);
      if (c.g.position.x > 100) c.g.position.x = -100;
      if (c.g.position.x < -100) c.g.position.x = 100;
    }
  });

  return (
    <group>
      <Batch prims={fixed.box} geometry={GEO.box} material={mats.std} />
      <Batch prims={fixed.cyl} geometry={GEO.cyl} material={mats.std} />
      <Batch prims={fixed.glow} geometry={GEO.box} material={mats.glow} />
      {movers.map((c, i) => <primitive key={i} object={c.g} />)}
    </group>
  );
}
