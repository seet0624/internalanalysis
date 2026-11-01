// 公司大楼外观：首页 3D 公司和 AI 指挥中心共用同一份（纯 three.js，不靠 React）。
// buildEntrance  大门：雨遮、两侧黄铜 Logo 石墙、四翼玻璃旋转门、台阶
// buildPlaza     门前广场：路灯、旗杆、长椅、矮柱、花台
// buildRoof      屋顶：女儿墙、屋顶设备、天窗、屋顶上的 Logo 招牌；setOpacity 淡出看里面
// buildLogoWall  大厅的 Logo 背景墙
// 每个都回传 { group, materials, update(t) }：materials 给场景做淡入淡出，update 让旋转门转
import * as THREE from 'three';

const C = {
  stone: '#E8E1D3', stoneDark: '#D9CFBC', brass: '#B8933F', brassDeep: '#8C6B24', glass: '#F3EAD3',
  frame: '#C8B68E', paper: '#FFFDF8', roof: '#EDE6D8', parapet: '#E2DCD1', unit: '#C9C2B6', wood: '#A88B5C', lamp: '#FFF1C9'
};

// 共用：Logo + 「数易」字样做成一张贴图（中文字用电脑自带字体）
const texCache = new Map();
export function logoTexture(logoUrl, opts = {}) {
  const key = logoUrl + '|' + (opts.text || '') + '|' + (opts.bg || '');
  if (texCache.has(key)) return texCache.get(key);
  const w = opts.width || 1024, h = opts.height || 512;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const paint = (img) => {
    g.clearRect(0, 0, w, h);
    if (opts.bg) { g.fillStyle = opts.bg; g.fillRect(0, 0, w, h); }
    const s = h * 0.72, pad = h * 0.14;
    const textOnly = !img;
    if (img) g.drawImage(img, opts.text ? pad : (w - s) / 2, (h - s) / 2, s, s);
    if (opts.text) {
      g.fillStyle = opts.color || C.brassDeep;
      g.textBaseline = 'middle';
      g.font = `600 ${Math.round(h * 0.34)}px "PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif`;
      const x = textOnly ? pad : pad * 2 + s;
      g.fillText(opts.text, x, h * (opts.sub ? 0.42 : 0.5));
      if (opts.sub) {
        g.font = `500 ${Math.round(h * 0.12)}px "Helvetica Neue",Arial,sans-serif`;
        g.fillStyle = opts.subColor || '#8A8173';
        g.fillText(opts.sub.split('').join(String.fromCharCode(8202)), x + 4, h * 0.74);
      }
    }
    tex.needsUpdate = true;
  };
  paint(null);
  const img = new Image();
  img.onload = () => paint(img);
  img.src = logoUrl;
  texCache.set(key, tex);
  return tex;
}

function mats() {
  const list = [];
  const std = (color, extra = {}) => { const m = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.05, ...extra }); m.userData.base = m.opacity; list.push(m); return m; };
  // alpha：贴图本身有透明（招牌、Logo），淡入淡出时不能把 transparent 关掉
  const basic = (opt) => { const m = new THREE.MeshBasicMaterial(opt); m.userData.base = m.opacity; m.userData.alpha = !!opt.transparent; list.push(m); return m; };
  return { list, std, basic };
}
const noPick = (o) => { o.traverse((x) => { if (x.isMesh) x.raycast = () => {}; }); return o; };
function boxAt(parent, w, h, d, m, x, y, z, shadow = true) {
  const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z);
  o.castShadow = shadow; o.receiveShadow = true; parent.add(o); return o;
}
function cylAt(parent, rt, rb, h, m, x, y, z, seg = 20) {
  const o = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m); o.position.set(x, y, z);
  o.castShadow = true; o.receiveShadow = true; parent.add(o); return o;
}

