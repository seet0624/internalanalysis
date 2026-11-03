// 部门小办公室（参考图：深色背景、等距视角、方块风格）：一个部门一间，上面的分页切换。
// 两面墙（后面、左边）+ 木地板，像一个摆在桌上的模型；工位两两对坐，右边是会议桌、茶水间、沙发。
// 人和 AI 员工都是同一个方块小人（AI 头上多一根发光天线），坐在工位上打字、起来去倒水、拿文件找同事交接。
import { useMemo, useState } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Floor, Person } from '../types';
import { useStore } from '../lib/store';
import { useLang } from '../lib/i18n';
import { useLive } from '../lib/live';
import { Builder } from './layout';
import { Batch } from './Batch';
import { Crew } from './Crew';
import { STATUS_COLOR, type Placement } from './status';
import { GEO, makeFloorMats } from './shared';
import { photoTexture } from './textures';

export const ROOM = { w: 14, d: 10 };
const X0 = -ROOM.w / 2, Z0 = -ROOM.d / 2;
const WALL = '#2F3542', TRIM = '#465063', DARK = '#1B1F27';
const LANE_X = 2.75;   // 工位区和右边（会议桌、茶水间、沙发）中间的走道

let seed = 1;
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];

type Seat = { x: number; z: number; ry: number };
export type OfficeLayout = { b: Builder; seats: Seat[]; walkways: number[]; shelf: { x: number; z: number; w: number } };

// 工位：浅木桌面、深色桌脚、一台发亮的屏幕、键盘、滑鼠、杯子；椅子在 facing 的反方向
function desk(b: Builder, x: number, z: number, w: number, facing: 1 | -1, screen: string) {
  b.box(x, 0.7, z, w, 0.06, 0.72, '#C9A27A');
  for (const k of [-1, 1]) b.box(x + k * (w / 2 - 0.05), 0, z, 0.07, 0.7, 0.66, '#2B2F38');
  const mz = z + facing * 0.16;
  b.box(x, 0.76, mz + facing * 0.05, 0.28, 0.02, 0.16, '#2B2F38');
  b.box(x, 0.76, mz + facing * 0.05, 0.07, 0.2, 0.05, '#2B2F38');
  b.box(x, 0.9, mz, 0.8, 0.46, 0.05, '#15181E');
  b.glow(x, 0.93, mz - facing * 0.03, 0.73, 0.4, 0.008, screen);
  b.glow(x - 0.14, 1.2, mz - facing * 0.036, 0.38, 0.035, 0.004, '#FFFFFF');
  b.glow(x + 0.04, 1.1, mz - facing * 0.036, 0.56, 0.03, 0.004, '#E8F0FE');
  b.glow(x - 0.06, 1.02, mz - facing * 0.036, 0.48, 0.03, 0.004, '#E8F0FE');
  b.box(x, 0.76, z - facing * 0.12, 0.46, 0.025, 0.15, '#3C4048');
  b.box(x + 0.34, 0.76, z - facing * 0.12, 0.07, 0.03, 0.11, '#E8EAED');
  b.box(x - w / 2 + 0.2, 0.76, z - facing * 0.08, 0.1, 0.12, 0.1, pick(['#EA4335', '#FBBC04', '#FFFFFF', '#34A853', '#4FC3F7']));
  if (rnd() < 0.35) { b.box(x + w / 2 - 0.18, 0.76, z + facing * 0.2, 0.14, 0.12, 0.14, '#E8E4DC'); b.box(x + w / 2 - 0.18, 0.88, z + facing * 0.2, 0.2, 0.18, 0.2, '#4CAF50'); }
  b.chair(x, z - facing * 0.62, facing === 1 ? 0 : Math.PI, '#3C4252');
}

// 方块盆栽
function plant(b: Builder, x: number, z: number, s = 1) {
  b.box(x, 0, z, 0.42 * s, 0.4 * s, 0.42 * s, '#D7CCC8');
  b.box(x, 0.4 * s, z, 0.52 * s, 0.46 * s, 0.52 * s, '#3E8E41');
  b.box(x + 0.08 * s, 0.82 * s, z - 0.05 * s, 0.38 * s, 0.36 * s, 0.38 * s, '#4CAF50');
  b.box(x - 0.08 * s, 1.12 * s, z + 0.06 * s, 0.24 * s, 0.26 * s, 0.24 * s, '#66BB6A');
}

