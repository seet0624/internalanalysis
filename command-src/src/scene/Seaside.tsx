// 海边（听竹轩在西边的海岸）：金色沙滩、会动的海（海浪 + 浪花线）、椰子树、木栈道码头、帆船、沙滩伞和躺椅。
// 材质是 Krea 生成的（hq/textures/sand.jpg、sea.jpg），模型都是程序画的，不用下载（国内打开快）。
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Batch } from './Batch';
import { GEO } from './shared';
import type { Prim } from './layout';
import { COAST, SITE, SLAB } from './constants';
import { photoTexture } from './textures';

const Y = -SLAB - 0.58;
const P = (x: number, y: number, z: number, sx: number, sy: number, sz: number, c: string, r?: [number, number, number]): Prim => ({ p: [x, y + sy / 2, z], s: [sx, sy, sz], c, r });
let seed = 77;
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

// 椰子树：弯弯的树干（一节一节）+ 一圈下垂的叶子 + 椰子
function palm(x: number, z: number, h: number, lean: number, ry: number, out: { box: Prim[]; sph: Prim[]; cyl: Prim[] }) {
  const n = 7;
  let px = x, pz = z, py = Y;
  const dx = Math.cos(ry), dz = Math.sin(ry);
  for (let i = 0; i < n; i++) {
    const t = i / n, seg = h / n;
    const bend = lean * t * t;
    const nx = x + dx * bend * h * 0.35, nz = z + dz * bend * h * 0.35, ny = Y + seg * (i + 1);
    out.cyl.push({ p: [(px + nx) / 2, (py + ny) / 2, (pz + nz) / 2], s: [0.42 - t * 0.12, seg * 1.05, 0.42 - t * 0.12], c: i % 2 ? '#8C7355' : '#9C8263', r: [dz * lean * 0.35 * (t + 0.1), 0, -dx * lean * 0.35 * (t + 0.1)] });
    px = nx; pz = nz; py = ny;
  }
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2 + ry;
    out.box.push({ p: [px + Math.cos(a) * 1.5, py - 0.35, pz + Math.sin(a) * 1.5], s: [3.2, 0.06, 0.75], c: k % 2 ? '#4E8A3A' : '#5E9C45', r: [0, -a, -0.45] });
  }
  for (let k = 0; k < 3; k++) out.sph.push({ p: [px + Math.cos(k * 2.1) * 0.25, py - 0.35, pz + Math.sin(k * 2.1) * 0.25], s: [0.32, 0.36, 0.32], c: '#6B5A2E' });
}