// 大门（面向 +z）。原点 = 门的中心、地面高度
export function buildEntrance({ width = 6, height = 3.1, logoUrl = '', name = '数易', sub = 'SHUYI' } = {}) {
  const M = mats(), group = new THREE.Group();
  const stone = M.std(C.stone, { roughness: 0.7 }), stone2 = M.std(C.stoneDark, { roughness: 0.75 });
  const brass = M.std(C.brass, { metalness: 0.75, roughness: 0.3 }), frame = M.std(C.frame, { metalness: 0.5, roughness: 0.35 });
  const glass = M.std(C.glass, { transparent: true, opacity: 0.28, roughness: 0.05, metalness: 0.2, depthWrite: false });
  const plaque = M.basic({ map: logoTexture(logoUrl, { text: name, sub, width: 1024, height: 384 }), transparent: true, toneMapped: false });
  const doorW = 2.2, pylonW = (width - doorW) / 2;
  // 台阶、门前地垫
  boxAt(group, width + 1.6, 0.12, 1.4, stone2, 0, 0.06, 0.9);
  boxAt(group, width + 0.8, 0.12, 0.8, stone, 0, 0.18, 0.5);
  // 两侧石墙 + 黄铜 Logo 牌
  for (const k of [-1, 1]) {
    const x = k * (doorW / 2 + pylonW / 2);
    boxAt(group, pylonW, height, 0.6, stone, x, height / 2, 0);
    boxAt(group, pylonW - 0.2, 0.05, 0.62, brass, x, height - 0.25, 0);
  }
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(width - doorW - 0.4, 3.2) * 0.9, 1.1), plaque);
  sign.position.set(-(doorW / 2 + pylonW / 2), 1.55, 0.31); group.add(sign);
  // 雨遮（悬臂）+ 金边
  boxAt(group, width + 1.2, 0.22, 2.0, M.std(C.paper, { roughness: 0.5 }), 0, height + 0.11, 0.6);
  boxAt(group, width + 1.2, 0.05, 0.05, brass, 0, height, 1.6);
  // 雨遮上方的立体字招牌
  const top = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.0), M.basic({ map: logoTexture(logoUrl, { text: name, width: 1024, height: 300 }), transparent: true, toneMapped: false }));
  top.position.set(0, height + 0.75, 0.2); group.add(top);
  // 旋转门：玻璃圆筒 + 四片门翼
  const R = doorW / 2 - 0.08;
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(R, R, height - 0.2, 32, 1, true), glass); drum.position.set(0, (height - 0.2) / 2 + 0.24, 0); group.add(drum);
  cylAt(group, R + 0.06, R + 0.06, 0.12, frame, 0, height - 0.02, 0, 32);
  cylAt(group, R + 0.06, R + 0.06, 0.06, frame, 0, 0.27, 0, 32);
  const wings = new THREE.Group(); wings.position.y = 0.24; group.add(wings);
  for (let i = 0; i < 4; i++) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(R - 0.05, height - 0.4, 0.03), glass);
    wing.position.set(Math.cos(i * Math.PI / 2) * (R / 2), (height - 0.4) / 2, Math.sin(i * Math.PI / 2) * (R / 2));
    wing.rotation.y = -i * Math.PI / 2; wings.add(wing);
    const edge = new THREE.Mesh(new THREE.BoxGeometry(R - 0.05, 0.04, 0.05), frame);
    edge.position.copy(wing.position); edge.position.y = height - 0.42; edge.rotation.y = wing.rotation.y; wings.add(edge);
  }
  cylAt(wings, 0.05, 0.05, height - 0.4, brass, 0, (height - 0.4) / 2, 0, 12);
  noPick(group);
  return { group, materials: M.list, update: (t) => { wings.rotation.y = t * 0.45; } };
}

// 门前广场。原点 = 大门中心；广场往 +z 延伸 depth
export function buildPlaza({ width = 18, depth = 8 } = {}) {
  const M = mats(), group = new THREE.Group();
  const metal = M.std('#8A8174', { metalness: 0.6, roughness: 0.4 }), lampM = M.basic({ color: C.lamp, toneMapped: false });
  const wood = M.std(C.wood, { roughness: 0.7 }), stone = M.std(C.stone, { roughness: 0.75 }), white = M.std(C.paper);
  // 路灯
  for (const x of [-width / 2 + 1, -width / 4, width / 4, width / 2 - 1]) {
    cylAt(group, 0.06, 0.09, 3.6, metal, x, 1.8, depth - 0.6, 10);
    boxAt(group, 0.55, 0.12, 0.3, metal, x, 3.62, depth - 0.6);
    boxAt(group, 0.45, 0.04, 0.22, lampM, x, 3.55, depth - 0.6, false);
  }
  // 三根旗杆
  [-1, 0, 1].forEach((k) => {
    const x = width / 2 - 2.6 + k * 0.9;
    cylAt(group, 0.04, 0.05, 6.5, white, x, 3.25, 2.4, 10);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.7), M.std(k === 0 ? '#B8933F' : '#F3EAD3', { side: THREE.DoubleSide, roughness: 0.9 }));
    flag.position.set(x + 0.57, 6.0, 2.4); group.add(flag);
  });
  // 长椅、矮柱
  for (const x of [-width / 2 + 3, width / 2 - 5.5]) {
    boxAt(group, 1.8, 0.08, 0.5, wood, x, 0.45, depth - 2.2);
    boxAt(group, 0.12, 0.42, 0.42, stone, x - 0.7, 0.21, depth - 2.2);
    boxAt(group, 0.12, 0.42, 0.42, stone, x + 0.7, 0.21, depth - 2.2);
  }
  for (let i = 0; i < 6; i++) cylAt(group, 0.1, 0.12, 0.7, stone, -2.5 + i, 0.35, depth - 0.2, 12);
  noPick(group);
  return { group, materials: M.list, update: () => {} };
}

