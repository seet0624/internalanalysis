// 大楼外观（每层一圈）：石材窗槛墙、落地窗、直条石柱、窗框。像一栋真的旅馆式办公楼，不是一片片飘着的楼板。
// 整栋看：四面都有外墙（窗户反射天空，有几扇亮着灯）；看单层：前面、右边打开（剖面），后面、左边留着当墙。
import { useMemo } from 'react';
import * as THREE from 'three';
import { D, SLAB, W } from './constants';
import { Batch } from './Batch';
import { GEO } from './shared';
import type { Prim } from './layout';

export const STOREY = 3.6;                 // 一层楼高（楼板到楼板）
const SILL = 0.75;                         // 窗台高度
const TOP = STOREY - SLAB;                 // 这层的窗户顶（上一层楼板底）

// 窗户贴图：16 格，每格天空反射的渐层；有的亮灯、有的拉了百叶窗（固定种子，每次一样）
let winTex: THREE.CanvasTexture | null = null;
function windowTexture() {
  if (winTex) return winTex;
  const c = document.createElement('canvas'); c.width = 1024; c.height = 160;
  const g = c.getContext('2d') as CanvasRenderingContext2D;
  let seed = 11;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const pw = c.width / 16;
  for (let i = 0; i < 16; i++) {
    const x = i * pw;
    const sky = g.createLinearGradient(0, 0, 0, c.height);
    sky.addColorStop(0, '#DCE8F4'); sky.addColorStop(0.55, '#9FB7CF'); sky.addColorStop(1, '#7E97B0');
    g.fillStyle = sky; g.fillRect(x, 0, pw, c.height);
    const r = rnd();
    if (r > 0.78) {                         // 亮灯的房间
      g.fillStyle = 'rgba(255,236,196,0.75)'; g.fillRect(x + 3, 10, pw - 6, c.height - 14);
    } else if (r > 0.55) {                  // 百叶窗
      g.fillStyle = 'rgba(236,232,224,0.85)'; g.fillRect(x + 3, 4, pw - 6, c.height * (0.3 + rnd() * 0.5));
      g.fillStyle = 'rgba(160,150,135,0.35)';
      for (let y = 8; y < c.height * 0.8; y += 7) g.fillRect(x + 3, y, pw - 6, 1);
    }
    // 斜斜的反光
    const hl = g.createLinearGradient(x, 0, x + pw, c.height);
    hl.addColorStop(0, 'rgba(255,255,255,0)'); hl.addColorStop(0.45, 'rgba(255,255,255,0.28)'); hl.addColorStop(0.55, 'rgba(255,255,255,0)');
    g.fillStyle = hl; g.fillRect(x, 0, pw, c.height);
  }
  winTex = new THREE.CanvasTexture(c);
  winTex.colorSpace = THREE.SRGBColorSpace;
  winTex.wrapS = THREE.RepeatWrapping;
  winTex.anisotropy = 4;
  return winTex;
}

export type FacadeMode = 'closed' | 'cut' | 'hidden';
type Side = 'front' | 'back' | 'left' | 'right';

export function makeFacadeMats() {
  const stone = new THREE.MeshStandardMaterial({ color: '#ECE6DC', roughness: 0.8, metalness: 0.02 });
  const frame = new THREE.MeshStandardMaterial({ color: '#7D858D', roughness: 0.4, metalness: 0.5 });
  // 贴图一格 1.5 公尺（16 格 = 24 公尺）；长边、短边各一份，重复次数不同
  const glassMat = (len: number) => {
    const t = windowTexture().clone(); t.needsUpdate = true; t.repeat.set(len / 24, 1);
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.15, metalness: 0.35, transparent: true, opacity: 0.94 });
  };
  const outerH = glassMat(W + 0.6), outerV = glassMat(D + 0.6);
  const inner = new THREE.MeshStandardMaterial({ color: '#DCE9F5', roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.18, depthWrite: false });
  [stone, frame, outerH, outerV, inner].forEach((m) => { m.userData.base = m.opacity; });
  return { stone, frame, outerH, outerV, inner, all: [stone, frame, outerH, outerV, inner] as THREE.Material[] };
}
export type FacadeMats = ReturnType<typeof makeFacadeMats>;

