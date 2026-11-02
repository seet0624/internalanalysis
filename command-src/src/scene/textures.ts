// 地板贴图：用 canvas 当场画（木地板、石材、地毯、架高地板），不用下载图片，国内打开也快。
import * as THREE from 'three';
import grassUrl from '../vendor/ez-tree/assets/grass.jpg';

export type Surface = 'wood' | 'stone' | 'carpet' | 'raised' | 'grass' | 'concrete';

const rand = (seed: number) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

function canvas(size: number, draw: (g: CanvasRenderingContext2D, s: number) => void) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  if (g) draw(g, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

const base: Partial<Record<Surface, THREE.Texture>> = {};
const clones: Partial<Record<Surface, THREE.Texture[]>> = {};

// Krea 生成的真实材质（hq/textures/*.jpg，每张约 50 KB，放在自己的网站上，国内打开快）
const PHOTO: Partial<Record<Surface, string>> = { wood: 'floor', stone: 'marble', carpet: 'carpet' };
const loader = new THREE.TextureLoader();
export const TEX_ROOT = '../hq/textures/';

function make(kind: Surface): THREE.Texture {
  const photo = PHOTO[kind];
  if (photo) {
    // 图片载入后，所有复制出去的贴图（共用同一张图）都要通知更新
    const t = loader.load(TEX_ROOT + photo + '.jpg', () => { t.needsUpdate = true; clones[kind]?.forEach((c) => { c.needsUpdate = true; }); });
    t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
    return t;
  }
  const r = rand(kind.length * 977 + 13);
  switch (kind) {
    case 'wood': return canvas(512, (g, s) => {       // 橡木长条地板
      const rows = 8, h = s / rows;
      for (let i = 0; i < rows; i++) {
        let x = -r() * 200;
        while (x < s) {
          const w = 160 + r() * 200, l = 150 + r() * 40;
          g.fillStyle = `hsl(32 ${30 + r() * 12}% ${l / 4}%)`;
          g.fillRect(x, i * h, w, h);
          for (let k = 0; k < 14; k++) {             // 木纹
            g.strokeStyle = `rgba(60,38,20,${0.05 + r() * 0.08})`;
            g.beginPath(); const y = i * h + r() * h; g.moveTo(x, y); g.bezierCurveTo(x + w / 3, y + r() * 6 - 3, x + w * 0.66, y + r() * 6 - 3, x + w, y); g.stroke();
          }
          g.fillStyle = 'rgba(40,25,12,.35)'; g.fillRect(x, i * h, 2, h);
          x += w;
        }
        g.fillStyle = 'rgba(40,25,12,.4)'; g.fillRect(0, i * h, s, 2);
      }
    });
    case 'stone': return canvas(512, (g, s) => {      // 米色大理石方砖
      const n = 4, c = s / n;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const l = 82 + r() * 6;
        g.fillStyle = `hsl(38 18% ${l}%)`; g.fillRect(i * c, j * c, c, c);
        for (let k = 0; k < 5; k++) {
          g.strokeStyle = `rgba(120,105,85,${0.08 + r() * 0.1})`; g.lineWidth = 1 + r();
          g.beginPath(); g.moveTo(i * c + r() * c, j * c); g.quadraticCurveTo(i * c + r() * c, j * c + r() * c, i * c + r() * c, j * c + c); g.stroke();
        }
      }
      g.strokeStyle = 'rgba(90,80,65,.35)'; g.lineWidth = 2;
      for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * c, 0); g.lineTo(i * c, s); g.moveTo(0, i * c); g.lineTo(s, i * c); g.stroke(); }
    });
    case 'carpet': return canvas(256, (g, s) => {     // 方块地毯
      const n = 4, c = s / n;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        g.fillStyle = `hsl(28 10% ${30 + r() * 5}%)`; g.fillRect(i * c, j * c, c, c);
        for (let k = 0; k < 220; k++) { g.fillStyle = `rgba(255,240,220,${r() * 0.05})`; g.fillRect(i * c + r() * c, j * c + r() * c, 1.5, 1.5); }
      }
    });
    case 'raised': return canvas(256, (g, s) => {     // 机房架高地板
      const n = 4, c = s / n;
      g.fillStyle = '#5A5650'; g.fillRect(0, 0, s, s);
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        g.fillStyle = `hsl(35 5% ${40 + r() * 6}%)`; g.fillRect(i * c + 2, j * c + 2, c - 4, c - 4);
        if ((i + j) % 3 === 0) { g.fillStyle = 'rgba(20,18,16,.35)'; for (let a = 0; a < 6; a++) for (let b = 0; b < 6; b++) g.fillRect(i * c + 8 + a * 8, j * c + 8 + b * 8, 4, 4); }
      }
    });
    case 'concrete': return canvas(256, (g, s) => {
      g.fillStyle = '#8A8174'; g.fillRect(0, 0, s, s);
      for (let k = 0; k < 3000; k++) { g.fillStyle = `rgba(${r() > 0.5 ? '255,250,240' : '30,25,20'},${r() * 0.06})`; g.fillRect(r() * s, r() * s, 2, 2); }
    });
    case 'grass': {
      // 图片载入完，所有共用这张图的副本都要重新上传
      const t = new THREE.TextureLoader().load(grassUrl, () => { for (const c of clones.grass ?? []) c.needsUpdate = true; });
      t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
      return t;
    }
  }
}

// 每块地板自己的重复次数（共用同一张图）
export function surfaceTexture(kind: Surface, w: number, d: number, tile = 4) {
  const t = (base[kind] ||= make(kind)).clone();
  t.needsUpdate = true;
  t.repeat.set(w / tile, d / tile);
  (clones[kind] ||= []).push(t);
  return t;
}

// 其他用途的照片材质（屋瓦、花窗墙、胡桃木、石板、湖水、地毯、山水画）：同一张图共用，各自设定重复次数
const photos: Record<string, { base: THREE.Texture; copies: THREE.Texture[] }> = {};
export function photoTexture(name: string, rx = 1, ry = 1, wrap = true) {
  let e = photos[name];
  if (!e) {
    const base = loader.load(TEX_ROOT + name + '.jpg', () => { e.copies.forEach((c) => { c.needsUpdate = true; }); });
    base.colorSpace = THREE.SRGBColorSpace; base.anisotropy = 8;
    e = photos[name] = { base, copies: [] };
  }
  const t = e.base.clone();
  if (wrap) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.needsUpdate = true;
  e.copies.push(t);
  return t;
}