// 后墙的窗：夜晚的城市（楼的剪影 + 亮着的窗）
function windowView(b: Builder, x: number) {
  const zf = Z0 + 0.03, w = 2.2, h = 1.25, y = 1.12;
  b.box(x, y - 0.06, zf, w + 0.12, h + 0.12, 0.06, DARK);
  b.glow(x, y, zf + 0.035, w, h, 0.008, '#1C2E4A');
  let bx = x - w / 2;
  while (bx < x + w / 2 - 0.12) {
    const bw = 0.18 + rnd() * 0.32, bh = 0.25 + rnd() * 0.75, cxw = Math.min(bw, x + w / 2 - bx);
    b.glow(bx + cxw / 2, y, zf + 0.04, cxw, bh, 0.006, '#101A2B');
    for (let wy = y + 0.06; wy < y + bh - 0.08; wy += 0.12) for (let wx = bx + 0.05; wx < bx + cxw - 0.05; wx += 0.09) {
      if (rnd() < 0.45) b.glow(wx, wy, zf + 0.046, 0.035, 0.05, 0.004, rnd() < 0.8 ? '#FFD27A' : '#9AD8FF');
    }
    bx += bw + 0.03;
  }
  b.box(x, y, zf + 0.06, 0.05, h, 0.03, DARK);
  b.box(x, y + h / 2, zf + 0.06, w, 0.04, 0.03, DARK);
  b.box(x, y - 0.12, zf + 0.12, w + 0.2, 0.05, 0.2, TRIM);   // 窗台
}

