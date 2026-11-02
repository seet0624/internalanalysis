// 度假村园区（在中国）：草地、中间的荷花湖、九曲桥、湖心亭、石板路、红灯笼、竹林、太湖石、松树、粉墙黛瓦的围墙、正门牌楼。
// 全部程序画，不用下载模型（国内打开快）。
import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Batch } from './Batch';
import { GEO } from './shared';
import type { Prim } from './layout';
import { TreeField, type TreeSpot } from './Trees';
import { COAST, D, LAKE, SITE, SLAB, W } from './constants';
import { Seaside } from './Seaside';
import { photoTexture } from './textures';

const Y = -SLAB - 0.58;                    // 地面高度（建筑台基底下）
const P = (x: number, y: number, z: number, sx: number, sy: number, sz: number, c: string, r?: [number, number, number]): Prim => ({ p: [x, y + sy / 2, z], s: [sx, sy, sz], c, r });
const BOUND = { x0: -150, x1: 150, z0: -125, z1: 110 };   // 围墙
let seed = 5;
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

// 湖岸：不规则的椭圆
function lakeShape(scale = 1) {
  const s = new THREE.Shape();
  const n = 48;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const wob = 1 + 0.08 * Math.sin(a * 3 + 0.6) + 0.05 * Math.cos(a * 5);
    const x = LAKE.x + Math.cos(a) * LAKE.rx * wob * scale, z = LAKE.z + Math.sin(a) * LAKE.rz * wob * scale;
    if (i === 0) s.moveTo(x, -z); else s.lineTo(x, -z);
  }
  return s;
}
const inLake = (x: number, z: number, pad = 0) => ((x - LAKE.x) / (LAKE.rx + pad)) ** 2 + ((z - LAKE.z) / (LAKE.rz + pad)) ** 2 < 1;
const inSea = (x: number) => x < COAST.x + 2;   // 西边的沙滩和海不放竹子、树
const nearBuilding = (x: number, z: number, pad = 6) => Object.values(SITE).some((s) => Math.abs(x - s.x) < W / 2 + pad && Math.abs(z - s.z) < D / 2 + pad);