export function Seaside() {
  const mats = useMemo(() => ({
    std: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.75, metalness: 0.03 }),
    sand: new THREE.MeshStandardMaterial({ map: photoTexture('sand', 30, 60), color: '#FFF6E2', roughness: 1 }),
    sea: new THREE.MeshStandardMaterial({ map: photoTexture('sea', 40, 40), color: '#9ED3DA', roughness: 0.1, metalness: 0.25, transparent: true, opacity: 0.96 }),
    foam: new THREE.MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.65, depthWrite: false })
  }), []);
  const scene = useMemo(() => {
    seed = 77;
    const box: Prim[] = [], sph: Prim[] = [], cyl: Prim[] = [];
    const out = { box, sph, cyl };
    // 椰子树：沙滩上一排（避开码头）
    for (let z = COAST.z0 + 6; z < COAST.z1 - 4; z += 6 + rnd() * 4) {
      if (Math.abs(z - SITE['2F'].z) < 5) continue;
      palm(COAST.x - 3 - rnd() * 10, z, 7 + rnd() * 4, 0.4 + rnd() * 0.5, Math.PI + (rnd() - 0.5) * 0.8, out);
    }
    // 木栈道码头：从听竹轩前面的沙滩一直伸进海里
    const pz = SITE['2F'].z, x0 = COAST.x + 2, x1 = COAST.sea - 46;
    box.push(P((x0 + x1) / 2, Y + 0.6, pz, x0 - x1, 0.18, 3, '#9C7A55'));
    for (let x = x1; x <= x0; x += 0.6) box.push(P(x, Y + 0.79, pz, 0.04, 0.005, 3, '#7A5C3E'));     // 木板缝
    for (let x = x1; x <= x0; x += 4) for (const sd of [-1, 1]) {
      cyl.push({ p: [x, Y + 0.0, pz + sd * 1.4], s: [0.28, 2.2, 0.28], c: '#6B4A33' });
      box.push(P(x, Y + 0.78, pz + sd * 1.45, 0.12, 0.9, 0.12, '#7A5C3E'));
    }
    box.push(P((x0 + x1) / 2, Y + 1.62, pz - 1.45, x0 - x1, 0.08, 0.1, '#7A5C3E'), P((x0 + x1) / 2, Y + 1.62, pz + 1.45, x0 - x1, 0.08, 0.1, '#7A5C3E'));
    box.push(P(x1 - 2, Y + 0.6, pz, 4, 0.18, 7, '#9C7A55'));                                              // 码头尽头的平台
    for (const sd of [-1, 1]) { cyl.push({ p: [x1 - 3.5, Y + 2.0, pz + sd * 3], s: [0.14, 2.8, 0.14], c: '#3B2A22' }); sph.push({ p: [x1 - 3.5, Y + 3.5, pz + sd * 3], s: [0.5, 0.6, 0.5], c: '#C8302A' }); }
    // 沙滩伞 + 躺椅
    for (let i = 0; i < 7; i++) {
      const ux = COAST.x - 6 - rnd() * 4, uz = COAST.z0 + 14 + i * ((COAST.z1 - COAST.z0 - 28) / 7) + rnd() * 2;
      if (Math.abs(uz - pz) < 6) continue;
      cyl.push({ p: [ux, Y + 1.3, uz], s: [0.08, 2.6, 0.08], c: '#E8E4DC' });
      sph.push({ p: [ux, Y + 2.5, uz], s: [3.2, 0.7, 3.2], c: i % 2 ? '#F2EFE8' : '#D93025' });
      for (const sd of [-1, 1]) {
        box.push(P(ux + 0.6, Y + 0.25, uz + sd * 1.1, 1.9, 0.12, 0.7, '#E8DCC8'));
        box.push(P(ux - 0.25, Y + 0.3, uz + sd * 1.1, 0.5, 0.5, 0.7, '#E8DCC8', [0, 0, 0.9]));
      }
    }
    return { box, sph, cyl };
  }, []);

  // 帆船：在海上慢慢来回
  const boats = useMemo(() => Array.from({ length: 4 }, (_, i) => {
    const g = new THREE.Group();
    const hull = new THREE.Mesh(GEO.box, new THREE.MeshStandardMaterial({ color: i % 2 ? '#F2EFE8' : '#1B3D6E', roughness: 0.6 }));
    hull.scale.set(7, 1.2, 2.2); hull.position.y = 0.4; g.add(hull);
    const mast = new THREE.Mesh(GEO.cyl, new THREE.MeshStandardMaterial({ color: '#E8E4DC' }));
    mast.scale.set(0.15, 9, 0.15); mast.position.set(0.3, 5, 0); g.add(mast);
    const sail = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(3.6, 0), new THREE.Vector2(0, 8)])), new THREE.MeshStandardMaterial({ color: '#FFFFFF', side: THREE.DoubleSide, roughness: 0.9 }));
    sail.position.set(0.4, 1.2, 0); sail.rotation.y = Math.PI / 2; g.add(sail);
    g.position.set(COAST.sea - 60 - i * 45, Y + 0.05, -60 + i * 55);
    return { g, phase: i * 1.7, baseZ: -60 + i * 55 };
  }), []);
  const foam = useRef<THREE.Mesh>(null);
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    const m = mats.sea.map; if (m) { m.offset.x += dt * 0.006; m.offset.y += dt * 0.003; }
    if (foam.current) { foam.current.position.x = COAST.sea + 1.2 + Math.sin(t * 0.6) * 1.2; mats.foam.opacity = 0.45 + Math.sin(t * 0.6) * 0.2; }
    for (const b of boats) { b.g.position.z = b.baseZ + Math.sin(t * 0.05 + b.phase) * 40; b.g.rotation.z = Math.sin(t * 0.8 + b.phase) * 0.04; b.g.rotation.y = Math.cos(t * 0.05 + b.phase) > 0 ? 0 : Math.PI; }
  });
  const len = COAST.z1 - COAST.z0;
  return (
    <group>
      {/* 沙滩 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(COAST.x + COAST.sea) / 2 - 2, Y + 0.005, (COAST.z0 + COAST.z1) / 2]} material={mats.sand} receiveShadow raycast={() => null}>
        <planeGeometry args={[COAST.x - COAST.sea + 8, len]} />
      </mesh>
      {/* 海：一直延伸到天边 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[COAST.sea - 300, Y + 0.03, 0]} material={mats.sea} receiveShadow raycast={() => null}>
        <planeGeometry args={[600, 1000]} />
      </mesh>
      {/* 浅滩的白色浪花线：一进一退 */}
      <mesh ref={foam} rotation={[-Math.PI / 2, 0, 0]} position={[COAST.sea + 1.2, Y + 0.05, (COAST.z0 + COAST.z1) / 2]} material={mats.foam} raycast={() => null}>
        <planeGeometry args={[1.4, len + 200]} />
      </mesh>
      <Batch prims={scene.box} geometry={GEO.box} material={mats.std} />
      <Batch prims={scene.cyl} geometry={GEO.cyl} material={mats.std} />
      <Batch prims={scene.sph} geometry={GEO.sph} material={mats.std} />
      {boats.map((b, i) => <primitive key={i} object={b.g} />)}
    </group>
  );
}