// 每一面：窗槛墙（石材）、玻璃、直条石柱、窗框
function sideParts(side: Side, kind: 'office' | 'lobby' | 'roof') {
  const horiz = side === 'front' || side === 'back';
  const len = horiz ? W + 0.6 : D + 0.6;
  const off = (horiz ? D : W) / 2 + 0.3;
  const sgn = side === 'front' || side === 'right' ? 1 : -1;
  const at = (u: number, y: number, h: number, t: number, along: number): Prim => horiz
    ? { p: [u, y + h / 2, sgn * (off + t / 2 - 0.15)], s: [along, h, t], c: '' }
    : { p: [sgn * (off + t / 2 - 0.15), y + h / 2, u], s: [t, h, along], c: '' };
  const stone: Prim[] = [], frame: Prim[] = [], glass: Prim[] = [];
  if (kind === 'roof') {
    stone.push(at(0, -SLAB, 1.1 + SLAB, 0.3, len));                       // 女儿墙
    frame.push(at(0, 1.1, 0.06, 0.34, len));
    return { stone, frame, glass, len };
  }
  const sill = kind === 'lobby' ? 0.12 : SILL;
  stone.push(at(0, -SLAB, sill + SLAB, 0.3, len));                         // 窗槛墙 / 底座
  if (kind === 'lobby' && side === 'front') {
    // 1F 正门（x = -8，宽 6.4）不要被玻璃挡住
    const a = -len / 2, b = len / 2, e0 = -8 - 3.5, e1 = -8 + 3.5;
    glass.push(at((a + e0) / 2, sill, TOP - sill, 0.06, e0 - a), at((e1 + b) / 2, sill, TOP - sill, 0.06, b - e1));
    stone.push(at(-8, 3.0, TOP - 3.0, 0.3, 7.0));
  } else glass.push(at(0, sill, TOP - sill, 0.06, len));
  frame.push(at(0, sill, 0.06, 0.12, len));
  frame.push(at(0, TOP - 0.06, 0.06, 0.12, len));
  // 直条石柱每 6 公尺、窗框每 1.5 公尺
  for (let u = -len / 2; u <= len / 2 + 0.01; u += 1.5) {
    const pil = Math.abs(((u + len / 2) / 6) % 1) < 0.01 || Math.abs(u - len / 2) < 0.01;
    const door = kind === 'lobby' && side === 'front' && u > -11.6 && u < -4.4;
    if (door) continue;
    if (pil) stone.push(at(u, -SLAB, STOREY, 0.5, 0.55));
    else frame.push(at(u, sill, TOP - sill, 0.1, 0.06));
  }
  return { stone, frame, glass, len };
}

export function Facade({ level, mode, mats }: { level: number; mode: FacadeMode; mats: FacadeMats }) {
  const kind: 'office' | 'lobby' | 'roof' = level === 5 ? 'roof' : level === 0 ? 'lobby' : 'office';
  const parts = useMemo(() => {
    const all = (['front', 'back', 'left', 'right'] as Side[]).map((s) => ({ side: s, ...sideParts(s, kind) }));
    return all;
  }, [kind]);
  // 看单层：前、右切开，后、左留着（玻璃变透明，从里面看出去）
  const { shown, stone, frame } = useMemo(() => {
    const shown = parts.filter((p) => mode === 'closed' || p.side === 'back' || p.side === 'left');
    return { shown, stone: shown.flatMap((p) => p.stone).map((x) => ({ ...x, c: '#ECE6DC' })), frame: shown.flatMap((p) => p.frame).map((x) => ({ ...x, c: '#7D858D' })) };
  }, [parts, mode]);
  if (mode === 'hidden' || level < 0) return null;
  return (
    <group>
      <Batch prims={stone} geometry={GEO.box} material={mats.stone} />
      <Batch prims={frame} geometry={GEO.box} material={mats.frame} />
      {shown.flatMap((p) => p.glass.map((g, i) => (
        <mesh key={p.side + i} geometry={GEO.box} position={g.p} scale={g.s} raycast={() => null}
          material={mode !== 'closed' ? mats.inner : p.side === 'front' || p.side === 'back' ? mats.outerH : mats.outerV} />
      )))}
    </group>
  );
}
