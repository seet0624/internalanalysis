// 3D 公司：按真实办公室平面图盖一层楼，按 hq/company.js 的名单摆员工，员工会自己走去茶水间、洗手间、会议室。
// mountOffice(容器, 名单, { onSelect, stats, companyName }) → { select, reset, zoom, setMode, status, away, setCompanyName }
// id：'boss'、'dept/<部门>'、'team/<小组>'、'agent/<小组或部门>/<序号>'、'fac/<设施>'、'room/<pantry|wc|lobby|lounge>'

import * as THREE from 'three';
import { OrbitControls } from '../vendor/three/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from '../vendor/three/CSS2DRenderer.js';
import { RoomEnvironment } from '../vendor/three/RoomEnvironment.js';
import { RoundedBoxGeometry } from '../vendor/three/RoundedBoxGeometry.js';
import { mergeGeometries } from '../vendor/three/BufferGeometryUtils.js';

// ---------- 楼层尺寸（1 单位约 1 公尺） ----------
const BW = 48, BD = 32;                 // x: -24..24，z: -16..16（z 越大越靠镜头）
const WT = 0.14;                         // 墙厚
const H_TALL = 2.7, H_INT = 1.3, H_LOW = 0.35;
const CELL = 0.5, GX = BW / CELL, GZ = BD / CELL;
const BOSS_COLOR = '#C99A3B';
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const rand = (a, b) => a + Math.random() * (b - a);

// ---------- 员工的需求（0–100，坐着工作每游戏分钟下降 decay） ----------
const NEEDS = [
  { key: 'energy', label: '精力', decay: 0.35 },
  { key: 'hunger', label: '饱足', decay: 0.25 },
  { key: 'bladder', label: '如厕', decay: 0.45 },
  { key: 'social', label: '社交', decay: 0.3 },
  { key: 'fun', label: '乐趣', decay: 0.3 }
];
// 每种去处每游戏分钟补哪些需求、头上冒什么
const ACT = {
  coffee: { fix: { energy: 14 }, icon: '☕', need: 'energy' },
  water: { fix: { energy: 5, bladder: -4 }, icon: '💧', need: 'energy' },
  pantry: { fix: { hunger: 12, social: 3 }, icon: '🍪', need: 'hunger' },
  wc: { fix: { bladder: 30 }, icon: '🚻', need: 'bladder' },
  wash: { fix: { bladder: 10 }, icon: '🧼', need: 'bladder' },
  meeting: { fix: { social: 7 }, icon: '📋', need: 'social' },
  visit: { fix: { social: 10 }, icon: '💬', need: 'social' },
  lobby: { fix: { social: 5 }, icon: '👋', need: 'social' },
  lounge: { fix: { fun: 12, social: 3, energy: 3 }, icon: '🎮', need: 'fun' },
  printer: { fix: {}, icon: '🖨️' }, mail: { fix: {}, icon: '📦' }, files: { fix: {}, icon: '🗂️' }
};
const FOR_NEED = { energy: ['coffee', 'coffee', 'water'], hunger: ['pantry'], bladder: ['wc', 'wc', 'wash'], social: ['visit', 'meeting', 'lobby', 'visit'], fun: ['lounge'] };
const ERRANDS = ['printer', 'mail', 'files', 'visit'];
const CHATS = ['这单要问下单者吗？', '子时这格要标红', '帮我看一下繁体', '家人订单排一起', '这个名字撞音了', '加急单先处理', '新生儿单放前面', 'OK，我来改', '明白！', '午饭吃什么？', '咖啡续杯吗？', '今天单子好多'];

// ---------- 平面图 ----------
// 房间：门开在哪一边（n 北 / s 南 / e 东 / w 西）、门中心坐标
const ROOMS = [
  { id: 'boss', name: '老板办公室', x0: -24, z0: -16, x1: -13, z1: -7, floor: 'carpetWarm', doors: [{ side: 's', at: -15.5 }], pick: 'boss', glassFront: true },
  { id: 'meeting', name: '会议室', x0: -13, z0: -16, x1: -3, z1: -7, floor: 'carpet', doors: [{ side: 's', at: -5 }], pick: 'fac/meeting', glass: true },
  { id: 'studio', name: '设计工作室', x0: -3, z0: -16, x1: 7, z1: -7, floor: 'wood', doors: [{ side: 's', at: 2 }], pick: 'fac/studio' },
  { id: 'media', name: '影音室', x0: 7, z0: -16, x1: 15, z1: -7, floor: 'dark', doors: [{ side: 's', at: 11 }], pick: 'fac/media' },
  { id: 'pantry', name: '茶水间', x0: 15, z0: -16, x1: 24, z1: -7, floor: 'tile', doors: [{ side: 's', at: 19.5, w: 3 }], pick: 'room/pantry' },
  { id: 'wcm', name: '洗手间 · 男', x0: -24, z0: -5, x1: -20, z1: 3, floor: 'tile', doors: [{ side: 'n', at: -22 }], pick: 'room/wc' },
  { id: 'wcf', name: '洗手间 · 女', x0: -20, z0: -5, x1: -16, z1: 3, floor: 'tile', doors: [{ side: 'n', at: -18 }], pick: 'room/wc' },
  { id: 'files', name: '档案室', x0: -24, z0: 3, x1: -16, z1: 8, floor: 'concrete', doors: [{ side: 'e', at: 5.5 }], pick: 'fac/files' },
  { id: 'server', name: '机房', x0: -24, z0: 8, x1: -16, z1: 12, floor: 'concrete', doors: [{ side: 'e', at: 10 }], pick: 'fac/server' },
  { id: 'mail', name: '收发室', x0: -24, z0: 12, x1: -16, z1: 16, floor: 'concrete', doors: [{ side: 'e', at: 14 }], pick: 'fac/mail' }
];
// 东边部门办公室：A 列门朝西开向主走廊，B 列门朝西开向内走廊
const DEPT_SLOTS = [
  { x0: 12, x1: 17.5, z0: -5, z1: 0 }, { x0: 19, x1: 24, z0: -5, z1: 0 },
  { x0: 12, x1: 17.5, z0: 0, z1: 5 }, { x0: 19, x1: 24, z0: 0, z1: 5 },
  { x0: 12, x1: 17.5, z0: 5, z1: 10 }, { x0: 19, x1: 24, z0: 5, z1: 10 }
];
// 开放区域（没有墙）
const OPEN = [
  { id: 'cs', name: '客服部', x0: -14, z0: -5, x1: 10, z1: 8, floor: 'wood', pick: 'dept/cs' },
  { id: 'lobby', name: '前台大厅', x0: -14, z0: 10, x1: 10, z1: 16, floor: 'stone', pick: 'room/lobby' },
  { id: 'lounge', name: '休息区', x0: 12, z0: 10, x1: 24, z1: 16, floor: 'carpetGreen', pick: 'room/lounge' }
];
const ENTRANCE = { x0: -5, x1: -1 }; // 南边大门

// ---------- 贴图（程序画，不用外部图片） ----------
function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  return t;
}
const FLOOR_TEX = {
  wood: () => canvasTex(512, 512, (g) => {
    const tones = ['#E6D5BB', '#E1CFB3', '#EADBC3', '#DDCAAD'];
    for (let r = 0; r < 8; r++) {
      const off = (r % 2) * 128;
      for (let c = -1; c < 4; c++) {
        g.fillStyle = tones[(r * 3 + c + 8) % 4]; g.fillRect(off + c * 256, r * 64, 256, 64);
        g.strokeStyle = 'rgba(120,95,60,.18)'; g.lineWidth = 2; g.strokeRect(off + c * 256, r * 64, 256, 64);
      }
    }
  }, true),
  tile: () => canvasTex(256, 256, (g) => {
    g.fillStyle = '#F2F3F3'; g.fillRect(0, 0, 256, 256);
    g.strokeStyle = '#D8DBDC'; g.lineWidth = 3;
    for (let i = 0; i <= 256; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(256, i); g.stroke(); }
  }, true),
  stone: () => canvasTex(256, 256, (g) => {
    g.fillStyle = '#EEEAE3'; g.fillRect(0, 0, 256, 256);
    g.strokeStyle = 'rgba(150,140,125,.25)'; g.lineWidth = 2; g.strokeRect(1, 1, 254, 254);
  }, true),
  carpet: (base) => canvasTex(128, 128, (g) => {
    g.fillStyle = base; g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.05})`; g.fillRect(Math.random() * 128, Math.random() * 128, 1.5, 1.5); }
  }, true),
  concrete: () => canvasTex(128, 128, (g) => {
    g.fillStyle = '#DEDBD6'; g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(80,80,80,${Math.random() * 0.06})`; g.fillRect(Math.random() * 128, Math.random() * 128, 2, 2); }
  }, true)
};
function floorMaterial(kind, w, d) {
  let t, rep;
  if (kind === 'wood') { t = FLOOR_TEX.wood(); rep = [w / 4, d / 4]; }
  else if (kind === 'tile') { t = FLOOR_TEX.tile(); rep = [w / 1.6, d / 1.6]; }
  else if (kind === 'stone') { t = FLOOR_TEX.stone(); rep = [w / 2, d / 2]; }
  else if (kind === 'concrete') { t = FLOOR_TEX.concrete(); rep = [w / 3, d / 3]; }
  else if (kind === 'dark') { return new THREE.MeshStandardMaterial({ color: '#4A4E55', roughness: 0.9 }); }
  else { t = FLOOR_TEX.carpet({ carpet: '#D8D3CA', carpetWarm: '#E5D2B2', carpetGreen: '#CBD7C7' }[kind] || '#D8D3CA'); rep = [w / 2, d / 2]; }
  t.repeat.set(rep[0], rep[1]);
  return new THREE.MeshStandardMaterial({ map: t, roughness: kind === 'tile' ? 0.35 : 0.85 });
}