export function buildOffice(n: number, accent: string): OfficeLayout {
  seed = 7 + n;
  const b = new Builder();
  // ---- 墙 ----
  b.box(0, 0, Z0 - 0.1, ROOM.w + 0.4, 2.8, 0.2, WALL);
  b.box(X0 - 0.1, 0, 0.1, 0.2, 2.8, ROOM.d + 0.2, WALL);
  b.box(0, 2.8, Z0 - 0.1, ROOM.w + 0.44, 0.08, 0.26, TRIM);
  b.box(X0 - 0.1, 2.8, 0.1, 0.26, 0.08, ROOM.d + 0.24, TRIM);
  b.box(0, 0, Z0 + 0.02, ROOM.w, 0.12, 0.04, DARK);
  b.box(X0 + 0.02, 0, 0, 0.04, 0.12, ROOM.d, DARK);
  b.glow(0, 0.98, Z0 + 0.011, ROOM.w, 0.04, 0.01, accent);       // 部门色的一条灯带
  b.glow(X0 + 0.011, 0.98, 0, 0.01, 0.04, ROOM.d, accent);
  windowView(b, -1.3);
  windowView(b, 4.4);
  // ---- 左墙：书架（业务手册）、任务看板、置物柜 ----
  const shelf = { x: X0 + 0.27, z: -3.0, w: 2.4 };
  b.box(X0 + 0.05, 0, shelf.z, 0.06, 2.2, shelf.w, '#3A2B20');
  for (const sz of [-1, 1]) b.box(shelf.x, 0, shelf.z + sz * (shelf.w / 2 - 0.03), 0.5, 2.2, 0.06, '#5E4636');
  for (const y of [0, 0.55, 1.1, 1.65, 2.16]) {
    b.box(shelf.x, y, shelf.z, 0.5, 0.05, shelf.w, '#5E4636');
    if (y > 2) continue;
    let bz = shelf.z - shelf.w / 2 + 0.1;
    while (bz < shelf.z + shelf.w / 2 - 0.16) {
      const bw = 0.06 + rnd() * 0.07, bh = 0.32 + rnd() * 0.14;
      b.box(shelf.x + 0.02, y + 0.05, bz + bw / 2, 0.36, bh, bw, pick(['#C62828', '#1565C0', '#2E7D32', '#F9A825', '#6A1B9A', '#ECEFF1', '#00838F', '#8D6E63']));
      bz += bw + 0.012;
    }
  }
  // 看板：三栏（待办 / 进行中 / 完成）
  b.box(X0 + 0.06, 1.0, -0.35, 0.06, 1.05, 1.8, '#111317');
  b.glow(X0 + 0.1, 1.04, -0.35, 0.008, 0.95, 1.7, '#15233A');
  ['#FBBC04', '#4FC3F7', '#34A853'].forEach((c, col) => {
    const zc = -0.35 - 0.55 + col * 0.55;
    b.glow(X0 + 0.11, 1.84, zc, 0.006, 0.05, 0.46, c);
    const k = 2 + Math.floor(rnd() * 3);
    for (let i = 0; i < k; i++) b.glow(X0 + 0.112, 1.66 - i * 0.17, zc, 0.004, 0.12, 0.42, i === 0 ? '#E8F0FE' : '#9AA7BD');
  });
  for (let i = 0; i < 4; i++) {
    const z = 1.25 + i * 0.6;
    b.box(X0 + 0.23, 0, z, 0.44, 1.9, 0.56, '#56627A');
    b.box(X0 + 0.46, 1.0, z + 0.18, 0.02, 0.18, 0.04, '#C9CDD1');
    b.box(X0 + 0.46, 1.6, z, 0.01, 0.12, 0.36, '#3E4758');
  }
  plant(b, X0 + 0.45, 4.3, 1.1);
  // ---- 茶水间（后面右边）----
  b.box(4.3, 0, Z0 + 0.35, 2.8, 0.86, 0.62, '#3A4150');
  b.box(4.3, 0.86, Z0 + 0.35, 2.92, 0.06, 0.68, '#E6E1D8');
  for (let i = 0; i < 4; i++) b.box(3.2 + i * 0.73, 0.1, Z0 + 0.67, 0.02, 0.66, 0.01, '#2B313D');
  b.box(4.7, 0.92, Z0 + 0.35, 0.5, 0.01, 0.36, '#9AA0A6');
  b.cyl(4.7, 0.92, Z0 + 0.18, 0.025, 0.28, '#C9CDD1');
  b.box(3.3, 0.92, Z0 + 0.3, 0.36, 0.48, 0.34, '#202124');
  b.glow(3.3, 1.2, Z0 + 0.475, 0.12, 0.05, 0.01, '#FF7043');
  for (let i = 0; i < 3; i++) b.box(3.75 + i * 0.16, 0.92, Z0 + 0.45, 0.09, 0.11, 0.09, pick(['#FFFFFF', '#EA4335', '#FBBC04']));
  b.box(6.35, 0, Z0 + 0.4, 0.85, 1.95, 0.7, '#CFD5DC');
  b.box(6.35, 1.3, Z0 + 0.76, 0.84, 0.01, 0.02, '#8F98A3');
  b.box(6.0, 0.75, Z0 + 0.77, 0.03, 0.4, 0.03, '#8F98A3');
  // 饮水机
  b.box(6.55, 0, -3.2, 0.4, 0.95, 0.4, '#E8EAED');
  b.cyl(6.55, 0.95, -3.2, 0.15, 0.42, '#7FB8E8');
  // ---- 会议桌（右边中间）----
  b.cyl(4.6, 0.7, -1.3, 0.85, 0.05, '#C9A27A');
  b.cyl(4.6, 0, -1.3, 0.08, 0.7, '#2B2F38');
  b.box(4.4, 0.75, -1.4, 0.4, 0.02, 0.28, '#BFC3C7');
  b.glow(4.4, 0.77, -1.53, 0.36, 0.2, 0.01, '#4FC3F7');
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k * Math.PI) / 2;
    b.chair(4.6 + Math.sin(a) * 1.3, -1.3 + Math.cos(a) * 1.3, a + Math.PI, '#4A5568');
  }
  // ---- 沙发区（前面右边）----
  b.box(4.8, 0, 3.2, 3.6, 0.02, 2.4, '#33395A');
  b.sofa(4.8, 2.4, 2.6, 0, '#5C6BC0');
  b.table(4.8, 3.55, 1.2, 0.6, '#C9A27A', 0.42);
  b.box(4.6, 0.42, 3.55, 0.3, 0.06, 0.22, '#ECEFF1');
  plant(b, 6.55, 2.2);
  plant(b, 2.0, Z0 + 0.4, 0.9);
  // ---- 工位：两两对坐；人多就两组 ----
  const pods = n <= 8 ? 1 : 2;
  const cols = Math.max(1, Math.min(6, Math.ceil(n / (pods * 2))));
  const sp = cols >= 5 ? 1.45 : 1.6, dw = sp - 0.16;
  const cx = cols >= 5 ? -2.0 : -2.3;
  const zcs = pods === 1 ? [-1.0] : [-2.4, 1.6];
  const seats: Seat[] = [];
  const screens = ['#4FC3F7', '#4FC3F7', '#81C995', accent, '#FDD663'];
  for (const zc of zcs) {
    for (let c = 0; c < cols; c++) {
      const x = cx + (c - (cols - 1) / 2) * sp;
      desk(b, x, zc - 0.38, dw, 1, pick(screens));
      desk(b, x, zc + 0.38, dw, -1, pick(screens));
      b.box(x, 0.73, zc, dw, 0.3, 0.03, '#3D4A5F');
      seats.push({ x, z: zc - 1.0, ry: 0 }, { x, z: zc + 1.0, ry: Math.PI });
    }
  }
  const walkways = pods === 1 ? [zcs[0] - 1.55, zcs[0] + 1.55] : [-3.95, -0.4, 3.15];
  return { b, seats, walkways, shelf };
}

