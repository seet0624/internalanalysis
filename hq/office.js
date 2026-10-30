// 3D 公司：按 hq/company.js 的名单盖办公室、摆桌子、放员工。
// mountOffice(容器, 名单, { onSelect, stats }) → { select(id), reset() }
// id：'boss'、'dept/<部门 id>'、'agent/<部门 id>/<序号>'、'conn/<序号>'

import * as THREE from 'three';
import { OrbitControls } from '../vendor/three/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from '../vendor/three/CSS2DRenderer.js';

const COLS = 3, RW = 10, RD = 8, GAP = 1.8, WALL_H = 1.0;
const BOSS_COLOR = '#C99A3B';
const KIND_LABEL = { site: '网站', claude: 'Claude', planned: '筹备中' };
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const tint = (hex, amt) => new THREE.Color(hex).lerp(new THREE.Color('#FFFFFF'), amt);
const mat = (color, extra) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.85, metalness: 0 }, extra));

function box(w, h, d, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
function cyl(rt, rb, h, material, x = 0, y = 0, z = 0, seg = 24) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material);
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

// ---------- 屏幕画面 ----------
const screenCache = new Map();
function screenTexture(kind, color) {
  const key = kind + color;
  if (screenCache.has(key)) return screenCache.get(key);
  const c = document.createElement('canvas'); c.width = 256; c.height = 150;
  const g = c.getContext('2d');
  g.fillStyle = '#FBFBF8'; g.fillRect(0, 0, 256, 150);
  g.fillStyle = color; g.fillRect(0, 0, 256, 18);
  if (kind === 'sheet') {
    // 表格：几格标红，像审核中的技术单
    g.strokeStyle = '#D9D6CE'; g.lineWidth = 1;
    for (let y = 30; y < 150; y += 15) { g.beginPath(); g.moveTo(8, y); g.lineTo(248, y); g.stroke(); }
    for (let x = 8; x <= 248; x += 48) { g.beginPath(); g.moveTo(x, 24); g.lineTo(x, 144); g.stroke(); }
    const reds = [[1, 1], [3, 3], [5, 0], [2, 4], [6, 2]];
    g.fillStyle = 'rgba(217,71,60,.85)';
    reds.forEach(([r, col]) => g.fillRect(10 + col * 48, 32 + r * 15, 44, 11));
    g.fillStyle = '#9A978F';
    for (let r = 0; r < 7; r++) for (let col = 0; col < 5; col++) if (!reds.some(([a, b]) => a === r && b === col)) g.fillRect(12 + col * 48, 36 + r * 15, 18 + ((r * 7 + col * 11) % 18), 4);
  } else if (kind === 'chat') {
    // 对话：一来一往
    [[10, 28, 150, '#E6E3DC'], [96, 56, 150, color], [10, 84, 120, '#E6E3DC'], [76, 112, 170, color]].forEach(([x, y, w, f]) => {
      g.fillStyle = f; g.beginPath(); g.roundRect(x, y, w, 20, 8); g.fill();
    });
  } else if (kind === 'chart') {
    [40, 64, 52, 88, 76, 108].forEach((h, i) => { g.fillStyle = i === 5 ? color : '#C9C5BB'; g.fillRect(24 + i * 36, 140 - h, 22, h); });
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  screenCache.set(key, t);
  return t;
}

// ---------- 家具 ----------
const M = {
  floorBase: mat('#F3F1EC'), wall: mat('#FFFFFF', { roughness: 0.95 }),
  desk: mat('#EDE5D8'), deskLeg: mat('#B9B3A7'), chair: mat('#3A3F44'), monitor: mat('#22262A', { roughness: 0.5 }),
  head: mat('#F7F5F0', { roughness: 0.6 }), shelf: mat('#D8CDBA'), pot: mat('#C9BFAE'), leaf: mat('#4E8A5B'),
  metal: mat('#9EA4A8', { roughness: 0.4, metalness: 0.2 })
};

// 一张办公桌 + 一位员工（面向屏幕，屏幕朝镜头）
function workstation(color, screenKind, ghost) {
  const g = new THREE.Group();
  const parts = [];
  const deskMat = ghost ? mat('#FFFFFF', { transparent: true, opacity: 0.35 }) : M.desk;
  g.add(box(1.9, 0.08, 0.9, deskMat, 0, 0.74, 0));
  [[-0.88, -0.38], [0.88, -0.38], [-0.88, 0.38], [0.88, 0.38]].forEach(([x, z]) => g.add(box(0.06, 0.72, 0.06, M.deskLeg, x, 0.36, z)));
  if (ghost) return { group: g, parts };

  g.add(box(0.08, 0.28, 0.08, M.monitor, 0, 0.92, -0.22));
  const mon = box(1.0, 0.6, 0.05, M.monitor, 0, 1.3, -0.24); g.add(mon);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 0.52), new THREE.MeshBasicMaterial({ map: screenTexture(screenKind, color), toneMapped: false }));
  screen.position.set(0, 1.3, -0.21); g.add(screen);
  g.add(box(0.5, 0.02, 0.16, M.monitor, 0, 0.79, 0.12)); // 键盘

  // 椅子
  g.add(box(0.62, 0.08, 0.58, M.chair, 0, 0.5, 0.78));
  g.add(box(0.62, 0.6, 0.08, M.chair, 0, 0.84, 1.06));
  g.add(cyl(0.04, 0.04, 0.42, M.metal, 0, 0.25, 0.78, 8));

  // 员工：身体用部门颜色，白色头，戴耳机
  const bodyMat = mat(color, { roughness: 0.7 });
  const headMat = M.head.clone();
  const person = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.27, 0.42, 6, 16), bodyMat);
  body.position.y = 0.98; body.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 24, 16), headMat);
  head.position.y = 1.58; head.castShadow = true;
  const phones = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.035, 8, 24, Math.PI), mat('#22262A'));
  phones.position.y = 1.6; phones.rotation.y = Math.PI / 2;
  person.add(body, head, phones);
  person.position.z = 0.72;
  g.add(person);
  parts.push(body, head, mon, screen);
  return { group: g, parts, person, mats: [bodyMat, headMat] };
}