// 屋顶。原点 = 屋顶中心、屋顶面高度；面积 w × d
export function buildRoof({ w = 36, d = 22, logoUrl = '', name = '数易', sub = 'SHUYI REVIEW HQ', signSide = 1 } = {}) {
  const M = mats(), group = new THREE.Group();
  const roof = M.std(C.roof, { roughness: 0.85 }), parapet = M.std(C.parapet, { roughness: 0.8 }), unit = M.std(C.unit, { roughness: 0.6, metalness: 0.2 });
  const brass = M.std(C.brass, { metalness: 0.7, roughness: 0.3 });
  const sky = M.std(C.glass, { transparent: true, opacity: 0.55, roughness: 0.05, metalness: 0.3 });
  boxAt(group, w + 0.4, 0.3, d + 0.4, roof, 0, -0.15, 0);
  // 女儿墙 + 金色压顶线
  for (const [sx, sz, lw, ld] of [[0, d / 2, w + 0.4, 0.25], [0, -d / 2, w + 0.4, 0.25], [w / 2, 0, 0.25, d + 0.4], [-w / 2, 0, 0.25, d + 0.4]]) {
    boxAt(group, lw, 0.7, ld, parapet, sx, 0.35, sz);
    boxAt(group, lw + 0.02, 0.05, ld + 0.02, brass, sx, 0.72, sz);
  }
  // 冷气主机、天窗
  for (let i = 0; i < 3; i++) {
    boxAt(group, 2.2, 1.0, 1.4, unit, -w / 2 + 4 + i * 3, 0.5, -d / 2 + 2.5);
    cylAt(group, 0.45, 0.45, 0.12, M.std('#8A8174'), -w / 2 + 4 + i * 3, 1.06, -d / 2 + 2.5, 18);
  }
  for (let i = 0; i < 4; i++) boxAt(group, 3, 0.25, 2, sky, -w / 4 + (i % 2) * w / 2 - 1.5 + 3, 0.13, (i < 2 ? -1 : 1) * d / 6);
  // 屋顶 Logo 招牌（站在前面的女儿墙上，面向镜头）
  const signW = Math.min(w * 0.42, 14);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(signW, signW * 0.36), M.basic({ map: logoTexture(logoUrl, { text: name, sub, width: 1400, height: 504 }), transparent: true, toneMapped: false, side: THREE.DoubleSide }));
  sign.position.set(0, 0.75 + signW * 0.18, signSide * (d / 2 + 0.05)); group.add(sign);
  for (const k of [-0.42, 0.42]) boxAt(group, 0.08, signW * 0.2, 0.08, brass, k * signW, 0.75 + signW * 0.1, signSide * (d / 2 - 0.05));
  noPick(group);
  const setOpacity = (o) => {
    for (const m of M.list) {
      const base = m.userData.base ?? 1, v = base * o;
      const t = v < 0.999 || base < 1 || !!m.userData.alpha;
      if (m.transparent !== t) { m.transparent = t; m.needsUpdate = true; }
      m.opacity = v; m.depthWrite = o > 0.6 && base >= 1;
    }
    group.visible = o > 0.01;
  };
  return { group, materials: M.list, update: () => {}, setOpacity };
}

// 只有屋顶招牌（指挥中心的天台已经是花园，不另盖屋顶）。原点 = 招牌底部中心，面向 +z
export function buildRoofSign({ width = 12, logoUrl = '', name = '数易', sub = 'SHUYI REVIEW HQ' } = {}) {
  const M = mats(), group = new THREE.Group();
  const brass = M.std(C.brass, { metalness: 0.7, roughness: 0.3 });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(width, width * 0.36), M.basic({ map: logoTexture(logoUrl, { text: name, sub, width: 1400, height: 504 }), transparent: true, toneMapped: false, side: THREE.DoubleSide }));
  sign.position.set(0, 0.4 + width * 0.18, 0); group.add(sign);
  for (const k of [-0.42, 0.42]) boxAt(group, 0.1, 0.4 + width * 0.1, 0.1, brass, k * width, (0.4 + width * 0.1) / 2, -0.06);
  boxAt(group, width * 0.92, 0.08, 0.12, brass, 0, 0.4, -0.06);
  noPick(group);
  return { group, materials: M.list, update: () => {} };
}

// 大厅 Logo 背景墙（面向 +z）
export function buildLogoWall({ width = 5, height = 2.4, logoUrl = '', name = '数易', sub = 'SHUYI' } = {}) {
  const M = mats(), group = new THREE.Group();
  const wood = M.std(C.wood, { roughness: 0.65 }), brass = M.std(C.brass, { metalness: 0.7, roughness: 0.3 });
  boxAt(group, width, height, 0.12, M.std('#F3EAD3', { roughness: 0.6 }), 0, height / 2, 0);
  for (let i = 0; i < 14; i++) boxAt(group, 0.06, height, 0.08, wood, -width / 2 + 0.2 + i * (width - 0.4) / 13, height / 2, 0.08);
  const p = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.62, width * 0.62 * 0.375), M.basic({ map: logoTexture(logoUrl, { text: name, sub, width: 1024, height: 384, bg: '#FFFDF8' }), toneMapped: false }));
  p.position.set(0, height * 0.58, 0.14); group.add(p);
  boxAt(group, width * 0.66, 0.04, 0.05, brass, 0, height * 0.58 - width * 0.62 * 0.19 - 0.08, 0.14);
  noPick(group);
  return { group, materials: M.list, update: () => {} };
}