// 后墙上的部门牌子
function signTexture(name: string, sub: string, color: string) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 112;
  const g = c.getContext('2d') as CanvasRenderingContext2D;
  g.fillStyle = '#161A21'; g.fillRect(0, 0, 512, 112);
  g.fillStyle = color; g.fillRect(0, 0, 10, 112);
  g.fillStyle = '#FFFFFF'; g.font = 'bold 44px "PingFang SC","Microsoft YaHei",sans-serif'; g.textBaseline = 'middle';
  g.fillText(name.length > 10 ? name.slice(0, 10) + '…' : name, 30, 44);
  g.fillStyle = '#9AA7BD'; g.font = '24px "PingFang SC","Microsoft YaHei",sans-serif';
  g.fillText(sub, 32, 88);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

// 闲逛去哪里：咖啡机前、饮水机旁、会议桌边、沙发前（固定阵列：Crew 才不会一直重建）
const STROLL = [{ x: 3.3, z: Z0 + 1.05 }, { x: 6.0, z: -3.2 }, { x: 3.4, z: -0.4 }, { x: 4.2, z: 3.0 }];

export function Office() {
  const s = useStore();
  const { tr } = useLang();
  const { chat } = useLive();
  const m = s.model;
  const dept = m.departments.find((d) => d.id === s.room) ?? m.departments[0];
  // 公司资料每分钟重算一次（新物件）；人没变就不重排，不然走到一半的人会被拉回座位
  const peopleKey = m.people.filter((p) => p.dept === dept.id).map((p) => p.id + p.status).join('|');
  const ppl = useMemo(() => {
    const list = m.people.filter((p) => p.dept === dept.id && (p.type === 'human' ? s.filters.humans : s.filters.ai));
    return [...list.filter((p) => p.type === 'human'), ...list.filter((p) => p.type === 'ai')];
  }, [peopleKey, dept.id, s.filters.humans, s.filters.ai]); // eslint-disable-line react-hooks/exhaustive-deps
  const layout = useMemo(() => buildOffice(ppl.length, dept.color), [ppl.length, dept.color]);
  const placements = useMemo<Placement[]>(() => ppl.map((p, i) => {
    const st = layout.seats[i];
    return { person: p, x: st.x, z: st.z, ry: st.ry, sit: true, seatId: `${dept.id.toUpperCase().slice(0, 4)}-${i + 1}` };
  }), [ppl, layout, dept.id]);
  const room: Floor = useMemo(() => ({ ...(m.floors.find((f) => f.id === dept.floor) ?? m.floors[0]), rooms: [] }), [dept.floor, m.floors]);
  // 走走道：先退到椅子后面的走道 → 沿走道走到中间的直走道 → 再进对方那一排
  const via = useMemo(() => {
    const lane = (z: number) => layout.walkways.reduce((a, w) => (Math.abs(w - z) < Math.abs(a - z) ? w : a), layout.walkways[0]);
    const V = (x: number, z: number) => new THREE.Vector3(x, 0, z);
    return (from: THREE.Vector3, to: THREE.Vector3) => {
      const out: THREE.Vector3[] = [];
      if (from.x < LANE_X - 0.2) { const z = lane(from.z); out.push(V(from.x, z), V(LANE_X, z)); }
      if (to.x < LANE_X - 0.2) { const z = lane(to.z); out.push(V(LANE_X, z), V(to.x, z)); }
      return out;
    };
  }, [layout]);

  const mats = useMemo(() => {
    const f = makeFloorMats();
    const floor = new THREE.MeshStandardMaterial({ map: photoTexture('floor', 4, 3), color: '#D8C4AE', roughness: 0.62, metalness: 0.02 });
    const base = new THREE.MeshStandardMaterial({ color: '#232833', roughness: 0.9 });
    return { std: f.std, glow: f.glow, floor, base };
  }, []);
  const sign = useMemo(() => signTexture(tr(dept.name), `${ppl.filter((p) => p.type === 'human').length} 人 · ${ppl.filter((p) => p.type === 'ai').length} AI`, dept.color), [dept, ppl, tr]);
  const [hovered, setHovered] = useState<Placement | null>(null);
  const openBook = () => { if (s.csView) window.dispatchEvent(new CustomEvent('open-handbook')); else s.setSection('kb'); };
  const isCS = dept.floor === '2F';

  return (
    <group>
      {/* 模型底座 + 木地板 */}
      <mesh geometry={GEO.box} material={mats.base} position={[0, -0.36, 0.1]} scale={[ROOM.w + 0.4, 0.7, ROOM.d + 0.2]} receiveShadow raycast={() => null} />
      <mesh material={mats.floor} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]} receiveShadow raycast={() => null}>
        <planeGeometry args={[ROOM.w, ROOM.d]} />
      </mesh>
      <Batch prims={layout.b.L.box} geometry={GEO.box} material={mats.std} />
      <Batch prims={layout.b.L.cyl} geometry={GEO.cyl} material={mats.std} />
      <Batch prims={layout.b.L.sph} geometry={GEO.sph} material={mats.std} />
      <Batch prims={layout.b.L.glow} geometry={GEO.box} material={mats.glow} />
      <mesh position={[1.55, 1.7, Z0 + 0.012]} raycast={() => null}>
        <planeGeometry args={[2.6, 0.57]} />
        <meshBasicMaterial map={sign} toneMapped={false} />
      </mesh>
      {/* 书架：客服部门点一下打开业务手册 */}
      {isCS && (
        <mesh position={[layout.shelf.x + 0.05, 1.1, layout.shelf.z]} scale={[0.6, 2.2, layout.shelf.w]} geometry={GEO.box}
          onClick={(e) => { e.stopPropagation(); openBook(); }}
          onPointerOver={() => { document.body.style.cursor = 'pointer'; }} onPointerOut={() => { document.body.style.cursor = ''; }}>
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
      {isCS && s.settings.labels && (
        <Html position={[layout.shelf.x + 0.45, 1.25, layout.shelf.z + 0.4]} center zIndexRange={[7, 0]} className="tag3d click">
          <button type="button" onClick={openBook} className="whitespace-nowrap rounded-lg border border-[#C9A86A]/60 bg-[#2A2418]/90 px-2.5 py-1 text-xs font-semibold text-[#F5D99A] shadow-glass hover:bg-[#3A311F]">📚 业务手册</button>
        </Html>
      )}
      <Crew key={dept.id} floor={room} placements={placements} doors={{}} chat={chat} selected={s.person} showNames={false}
        strollSpots={STROLL} via={via}
        onPick={(id) => s.selectPerson(id)} onHover={setHovered} />
      {hovered && <Tip p={hovered.person} x={hovered.x} z={hovered.z} />}
      {placements.length === 0 && (
        <Html position={[-2.3, 1.2, -1]} center className="tag3d">
          <div className="whitespace-nowrap rounded-lg bg-[#161A21]/90 px-3 py-1.5 text-xs text-[#9AA7BD]">这间办公室还没有人</div>
        </Html>
      )}
    </group>
  );
}

function Tip({ p, x, z }: { p: Person; x: number; z: number }) {
  const { t, tr } = useLang();
  return (
    <Html position={[x, 2.45, z]} center zIndexRange={[9, 0]} className="tag3d">
      <div className="animate-slideUp whitespace-nowrap rounded-lg border border-white/10 bg-[#161A21]/95 px-2.5 py-1.5 text-white shadow-glass">
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          {p.type === 'ai' && <span className="rounded bg-[#12B5CB]/25 px-1 text-[9px] font-bold text-[#7CF0FF]">AI</span>}
          {tr(p.name)}
        </div>
        <div className="text-2xs text-[#9AA7BD]">{tr(p.title)}</div>
        <div className="mt-0.5 flex items-center gap-1 text-2xs" style={{ color: STATUS_COLOR[p.status] }}>
          <span className="size-1.5 rounded-full" style={{ background: STATUS_COLOR[p.status] }} />{t(`st_${p.status}`)}
        </div>
      </div>
    </Html>
  );
}