function plant(x, z, s = 1) {
  const g = new THREE.Group();
  g.add(cyl(0.22 * s, 0.17 * s, 0.38 * s, M.pot, 0, 0.19 * s, 0));
  const leaves = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42 * s, 0), M.leaf);
  leaves.position.y = 0.72 * s; leaves.castShadow = true;
  g.add(leaves); g.position.set(x, 0.1, z);
  return g;
}

// 设施里的摆设
function facilityProps(kind, color) {
  const g = new THREE.Group();
  const accent = mat(color);
  if (kind === 'mail') {
    g.add(box(1.8, 1.3, 0.5, M.shelf, 0, 0.75, -0.6));
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) g.add(box(0.36, 0.3, 0.04, M.monitor, -0.63 + c * 0.42, 0.45 + r * 0.38, -0.33));
    const env = box(0.7, 0.04, 0.46, mat('#FFFFFF'), 0, 1.44, -0.6); env.rotation.y = 0.25; g.add(env);
    g.add(box(0.7, 0.05, 0.04, accent, 0, 1.47, -0.6));
  } else if (kind === 'files') {
    [-0.8, 0, 0.8].forEach((x) => {
      g.add(box(0.7, 1.4, 0.6, M.metal, x, 0.8, -0.5));
      [0.45, 0.9, 1.35].forEach((y) => g.add(box(0.22, 0.05, 0.03, accent, x, y, -0.19)));
    });
  } else if (kind === 'meeting') {
    g.add(cyl(0.9, 0.9, 0.06, M.desk, 0, 0.74, 0));
    g.add(cyl(0.08, 0.12, 0.7, M.deskLeg, 0, 0.36, 0, 12));
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + Math.PI / 4;
      g.add(cyl(0.22, 0.22, 0.45, accent, Math.cos(a) * 1.3, 0.32, Math.sin(a) * 1.3, 16));
    }
  } else if (kind === 'design') {
    const legs = [[-0.35, 0.18], [0.35, 0.18], [0, -0.25]];
    legs.forEach(([x, z]) => { const l = box(0.05, 1.7, 0.05, M.deskLeg, x, 0.85, z); l.rotation.x = z > 0 ? -0.12 : 0.18; g.add(l); });
    const cv = document.createElement('canvas'); cv.width = 128; cv.height = 96;
    const cg = cv.getContext('2d');
    cg.fillStyle = '#FFFFFF'; cg.fillRect(0, 0, 128, 96);
    cg.fillStyle = color; cg.beginPath(); cg.arc(44, 46, 24, 0, Math.PI * 2); cg.fill();
    cg.fillStyle = '#F2B866'; cg.fillRect(66, 24, 40, 40);
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const art = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.68), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
    art.position.set(0, 1.25, 0.12); art.rotation.x = -0.12;
    g.add(art);
  }
  return g;
}