export function Resort() {
  const mats = useMemo(() => ({
    std: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.75, metalness: 0.04 }),
    glow: (() => { const m = new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }); m.color.setScalar(1.6); return m; })(),   // 灯笼会发光
    water: new THREE.MeshStandardMaterial({ map: photoTexture('water', 0.06, 0.06), color: '#B7D3CF', roughness: 0.06, metalness: 0.3, transparent: true, opacity: 0.95 }),
    grass: new THREE.MeshStandardMaterial({ color: '#A9C68A', roughness: 1 }),   // 远看用纯色（草的照片会出现格子纹）
    stone: new THREE.MeshStandardMaterial({ map: photoTexture('paving', 1.5, 1.5), color: '#F2EEE6', roughness: 0.85 }),
    shore: new THREE.MeshStandardMaterial({ map: photoTexture('paving', 0.3, 0.3), color: '#EEEAE2', roughness: 0.85 })
  }), []);
  const geo = useMemo(() => ({ lake: new THREE.ShapeGeometry(lakeShape()), shore: new THREE.ShapeGeometry(lakeShape(1.07)) }), []);

  const scene = useMemo(() => {
    seed = 5;
    const box: Prim[] = [], cyl: Prim[] = [], sph: Prim[] = [], glow: Prim[] = [], paths: Prim[] = [];
    const trees: TreeSpot[] = [];
    // 石板路：大门 → 迎宾阁 → 绕湖一圈 → 每栋的台阶前
    paths.push(P(0, Y, 86, 7, 0.06, 48, ''));
    const ring = 40;
    for (let i = 0; i < 72; i++) {
      const a = (i / 72) * Math.PI * 2;
      paths.push(P(LAKE.x + Math.cos(a) * (LAKE.rx + 9), Y, LAKE.z + Math.sin(a) * (LAKE.rz + 9), 4.2, 0.06, 3.2, '', [0, -a + Math.PI / 2, 0]));
    }
    void ring;
    for (const [id, s] of Object.entries(SITE)) {
      if (id === 'B1') continue;
      const fx = s.x, fz = s.z + D / 2 + 3.5;                           // 台阶前
      const tx = LAKE.x + (fx - LAKE.x) * 0.62, tz = LAKE.z + (fz - LAKE.z) * 0.62;
      const dx = tx - fx, dz = tz - fz, len = Math.hypot(dx, dz);
      paths.push(P((fx + tx) / 2, Y, (fz + tz) / 2, 3.4, 0.06, len, '', [0, Math.atan2(dx, dz), 0]));
      // 灯笼：路两边
      for (let k = 0.15; k < 1; k += 0.3) {
        for (const sd of [-1, 1]) {
          const px = fx + dx * k + sd * 2.4 * (dz / len), pz = fz + dz * k - sd * 2.4 * (dx / len);
          cyl.push({ p: [px, Y + 1.0, pz], s: [0.12, 2.0, 0.12], c: '#3B2A22' });
          sph.push({ p: [px, Y + 2.15, pz], s: [0.5, 0.62, 0.5], c: '#C8302A' });
          glow.push(P(px, Y + 2.0, pz, 0.24, 0.3, 0.24, '#FFC46B'));
        }
      }
    }
    // 云栖馆的小路
    paths.push(P(90, Y, -66, 3, 0.06, 40, '', [0, -0.9, 0]));   // 云栖馆的小路
    // 九曲桥：从南岸到湖心亭（折几次）
    const bridge: [number, number][] = [[0, LAKE.z + LAKE.rz + 3], [5, LAKE.z + 14], [-4, LAKE.z + 8], [3, LAKE.z + 2], [0, LAKE.z - 2]];
    for (let i = 0; i < bridge.length - 1; i++) {
      const [ax, az] = bridge[i], [bx, bz] = bridge[i + 1];
      const len = Math.hypot(bx - ax, bz - az), ry = Math.atan2(bx - ax, bz - az);
      const cx = (ax + bx) / 2, cz = (az + bz) / 2;
      box.push(P(cx, Y + 0.35, cz, 2.2, 0.18, len + 0.6, '#C9C1B0', [0, ry, 0]));
      for (const sd of [-1, 1]) {
        const ox = Math.cos(ry) * sd * 1.05, oz = -Math.sin(ry) * sd * 1.05;
        box.push(P(cx + ox, Y + 0.95, cz + oz, 0.1, 0.08, len + 0.4, '#B9B1A0', [0, ry, 0]));
        for (let t = 0; t <= 1.001; t += 0.25) box.push(P(ax + (bx - ax) * t + ox, Y + 0.5, az + (bz - az) * t + oz, 0.14, 0.5, 0.14, '#B0A898'));
      }
      for (let t = 0.2; t < 1; t += 0.4) cyl.push({ p: [ax + (bx - ax) * t, Y + 0.0, az + (bz - az) * t], s: [0.5, 0.7, 0.5], c: '#9D978A' });
    }
    // 湖心亭：六角亭（柱子 + 平台），屋顶另外画
    const pc = { x: 0, z: LAKE.z - 6 };
    cyl.push({ p: [pc.x, Y + 0.3, pc.z], s: [8, 0.6, 8], c: '#C9C1B0' });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      cyl.push({ p: [pc.x + Math.cos(a) * 3.2, Y + 2.1, pc.z + Math.sin(a) * 3.2], s: [0.3, 3.0, 0.3], c: '#6E3328' });
      box.push(P(pc.x + Math.cos(a + Math.PI / 6) * 2.9, Y + 1.0, pc.z + Math.sin(a + Math.PI / 6) * 2.9, 0.12, 0.45, 3.0, '#6E3328', [0, -(a + Math.PI / 6), 0]));
    }
    cyl.push({ p: [pc.x, Y + 1.1, pc.z], s: [1.4, 0.06, 1.4], c: '#7A5A44' });     // 石桌
    // 荷叶 + 荷花
    for (let i = 0; i < 140; i++) {
      const a = rnd() * Math.PI * 2, r = 0.45 + rnd() * 0.5;
      const x = LAKE.x + Math.cos(a) * LAKE.rx * r, z = LAKE.z + Math.sin(a) * LAKE.rz * r;
      if (Math.abs(x) < 6 && z > LAKE.z - 12) continue;                  // 桥和亭子附近不要
      cyl.push({ p: [x, Y + 0.12, z], s: [1.1 + rnd() * 0.7, 0.03, 1.1 + rnd() * 0.7], c: rnd() > 0.5 ? '#4F8A4A' : '#5E9A55' });
      if (rnd() > 0.82) sph.push({ p: [x + 0.2, Y + 0.38, z], s: [0.32, 0.38, 0.32], c: '#F4A3B8' });
    }
    // 太湖石：湖边几块
    for (let i = 0; i < 12; i++) {
      const a = rnd() * Math.PI * 2;
      const x = LAKE.x + Math.cos(a) * (LAKE.rx + 3), z = LAKE.z + Math.sin(a) * (LAKE.rz + 3);
      sph.push({ p: [x, Y + 0.6, z], s: [1.6 + rnd() * 1.6, 1.4 + rnd() * 2.2, 1.4 + rnd()], c: rnd() > 0.5 ? '#A9A59C' : '#BDB8AE', r: [rnd(), rnd() * 3, rnd()] } as Prim);
    }
    // 竹林：一丛一丛（绿竿 + 叶团）
    const bamboo = (cx: number, cz: number, n: number) => {
      for (let i = 0; i < n; i++) {
        const x = cx + (rnd() - 0.5) * 9, z = cz + (rnd() - 0.5) * 9, h = 6 + rnd() * 4;
        if (nearBuilding(x, z, 2) || inLake(x, z, 2) || inSea(x)) continue;
        cyl.push({ p: [x, Y + h / 2, z], s: [0.14, h, 0.14], c: rnd() > 0.3 ? '#6E9A4E' : '#88A85A', r: [(rnd() - 0.5) * 0.12, 0, (rnd() - 0.5) * 0.12] });
        sph.push({ p: [x, Y + h - 0.6, z], s: [1.4, 2.2, 1.4], c: rnd() > 0.5 ? '#5C8E44' : '#6FA052' });
      }
    };
    // 听竹轩：竹林围着
    const tz = SITE['2F'];
    for (const [dx, dz] of [[-24, -8], [-24, 6], [-14, -16], [6, -16], [18, -15], [-22, 18]]) bamboo(tz.x + dx, tz.z + dz, 26);
    for (const [x, z] of [[-30, 40], [30, 40], [-100, 50], [100, 50], [-36, -100], [36, -100], [110, -10], [-115, -20]]) bamboo(x, z, 22);
    // 树：松树、橡树散在园区
    for (let i = 0; i < 70; i++) {
      const x = BOUND.x0 + 8 + rnd() * (BOUND.x1 - BOUND.x0 - 16), z = BOUND.z0 + 8 + rnd() * (BOUND.z1 - BOUND.z0 - 16);
      if (nearBuilding(x, z, 7) || inLake(x, z, 10) || inSea(x) || (Math.abs(x) < 8 && z > 30)) continue;
      trees.push({ x, y: Y, z, kind: rnd() > 0.45 ? 'pine' : rnd() > 0.5 ? 'oak' : 'ash', h: 6 + rnd() * 5, ry: rnd() * 6 });
    }
    // 粉墙黛瓦的围墙（正门留口）
    const wall = (ax: number, az: number, bx: number, bz: number) => {
      const len = Math.hypot(bx - ax, bz - az), ry = Math.atan2(bx - ax, bz - az);
      box.push(P((ax + bx) / 2, Y, (az + bz) / 2, 0.5, 2.6, len, '#F2EFE8', [0, ry, 0]));
      box.push(P((ax + bx) / 2, Y + 2.6, (az + bz) / 2, 1.1, 0.3, len + 0.6, '#4B5057', [0, ry, 0]));
      box.push(P((ax + bx) / 2, Y, (az + bz) / 2, 0.55, 0.4, len, '#8E8A82', [0, ry, 0]));
    };
    // 西边面海：不砌墙，围墙从沙滩边开始
    wall(COAST.x, BOUND.z0, BOUND.x1, BOUND.z0);
    wall(BOUND.x1, BOUND.z0, BOUND.x1, BOUND.z1);
    wall(COAST.x, BOUND.z1, -7, BOUND.z1);
    wall(7, BOUND.z1, BOUND.x1, BOUND.z1);
    // 正门牌楼：四柱三间
    for (const x of [-7, -3, 3, 7]) {
      box.push(P(x, Y, BOUND.z1, 0.7, 0.6, 0.7, '#9C978C'));
      cyl.push({ p: [x, Y + 3.6, BOUND.z1], s: [0.5, 6.6, 0.5], c: '#6E3328' });
    }
    box.push(P(0, Y + 6.2, BOUND.z1, 15.5, 0.5, 0.6, '#6E3328'));
    box.push(P(0, Y + 6.75, BOUND.z1, 17.5, 0.5, 2.2, '#4B5057'));
    box.push(P(0, Y + 7.25, BOUND.z1, 8, 0.6, 1.2, '#4B5057'));
    box.push(P(0, Y + 4.7, BOUND.z1 + 0.35, 5.2, 1.3, 0.12, '#1B3D6E'));        // 匾额底
    glow.push(P(0, Y + 4.95, BOUND.z1 + 0.42, 3.8, 0.7, 0.02, '#E8C77A'));       // 匾额字（金）
    // 门口石狮（简化）+ 停车区
    for (const sx of [-1, 1]) { box.push(P(sx * 9.5, Y, BOUND.z1 + 1, 1.2, 0.9, 1.6, '#B3AD9F')); sph.push({ p: [sx * 9.5, Y + 1.5, BOUND.z1 + 1], s: [1.1, 1.2, 1.3], c: '#B3AD9F' }); }
    return { box, cyl, sph, glow, paths, trees, pc };
  }, []);

  // 湖心亭屋顶（六角攒尖）
  const pavRoof = useMemo(() => new THREE.ConeGeometry(5.2, 2.6, 6), []);
  const roofMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#4B5057', roughness: 0.7 }), []);
  // 湖水慢慢流动
  useFrame((_, dt) => { const m = mats.water.map; if (m) { m.offset.x += dt * 0.004; m.offset.y += dt * 0.0025; } });

  return (
    <group>
      {/* 草地 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(COAST.x + BOUND.x1) / 2 + 2, Y - 0.01, -8]} material={mats.grass} receiveShadow raycast={() => null}>
        <planeGeometry args={[BOUND.x1 - COAST.x + 4, BOUND.z1 - BOUND.z0 + 4]} />
      </mesh>
      {/* 围墙外：田野一样的浅绿 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, Y - 0.05, 0]} raycast={() => null}>
        <ringGeometry args={[175, 520, 64]} />
        <meshStandardMaterial color="#B8C9A6" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, Y - 0.06, 0]} raycast={() => null}>
        <circleGeometry args={[176, 64]} />
        <meshStandardMaterial color="#B3C59F" roughness={1} />
      </mesh>
      {/* 湖：石岸 + 水 */}
      <mesh geometry={geo.shore} rotation={[-Math.PI / 2, 0, 0]} position={[0, Y + 0.02, 0]} material={mats.shore} raycast={() => null} />
      <mesh geometry={geo.lake} rotation={[-Math.PI / 2, 0, 0]} position={[0, Y + 0.08, 0]} material={mats.water} receiveShadow raycast={() => null} />
      <Batch prims={scene.paths} geometry={GEO.box} material={mats.stone} />
      <Batch prims={scene.box} geometry={GEO.box} material={mats.std} />
      <Batch prims={scene.cyl} geometry={GEO.cyl} material={mats.std} />
      <Batch prims={scene.sph} geometry={GEO.sph} material={mats.std} />
      <Batch prims={scene.glow} geometry={GEO.box} material={mats.glow} />
      <mesh geometry={pavRoof} material={roofMat} position={[scene.pc.x, Y + 4.85, scene.pc.z]} castShadow raycast={() => null} />
      <mesh position={[scene.pc.x, Y + 6.3, scene.pc.z]} raycast={() => null}><sphereGeometry args={[0.35, 12, 8]} /><meshStandardMaterial color="#C9A86A" metalness={0.6} roughness={0.3} /></mesh>
      <TreeField spots={scene.trees} />
      <Seaside />
    </group>
  );
}
