// 度假村的一栋建筑（粉墙黛瓦）：石台基、木柱回廊、白墙花窗、额枋、歇山式灰瓦屋顶（飞檐翘角）。
// 整区看：屋顶盖着；滑鼠移上去屋顶升起变透明可以偷看；点进去屋顶掀开、前面和右边的墙打开（剖面）。
// 云栖馆（机房）是半埋在山坡里的现代建筑：石墙 + 草屋顶；观云台是露天茶园：只有矮栏杆。
import { useMemo } from 'react';
import * as THREE from 'three';
import { D, SLAB, W } from './constants';
import { Batch } from './Batch';
import { GEO } from './shared';
import type { Prim } from './layout';
import { photoTexture } from './textures';

export type ShellMode = 'closed' | 'cut' | 'hidden';
export type ShellKind = 'hall' | 'garden' | 'earth';

const WALL_TOP = 3.1;
const COL_H = 3.45;

// ---------- 贴图（canvas 画，不用下载） ----------
let latticeTex: THREE.CanvasTexture | null = null;
function lattice() {
  if (latticeTex) return latticeTex;
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const g = c.getContext('2d') as CanvasRenderingContext2D;
  g.fillStyle = '#F4F1EA'; g.fillRect(0, 0, 512, 256);                   // 白墙
  g.fillStyle = '#8E8A82'; g.fillRect(0, 226, 512, 30);                  // 墙脚石
  // 两扇花窗（一格 = 3 公尺 = 256px）
  for (const x0 of [40, 296]) {
    g.fillStyle = '#4A3326'; g.fillRect(x0, 40, 176, 150);
    g.fillStyle = '#E9DCC0'; g.fillRect(x0 + 8, 48, 160, 134);            // 窗纸透出的暖光
    g.strokeStyle = '#4A3326'; g.lineWidth = 5;
    for (let i = 1; i < 6; i++) { g.beginPath(); g.moveTo(x0 + 8 + i * 27, 48); g.lineTo(x0 + 8 + i * 27, 182); g.stroke(); }
    for (let j = 1; j < 5; j++) { g.beginPath(); g.moveTo(x0 + 8, 48 + j * 27); g.lineTo(x0 + 168, 48 + j * 27); g.stroke(); }
    g.lineWidth = 3;                                                     // 冰裂纹
    for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(x0 + 20 + k * 25, 60); g.lineTo(x0 + 35 + k * 22, 170); g.stroke(); }
  }
  latticeTex = new THREE.CanvasTexture(c);
  latticeTex.colorSpace = THREE.SRGBColorSpace; latticeTex.wrapS = THREE.RepeatWrapping; latticeTex.anisotropy = 4;
  return latticeTex;
}
let tileTex: THREE.CanvasTexture | null = null;
function tiles() {
  if (tileTex) return tileTex;
  const c = document.createElement('canvas'); c.width = 256; c.height = 256;
  const g = c.getContext('2d') as CanvasRenderingContext2D;
  g.fillStyle = '#4B5057'; g.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x += 16) {                                    // 一垄一垄的筒瓦
    const gr = g.createLinearGradient(x, 0, x + 16, 0);
    gr.addColorStop(0, '#3A3E44'); gr.addColorStop(0.5, '#646A72'); gr.addColorStop(1, '#3A3E44');
    g.fillStyle = gr; g.fillRect(x, 0, 16, 256);
  }
  g.fillStyle = 'rgba(30,32,36,0.35)';
  for (let y = 0; y < 256; y += 22) g.fillRect(0, y, 256, 3);
  tileTex = new THREE.CanvasTexture(c);
  tileTex.colorSpace = THREE.SRGBColorSpace; tileTex.wrapS = tileTex.wrapT = THREE.RepeatWrapping; tileTex.repeat.set(10, 3);
  return tileTex;
}

export function makeShellMats() {
  // Krea 生成的真实材质：白墙 + 冰裂纹花窗（一扇 3 公尺）、灰色筒瓦
  const wallH = new THREE.MeshStandardMaterial({ map: photoTexture('lattice', (W + 0.3) / 3.4, 1), roughness: 0.9 });
  const wallV = new THREE.MeshStandardMaterial({ map: photoTexture('lattice', (D + 0.3) / 3.4, 1), roughness: 0.9 });
  const roof = new THREE.MeshStandardMaterial({ map: photoTexture('roof', 18, 3), roughness: 0.75, metalness: 0.05, side: THREE.DoubleSide });
  void lattice; void tiles;   // 程序画的版本留着当备用
  const std = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7, metalness: 0.05 });
  const grass = new THREE.MeshStandardMaterial({ color: '#7FA86A', roughness: 1 });
  const all = [wallH, wallV, roof, std, grass];
  all.forEach((m) => { m.userData.base = 1; });
  return { wallH, wallV, roof, std, grass, all: all as THREE.Material[] };
}
export type ShellMats = ReturnType<typeof makeShellMats>;