function screenTexture(kind, color) {
  return canvasTex(256, 150, (g) => {
    g.fillStyle = '#FBFBF8'; g.fillRect(0, 0, 256, 150);
    g.fillStyle = color; g.fillRect(0, 0, 256, 16);
    if (kind === 'sheet') {
      g.strokeStyle = '#D9D6CE'; g.lineWidth = 1;
      for (let y = 28; y < 150; y += 15) { g.beginPath(); g.moveTo(8, y); g.lineTo(248, y); g.stroke(); }
      for (let x = 8; x <= 248; x += 48) { g.beginPath(); g.moveTo(x, 22); g.lineTo(x, 144); g.stroke(); }
      [[1, 1], [3, 3], [5, 0], [2, 4], [6, 2]].forEach(([r, c]) => { g.fillStyle = 'rgba(217,71,60,.85)'; g.fillRect(10 + c * 48, 30 + r * 15, 44, 11); });
    } else if (kind === 'chat') {
      [[10, 26, 150, '#E6E3DC'], [96, 54, 150, color], [10, 82, 120, '#E6E3DC'], [76, 110, 170, color]].forEach(([x, y, w, f]) => { g.fillStyle = f; g.beginPath(); g.roundRect(x, y, w, 20, 8); g.fill(); });
    } else if (kind === 'calendar') {
      g.strokeStyle = '#D9D6CE';
      for (let c = 0; c < 6; c++) for (let r = 0; r < 4; r++) g.strokeRect(10 + c * 40, 26 + r * 30, 40, 30);
      [[1, 0, '#3A6EA5'], [3, 1, color], [0, 2, '#2C6A37'], [4, 3, '#B83A6E'], [2, 2, color]].forEach(([c, r, f]) => { g.fillStyle = f; g.fillRect(13 + c * 40, 30 + r * 30, 34, 10); });
    }
  });
}
function abstractArt(seed) {
  return canvasTex(256, 192, (g) => {
    const pal = [['#E8D7C3', '#0E6B66', '#F2B866', '#B83A6E'], ['#DCE6EC', '#3A6EA5', '#C99A3B', '#55544E'], ['#EFE6DA', '#C26A00', '#1F7A8C', '#6B4FA0'], ['#E4EEE6', '#2C6A37', '#F2B866', '#0E6B66']][seed % 4];
    g.fillStyle = pal[0]; g.fillRect(0, 0, 256, 192);
    g.fillStyle = pal[1]; g.beginPath(); g.arc(90, 100, 56, 0, Math.PI * 2); g.fill();
    g.fillStyle = pal[2]; g.fillRect(140, 40, 70, 90);
    g.fillStyle = pal[3]; g.fillRect(30, 150, 196, 12);
  });
}

// ---------- 材质 ----------
const mat = (color, extra) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.8, metalness: 0 }, extra));
const M = {
  slab: mat('#E2DCD1'), corridor: mat('#F2EFEA', { roughness: 0.9 }),
  wall: mat('#FBFAF7', { roughness: 0.95 }), window: mat('#CFE3EA', { roughness: 0.1, metalness: 0.1, emissive: '#BFD9E2', emissiveIntensity: 0.25 }),
  glass: new THREE.MeshStandardMaterial({ color: '#DCEEF2', roughness: 0.05, metalness: 0, transparent: true, opacity: 0.28, depthWrite: false }),
  frame: mat('#A8AEB2', { roughness: 0.4, metalness: 0.4 }),
  desk: mat('#EDE6DA', { roughness: 0.6 }), oak: mat('#C9A97E', { roughness: 0.6 }), walnut: mat('#7A5A3C', { roughness: 0.55 }),
  leg: mat('#B9BDC1', { roughness: 0.35, metalness: 0.5 }), chair: mat('#2F3439', { roughness: 0.7 }), monitor: mat('#1D2125', { roughness: 0.35 }),
  sofa: mat('#8E9E9F', { roughness: 0.95 }), sofa2: mat('#CDBBA3', { roughness: 0.95 }), cushion: mat('#E7DCCB', { roughness: 1 }),
  leaf: mat('#5E8F5B', { roughness: 0.9 }), leaf2: mat('#7BA66E', { roughness: 0.9 }), pot: mat('#D9D0C3', { roughness: 0.7 }),
  white: mat('#FFFFFF', { roughness: 0.4 }), steel: mat('#C9CED2', { roughness: 0.25, metalness: 0.7 }), counter: mat('#F6F4F0', { roughness: 0.3 }),
  cabinet: mat('#A9B4B0', { roughness: 0.6 }), dark: mat('#33373D', { roughness: 0.6 }), shelf: mat('#D8CBB5', { roughness: 0.8 }),
  green: mat('#3FAE5A', { roughness: 0.8 }), led: new THREE.MeshStandardMaterial({ color: '#2EE07A', emissive: '#2EE07A', emissiveIntensity: 1 }),
  ghost: new THREE.MeshStandardMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.35, depthWrite: false }),
  grass: mat('#C9D8B8', { roughness: 1 }), path: mat('#E9E4DB', { roughness: 1 })
};
const tintMat = (() => { const cache = {}; return (hex, amt = 0.8) => cache[hex + amt] || (cache[hex + amt] = mat(new THREE.Color(hex).lerp(new THREE.Color('#FFFFFF'), amt))); })();
const colorMat = (() => { const cache = {}; return (hex) => cache[hex] || (cache[hex] = mat(hex, { roughness: 0.6 })); })();