function label(html, className, onClick, ariaLabel) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = className;
  el.innerHTML = html;
  if (ariaLabel) el.setAttribute('aria-label', ariaLabel);
  el.addEventListener('pointerdown', (e) => e.stopPropagation());
  el.addEventListener('click', (e) => { e.stopPropagation(); onClick(); });
  return new CSS2DObject(el);
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function mountOffice(container, company, opts = {}) {
  const onSelect = opts.onSelect || (() => {});
  const stats = opts.stats || {};

  // ---------- 渲染器 ----------
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  container.appendChild(renderer.domElement);

  const labels = new CSS2DRenderer();
  labels.domElement.className = 'hq-labels';
  container.appendChild(labels.domElement);

  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#FFFFFF', '#E3DED3', 1.6));
  const sun = new THREE.DirectionalLight('#FFF6E8', 2.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0004;
  scene.add(sun, sun.target);

  // ---------- 平面配置 ----------
  const depts = company.departments || [];
  const rows = 1 + Math.ceil(depts.length / COLS);
  const W = COLS * RW + (COLS - 1) * GAP;
  const D = rows * RD + (rows - 1) * GAP;
  const colX = (c) => -W / 2 + RW / 2 + c * (RW + GAP);
  const rowZ = (r) => -D / 2 + RD / 2 + r * (RD + GAP);

  const sh = sun.shadow.camera;
  sh.left = -W / 2 - 4; sh.right = W / 2 + 4; sh.top = D / 2 + 4; sh.bottom = -D / 2 - 4; sh.far = 120;
  sun.position.set(-18, 40, 22);

  scene.add(box(W + 4, 0.4, D + 4, M.floorBase, 0, -0.2, 0));
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(W + 40, D + 40), new THREE.ShadowMaterial({ opacity: 0.12 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.41; ground.receiveShadow = true;
  scene.add(ground);

  const items = new Map();   // id → { meshes, mats, el, pos, color }
  const pickables = [];
  const bobbers = [];

  function register(id, meshes, mats, labelObj, pos, color) {
    meshes.forEach((m) => { m.userData.pick = id; pickables.push(m); });
    items.set(id, { meshes, mats: mats || [], el: labelObj ? labelObj.element : null, pos, color });
  }

  function room(x, z, w, d, color, planned) {
    const g = new THREE.Group(); g.position.set(x, 0, z);
    const floorMat = planned ? mat('#FFFFFF', { transparent: true, opacity: 0.5 }) : mat(tint(color, 0.86));
    const floor = box(w, 0.1, d, floorMat, 0, 0.05, 0); floor.castShadow = false; g.add(floor);
    if (planned) {
      const pts = [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2], [-w / 2, -d / 2]].map(([a, b]) => new THREE.Vector3(a, 0.12, b));
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color: '#8E949A', dashSize: 0.5, gapSize: 0.35 }));
      line.computeLineDistances(); g.add(line);
      return g;
    }
    const capMat = mat(color);
    g.add(box(w, WALL_H, 0.12, M.wall, 0, WALL_H / 2 + 0.1, -d / 2 + 0.06));
    g.add(box(w, 0.06, 0.14, capMat, 0, WALL_H + 0.13, -d / 2 + 0.06));
    [-1, 1].forEach((s) => {
      g.add(box(0.12, WALL_H, d, M.wall, s * (w / 2 - 0.06), WALL_H / 2 + 0.1, 0));
      g.add(box(0.14, 0.06, d, capMat, s * (w / 2 - 0.06), WALL_H + 0.13, 0));
    });
    return g;
  }

  // ---------- 第 0 排：老板办公室 + 设施 ----------
  {
    const bx = colX(1), bz = rowZ(0);
    scene.add(room(bx, bz, RW, RD, BOSS_COLOR));
    const rug = new THREE.Mesh(new THREE.CircleGeometry(2.6, 48), mat(tint(BOSS_COLOR, 0.6)));
    rug.rotation.x = -Math.PI / 2; rug.position.set(bx, 0.11, bz + 0.6); rug.receiveShadow = true; scene.add(rug);
    scene.add(box(3.2, 1.9, 0.45, M.shelf, bx, 1.05, bz - RD / 2 + 0.45));
    const bookColors = ['#0E6B66', '#3A6EA5', '#C26A00', '#B83A6E', '#2C6A37', '#6B4FA0'];
    for (let r = 0; r < 3; r++) for (let i = 0; i < 9; i++) scene.add(box(0.22, 0.42, 0.3, mat(bookColors[(i + r * 2) % 6]), bx - 1.35 + i * 0.32 + (r % 2) * 0.05, 0.42 + r * 0.6, bz - RD / 2 + 0.5));
    scene.add(plant(bx - RW / 2 + 0.8, bz - RD / 2 + 0.8, 1.3), plant(bx + RW / 2 - 0.8, bz - RD / 2 + 0.8, 1.1));

    // 老板桌：老板面向全公司
    const desk = new THREE.Group(); desk.position.set(bx, 0, bz - 0.6);
    desk.add(box(2.8, 0.1, 1.2, mat('#6E5536', { roughness: 0.6 }), 0, 0.78, 0));
    desk.add(box(2.7, 0.7, 0.08, mat('#5E482D'), 0, 0.38, 0.5));
    const lap = box(0.6, 0.38, 0.04, M.monitor, 0.6, 1.02, -0.05); lap.rotation.x = 0.25; desk.add(lap);
    desk.add(box(0.8, 0.1, 0.75, M.chair, 0, 0.55, -0.95));
    desk.add(box(0.8, 1.0, 0.1, M.chair, 0, 1.05, -1.35));
    const bossMat = mat(BOSS_COLOR, { roughness: 0.5, metalness: 0.15 });
    const bossHead = M.head.clone();
    const boss = new THREE.Group(); boss.position.z = -0.95;
    const bb = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.5, 6, 16), bossMat); bb.position.y = 1.12; bb.castShadow = true;
    const bh = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 16), bossHead); bh.position.y = 1.82; bh.castShadow = true;
    const tie = box(0.1, 0.4, 0.04, mat('#8C1D18'), 0, 1.22, 0.33);
    boss.add(bb, bh, tie); desk.add(boss);
    [-0.8, 0.8].forEach((x) => { desk.add(box(0.6, 0.08, 0.6, mat(tint(BOSS_COLOR, 0.3)), x, 0.48, 1.35)); desk.add(box(0.6, 0.5, 0.08, mat(tint(BOSS_COLOR, 0.3)), x, 0.75, 1.62)); });
    scene.add(desk);
    bobbers.push({ obj: boss, base: 0, phase: 0.3 });

    const b = company.boss || { name: '你', title: '老板' };
    const sign = label(`<i style="background:${BOSS_COLOR}"></i>老板办公室<small>${esc(b.title)}（${esc(b.name)}）</small>`, 'hq-sign hq-sign-boss', () => select('boss', true));
    sign.position.set(bx, WALL_H + 0.9, bz - RD / 2); scene.add(sign);
    register('boss', [bb, bh], [bossMat, bossHead], sign, new THREE.Vector3(bx, 1, bz - 0.6), BOSS_COLOR);

    // 设施：左右两边各放一半
    const conns = company.connectors || [];
    const left = conns.slice(0, Math.ceil(conns.length / 2)), right = conns.slice(Math.ceil(conns.length / 2));
    [[left, 0], [right, 2]].forEach(([list, col]) => {
      if (!list.length) return;
      const g = 0.6, w = (RW - (list.length - 1) * g) / list.length;
      list.forEach((cn, k) => {
        const i = conns.indexOf(cn), id = 'conn/' + i, color = '#55544E';
        const x = colX(col) - RW / 2 + w / 2 + k * (w + g), z = rowZ(0);
        scene.add(room(x, z, w, RD, color));
        const props = facilityProps(cn.kind, ['#D9473C', '#3A6EA5', '#2C6A37', '#B83A6E'][i % 4]);
        props.position.set(x, 0.1, z - 0.6); scene.add(props);
        scene.add(plant(x + w / 2 - 0.6, z + RD / 2 - 0.7, 0.8));
        const meshes = []; props.traverse((o) => { if (o.isMesh) meshes.push(o); });
        const s = label(`<i style="background:${color}"></i>${esc(cn.room)}<small>${esc(cn.name)}</small>`, 'hq-sign hq-sign-conn', () => select(id, true));
        s.position.set(x, WALL_H + 0.9, z - RD / 2); scene.add(s);
        register(id, meshes, [], s, new THREE.Vector3(x, 1, z), color);
      });
    });
  }

  // ---------- 部门 ----------
  depts.forEach((dept, i) => {
    const x = colX(i % COLS), z = rowZ(1 + Math.floor(i / COLS));
    const planned = dept.kind === 'planned';
    scene.add(room(x, z, RW, RD, dept.color, planned));
    const sign = label(`<i style="background:${dept.color}"></i>${esc(dept.name)}<small>${KIND_LABEL[dept.kind] || ''}</small>`, 'hq-sign' + (planned ? ' hq-sign-planned' : ''), () => select('dept/' + dept.id, true));
    sign.position.set(x, WALL_H + 0.9, z - RD / 2); scene.add(sign);
    register('dept/' + dept.id, [], [], sign, new THREE.Vector3(x, 1, z), dept.color);

    const agents = planned ? [null, null, null] : dept.agents || [];
    const perRow = agents.length > 4 ? 3 : Math.min(agents.length, 2) || 1;
    const nRows = Math.ceil(agents.length / perRow);
    const sx = RW / (perRow + 0.4), sz = 3.0;
    agents.forEach((a, k) => {
      const r = Math.floor(k / perRow), c = k % perRow, inRow = Math.min(perRow, agents.length - r * perRow);
      const ax = x + (c - (inRow - 1) / 2) * sx, az = z + 0.4 + (r - (nRows - 1) / 2) * sz;
      const ws = workstation(dept.color, dept.kind === 'site' ? 'sheet' : 'chat', planned);
      ws.group.position.set(ax, 0.1, az);
      scene.add(ws.group);
      if (!a) return;
      const id = `agent/${dept.id}/${k}`;
      const stat = a.stat && stats[a.stat] ? `<span class="hq-tag-stat">${esc(stats[a.stat])}</span>` : '';
      const tag = label(`<span class="hq-tag-name">${esc(a.name)}</span><span class="hq-tag-role">${esc(a.role)}</span>${stat}`, 'hq-tag', () => select(id, true), `${dept.name} ${a.name}，${a.role}`);
      tag.position.set(ax, 2.35, az + 0.82); scene.add(tag);
      register(id, ws.parts, ws.mats, tag, new THREE.Vector3(ax, 1, az), dept.color);
      bobbers.push({ obj: ws.person, base: 0, phase: k * 1.7 + i });
    });
    if (!planned) scene.add(plant(x - RW / 2 + 0.7, z + RD / 2 - 0.7, 0.8));
  });

  // ---------- 镜头 ----------
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 400);
  const HOME = { target: new THREE.Vector3(0, 0, 0), offset: new THREE.Vector3(30, 38, 46) };
  camera.position.copy(HOME.target).add(HOME.offset);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(HOME.target);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.minPolarAngle = 0.35; controls.maxPolarAngle = 1.2;
  controls.minZoom = 0.8; controls.maxZoom = 4;
  controls.screenSpacePanning = false;
  controls.update();

  // 全景时整间公司在镜头里占多大：把地板四角投影到镜头平面量出来
  const extent = (() => {
    const cam = camera.clone(); cam.position.copy(HOME.target).add(HOME.offset); cam.lookAt(HOME.target); cam.updateMatrixWorld();
    let x = 0, y = 0;
    [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => [0, 2.4].forEach((py) => {
      const v = new THREE.Vector3(sx * (W / 2 + 2), py, sz * (D / 2 + 2)).applyMatrix4(cam.matrixWorldInverse);
      x = Math.max(x, Math.abs(v.x)); y = Math.max(y, Math.abs(v.y));
    })));
    return { x, y };
  })();

  // 手机直放时整间公司太小，全景先放大一点，拖动看其他部门
  let homeZoom = 1, fitted = false;
  function fit() {
    const w = container.clientWidth || 1, h = container.clientHeight || 1, aspect = w / h;
    const half = Math.max(extent.y, extent.x / aspect) * 1.03;
    homeZoom = aspect < 0.9 ? 1.6 : 1;
    if (!fitted) { camera.zoom = homeZoom; fitted = true; }
    camera.left = -half * aspect; camera.right = half * aspect; camera.top = half; camera.bottom = -half;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h); labels.setSize(w, h);
  }
  fit();
  new ResizeObserver(fit).observe(container);

  // 不让镜头跑出公司外面
  controls.addEventListener('change', () => {
    const t = controls.target, lim = new THREE.Vector3(W / 2, 0, D / 2);
    const cx = THREE.MathUtils.clamp(t.x, -lim.x, lim.x), cz = THREE.MathUtils.clamp(t.z, -lim.z, lim.z);
    if (cx !== t.x || cz !== t.z) { camera.position.x += cx - t.x; camera.position.z += cz - t.z; t.x = cx; t.z = cz; }
  });

  // ---------- 点选 ----------
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  let hovered = null, selected = null, down = null, fly = null;

  function setGlow(id, on) {
    const it = items.get(id); if (!it) return;
    it.mats.forEach((m) => { m.emissive = new THREE.Color(on ? it.color : '#000000'); m.emissiveIntensity = on ? 0.35 : 0; });
    if (it.el) it.el.classList.toggle('is-hover', on && id !== selected);
  }
  function pick(e) {
    const r = renderer.domElement.getBoundingClientRect();
    ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, camera);
    const hit = ray.intersectObjects(pickables, false)[0];
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
  renderer.domElement.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; fly = null; });
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
    const id = pick(e);
    if (id) select(id, true);
  });

  function select(id, fromScene) {
    if (selected && selected !== id) { setGlow(selected, false); const p = items.get(selected); if (p && p.el) p.el.classList.remove('is-sel'); }
    selected = id;
    const it = items.get(id);
    if (!it) return;
    setGlow(id, true);
    if (it.el) { it.el.classList.add('is-sel'); it.el.classList.remove('is-hover'); }
    fly = { target: it.pos.clone(), zoom: Math.max(camera.zoom, id.startsWith('dept/') ? 1.6 : 2.1) };
    if (fromScene) onSelect(id);
  }
  function reset() {
    if (selected) { setGlow(selected, false); const p = items.get(selected); if (p && p.el) p.el.classList.remove('is-sel'); }
    selected = null;
    fly = { target: HOME.target.clone(), zoom: homeZoom, offset: HOME.offset.clone() };
  }

  // ---------- 动画 ----------
  const clock = new THREE.Clock();
  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(container);

  function frame() {
    requestAnimationFrame(frame);
    if (!visible || document.hidden) { clock.getDelta(); return; }
    const dt = Math.min(clock.getDelta(), 0.1), t = clock.elapsedTime;
    if (!REDUCED) bobbers.forEach((b) => { b.obj.position.y = b.base + Math.sin(t * 1.6 + b.phase) * 0.03; b.obj.rotation.y = Math.sin(t * 0.5 + b.phase) * 0.12; });
    if (fly) {
      const k = REDUCED ? 1 : 1 - Math.exp(-dt * 7);
      const delta = fly.target.clone().sub(controls.target).multiplyScalar(k);
      controls.target.add(delta); camera.position.add(delta);
      if (fly.offset) camera.position.lerp(controls.target.clone().add(fly.offset), k);
      camera.zoom += (fly.zoom - camera.zoom) * k; camera.updateProjectionMatrix();
      if (delta.length() < 0.005 && Math.abs(fly.zoom - camera.zoom) < 0.005) fly = null;
    }
    controls.update();
    // 员工在屏幕上够大（每公尺 15 像素以上）才显示名牌，免得挤成一团
    const pxPerUnit = (container.clientHeight / (camera.top - camera.bottom)) * camera.zoom;
    container.classList.toggle('hq-near', pxPerUnit > 15);
    renderer.render(scene, camera);
    labels.render(scene, camera);
  }
  frame();

  return {
    select: (id) => select(id, false),
    reset,
    zoom: (f) => { fly = null; camera.zoom = THREE.MathUtils.clamp(camera.zoom * f, controls.minZoom, controls.maxZoom); camera.updateProjectionMatrix(); }
  };
}