// 方形台体（四角锥台），用 4 边的圆柱体转 45° 做；bottom/top 是长宽
function frustum(bx: number, bz: number, tx: number, tz: number, h: number) {
  const g = new THREE.CylinderGeometry(Math.SQRT1_2, Math.SQRT1_2, h, 4, 1, false);
  g.rotateY(Math.PI / 4);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const top = p.getY(i) > 0;
    p.setX(i, p.getX(i) * (top ? tx : bx));
    p.setZ(i, p.getZ(i) * (top ? tz : bz));
  }
  g.computeVertexNormals();
  return g;
}

type Side = 'front' | 'back' | 'left' | 'right';
const P = (x: number, y: number, z: number, sx: number, sy: number, sz: number, c: string, r?: [number, number, number]): Prim => ({ p: [x, y + sy / 2, z], s: [sx, sy, sz], c, r });

export function Pavilion({ kind, mode, mats, roofLift }: { kind: ShellKind; mode: ShellMode; mats: ShellMats; roofLift: number }) {
  const parts = useMemo(() => {
    const bySide: Record<Side, { box: Prim[]; wall: Prim[] }> = { front: { box: [], wall: [] }, back: { box: [], wall: [] }, left: { box: [], wall: [] }, right: { box: [], wall: [] } };
    const base: Prim[] = [];
    const hw = W / 2, hd = D / 2;
    // 台基（灰石）+ 正面台阶
    base.push(P(0, -SLAB - 0.55, 0, W + 3.4, 0.55, D + 3.4, '#A8A397'));
    base.push(P(0, -SLAB - 0.02, 0, W + 3.2, 0.04, D + 3.2, '#BDB7AA'));
    for (let i = 0; i < 3; i++) base.push(P(0, -SLAB - 0.55, hd + 1.7 + 0.45 + i * 0.45, 8, 0.55 - i * 0.18, 0.45, '#B3AD9F'));
    if (kind === 'garden') {
      // 观云台：石栏杆
      for (const side of ['front', 'back', 'left', 'right'] as Side[]) {
        const h = side === 'front' || side === 'back';
        const len = h ? W + 3 : D + 3;
        const o = (h ? hd : hw) + 1.5;
        const sg = side === 'front' || side === 'right' ? 1 : -1;
        const at = (u: number, y: number, sy: number, t: number, l: number, c: string) => h ? P(u, y, sg * o, l, sy, t, c) : P(sg * o, y, u, t, sy, l, c);
        bySide[side].box.push(at(0, 0.75, 0.1, 0.22, len, '#C9C3B6'));
        for (let u = -len / 2; u <= len / 2 + 0.01; u += 1.5) bySide[side].box.push(at(u, -SLAB, 0.85 + SLAB, 0.18, 0.18, '#B8B1A3'));
      }
      return { bySide, base, roof: null as null | { geo: THREE.BufferGeometry; y: number }[], trim: [] as Prim[] };
    }
    for (const side of ['front', 'back', 'left', 'right'] as Side[]) {
      const h = side === 'front' || side === 'back';
      const len = h ? W + 0.3 : D + 0.3;
      const sg = side === 'front' || side === 'right' ? 1 : -1;
      const wallO = (h ? hd : hw) + 0.15, colO = (h ? hd : hw) + 1.4;
      const at = (u: number, o: number, y: number, sy: number, t: number, l: number, c: string) => h ? P(u, y, sg * o, l, sy, t, c) : P(sg * o, y, u, t, sy, l, c);
      if (kind === 'earth') {
        bySide[side].box.push(at(0, wallO, -SLAB, WALL_TOP + SLAB, 0.4, len + 0.4, '#8F8B82'));   // 石墙
        if (side === 'front') for (let u = -len / 2 + 3; u < len / 2 - 2; u += 4) bySide[side].box.push(at(u, wallO + 0.21, 1.0, 1.4, 0.02, 2.4, '#3E4A55'));
        continue;
      }
      bySide[side].wall.push(at(0, wallO, -SLAB, WALL_TOP + SLAB, 0.24, len, '#FFFFFF'));
      // 回廊木柱（暗红褐）+ 柱础
      const colLen = (h ? W : D) + 2.8;
      for (let u = -colLen / 2; u <= colLen / 2 + 0.01; u += colLen / Math.round(colLen / 3.2)) {
        bySide[side].box.push(at(u, colO, -SLAB, 0.25, 0.5, 0.5, '#9C978C'));
        bySide[side].box.push({ p: h ? [u, (COL_H - SLAB) / 2 - SLAB + 0.25, sg * colO] : [sg * colO, (COL_H - SLAB) / 2 - SLAB + 0.25, u], s: [0.3, COL_H - 0.25, 0.3], c: '#6E3328' });
      }
      // 额枋（梁）+ 彩画一条
      bySide[side].box.push(at(0, colO, COL_H - 0.1, 0.4, 0.3, colLen + 0.3, '#6E3328'));
      bySide[side].box.push(at(0, colO + 0.16 * 1, COL_H + 0.02, 0.12, 0.02, colLen, '#2E6E6A'));
      bySide[side].box.push(at(0, (wallO + colO) / 2, WALL_TOP, 0.12, colO - wallO + 0.3, len, '#5A3A28'));   // 回廊顶板
    }
    if (kind === 'earth') {
      return { bySide, base, roof: null, trim: [P(0, WALL_TOP, 0, W + 1.2, 0.35, D + 1.2, '#8F8B82')] as Prim[] };
    }
    // 歇山屋顶：檐口（略外翻）+ 屋面 + 正脊 + 鸱吻 + 四角飞檐
    const ex = W + 6.4, ez = D + 6.4;
    const roof = [
      { geo: frustum(ex + 0.8, ez + 0.8, ex - 0.6, ez - 0.6, 0.45), y: COL_H + 0.45 },
      { geo: frustum(ex - 0.6, ez - 0.6, W * 0.42, 1.2, 3.6), y: COL_H + 0.67 + 1.8 }
    ];
    const ry = COL_H + 0.67 + 3.6;
    const trim: Prim[] = [
      P(0, ry - 0.1, 0, W * 0.42 + 0.6, 0.55, 0.7, '#2F3338'),
      P(W * 0.21 + 0.4, ry, 0, 0.5, 1.1, 0.5, '#2F3338', [0, 0, -0.35]),
      P(-W * 0.21 - 0.4, ry, 0, 0.5, 1.1, 0.5, '#2F3338', [0, 0, 0.35])
    ];
    for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const a = Math.atan2(sz, sx);
      trim.push({ p: [sx * (ex / 2 + 0.2), COL_H + 0.75, sz * (ez / 2 + 0.2)], s: [1.8, 0.22, 0.4], c: '#2F3338', r: [0, -a, 0.42] });
    }
    return { bySide, base, roof, trim };
  }, [kind]);

  const shownSides: Side[] = mode === 'closed' ? ['front', 'back', 'left', 'right'] : mode === 'cut' ? ['back', 'left'] : [];
  const box = useMemo(() => [...parts.base, ...shownSides.flatMap((s) => parts.bySide[s].box)], [parts, mode]); // eslint-disable-line react-hooks/exhaustive-deps
  if (mode === 'hidden') return null;
  return (
    <group>
      <Batch prims={box} geometry={GEO.box} material={mats.std} />
      {shownSides.flatMap((s) => parts.bySide[s].wall.map((w, i) => (
        <mesh key={s + i} geometry={GEO.box} position={w.p} scale={w.s} material={s === 'front' || s === 'back' ? mats.wallH : mats.wallV} castShadow receiveShadow raycast={() => null} />
      )))}
      {/* 屋顶：掀开时往上飞走 */}
      <group position={[0, roofLift, 0]} visible={roofLift < 30}>
        {parts.roof?.map((r, i) => <mesh key={i} geometry={r.geo} position={[0, r.y, 0]} material={mats.roof} castShadow raycast={() => null} />)}
        {kind === 'earth' && <mesh geometry={GEO.box} position={[0, WALL_TOP + 0.4, 0]} scale={[W + 1, 0.1, D + 1]} material={mats.grass} raycast={() => null} />}
        <Batch prims={parts.trim} geometry={GEO.box} material={mats.std} />
      </group>
    </group>
  );
}