export function mountOffice(container, company, opts = {}) {
  const onSelect = opts.onSelect || (() => {});
  const stats = opts.stats || {};

  // ---------- 渲染器、灯光 ----------
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  container.appendChild(renderer.domElement);
  const labels = new CSS2DRenderer();
  labels.domElement.className = 'hq-labels';
  container.appendChild(labels.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  const hemi = new THREE.HemisphereLight('#FFFFFF', '#D9D2C5', 0.9);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#FFF4E2', 2.4);
  sun.position.set(-26, 46, 30);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.02; sun.shadow.radius = 3;
  Object.assign(sun.shadow.camera, { left: -34, right: 34, top: 30, bottom: -30, near: 1, far: 140 });
  scene.add(sun, sun.target);

  // ---------- 走路用的格子 ----------
  const grid = new Uint8Array(GX * GZ);
  const cellOf = (x, z) => [Math.floor((x + BW / 2) / CELL), Math.floor((z + BD / 2) / CELL)];
  const inGrid = (i, j) => i >= 0 && j >= 0 && i < GX && j < GZ;
  function blockRect(x0, z0, x1, z1, pad = 0.15) {
    const [a, b] = cellOf(Math.min(x0, x1) - pad, Math.min(z0, z1) - pad);
    const [c, d] = cellOf(Math.max(x0, x1) + pad - 1e-6, Math.max(z0, z1) + pad - 1e-6);
    for (let i = a; i <= c; i++) for (let j = b; j <= d; j++) if (inGrid(i, j)) grid[j * GX + i] = 1;
  }
  const freeAt = [];  // 座位、目的地：最后强制可以站
  const blocked = (i, j) => !inGrid(i, j) || grid[j * GX + i] === 1;

  // ---------- 静态物件：最后按材质合并，减少绘制次数 ----------
  const statics = new THREE.Group();
  const glassPanes = [];
  function add(mesh, parent) { mesh.castShadow = true; mesh.receiveShadow = true; (parent || statics).add(mesh); return mesh; }
  function box(w, h, d, m, x, y, z, parent) { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); return add(o, parent); }
  function rbox(w, h, d, m, x, y, z, parent, r = 0.05) { const o = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2, h / 2, d / 2)), m); o.position.set(x, y, z); return add(o, parent); }
  function cyl(rt, rb, h, m, x, y, z, parent, seg = 20) { const o = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m); o.position.set(x, y, z); return add(o, parent); }
  function sph(r, m, x, y, z, parent, sy = 1) { const o = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 12), m); o.position.set(x, y, z); o.scale.y = sy; return add(o, parent); }
  function group(x, z, rotY = 0) { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rotY; statics.add(g); return g; }

  // ---------- 地基、外面 ----------
  {
    const plinth = new THREE.Mesh(new RoundedBoxGeometry(BW + 10, 0.6, BD + 12, 3, 0.25), M.grass);
    plinth.position.set(0, -0.35, 1); plinth.receiveShadow = true; scene.add(plinth);
    box(BW + 0.6, 0.3, BD + 0.6, M.slab, 0, -0.14, 0);
    const corridor = new THREE.Mesh(new THREE.PlaneGeometry(BW, BD), M.corridor);
    corridor.rotation.x = -Math.PI / 2; corridor.position.y = 0.012; corridor.receiveShadow = true; scene.add(corridor);
    // 大门外的步道
    const walk = new THREE.Mesh(new THREE.PlaneGeometry(ENTRANCE.x1 - ENTRANCE.x0 + 1, 5.6), M.path);
    walk.rotation.x = -Math.PI / 2; walk.position.set((ENTRANCE.x0 + ENTRANCE.x1) / 2, -0.04, BD / 2 + 3.1); walk.receiveShadow = true; scene.add(walk);
    // 外面的树
    [[-27, 18], [-20, 19.5], [8, 19.5], [16, 18.8], [26.5, 17], [27, 4], [-27.5, 6]].forEach(([x, z], k) => {
      cyl(0.12, 0.16, 1.4, M.walnut, x, 0.7, z);
      sph(1.0 + (k % 3) * 0.2, k % 2 ? M.leaf : M.leaf2, x, 2.0, z);
    });
  }
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ opacity: 0.1 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.66; ground.receiveShadow = true; scene.add(ground);

  // ---------- 墙 ----------
  // 沿一条直线盖墙，门的位置留空
  function wallLine(x0, z0, x1, z1, h, m, gaps = []) {
    const horiz = Math.abs(z1 - z0) < 1e-6;
    const a = horiz ? Math.min(x0, x1) : Math.min(z0, z1), b = horiz ? Math.max(x0, x1) : Math.max(z0, z1);
    const cuts = gaps.map((g) => [g.at - g.w / 2, g.at + g.w / 2]).sort((p, q) => p[0] - q[0]);
    let s = a;
    const segs = [];
    cuts.forEach(([c0, c1]) => { if (c0 > s) segs.push([s, Math.min(c0, b)]); s = Math.max(s, c1); });
    if (s < b) segs.push([s, b]);
    segs.forEach(([p, q]) => {
      const len = q - p; if (len < 0.05) return;
      const mid = (p + q) / 2;
      if (m === M.glass) {
        const gx = horiz ? mid : x0, gz = horiz ? z0 : mid;
        const pane = new THREE.Mesh(new THREE.BoxGeometry(horiz ? len : 0.04, h, horiz ? 0.04 : len), M.glass);
        pane.position.set(gx, h / 2 + 0.02, gz); pane.renderOrder = 2; scene.add(pane); glassPanes.push(pane);
        box(horiz ? len : 0.08, 0.06, horiz ? 0.08 : len, M.frame, gx, h + 0.03, gz);
        box(horiz ? len : 0.08, 0.06, horiz ? 0.08 : len, M.frame, gx, 0.05, gz);
        for (let t = p; t <= q + 1e-6; t += Math.max(len / Math.ceil(len / 2.2), 0.5)) box(0.06, h, 0.06, M.frame, horiz ? t : x0, h / 2, horiz ? z0 : t);
      } else {
        box(horiz ? len : WT, h, horiz ? WT : len, m, horiz ? mid : x0, h / 2 + 0.02, horiz ? z0 : mid);
      }
      if (horiz) blockRect(p, z0 - WT / 2, q, z0 + WT / 2, 0.1); else blockRect(x0 - WT / 2, p, x0 + WT / 2, q, 0.1);
    });
  }
  const onEdge = (v, e) => Math.abs(v - e) < 1e-6;

  // 外墙：后面、左边高墙带窗；前面、右边是矮墙加玻璃
  wallLine(-BW / 2, -BD / 2, BW / 2, -BD / 2, H_TALL, M.wall);
  wallLine(-BW / 2, -BD / 2, -BW / 2, BD / 2, H_TALL, M.wall);
  for (let x = -21; x < 24; x += 4) box(2.4, 1.3, 0.03, M.window, x, 1.45, -BD / 2 + WT / 2 + 0.02);
  for (let z = -13; z < 16; z += 4) box(0.03, 1.3, 2.4, M.window, -BW / 2 + WT / 2 + 0.02, 1.45, z);
  wallLine(-BW / 2, BD / 2, BW / 2, BD / 2, H_LOW, M.wall, [{ at: (ENTRANCE.x0 + ENTRANCE.x1) / 2, w: ENTRANCE.x1 - ENTRANCE.x0 }]);
  wallLine(BW / 2, -BD / 2, BW / 2, BD / 2, H_LOW, M.wall);
  wallLine(-BW / 2, BD / 2 - 0.02, BW / 2, BD / 2 - 0.02, 1.1, M.glass, [{ at: (ENTRANCE.x0 + ENTRANCE.x1) / 2, w: ENTRANCE.x1 - ENTRANCE.x0 }]);
  wallLine(BW / 2 - 0.02, -BD / 2, BW / 2 - 0.02, BD / 2, 1.1, M.glass);

  // 房间墙：每间房在自己范围里面往内缩半个墙厚，相邻的房间各有一面墙
  function roomWalls(r) {
    const inset = WT / 2;
    const sides = {
      n: [r.x0, r.z0 + inset, r.x1, r.z0 + inset], s: [r.x0, r.z1 - inset, r.x1, r.z1 - inset],
      w: [r.x0 + inset, r.z0, r.x0 + inset, r.z1], e: [r.x1 - inset, r.z0, r.x1 - inset, r.z1]
    };
    Object.entries(sides).forEach(([side, [ax, az, bx, bz]]) => {
      if ((side === 'n' && onEdge(r.z0, -BD / 2)) || (side === 's' && onEdge(r.z1, BD / 2)) || (side === 'w' && onEdge(r.x0, -BW / 2)) || (side === 'e' && onEdge(r.x1, BW / 2))) return;
      const gaps = (r.doors || []).filter((d) => d.side === side).map((d) => ({ at: d.at, w: d.w || 1.4 }));
      const m = r.glass || (r.glassFront && side === 's') ? M.glass : M.wall;
      wallLine(ax, az, bx, bz, m === M.glass ? 1.6 : H_INT, m, gaps);
    });
  }

  // ---------- 地板（每个区域一块，点了就选那个区域） ----------
  const pickables = [];
  function floor(r, kind, pickId) {
    const w = r.x1 - r.x0, d = r.z1 - r.z0;
    const f = new THREE.Mesh(new THREE.PlaneGeometry(w, d), floorMaterial(kind, w, d));
    f.rotation.x = -Math.PI / 2; f.position.set((r.x0 + r.x1) / 2, 0.02, (r.z0 + r.z1) / 2); f.receiveShadow = true;
    scene.add(f);
    if (pickId) { f.userData.pick = pickId; pickables.push(f); }
    return f;
  }

  // ---------- 标签 ----------
  const items = new Map();  // id → { el, pos, mats, color, agent }
  function label(html, className, id, ariaLabel, focusable = true) {
    const el = document.createElement('button');
    el.type = 'button'; el.className = className; el.innerHTML = html;
    if (!focusable) el.tabIndex = -1;
    if (ariaLabel) el.setAttribute('aria-label', ariaLabel);
    el.addEventListener('pointerdown', (e) => e.stopPropagation());
    el.addEventListener('click', (e) => { e.stopPropagation(); select(id, true); });
    return new CSS2DObject(el);
  }
  function register(id, info) { items.set(id, Object.assign({ mats: [] }, info)); }
  function roomSign(r, html, id, cls = '') {
    const s = label(html, 'hq-room ' + cls, id);
    s.position.set((r.x0 + r.x1) / 2, 2.4, (r.z0 + r.z1) / 2);
    scene.add(s);
    if (!items.has(id)) register(id, { el: s.element, pos: new THREE.Vector3((r.x0 + r.x1) / 2, 0.5, (r.z0 + r.z1) / 2) });
    else if (!items.get(id).el) items.get(id).el = s.element;
    return s;
  }

  // ---------- 目的地（员工会走去的地方） ----------
  const spots = [];
  function spot(kind, x, z, facing, sit, doing, place) { spots.push({ kind, pos: new THREE.Vector3(x, 0, z), facing, sit, doing, place, taken: false }); freeAt.push([x, z]); }

  // ---------- 家具 ----------
  function plant(x, z, s = 1, parent) {
    const g = parent || statics;
    cyl(0.22 * s, 0.17 * s, 0.42 * s, M.pot, x, 0.21 * s, z, g);
    sph(0.36 * s, M.leaf, x, 0.72 * s, z, g, 1.15);
    sph(0.26 * s, M.leaf2, x + 0.14 * s, 0.98 * s, z - 0.08 * s, g);
    if (!parent) blockRect(x - 0.25 * s, z - 0.25 * s, x + 0.25 * s, z + 0.25 * s, 0.05);
  }
  function chairAt(g, x, z, rot, m = M.chair) {
    const c = new THREE.Group(); c.position.set(x, 0, z); c.rotation.y = rot; g.add(c);
    rbox(0.5, 0.08, 0.48, m, 0, 0.46, 0, c, 0.03);
    rbox(0.5, 0.5, 0.07, m, 0, 0.76, -0.24, c, 0.03);
    cyl(0.03, 0.03, 0.38, M.leg, 0, 0.22, 0, c, 8);
    cyl(0.22, 0.22, 0.03, M.leg, 0, 0.03, 0, c, 12);
  }
  // 办公桌：座位在 (sx, sz)，人面向 face（弧度，0 = 面向 +z），桌子在人前面
  function workstation(sx, sz, face, color, screenKind, ghost) {
    const g = group(sx, sz, face);
    const top = ghost ? M.ghost : M.desk;
    rbox(1.5, 0.05, 0.75, top, 0, 0.74, 0.72, g, 0.02);
    [[-0.7, 0.4], [0.7, 0.4], [-0.7, 1.04], [0.7, 1.04]].forEach(([x, z]) => box(0.04, 0.72, 0.04, ghost ? M.ghost : M.leg, x, 0.36, z, g));
    const dx = Math.sin(face) * 0.72, dz = Math.cos(face) * 0.72;
    const hw = Math.abs(Math.cos(face)) * 0.75 + Math.abs(Math.sin(face)) * 0.38, hd = Math.abs(Math.sin(face)) * 0.75 + Math.abs(Math.cos(face)) * 0.38;
    blockRect(sx + dx - hw, sz + dz - hd, sx + dx + hw, sz + dz + hd, 0.05);
    if (ghost) return;
    box(0.06, 0.24, 0.06, M.monitor, 0, 0.88, 0.92, g);
    rbox(0.9, 0.52, 0.04, M.monitor, 0, 1.2, 0.94, g, 0.02);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.84, 0.46), new THREE.MeshBasicMaterial({ map: screenTexture(screenKind, color), toneMapped: false }));
    scr.position.set(sx + Math.sin(face) * 0.915, 1.2, sz + Math.cos(face) * 0.915); scr.rotation.y = face + Math.PI; scene.add(scr);
    rbox(0.45, 0.02, 0.15, M.dark, 0, 0.775, 0.55, g, 0.01);
    sph(0.05, M.white, 0.35, 0.78, 0.6, g, 0.5);
    chairAt(g, 0, 0, face + Math.PI);
    freeAt.push([sx, sz]);
  }
  function sofa(g, x, z, rot, w = 2.0, m = M.sofa) {
    const s = new THREE.Group(); s.position.set(x, 0, z); s.rotation.y = rot; g.add(s);
    rbox(w, 0.4, 0.85, m, 0, 0.22, 0, s, 0.08);
    rbox(w, 0.5, 0.2, m, 0, 0.55, -0.35, s, 0.08);
    rbox(0.2, 0.32, 0.85, m, -w / 2 + 0.1, 0.5, 0, s, 0.06); rbox(0.2, 0.32, 0.85, m, w / 2 - 0.1, 0.5, 0, s, 0.06);
    rbox(0.42, 0.36, 0.12, M.cushion, -w / 4, 0.6, -0.22, s, 0.05);
    const c = Math.cos(rot), sn = Math.sin(rot), hw = Math.abs(c) * w / 2 + Math.abs(sn) * 0.42, hd = Math.abs(sn) * w / 2 + Math.abs(c) * 0.42;
    blockRect(x - hw, z - hd, x + hw, z + hd, 0.02);
  }
  function artFrame(x, y, z, rotY, w, h, idx) {
    const g = group(x, z, rotY);
    rbox(w + 0.12, h + 0.12, 0.05, M.walnut, 0, y, 0, g, 0.02);
    const m = new THREE.MeshBasicMaterial({ map: abstractArt(idx), toneMapped: false });
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
    p.position.set(x + Math.sin(rotY) * 0.03, y, z + Math.cos(rotY) * 0.03); p.rotation.y = rotY; scene.add(p);
    const list = company.art || [];
    const a = list.length ? list[idx % list.length] : null;
    if (a && a.url) {
      const loader = new THREE.TextureLoader(); loader.setCrossOrigin('anonymous');
      loader.load(a.url, (t) => { t.colorSpace = THREE.SRGBColorSpace; m.map = t; m.needsUpdate = true; }, undefined, () => {});
    }
  }

  // ---------- 盖房间 ----------
  ROOMS.forEach((r) => { roomWalls(r); floor(r, r.floor, r.pick); });

  // 老板办公室
  const bossSeat = new THREE.Vector3(-18.5, 0, -12.9);
  {
    const g = statics;
    const rug = new THREE.Mesh(new THREE.CircleGeometry(2.6, 48), tintMat(BOSS_COLOR, 0.55)); rug.rotation.x = -Math.PI / 2; rug.position.set(-18.5, 0.025, -11.6); rug.receiveShadow = true; scene.add(rug);
    rbox(2.8, 0.08, 1.2, M.walnut, -18.5, 0.78, -11.9, g, 0.03);
    rbox(2.7, 0.7, 0.08, M.walnut, -18.5, 0.38, -11.35, g, 0.02);
    box(0.08, 0.72, 1.1, M.walnut, -19.8, 0.37, -11.9); box(0.08, 0.72, 1.1, M.walnut, -17.2, 0.37, -11.9);
    blockRect(-19.9, -12.5, -17.1, -11.3, 0.05);
    const lap = rbox(0.55, 0.36, 0.03, M.monitor, -18, 1.0, -12.15, g, 0.01); lap.rotation.x = -0.25;
    const bc = new THREE.Group(); bc.position.copy(bossSeat); g.add(bc);
    rbox(0.66, 0.1, 0.6, M.dark, 0, 0.48, 0, bc, 0.04); rbox(0.66, 0.85, 0.1, M.dark, 0, 0.95, -0.3, bc, 0.04);
    rbox(3.6, 2.1, 0.45, M.shelf, -18.5, 1.08, -15.5, g, 0.03); blockRect(-20.3, -15.9, -16.7, -15.2);
    const books = ['#0E6B66', '#3A6EA5', '#C26A00', '#B83A6E', '#2C6A37', '#6B4FA0', '#C99A3B'];
    for (let row = 0; row < 3; row++) for (let i = 0; i < 11; i++) box(0.2, 0.42, 0.28, colorMat(books[(i + row * 3) % 7]), -20.05 + i * 0.3 + (row % 2) * 0.06, 0.42 + row * 0.62, -15.4);
    sofa(g, -22.4, -9.6, Math.PI / 2, 2.2, M.sofa2);
    rbox(0.9, 0.35, 1.4, M.oak, -21.1, 0.2, -9.6, g, 0.04); blockRect(-21.6, -10.3, -20.6, -8.9);
    chairAt(g, -19.2, -10.4, Math.PI, M.sofa2); chairAt(g, -17.8, -10.4, Math.PI, M.sofa2);
    blockRect(-19.5, -10.7, -17.5, -10.1, 0.02);
    plant(-23.2, -15.1, 1.3); plant(-14, -15.1, 1.1);
    artFrame(-23.85, 1.45, -12.2, Math.PI / 2, 1.6, 1.1, 0);
  }

  // 会议室（也是 Google Calendar、简报工具的设施）
  {
    const g = statics;
    rbox(6.2, 0.07, 1.6, M.white, -8, 0.76, -11.6, g, 0.04);
    [[-10.6, -11.6], [-5.4, -11.6]].forEach(([x, z]) => rbox(0.3, 0.72, 1.0, M.leg, x, 0.37, z, g, 0.04));
    blockRect(-11.1, -12.4, -4.9, -10.8, 0.02);
    for (let i = 0; i < 4; i++) {
      const x = -10.25 + i * 1.5;
      chairAt(g, x, -12.9, 0, M.sofa); chairAt(g, x, -10.3, Math.PI, M.sofa);
      spot('meeting', x, -13.0, 0, true, '在会议室开会', '会议室');
      spot('meeting', x, -10.2, Math.PI, true, '在会议室开会', '会议室');
    }
    rbox(3.0, 1.6, 0.08, M.monitor, -8, 1.55, -15.85, g, 0.03);
    const tv = new THREE.Mesh(new THREE.PlaneGeometry(2.86, 1.46), new THREE.MeshBasicMaterial({ map: screenTexture('calendar', '#0E6B66'), toneMapped: false }));
    tv.position.set(-8, 1.55, -15.8); scene.add(tv);
    plant(-12.4, -7.8, 1); plant(-3.7, -15.2, 1.1);
  }

  // 设计工作室
  {
    const g = statics;
    [[-1, -12.5], [3.5, -12.5]].forEach(([x, z], k) => {
      rbox(2.2, 0.06, 1.1, M.oak, x, 0.9, z, g, 0.03);
      [[-1, -0.45], [1, -0.45], [-1, 0.45], [1, 0.45]].forEach(([a, b]) => box(0.05, 0.88, 0.05, M.leg, x + a, 0.44, z + b));
      blockRect(x - 1.15, z - 0.6, x + 1.15, z + 0.6, 0.05);
      rbox(1.1, 0.62, 0.04, M.monitor, x, 1.35, z - 0.4, g, 0.02);
      const s = new THREE.Mesh(new THREE.PlaneGeometry(1.04, 0.56), new THREE.MeshBasicMaterial({ map: abstractArt(k + 1), toneMapped: false }));
      s.position.set(x, 1.35, z - 0.37); scene.add(s);
    });
    const ex = 5.5, ez = -9.5;
    [[-0.35, 0.2], [0.35, 0.2], [0, -0.25]].forEach(([a, b]) => { const l = box(0.05, 1.8, 0.05, M.walnut, ex + a, 0.9, ez + b); l.rotation.x = b > 0 ? -0.12 : 0.18; });
    rbox(1.0, 0.76, 0.04, M.white, ex, 1.3, ez + 0.13, statics, 0.01);
    const art = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 0.68), new THREE.MeshBasicMaterial({ map: abstractArt(2), toneMapped: false }));
    art.position.set(ex, 1.3, ez + 0.16); scene.add(art);
    blockRect(ex - 0.5, ez - 0.4, ex + 0.5, ez + 0.4);
    rbox(1.6, 1.8, 0.4, M.shelf, -2.0, 0.92, -15.5, g, 0.03); blockRect(-2.8, -15.9, -1.2, -15.2);
    plant(6.3, -15.1, 1.2); plant(-2.4, -8.0, 0.9);
  }

  // 影音室
  {
    const g = statics;
    rbox(5.6, 2.3, 0.08, M.green, 11, 1.17, -15.75, g, 0.02);
    const gs = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 1.5), M.green); gs.rotation.x = -Math.PI / 2; gs.position.set(11, 0.03, -15); scene.add(gs);
    [[-0.3, 0.2], [0.3, 0.2], [0, -0.3]].forEach(([a, b]) => { const l = box(0.04, 1.3, 0.04, M.dark, 11 + a, 0.65, -10.6 + b); l.rotation.x = b > 0 ? 0.15 : -0.2; });
    rbox(0.45, 0.32, 0.6, M.dark, 11, 1.4, -10.65, g, 0.04);
    cyl(0.12, 0.12, 0.2, M.monitor, 11, 1.42, -11.0, g).rotation.x = Math.PI / 2;
    blockRect(10.6, -11, 11.4, -10.3);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.05, 10, 32), new THREE.MeshStandardMaterial({ color: '#FFFFFF', emissive: '#FFF6E0', emissiveIntensity: 1.2 }));
    ring.position.set(8.6, 1.6, -12); ring.rotation.y = 0.6; scene.add(ring);
    cyl(0.03, 0.03, 1.4, M.dark, 8.6, 0.7, -12, g, 8); blockRect(8.3, -12.3, 8.9, -11.7);
    sofa(g, 13.4, -8.6, Math.PI, 2.2, M.sofa);
    plant(7.7, -7.9, 0.9);
  }

  // 茶水间
  {
    const g = statics;
    rbox(8.4, 0.9, 0.7, M.cabinet, 19.3, 0.45, -15.45, g, 0.03);
    rbox(8.5, 0.05, 0.75, M.counter, 19.3, 0.93, -15.42, g, 0.02);
    rbox(8.4, 0.75, 0.4, M.cabinet, 19.3, 1.95, -15.65, g, 0.03);
    blockRect(15.1, -15.9, 23.6, -15.0);
    rbox(0.8, 0.02, 0.45, M.steel, 17.0, 0.96, -15.4, g, 0.01); cyl(0.02, 0.02, 0.3, M.steel, 17.0, 1.1, -15.62, g, 8);
    rbox(0.42, 0.55, 0.42, M.dark, 19.6, 1.23, -15.45, g, 0.05); rbox(0.3, 0.06, 0.2, M.steel, 19.6, 1.05, -15.25, g, 0.02);
    rbox(0.6, 0.35, 0.4, M.white, 21.4, 1.13, -15.5, g, 0.04);
    rbox(1.0, 2.0, 0.75, M.steel, 23.3, 1.0, -14.9, g, 0.05); blockRect(22.8, -15.3, 23.8, -14.5);
    spot('coffee', 19.6, -14.5, Math.PI, false, '在茶水间泡咖啡', '茶水间');
    spot('coffee', 17.0, -14.5, Math.PI, false, '在茶水间洗杯子', '茶水间');
    spot('coffee', 21.4, -14.5, Math.PI, false, '在茶水间热饭', '茶水间');
    spot('coffee', 18.3, -14.4, Math.PI, false, '在茶水间排队等咖啡', '茶水间');
    spot('coffee', 20.6, -14.4, Math.PI, false, '在茶水间泡茶', '茶水间');
    [[17.3, -10.8], [21.3, -10.8]].forEach(([x, z]) => {
      cyl(0.7, 0.7, 0.05, M.white, x, 0.75, z, g, 28); cyl(0.05, 0.25, 0.72, M.leg, x, 0.36, z, g, 12);
      blockRect(x - 0.6, z - 0.6, x + 0.6, z + 0.6, 0);
      [0, 2.1, 4.2].forEach((a) => {
        const sx = x + Math.sin(a) * 1.05, sz = z + Math.cos(a) * 1.05;
        cyl(0.2, 0.2, 0.06, M.oak, sx, 0.48, sz, g, 16); cyl(0.03, 0.03, 0.46, M.leg, sx, 0.23, sz, g, 8);
        spot('pantry', sx, sz, a + Math.PI, true, '在茶水间吃点心', '茶水间');
      });
    });
    rbox(0.4, 1.0, 0.4, M.white, 15.6, 0.5, -8.0, g, 0.05);
    cyl(0.17, 0.17, 0.45, new THREE.MeshStandardMaterial({ color: '#9CCBE0', transparent: true, opacity: 0.7, roughness: 0.1 }), 15.6, 1.23, -8.0, g);
    blockRect(15.3, -8.3, 15.9, -7.7);
    spot('water', 16.4, -8.0, -Math.PI / 2, false, '在饮水机倒水', '茶水间');
    plant(23.3, -7.8, 1);
  }

  // 洗手间：每间两个隔间（南边）、一排洗手台（西边）
  [[-24, -20], [-20, -16]].forEach(([x0]) => {
    const g = statics;
    for (let k = 0; k < 2; k++) {
      const sx = x0 + 0.2 + k * 1.8;
      box(0.05, 1.8, 1.7, M.cabinet, sx, 0.95, 2.05); box(0.05, 1.8, 1.7, M.cabinet, sx + 1.75, 0.95, 2.05);
      const door = box(1.4, 1.6, 0.04, M.cabinet, sx + 0.88, 0.95, 1.2); door.rotation.y = 0.25;
      rbox(0.42, 0.42, 0.6, M.white, sx + 0.88, 0.23, 2.6, g, 0.12);
      blockRect(sx - 0.05, 1.15, sx + 0.05, 2.9); blockRect(sx + 1.7, 1.15, sx + 1.8, 2.9); blockRect(sx + 0.6, 2.3, sx + 1.15, 2.9, 0);
      spot('wc', sx + 0.88, 1.85, Math.PI, false, '在洗手间', '洗手间');
    }
    const wx = x0 + 0.45;
    rbox(0.6, 0.85, 2.6, M.counter, wx, 0.43, -2.4, g, 0.03); blockRect(wx - 0.3, -3.7, wx + 0.3, -1.1);
    [-3.0, -1.8].forEach((z) => { rbox(0.05, 0.8, 0.9, M.window, x0 + 0.17, 1.5, z, g, 0.02); cyl(0.2, 0.15, 0.08, M.white, wx, 0.89, z, g, 16); });
    spot('wash', wx + 0.75, -2.4, -Math.PI / 2, false, '在洗手', '洗手间');
  });

  // 档案室、机房、收发室
  {
    const g = statics;
    for (let k = 0; k < 5; k++) { rbox(0.9, 1.5, 0.65, M.cabinet, -23.3 + k * 1.05, 0.76, 3.55, g, 0.03); for (let d = 0; d < 3; d++) box(0.3, 0.04, 0.02, M.steel, -23.3 + k * 1.05, 0.4 + d * 0.45, 3.9); }
    blockRect(-23.8, 3.1, -18.6, 4.0);
    rbox(1.6, 0.06, 0.8, M.oak, -20.5, 0.75, 6.4, g, 0.02); blockRect(-21.3, 6.0, -19.7, 6.8);
    spot('files', -20.5, 5.6, 0, false, '在档案室找资料', '档案室');
    for (let k = 0; k < 3; k++) {
      const x = -23.3 + k * 1.3;
      rbox(0.9, 2.0, 0.9, M.dark, x, 1.0, 8.75, g, 0.03); blockRect(x - 0.45, 8.3, x + 0.45, 9.2);
      for (let r = 0; r < 6; r++) box(0.06, 0.06, 0.02, M.led, x - 0.25 + (r % 3) * 0.25, 0.5 + Math.floor(r / 3) * 0.9 + (k % 2) * 0.2, 9.21);
    }
    rbox(3.2, 1.5, 0.35, M.shelf, -21.8, 0.76, 12.4, g, 0.03); blockRect(-23.4, 12.2, -20.2, 12.6);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) box(0.42, 0.36, 0.02, M.dark, -23.05 + c * 0.5, 0.35 + r * 0.45, 12.58);
    [[-19.6, 14.8], [-19.0, 15.1], [-19.4, 15.4]].forEach(([x, z], k) => rbox(0.5, 0.35, 0.45, M.shelf, x, 0.18 + (k === 2 ? 0.36 : 0), z, g, 0.02));
    blockRect(-19.9, 14.5, -18.7, 15.7);
    spot('mail', -21.8, 13.3, Math.PI, false, '在收发室拿包裹', '收发室');
  }

  // ---------- 客服部（开放办公） ----------
  const people = [];
  const cs = (company.departments || []).find((d) => d.main) || { teams: [] };
  const others = (company.departments || []).filter((d) => !d.main);
  OPEN.forEach((o) => floor(o, o.floor, o.pick));
  {
    const o = OPEN[0];
    const cx = (o.x0 + o.x1) / 2;
    const s = label(`<i style="background:${cs.color || '#0E6B66'}"></i>${esc(cs.name || '客服部')}<small>主要办公区</small>`, 'hq-room hq-room-main', 'dept/cs');
    s.position.set(cx, 2.6, o.z0 + 0.6); scene.add(s);
    register('dept/cs', { el: s.element, pos: new THREE.Vector3(cx, 0.5, (o.z0 + o.z1) / 2) });
    const quads = [[-13, -4.2, -2.5, 1.2], [-1.5, -4.2, 9, 1.2], [-13, 2.2, -2.5, 7.6], [-1.5, 2.2, 9, 7.6]];
    (cs.teams || []).slice(0, 4).forEach((t, qi) => {
      const [x0, z0, x1, z1] = quads[qi], qx = (x0 + x1) / 2, qz = (z0 + z1) / 2;
      const planned = t.kind === 'planned';
      const rug = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), planned ? M.ghost : tintMat(t.color, 0.78));
      rug.rotation.x = -Math.PI / 2; rug.position.set(qx, 0.03, qz); rug.receiveShadow = true; scene.add(rug);
      const n = planned ? 4 : t.agents.length, cols = Math.ceil(n / 2);
      // 两排对坐，中间一块小组颜色的隔板
      if (!planned) rbox(cols * 1.7 + 0.2, 0.42, 0.05, colorMat(t.color), qx, 1.0, qz, statics, 0.02);
      for (let k = 0; k < n; k++) {
        const col = k % cols, row = Math.floor(k / cols);
        const x = qx + (col - (cols - 1) / 2) * 1.7, z = row === 0 ? qz - 1.25 : qz + 1.25, face = row === 0 ? 0 : Math.PI;
        workstation(x, z, face, t.color, t.kind === 'site' ? 'sheet' : 'chat', planned);
        if (!planned) people.push({ group: t, index: k, agent: t.agents[k], seat: new THREE.Vector3(x, 0, z), face, color: t.color });
      }
      plant(x1 - 0.4, z0 + 0.4, 0.8);
      const sign = label(`<i style="background:${t.color}"></i>${esc(t.name)}<small>${planned ? '空工位' : t.agents.length + ' 人'}</small>`, 'hq-sign' + (planned ? ' hq-sign-planned' : ''), 'team/' + t.id);
      sign.position.set(qx, 2.2, qz); scene.add(sign);
      register('team/' + t.id, { el: sign.element, pos: new THREE.Vector3(qx, 0.5, qz) });
    });
    // 角落的打印机
    rbox(0.8, 0.9, 0.6, M.white, 9.3, 0.45, -4.4, statics, 0.05); rbox(0.6, 0.08, 0.4, M.dark, 9.3, 0.94, -4.4, statics, 0.02);
    blockRect(8.9, -4.7, 9.7, -4.1); spot('printer', 9.3, -3.5, Math.PI, false, '在打印', '打印机');
  }

  // ---------- 前台大厅 ----------
  const logoCanvas = document.createElement('canvas'); logoCanvas.width = 1024; logoCanvas.height = 220;
  const logoTex = new THREE.CanvasTexture(logoCanvas); logoTex.colorSpace = THREE.SRGBColorSpace; logoTex.anisotropy = 8;
  {
    const g = statics;
    // 公司名称墙（跟着公司名称改）
    rbox(7.5, 1.7, 0.25, colorMat('#0E6B66'), -3, 0.87, 10.7, g, 0.04); blockRect(-6.8, 10.5, 0.8, 10.9);
    const lp = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 1.55), new THREE.MeshBasicMaterial({ map: logoTex, transparent: true, toneMapped: false }));
    lp.position.set(-3, 0.9, 10.84); scene.add(lp);
    // 前台桌
    rbox(4.2, 1.05, 0.7, M.white, -3, 0.53, 12.6, g, 0.08); rbox(4.4, 0.06, 0.85, M.oak, -3, 1.08, 12.55, g, 0.03);
    blockRect(-5.2, 12.2, -0.8, 13.0);
    plant(-8.6, 10.8, 1.3); plant(2.6, 10.8, 1.3);
    // 等候区
    sofa(g, -11.2, 13.4, Math.PI / 2, 2.4, M.sofa2);
    rbox(1.0, 0.35, 1.6, M.oak, -9.8, 0.2, 13.4, g, 0.06); blockRect(-10.3, 12.6, -9.3, 14.2);
    spot('lobby', -11.0, 12.8, Math.PI / 2, true, '在大厅等访客', '前台大厅');
    spot('lobby', -11.0, 14.0, Math.PI / 2, true, '在大厅跟访客聊', '前台大厅');
    sofa(g, 6.5, 13.6, -Math.PI / 2, 2.2, M.sofa);
    plant(8.9, 15.2, 1.1);
    const doormat = new THREE.Mesh(new THREE.PlaneGeometry(ENTRANCE.x1 - ENTRANCE.x0, 1.2), M.dark);
    doormat.rotation.x = -Math.PI / 2; doormat.position.set((ENTRANCE.x0 + ENTRANCE.x1) / 2, 0.03, BD / 2 - 0.8); scene.add(doormat);
    roomSign(OPEN[1], `<i style="background:#55544E"></i>前台大厅`, 'room/lobby');
    artFrame(-12.4, 1.2, 10.25, 0, 1.5, 1.0, 3);
  }
  function drawLogo(name) {
    const g = logoCanvas.getContext('2d');
    g.clearRect(0, 0, 1024, 220);
    g.fillStyle = '#FFFFFF'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '700 108px "PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif';
    g.fillText(name, 512, 104, 960);
    g.font = '500 30px "PingFang SC","Microsoft YaHei",sans-serif'; g.globalAlpha = 0.8;
    g.fillText('客服部 · 审核 · AI 团队', 512, 186); g.globalAlpha = 1;
    logoTex.needsUpdate = true;
  }
  drawLogo(opts.companyName || company.name);

  // ---------- 休息区 ----------
  {
    const g = statics;
    sofa(g, 15.2, 13.6, Math.PI / 2, 2.6, M.sofa);
    sofa(g, 17.4, 15.3, Math.PI, 2.6, M.sofa2);
    rbox(1.4, 0.3, 1.4, M.oak, 17.3, 0.18, 13.4, g, 0.1); blockRect(16.6, 12.7, 18.0, 14.1);
    spot('lounge', 15.4, 13.0, Math.PI / 2, true, '在休息区放空', '休息区');
    spot('lounge', 15.4, 14.2, Math.PI / 2, true, '在休息区看书', '休息区');
    spot('lounge', 17.4, 15.1, Math.PI, true, '在休息区聊天', '休息区');
    [[21.2, 12.6, '#C26A00'], [22.6, 13.4, '#0E6B66']].forEach(([x, z, c]) => { sph(0.55, colorMat(c), x, 0.32, z, g, 0.6); blockRect(x - 0.4, z - 0.4, x + 0.4, z + 0.4, 0); spot('lounge', x, z + 0.7, Math.PI, false, '在休息区伸懒腰', '休息区'); });
    rbox(1.6, 0.18, 0.9, M.walnut, 21.5, 0.85, 15.0, g, 0.03); [[-0.7, -0.35], [0.7, -0.35], [-0.7, 0.35], [0.7, 0.35]].forEach(([a, b]) => box(0.07, 0.78, 0.07, M.dark, 21.5 + a, 0.39, 15.0 + b));
    for (let k = 0; k < 4; k++) cyl(0.015, 0.015, 1.3, M.steel, 21.5 - 0.5 + k * 0.33, 0.95, 15.0, g, 6).rotation.x = Math.PI / 2;
    blockRect(20.6, 14.5, 22.4, 15.5);
    spot('lounge', 21.5, 14.2, Math.PI, false, '在休息区打手足球', '休息区');
    rbox(2.4, 1.6, 0.35, M.shelf, 19.6, 0.82, 10.35, g, 0.03); blockRect(18.4, 10.1, 20.8, 10.6);
    plant(23.3, 10.8, 1.3); plant(12.6, 15.3, 1.0);
    roomSign(OPEN[2], `<i style="background:#55544E"></i>休息区`, 'room/lounge');
    artFrame(14.0, 1.0, 10.08, 0, 1.2, 0.8, 1);
  }

  // ---------- 其他部门 ----------
  const deptRoom = (i) => Object.assign({}, DEPT_SLOTS[i], { doors: [{ side: 'w', at: (DEPT_SLOTS[i].z0 + DEPT_SLOTS[i].z1) / 2 }] });
  others.slice(0, DEPT_SLOTS.length).forEach((d, i) => {
    const r = deptRoom(i);
    const planned = d.kind === 'planned';
    roomWalls(r);
    floor(r, planned ? 'concrete' : 'wood', 'dept/' + d.id);
    const n = planned ? 2 : d.agents.length, w = r.x1 - r.x0;
    for (let k = 0; k < n; k++) {
      const row = Math.floor(k / 2), inRow = Math.min(2, n - row * 2), col = k % 2;
      const x = r.x0 + 0.5 + (w - 0.5) / 2 + (col - (inRow - 1) / 2) * 2.1, z = r.z0 + 1.9 + row * 2.1;
      workstation(x, z, Math.PI, d.color, 'chat', planned);
      if (!planned) people.push({ group: d, index: k, agent: d.agents[k], seat: new THREE.Vector3(x, 0, z), face: Math.PI, color: d.color });
    }
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.4, 0.3), planned ? M.ghost : colorMat(d.color));
    strip.rotation.x = -Math.PI / 2; strip.position.set((r.x0 + r.x1) / 2, 0.03, r.z1 - 0.35); scene.add(strip);
    plant(r.x1 - 0.5, r.z1 - 0.6, 0.7);
    roomSign(r, `<i style="background:${d.color}"></i>${esc(d.name)}<small>${planned ? '筹备中' : d.agents.length + ' 人'}</small>`, 'dept/' + d.id, planned ? 'hq-room-planned' : '');
  });

  // ---------- 设施（连接器）、其他房间标签 ----------
  ROOMS.forEach((r) => {
    if (r.id === 'boss') { roomSign(r, `<i style="background:${BOSS_COLOR}"></i>老板办公室<small>${esc(company.boss.title)}（${esc(company.boss.name)}）</small>`, 'boss', 'hq-room-boss'); return; }
    if (r.id === 'wcf') return;
    if (r.id === 'wcm') { roomSign({ x0: -24, z0: -5, x1: -16, z1: 3 }, `<i style="background:#55544E"></i>洗手间<small>男 · 女</small>`, 'room/wc'); return; }
    if (r.id === 'pantry') { roomSign(r, `<i style="background:#55544E"></i>茶水间`, 'room/pantry'); return; }
    const f = (company.facilities || []).find((x) => 'fac/' + x.id === r.pick);
    if (f) roomSign(r, `<i style="background:#55544E"></i>${esc(f.room)}<small>${f.connectors.length} 个连接器</small>`, 'fac/' + f.id, 'hq-room-fac');
  });
  // 走廊只有 2 格宽，植物放在走廊尽头的角落，不挡路
  [[-15.6, 15.5], [11.6, -4.6], [23.5, -5.6]].forEach(([x, z]) => plant(x, z, 0.7));

  // ---------- 合并静态物件 ----------
  const mergedBy = new Map();
  {
    statics.updateMatrixWorld(true);
    const buckets = new Map();
    mergedBy.clear();
    statics.traverse((o) => {
      if (!o.isMesh) return;
      // 圆角方块没有 index、其他有：全部转成没有 index 才能合并
      const geo = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(o.matrixWorld);
      if (!buckets.has(o.material)) buckets.set(o.material, []);
      buckets.get(o.material).push(geo);
    });
    buckets.forEach((geos, m) => {
      let merged = null;
      try { merged = mergeGeometries(geos, false); } catch (e) { merged = null; }
      if (!merged) { geos.forEach((geo) => { const x = new THREE.Mesh(geo, m); x.castShadow = x.receiveShadow = true; scene.add(x); }); return; }
      const mesh = new THREE.Mesh(merged, m);
      mesh.castShadow = m !== M.ghost; mesh.receiveShadow = true;
      scene.add(mesh); mergedBy.set(m, mesh);
      geos.forEach((geo) => geo.dispose());
    });
    statics.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
  }

  // 座位、目的地一定能站；门口一定能过
  freeAt.forEach(([x, z]) => { const [i, j] = cellOf(x, z); if (inGrid(i, j)) grid[j * GX + i] = 0; });
  const openDoor = (r) => (r.doors || []).forEach((d) => {
    const w = (d.w || 1.4) / 2 - 0.2;
    const ns = d.side === 'n' || d.side === 's';
    const line = ns ? (d.side === 'n' ? r.z0 : r.z1) : (d.side === 'w' ? r.x0 : r.x1);
    for (let u = d.at - w; u <= d.at + w + 1e-6; u += CELL / 2) for (const v of [-0.45, -0.2, 0, 0.2, 0.45]) {
      const [i, j] = ns ? cellOf(u, line + v) : cellOf(line + v, u);
      if (inGrid(i, j)) grid[j * GX + i] = 0;
    }
  });
  ROOMS.forEach(openDoor);
  others.slice(0, DEPT_SLOTS.length).forEach((d, i) => openDoor(deptRoom(i)));

  // ---------- 寻路（A*，八方向，再把路线拉直） ----------
  function nearestFree(i, j) {
    if (!blocked(i, j)) return [i, j];
    for (let r = 1; r < 8; r++) for (let a = -r; a <= r; a++) for (const [p, q] of [[i + a, j - r], [i + a, j + r], [i - r, j + a], [i + r, j + a]]) if (!blocked(p, q)) return [p, q];
    return null;
  }
  function los(a, b) {
    const dx = b.x - a.x, dz = b.z - a.z, n = Math.ceil(Math.hypot(dx, dz) / 0.2);
    for (let k = 1; k < n; k++) { const [i, j] = cellOf(a.x + dx * k / n, a.z + dz * k / n); if (blocked(i, j)) return false; }
    return true;
  }
  const G = new Float32Array(GX * GZ), FROM = new Int32Array(GX * GZ), SEEN = new Uint32Array(GX * GZ);
  let stamp = 0;
  function findPath(from, to) {
    const s = nearestFree(...cellOf(from.x, from.z)), t = nearestFree(...cellOf(to.x, to.z));
    if (!s || !t) return null;
    stamp++;
    const si = s[1] * GX + s[0], ti = t[1] * GX + t[0];
    const heap = [];
    const push = (f, i) => { heap.push([f, i]); let c = heap.length - 1; while (c > 0) { const p = (c - 1) >> 1; if (heap[p][0] <= heap[c][0]) break; [heap[p], heap[c]] = [heap[c], heap[p]]; c = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let c = 0; for (;;) { const l = c * 2 + 1, r = l + 1; let m = c; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === c) break; [heap[m], heap[c]] = [heap[c], heap[m]]; c = m; } } return top; };
    const h = (i) => { const dx = Math.abs((i % GX) - t[0]), dz = Math.abs(((i / GX) | 0) - t[1]); return Math.max(dx, dz) + 0.414 * Math.min(dx, dz); };
    G[si] = 0; FROM[si] = -1; SEEN[si] = stamp; push(h(si), si);
    let found = false, guard = 0, best = si, bestH = h(si);
    while (heap.length && guard++ < 20000) {
      const [, cur] = pop();
      if (cur === ti) { found = true; break; }
      const hc = h(cur); if (hc < bestH) { bestH = hc; best = cur; }
      const ci = cur % GX, cj = (cur / GX) | 0;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const ni = ci + di, nj = cj + dj;
        if (blocked(ni, nj)) continue;
        if (di && dj && (blocked(ci + di, cj) || blocked(ci, cj + dj))) continue;
        const nx = nj * GX + ni, ng = G[cur] + (di && dj ? 1.414 : 1);
        if (SEEN[nx] === stamp && ng >= G[nx]) continue;
        SEEN[nx] = stamp; G[nx] = ng; FROM[nx] = cur; push(ng + h(nx), nx);
      }
    }
    // 目的地被沙发、桌子围住（例如坐沙发）：走到最近走得到的地方，再一步坐进去
    if (!found && bestH > 4) return null;
    const end = found ? ti : best;
    const cells = []; for (let c = end; c !== -1; c = FROM[c]) cells.push(c);
    cells.reverse();
    const pts = cells.map((c) => new THREE.Vector3(((c % GX) + 0.5) * CELL - BW / 2, 0, (((c / GX) | 0) + 0.5) * CELL - BD / 2));
    pts[0] = from.clone();
    if (found) pts[pts.length - 1] = to.clone(); else pts.push(to.clone());
    const out = [pts[0]];
    for (let i = 0; i < pts.length - 1;) { let j = pts.length - 1; while (j > i + 1 && !los(pts[i], pts[j])) j--; out.push(pts[j]); i = j; }
    return out;
  }

  // ---------- 人物 ----------
  const SKIN = ['#F1D3B8', '#E2B48E', '#C68D63', '#8F5B3B', '#F4DCC6'];
  const HAIR = ['#2A211C', '#3B2A20', '#1E1E1E', '#6B4A2E', '#9A7350', '#4A3A30'];
  const PANTS = ['#2B2F36', '#3C4654', '#4A4036', '#2F3B33'];
  const pickMeshes = [];
  function makePerson(color, seed, id, scale = 1) {
    const root = new THREE.Group();
    const body = new THREE.Group(); root.add(body);
    const shirt = mat(color, { roughness: 0.7 });
    const skin = colorMat(SKIN[seed % SKIN.length]), hair = colorMat(HAIR[(seed * 7) % HAIR.length]), pants = colorMat(PANTS[(seed * 3) % PANTS.length]);
    const torso = new THREE.Mesh(new RoundedBoxGeometry(0.44, 0.56, 0.26, 2, 0.1), shirt); torso.position.y = 1.12;
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.08, 10), skin); neck.position.y = 1.43;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 22, 16), skin); head.position.y = 1.62;
    const hairM = new THREE.Mesh(new THREE.SphereGeometry(0.2, 22, 12, 0, Math.PI * 2, 0, Math.PI * (seed % 3 === 0 ? 0.62 : 0.5)), hair); hairM.position.y = 1.64; hairM.rotation.x = -0.25;
    body.add(torso, neck, head, hairM);
    const limb = (r, len, m) => { const p = new THREE.Group(); const c = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 4, 10), m); c.position.y = -len / 2 - r * 0.6; c.castShadow = true; p.add(c); return { p, c }; };
    const armL = limb(0.06, 0.42, shirt), armR = limb(0.06, 0.42, shirt), legL = limb(0.085, 0.5, pants), legR = limb(0.085, 0.5, pants);
    armL.p.position.set(-0.29, 1.36, 0); armR.p.position.set(0.29, 1.36, 0);
    legL.p.position.set(-0.11, 0.82, 0); legR.p.position.set(0.11, 0.82, 0);
    body.add(armL.p, armR.p, legL.p, legR.p);
    [torso, head, hairM, neck].forEach((m) => { m.castShadow = true; });
    [torso, head, hairM, armL.c, armR.c, legL.c, legR.c].forEach((m) => { m.userData.pick = id; pickMeshes.push(m); });
    root.scale.setScalar(scale);
    scene.add(root);
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.11, 12), colorMat('#FFFFFF'));
    cup.position.set(0, -0.62, 0.06); cup.visible = false; armR.p.add(cup);
    return { root, body, armL: armL.p, armR: armR.p, legL: legL.p, legR: legR.p, shirt, cup };
  }
  function poseSit(p, t, typing) {
    p.body.position.y = -0.34;
    p.legL.rotation.x = p.legR.rotation.x = -Math.PI / 2 + 0.05;
    const k = typing && !REDUCED ? Math.sin(t * 9) * 0.06 : 0;
    p.armL.rotation.x = -1.0 + k; p.armR.rotation.x = -1.0 - k;
    p.armL.rotation.z = 0.12; p.armR.rotation.z = -0.12;
  }
  function poseStand(p) { p.body.position.y = 0; p.legL.rotation.x = p.legR.rotation.x = 0; p.armL.rotation.x = p.armR.rotation.x = 0; p.armL.rotation.z = 0.06; p.armR.rotation.z = -0.06; }
  function poseWalk(p, phase) {
    const s = Math.sin(phase);
    p.body.position.y = Math.abs(Math.cos(phase)) * 0.05;
    p.legL.rotation.x = s * 0.55; p.legR.rotation.x = -s * 0.55;
    p.armL.rotation.x = -s * 0.45; p.armR.rotation.x = s * 0.45;
    p.armL.rotation.z = 0.06; p.armR.rotation.z = -0.06;
  }

  const agents = [];
  people.forEach((pp, n) => {
    const id = `agent/${pp.group.id}/${pp.index}`;
    const person = makePerson(pp.color, n * 5 + 3, id);
    person.root.position.copy(pp.seat); person.root.rotation.y = pp.face;
    const stat = pp.agent.stat && stats[pp.agent.stat] ? `<span class="hq-tag-stat">${esc(stats[pp.agent.stat])}</span>` : '';
    const tag = label(`<span class="hq-tag-name">${esc(pp.agent.name)}<span class="hq-tag-mood"></span></span><span class="hq-tag-role">${esc(pp.agent.role)}</span>${stat}<span class="hq-tag-doing"></span>`, 'hq-tag', id, `${pp.group.name} ${pp.agent.name}，${pp.agent.role}`, false);
    tag.position.set(0, 2.1, 0); person.root.add(tag);
    const bubble = document.createElement('div'); bubble.className = 'hq-bubble'; bubble.hidden = true;
    const bo = new CSS2DObject(bubble); bo.position.set(0, 2.75, 0); person.root.add(bo);
    const needs = {}, mult = {};
    NEEDS.forEach((nd) => { needs[nd.key] = rand(n < 6 ? 30 : 55, 100); mult[nd.key] = rand(0.75, 1.3); });
    const a = { id, name: pp.agent.name, person, seat: pp.seat.clone(), face: pp.face, state: 'sit', timer: rand(1, 6), path: null, k: 0, phase: Math.random() * 6, spot: null, back: false, away: false, doing: '工作中', tag: tag.element, bubble, bubbleT: 0, chatT: 0, needs, mult, cupT: 0 };
    agents.push(a);
    register(id, { el: tag.element, pos: pp.seat.clone(), mats: [person.shirt], color: pp.color, agent: a });
  });

  // 老板：坐在大桌后面，面向全公司
  const bossP = makePerson(BOSS_COLOR, 11, 'boss', 1.08);
  bossP.root.position.copy(bossSeat); bossP.root.rotation.y = 0;
  const tie = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.36, 0.03), colorMat('#8C1D18')); tie.position.set(0, 1.1, 0.14); bossP.body.add(tie);
  Object.assign(items.get('boss'), { mats: [bossP.shirt], color: BOSS_COLOR, pos: bossSeat.clone() });

  // ---------- 员工的一天：需求、心情，自己决定去做什么 ----------
  let away = 0;
  const MAX_AWAY = Math.max(3, Math.round(agents.length * 0.35));
  const pickOf = (arr) => arr[(Math.random() * arr.length) | 0];
  function mood(a) {
    const avg = NEEDS.reduce((s2, nd) => s2 + a.needs[nd.key], 0) / NEEDS.length;
    const m = avg >= 75 ? ['开心', '😄'] : avg >= 55 ? ['不错', '🙂'] : avg >= 35 ? ['有点累', '😐'] : ['心情差', '😣'];
    return { score: Math.round(avg), label: m[0], emoji: m[1] };
  }
  function showBubble(a, text, secs, speech) {
    a.bubble.textContent = text; a.bubble.hidden = false; a.bubbleT = secs;
    a.bubble.classList.toggle('is-speech', !!speech);
  }
  function setDoing(a, text) { a.doing = text; a.tag.querySelector('.hq-tag-doing').textContent = text === '工作中' ? '' : text; }
  function decide(a) {
    let low = NEEDS[0].key;
    NEEDS.forEach((nd) => { if (a.needs[nd.key] < a.needs[low]) low = nd.key; });
    const v = a.needs[low];
    if (v < 50 && Math.random() < 0.25 + (50 - v) / 40) return pickOf(FOR_NEED[low]);
    if (Math.random() < 0.05) return pickOf(ERRANDS);
    return null;
  }
  function spotFor(a, kind) {
    if (kind === 'visit') {
      const mates = agents.filter((b) => b !== a && b.state === 'sit' && !b.host);
      if (!mates.length) return null;
      const b = pickOf(mates);
      const pos = b.seat.clone().add(new THREE.Vector3(Math.cos(b.face), 0, -Math.sin(b.face)).multiplyScalar(0.8));
      if (blocked(...cellOf(pos.x, pos.z))) return null;
      return { kind, pos, facing: Math.atan2(b.seat.x - pos.x, b.seat.z - pos.z), sit: false, doing: `跟${b.name}讨论工作`, place: b.name + '那边', taken: false, host: b };
    }
    const free = spots.filter((sp) => sp.kind === kind && !sp.taken);
    return free.length ? pickOf(free) : null;
  }
  function startWalk(a, dest, back) {
    const path = findPath(a.person.root.position, dest);
    if (!path || path.length < 2) return false;
    a.path = path; a.k = 1; a.state = 'walk'; a.back = back;
    poseStand(a.person);
    return true;
  }
  function release(a) { if (a.spot) { a.spot.taken = false; if (a.spot.host) a.spot.host.host = null; a.spot = null; } }
  function go(a, kind) {
    const sp = spotFor(a, kind);
    if (!sp) { a.why = kind + '：没位子'; return false; }
    if (!startWalk(a, sp.pos, false)) { a.why = kind + '：走不到'; return false; }
    a.why = '';
    release(a);
    sp.taken = true; a.spot = sp; a.kind = kind;
    if (sp.host) sp.host.host = a;
    if (!a.away) { a.away = true; away++; }
    setDoing(a, '走去' + sp.place);
    showBubble(a, ACT[kind].icon, 3);
    return true;
  }
  function goBack(a) {
    release(a);
    if (startWalk(a, a.seat, true)) setDoing(a, '回座位'); else sitDown(a);
  }
  function sitDown(a) {
    const p = a.person; a.state = 'sit'; p.root.rotation.y = a.face; p.root.position.copy(a.seat);
    a.timer = rand(4, 10); if (a.away) { a.away = false; away--; } setDoing(a, '工作中');
  }
  // dt：这一步的游戏秒数（已经乘上速度）；gmin：这一步的游戏分钟
  function updateAgent(a, dt, gmin, t) {
    const p = a.person;
    const fixing = a.state === 'stay' && a.spot ? ACT[a.kind].fix : null;
    NEEDS.forEach((nd) => {
      let v = a.needs[nd.key] - nd.decay * a.mult[nd.key] * gmin * (fixing ? 0.5 : 1);
      if (fixing && fixing[nd.key]) v += fixing[nd.key] * gmin;
      a.needs[nd.key] = Math.max(0, Math.min(100, v));
    });
    if (a.cupT > 0) { a.cupT -= gmin; if (a.cupT <= 0) p.cup.visible = false; }
    if (a.state === 'sit') {
      poseSit(p, t + a.phase, true);
      a.timer -= dt;
      if (a.timer <= 0) {
        a.timer = rand(3, 8);
        if (away >= MAX_AWAY || REDUCED || a.host) return;
        const kind = decide(a);
        if (kind) go(a, kind);
      }
    } else if (a.state === 'walk') {
      const target = a.path[a.k], pos = p.root.position;
      const dx = target.x - pos.x, dz = target.z - pos.z, dist = Math.hypot(dx, dz);
      a.phase += dt * 8;
      poseWalk(p, a.phase);
      if (p.cup.visible) p.armR.rotation.x = -1.1;
      if (dist > 1e-4) {
        let diff = Math.atan2(dx, dz) - p.root.rotation.y; diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        p.root.rotation.y += diff * Math.min(1, dt * 10);
      }
      const step = 2.2 * dt;
      if (dist <= step) { pos.x = target.x; pos.z = target.z; a.k++; } else { pos.x += dx / dist * step; pos.z += dz / dist * step; }
      if (a.k >= a.path.length) {
        if (a.back) sitDown(a);
        else { a.state = 'stay'; a.timer = rand(4, 12); p.root.rotation.y = a.spot.facing; setDoing(a, a.spot.doing); a.chatT = 0; }
      }
    } else if (a.state === 'stay') {
      if (a.spot.sit) poseSit(p, t, false); else { poseStand(p); if (!REDUCED) p.armR.rotation.x = -0.6 + Math.sin(t * 2 + a.phase) * 0.15; }
      // 找同事讨论：两个人轮流冒对话
      if (a.kind === 'visit' || a.kind === 'meeting' || a.kind === 'lobby') {
        a.chatT -= dt;
        if (a.chatT <= 0) {
          a.chatT = rand(2.5, 4);
          const who = a.spot.host && Math.random() < 0.5 ? a.spot.host : a;
          showBubble(who, pickOf(CHATS), 2.4, true);
        }
      }
      a.timer -= gmin;
      const need = ACT[a.kind].need;
      if (a.timer <= 0 || (need && a.needs[need] >= 95 && a.timer < 8)) {
        if (a.kind === 'coffee') { p.cup.visible = true; a.cupT = 25; }
        goBack(a);
      }
    }
  }
  function moodTags() { agents.forEach((a) => { const m = mood(a); a.tag.querySelector('.hq-tag-mood').textContent = ' ' + m.emoji; }); }
  moodTags();

  // 选中员工脚下的圈
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.56, 40), new THREE.MeshBasicMaterial({ color: '#2EB872', transparent: true, opacity: 0.85, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.visible = false; scene.add(ring);

  // ---------- 游戏时钟、天色 ----------
  let gameMin = 9 * 60, day = 1, speed = 1;
  const SKY_DAY = new THREE.Color('#FFFFFF'), SKY_EVE = new THREE.Color('#F4CFA6'), SUN_DAY = new THREE.Color('#FFF4E2'), SUN_EVE = new THREE.Color('#FFB46B');
  function applyDaylight() {
    const h = gameMin / 60, ang = THREE.MathUtils.clamp((h - 6) / 15, 0, 1) * Math.PI, up = Math.sin(ang);
    sun.position.set(-44 * Math.cos(ang), 10 + 40 * up, 30);
    sun.intensity = 0.9 + 1.6 * up;
    sun.color.copy(SUN_EVE).lerp(SUN_DAY, Math.min(1, up * 1.3));
    hemi.intensity = 0.55 + 0.4 * up;
    const sky = SKY_EVE.clone().lerp(SKY_DAY, Math.min(1, up * 1.2));
    container.style.setProperty('--sky', '#' + sky.getHexString());
  }
  applyDaylight();

  // ---------- 镜头 ----------
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 500);
  const MODES = {
    '3d': { target: new THREE.Vector3(0, 0, 0.5), offset: new THREE.Vector3(36, 44, 42) },
    plan: { target: new THREE.Vector3(0, 0, 0), offset: new THREE.Vector3(0, 90, 0.001) }
  };
  let mode = '3d';
  camera.position.copy(MODES['3d'].target).add(MODES['3d'].offset);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(MODES['3d'].target);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.minPolarAngle = 0.3; controls.maxPolarAngle = 1.2;
  controls.minZoom = 0.7; controls.maxZoom = 7;
  controls.screenSpacePanning = false;
  controls.update();

  function extentFor(m) {
    const cam = camera.clone(); cam.position.copy(MODES[m].target).add(MODES[m].offset); cam.lookAt(MODES[m].target); cam.updateMatrixWorld();
    let x = 0, y = 0;
    [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => [0, 2.7].forEach((py) => {
      const v = new THREE.Vector3(sx * (BW / 2 + 1), py, sz * (BD / 2 + 1)).applyMatrix4(cam.matrixWorldInverse);
      x = Math.max(x, Math.abs(v.x)); y = Math.max(y, Math.abs(v.y));
    })));
    return { x, y };
  }
  const EXT = { '3d': extentFor('3d'), plan: extentFor('plan') };
  let homeZoom = 1, fitted = false;
  function fit() {
    const w = container.clientWidth || 1, h = container.clientHeight || 1, aspect = w / h, e = EXT[mode];
    const half = Math.max(e.y, e.x / aspect) * 1.04;
    homeZoom = aspect < 0.9 && mode === '3d' ? 1.7 : 1;
    if (!fitted) { camera.zoom = homeZoom; fitted = true; }
    camera.left = -half * aspect; camera.right = half * aspect; camera.top = half; camera.bottom = -half;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h); labels.setSize(w, h);
  }
  fit();
  new ResizeObserver(fit).observe(container);
  controls.addEventListener('change', () => {
    const t = controls.target;
    const cx = THREE.MathUtils.clamp(t.x, -BW / 2, BW / 2), cz = THREE.MathUtils.clamp(t.z, -BD / 2, BD / 2);
    if (cx !== t.x || cz !== t.z) { camera.position.x += cx - t.x; camera.position.z += cz - t.z; t.x = cx; t.z = cz; }
  });

  // ---------- 点选 ----------
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  let hovered = null, selected = null, down = null, fly = null, follow = null;
  function setGlow(id, on) {
    const it = items.get(id); if (!it) return;
    it.mats.forEach((m) => { m.emissive = new THREE.Color(on ? it.color : '#000000'); m.emissiveIntensity = on ? 0.35 : 0; });
    if (it.el) it.el.classList.toggle('is-hover', on && id !== selected);
  }
  function pick(e) {
    const r = renderer.domElement.getBoundingClientRect();
    ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, camera);
    const hit = ray.intersectObjects(pickMeshes, false)[0] || ray.intersectObjects(pickables, false)[0];
    return hit ? hit.object.userData.pick : null;
  }
  renderer.domElement.addEventListener('pointermove', (e) => {
    if (e.buttons) return;
    const id = pick(e);
    if (id === hovered) return;
    if (hovered && hovered !== selected) setGlow(hovered, false);
    hovered = id;
    if (id) setGlow(id, true);
    renderer.domElement.style.cursor = id ? 'pointer' : 'grab';
  });
  renderer.domElement.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; fly = null; follow = null; });
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
    const id = pick(e);
    if (id) select(id, true);
  });
  function select(id, fromScene) {
    if (selected && selected !== id) { setGlow(selected, false); const p = items.get(selected); if (p && p.el) p.el.classList.remove('is-sel'); }
    selected = id;
    const it = items.get(id);
    if (!it) { if (fromScene) onSelect(id); return; }
    setGlow(id, true);
    if (it.el) { it.el.classList.add('is-sel'); it.el.classList.remove('is-hover'); }
    const pos = it.agent ? it.agent.person.root.position.clone() : it.pos.clone();
    const close = id.startsWith('agent/') || id === 'boss';
    fly = { target: pos, zoom: Math.max(camera.zoom, close ? 2.6 : 1.8) };
    follow = it.agent || null;
    if (fromScene) onSelect(id);
  }
  function reset() {
    if (selected) { setGlow(selected, false); const p = items.get(selected); if (p && p.el) p.el.classList.remove('is-sel'); }
    selected = null; follow = null;
    fly = { target: MODES[mode].target.clone(), zoom: homeZoom, offset: MODES[mode].offset.clone() };
  }
  function setMode(m) {
    if (!MODES[m] || m === mode) return;
    mode = m;
    container.classList.toggle('hq-plan', m === 'plan');
    controls.enableRotate = m === '3d';
    controls.minPolarAngle = m === 'plan' ? 0 : 0.3;
    fit();
    // 直接跳过去：从斜角慢慢移到正上方，水平角度会留在原来的方向，平面图就歪了
    follow = null; fly = null;
    controls.target.copy(MODES[m].target);
    camera.position.copy(MODES[m].target).add(MODES[m].offset);
    camera.zoom = m === 'plan' ? 1 : homeZoom; camera.updateProjectionMatrix();
    controls.update();
  }

  // ---------- 动画 ----------
  const clock = new THREE.Clock();
  let visible = true, moodTick = 0;
  const perf = { on: true, n: 0, t: 0 };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(container);
  function frame() {
    requestAnimationFrame(frame);
    if (!visible || document.hidden) { clock.getDelta(); return; }
    // 员工按真实时间走：画面卡的电脑上也是正常速度（每次最多算 0.1 秒，分几次算完）
    const real = Math.min(clock.getDelta(), 2), t = clock.elapsedTime, dt = Math.min(real, 0.1);
    for (let left = real; left > 1e-6; left -= 0.1) {
      const step = Math.min(left, 0.1) * speed;   // 游戏秒
      if (!step) break;
      const gmin = step;                           // 1 倍速：真实 1 秒 = 游戏 1 分钟
      gameMin += gmin;
      if (gameMin >= 20 * 60) { gameMin = 8 * 60; day++; }
      agents.forEach((a) => updateAgent(a, step, gmin, t));
    }
    agents.forEach((a) => { if (a.bubbleT > 0) { a.bubbleT -= real; if (a.bubbleT <= 0) a.bubble.hidden = true; } });
    if ((moodTick += real) > 2) { moodTick = 0; moodTags(); applyDaylight(); }
    poseSit(bossP, t, true);
    const sel = selected && items.get(selected);
    ring.visible = !!(sel && sel.agent);
    if (ring.visible) { ring.position.set(sel.agent.person.root.position.x, 0.05, sel.agent.person.root.position.z); if (!REDUCED) ring.scale.setScalar(1 + Math.sin(t * 4) * 0.08); }
    // 前 4 秒太卡（每秒不到 24 张）就降到 1 倍解析度
    if (perf.on) { perf.n++; perf.t += real; if (perf.t > 4) { perf.on = false; if (perf.n / perf.t < 24 && renderer.getPixelRatio() > 1) { renderer.setPixelRatio(1); fit(); } } }
    M.led.emissiveIntensity = 0.6 + (Math.sin(t * 6) > 0 ? 0.6 : 0);
    if (fly || follow) {
      const target = fly ? fly.target : follow.person.root.position;
      const k = REDUCED ? 1 : 1 - Math.exp(-dt * (fly ? 6 : 4));
      if (fly && follow) fly.target.copy(follow.person.root.position);
      const delta = target.clone().sub(controls.target); delta.y = 0; delta.multiplyScalar(k);
      controls.target.add(delta); camera.position.add(delta);
      if (fly) {
        if (fly.offset) camera.position.lerp(controls.target.clone().add(fly.offset), k);
        camera.zoom += (fly.zoom - camera.zoom) * k; camera.updateProjectionMatrix();
        const settled = !fly.offset || camera.position.distanceTo(controls.target.clone().add(fly.offset)) < 0.05;
        if (settled && delta.length() < 0.004 && Math.abs(fly.zoom - camera.zoom) < 0.004) fly = null;
      }
    }
    controls.update();
    const pxPerUnit = (container.clientHeight / (camera.top - camera.bottom)) * camera.zoom;
    container.classList.toggle('hq-near', pxPerUnit > 30);
    renderer.render(scene, camera);
    labels.render(scene, camera);
  }
  frame();

  return {
    select: (id) => select(id, false),
    reset, setMode,
    zoom: (f) => { fly = null; follow = null; camera.zoom = THREE.MathUtils.clamp(camera.zoom * f, controls.minZoom, controls.maxZoom); camera.updateProjectionMatrix(); },
    status: (id) => { const it = items.get(id); return it && it.agent ? it.agent.doing : null; },
    agentInfo: (id) => {
      const it = items.get(id); if (!it || !it.agent) return null;
      const a = it.agent;
      return { doing: a.doing, why: a.why || '', host: !!a.host, state: a.state, mood: mood(a), needs: NEEDS.map((nd) => ({ key: nd.key, label: nd.label, value: Math.round(a.needs[nd.key]) })), busy: a.state !== 'sit' };
    },
    // 叫员工去做某件事：kind 是 coffee / pantry / wc / meeting / lounge / back
    command: (id, kind) => {
      const it = items.get(id); if (!it || !it.agent) return false;
      const a = it.agent;
      if (kind === 'back') { if (a.state === 'sit') return true; goBack(a); return true; }
      if (a.host) return false;
      // 那边没位子就去差不多的地方
      const alt = { coffee: ['water', 'pantry'], pantry: ['coffee'], wc: ['wash'], meeting: ['visit', 'lobby'], lounge: ['lobby', 'pantry'] };
      return [kind, ...(alt[kind] || [])].some((k) => go(a, k));
    },
    clock: () => ({ day, text: String(Math.floor(gameMin / 60)).padStart(2, '0') + ':' + String(Math.floor(gameMin % 60)).padStart(2, '0'), speed }),
    setSpeed: (v) => { speed = v; },
    setWalls: (low) => {
      const k = low ? 0.12 : 1;
      [M.wall, M.frame].forEach((m) => { const mesh = mergedBy.get(m); if (mesh) mesh.scale.y = k; });
      const w = mergedBy.get(M.window); if (w) w.visible = !low;
      glassPanes.forEach((g) => { g.visible = !low; });
    },
    info: () => ({ calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, pixelRatio: renderer.getPixelRatio() }),
    away: () => away,
    total: () => agents.length,
    occupants: (place) => agents.filter((a) => a.state === 'stay' && a.spot && a.spot.place === place).map((a) => a.name),
    setCompanyName: (n) => drawLogo(n)
  };
}
