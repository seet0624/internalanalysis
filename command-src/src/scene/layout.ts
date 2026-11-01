// 楼层平面 → 3D 小物件清单（只是资料，画的工作在 FloorModel 用 InstancedMesh 一次画完）。
import type { Floor, Room } from '../types';
import { COLORS as C, D, W, WALL_H } from './constants';
import type { TreeKind, TreeSpot } from './Trees';
import type { Surface } from './textures';

export type Prim = { p: [number, number, number]; s: [number, number, number]; c: string; r?: [number, number, number] };
export type Seat = { x: number; z: number; ry: number; id: string; room: string; sit: boolean };
export type RoomLabel = { room: Room; x: number; z: number };
// 门：门洞中心（世界座标）、门往外（走廊那边）的方向
export type Door = { room: string; x: number; z: number; nx: number; nz: number };
// 门上的房号牌（像旅馆：201、202…）
export type Plaque = { room: Room; no: string; x: number; y: number; z: number; ry: number; color: string };

export type FloorLayout = {
  box: Prim[]; cyl: Prim[]; sph: Prim[]; glow: Prim[]; glowCyl: Prim[]; glass: Prim[];
  tiles: { room: Room; x: number; z: number; w: number; d: number; color: string; surface: Surface }[];
  trees: TreeSpot[];   // 盆栽、花园的树（真实树模型）
  seats: Record<string, Seat[]>;   // room id → 工位
  labels: RoomLabel[];
  doors: Record<string, Door>;     // room id → 门（员工走路一定从门进出）
  plaques: Plaque[];
};

const mix = (a: string, b: string, t: number) => {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
  return '#' + ((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0');
};

class Builder {
  L: FloorLayout = { box: [], cyl: [], sph: [], glow: [], glowCyl: [], glass: [], tiles: [], trees: [], seats: {}, labels: [], doors: {}, plaques: [] };
  tree(x: number, y: number, z: number, kind: TreeKind, h: number) {
    this.L.trees.push({ x, y, z, kind, h, ry: ((x * 7.3 + z * 3.1) % 6.28) });
  }
  // y 是底部高度；物件中心 = y + 高/2
  box(x: number, y: number, z: number, sx: number, sy: number, sz: number, c: string, ry = 0) {
    this.L.box.push({ p: [x, y + sy / 2, z], s: [sx, sy, sz], c, r: ry ? [0, ry, 0] : undefined });
  }
  tilt(x: number, y: number, z: number, sx: number, sy: number, sz: number, c: string, r: [number, number, number]) {
    this.L.box.push({ p: [x, y + sy / 2, z], s: [sx, sy, sz], c, r });
  }
  cyl(x: number, y: number, z: number, rad: number, h: number, c: string) { this.L.cyl.push({ p: [x, y + h / 2, z], s: [rad * 2, h, rad * 2], c }); }
  sph(x: number, y: number, z: number, rad: number, c: string, sy = 1) { this.L.sph.push({ p: [x, y, z], s: [rad * 2, rad * 2 * sy, rad * 2], c }); }
  glow(x: number, y: number, z: number, sx: number, sy: number, sz: number, c: string, ry = 0) {
    this.L.glow.push({ p: [x, y + sy / 2, z], s: [sx, sy, sz], c, r: ry ? [0, ry, 0] : undefined });
  }
  glowCyl(x: number, y: number, z: number, rad: number, h: number, c: string) { this.L.glowCyl.push({ p: [x, y + h / 2, z], s: [rad * 2, h, rad * 2], c }); }
  glass(x: number, y: number, z: number, sx: number, sy: number, sz: number) { this.L.glass.push({ p: [x, y + sy / 2, z], s: [sx, sy, sz], c: C.glass }); }
  seat(room: Room, x: number, z: number, ry: number, sit = true) {
    const list = (this.L.seats[room.id] ||= []);
    list.push({ x, z, ry, sit, room: room.id, id: '' });
  }

  // ---------- 家具 ----------
  plant(x: number, z: number, h = 1) {
    this.cyl(x, 0, z, 0.24, 0.42, C.plantPot);
    this.cyl(x, 0.42, z, 0.21, 0.02, '#6B5442');   // 泥土
    this.tree(x, 0.4, z, 'bush', 1.0 * h);
  }
  chair(x: number, z: number, ry: number, c: string = C.chair) {
    const bx = Math.sin(ry) * -0.24, bz = Math.cos(ry) * -0.24;
    this.cyl(x, 0, z, 0.04, 0.42, C.metal);
    this.box(x, 0.42, z, 0.5, 0.08, 0.5, c, ry);
    this.box(x + bx, 0.5, z + bz, 0.5, 0.55, 0.07, C.chairBack, ry);
  }
  // 一张工位：桌面、桌脚、屏幕、椅子；facing = 1 面向 +z，-1 面向 -z
  desk(room: Room, x: number, z: number, facing: 1 | -1, screen: string) {
    const ry = facing === 1 ? 0 : Math.PI;
    this.box(x, 0.7, z, 1.4, 0.05, 0.7, C.deskTop);
    this.box(x - 0.66, 0, z, 0.05, 0.7, 0.62, C.deskLeg);
    this.box(x + 0.66, 0, z, 0.05, 0.7, 0.62, C.deskLeg);
    // 双屏幕
    const mz = z + facing * 0.2;
    for (const k of [-1, 1]) {
      const mx = x + k * 0.29;
      this.box(mx, 0.75, mz, 0.06, 0.18, 0.06, C.monitor);
      this.box(mx, 0.9, mz, 0.54, 0.32, 0.03, C.monitor, k * facing * 0.18);
      this.glow(mx, 0.92, mz - facing * 0.02, 0.49, 0.27, 0.01, k === -1 ? screen : C.screen, k * facing * 0.18);
    }
    // 键盘、滑鼠、耳机、马克杯
    this.box(x, 0.75, z - facing * 0.08, 0.42, 0.02, 0.13, '#E8EAED');
    this.box(x + 0.3, 0.75, z - facing * 0.08, 0.06, 0.02, 0.09, '#E8EAED');
    this.cyl(x - 0.48, 0.75, z - facing * 0.05, 0.05, 0.1, '#FFFFFF');
    this.box(x + 0.5, 0.75, z + facing * 0.05, 0.16, 0.05, 0.12, '#5F6368');
    const cz = z - facing * 0.62;
    this.chair(x, cz, ry);
    this.seat(room, x, cz, ry, true);
  }
  whiteboard(x: number, z: number, w: number, ry: number) {
    this.box(x, 0.85, z, ry ? 0.05 : w, 1.0, ry ? w : 0.05, '#FFFFFF', 0);
    this.box(x, 0.8, z, ry ? 0.08 : w + 0.06, 0.04, ry ? w + 0.06 : 0.08, '#BDC1C6');
    this.box(x - (ry ? 0 : w * 0.3), 1.3, z + (ry ? -w * 0.3 : 0), ry ? 0.06 : w * 0.25, 0.04, ry ? w * 0.25 : 0.06, '#1A73E8');
    this.box(x + (ry ? 0 : w * 0.1), 1.15, z + (ry ? w * 0.1 : 0), ry ? 0.06 : w * 0.35, 0.03, ry ? w * 0.35 : 0.06, '#EA4335');
  }
  sofa(x: number, z: number, w: number, ry: number, c: string = C.sofa) {
    const bx = Math.sin(ry) * -0.32, bz = Math.cos(ry) * -0.32;
    this.box(x, 0, z, ry % Math.PI === 0 ? w : 0.85, 0.42, ry % Math.PI === 0 ? 0.85 : w, c);
    this.box(x + bx, 0.42, z + bz, ry % Math.PI === 0 ? w : 0.2, 0.42, ry % Math.PI === 0 ? 0.2 : w, mix(c, '#5E5650', 0.15));
  }
  table(x: number, z: number, w: number, d: number, c: string = C.white, h = 0.74) {
    this.box(x, h - 0.05, z, w, 0.05, d, c);
    this.box(x, 0, z, Math.max(0.1, w * 0.12), h - 0.05, Math.max(0.1, d * 0.4), C.deskLeg);
  }
  roundTable(x: number, z: number, r: number, h = 0.74) {
    this.cyl(x, h - 0.04, z, r, 0.04, C.white);
    this.cyl(x, 0, z, 0.06, h - 0.04, C.metal);
  }
  rug(x: number, z: number, w: number, d: number, c: string = C.rug) { this.box(x, 0.005, z, w, 0.02, d, c); }
  screenWall(x: number, z: number, w: number, ry: number, c: string = C.screen) {
    this.box(x, 0.9, z, ry ? 0.08 : w + 0.1, 1.3, ry ? w + 0.1 : 0.08, C.monitor);
    this.glow(x + (ry ? 0.05 : 0), 0.95, z + (ry ? 0 : 0.05), ry ? 0.02 : w, 1.2, ry ? w : 0.02, c);
  }
  rack(x: number, z: number, led: string, ry = 0) {
    this.box(x, 0, z, 0.6, 2.1, 1.0, C.rack, ry);
    for (let i = 0; i < 5; i++) {
      const fz = ry ? x : z;
      void fz;
      this.glow(x + (ry ? 0.31 : -0.18 + (i % 3) * 0.18), 0.25 + i * 0.36, z + (ry ? -0.3 + (i % 3) * 0.3 : 0.51), ry ? 0.01 : 0.12, 0.04, ry ? 0.12 : 0.01, led);
    }
    this.glow(x + (ry ? 0.31 : 0.24), 0.1, z + (ry ? 0.42 : 0.51), ry ? 0.01 : 0.03, 1.9, ry ? 0.03 : 0.01, led);
  }
}

type RR = Room & { x0: number; z0: number; x1: number; z1: number };

// 办公区：两两对坐的工位，置中排在房间里
function office(b: Builder, r: RR, cx: number, cz: number, seats: number, accent: string) {
  const pairs = Math.max(1, Math.ceil(seats / 2));
  const maxCols = Math.max(1, Math.floor((r.w - 1.6) / 1.55));
  const rows = Math.max(1, Math.min(Math.floor((r.d - 1.4) / 3.3), Math.ceil(pairs / maxCols)));
  const cols = Math.min(maxCols, Math.ceil(pairs / rows));
  const x0 = cx - ((cols - 1) * 1.55) / 2;
  const z0 = cz - ((rows - 1) * 3.4) / 2 + 0.2;
  let made = 0;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols && made < pairs; col++, made++) {
      const x = x0 + col * 1.55, z = z0 + row * 3.4;
      b.desk(r, x, z - 0.36, -1, made % 3 === 2 ? C.screenAlt : C.screen);
      b.desk(r, x, z + 0.36, 1, made % 4 === 1 ? accent : C.screen);
      b.glass(x, 0.75, z, 1.4, 0.4, 0.03);
    }
  }
  b.plant(r.x0 + 0.6, r.z0 + 0.6);
  b.plant(r.x1 - 0.6, r.z1 - 0.6, 0.8);
}

function furnish(b: Builder, r: RR, accent: string) {
  const cx = (r.x0 + r.x1) / 2, cz = (r.z0 + r.z1) / 2;
  switch (r.kind) {
    case 'office': office(b, r, cx, cz, r.seats ?? 6, accent); break;
    case 'training': {
      b.screenWall(r.x1 - 0.25, cz, r.d - 1.6, Math.PI / 2, accent);
      for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) {
        const x = r.x0 + 1.2 + i * 1.6, z = r.z0 + 1.0 + j * 1.25;
        b.table(x, z, 0.9, 0.5);
        b.chair(x - 0.55, z, -Math.PI / 2);
      }
      break;
    }
    case 'exec': {
      b.rug(cx, cz + 0.3, r.w - 2, r.d - 3);
      b.box(cx, 0.68, r.z0 + 2.2, 2.4, 0.08, 1.0, C.wood);
      b.box(cx - 1.05, 0, r.z0 + 2.2, 0.12, 0.68, 0.9, C.wood);
      b.box(cx + 1.05, 0, r.z0 + 2.2, 0.12, 0.68, 0.9, C.wood);
      b.box(cx - 0.4, 0.76, r.z0 + 2.0, 0.7, 0.42, 0.03, C.monitor);
      b.glow(cx - 0.4, 0.78, r.z0 + 2.02, 0.64, 0.36, 0.01, C.screen);
      b.chair(cx, r.z0 + 1.3, 0, '#3A2A20');
      b.seat(r, cx, r.z0 + 1.3, 0);
      b.chair(cx - 0.6, r.z0 + 3.2, Math.PI); b.chair(cx + 0.6, r.z0 + 3.2, Math.PI);
      b.seat(r, cx + 0.6, r.z0 + 3.2, Math.PI);
      b.sofa(cx, r.z1 - 1.0, 2.6, Math.PI, C.sofaAlt);
      b.table(cx, r.z1 - 2.1, 1.2, 0.6, C.wood, 0.4);
      for (let i = 0; i < 3; i++) b.box(r.x0 + 0.25, 0, r.z0 + 1 + i * 1.1, 0.4, 2.0, 1.0, C.wood);
      b.plant(r.x1 - 0.6, r.z0 + 0.6, 1.2);
      break;
    }
    case 'board': case 'meeting': {
      const big = r.kind === 'board';
      const tw = Math.min(r.w - 3, big ? 9 : 4), td = big ? 2 : 1.2;
      if (big) b.rug(cx, cz, tw + 2.4, td + 3, '#CDB89A');
      b.table(cx, cz, tw, td, big ? C.wood : C.white);
      const n = Math.max(2, Math.floor(tw / 0.9));
      for (let i = 0; i < n; i++) {
        const x = cx - tw / 2 + 0.45 + i * ((tw - 0.9) / Math.max(1, n - 1));
        b.chair(x, cz - td / 2 - 0.45, 0);
        b.chair(x, cz + td / 2 + 0.45, Math.PI);
      }
      b.screenWall(r.x0 + 0.2, cz, Math.min(r.d - 2, big ? 4 : 2.4), Math.PI / 2, big ? accent : C.screen);
      if (!big) b.whiteboard(r.x1 - 0.2, cz, Math.min(r.d - 3, 2.2), Math.PI / 2);
      b.plant(r.x1 - 0.6, r.z0 + 0.6);
      break;
    }
    case 'lounge': case 'waiting': case 'pavilion': {
      if (r.kind === 'pavilion') {
        b.glass(cx, 0, r.z0 + 0.15, r.w - 0.6, WALL_H, 0.05);
        b.glass(r.x0 + 0.15, 0, cz, 0.05, WALL_H, r.d - 0.6);
        b.box(cx, WALL_H, cz, r.w - 0.4, 0.12, r.d - 0.4, C.white);
        b.box(r.x0 + 2.2, 0, r.z0 + 1.2, 3.2, 1.05, 0.6, C.wood);
        b.glow(r.x0 + 2.2, 1.05, r.z0 + 1.52, 3.2, 0.03, 0.02, accent);
      }
      b.rug(cx, cz + 0.4, Math.min(r.w - 2, 6), Math.min(r.d - 2.5, 4));
      b.sofa(cx, cz - 1.2, 2.6, 0);
      b.sofa(cx, cz + 2.0, 2.6, Math.PI, C.sofaAlt);
      b.sofa(cx - 2.2, cz + 0.4, 1.8, Math.PI / 2);
      b.table(cx, cz + 0.4, 1.4, 0.8, C.white, 0.4);
      b.plant(r.x0 + 0.6, r.z1 - 0.6, 1.3);
      b.plant(r.x1 - 0.6, r.z0 + 0.6, 1.1);
      b.plant(r.x1 - 0.6, r.z1 - 0.6, 0.9);
      break;
    }
    case 'coffee': {
      b.box(cx, 0, r.z0 + 0.8, r.w - 4, 1.05, 0.7, C.wood);
      b.box(cx, 1.05, r.z0 + 0.8, r.w - 4, 0.04, 0.75, C.white);
      b.glow(cx, 0.1, r.z0 + 1.16, r.w - 4, 0.04, 0.01, accent);
      for (let i = 0; i < 3; i++) { b.box(cx - 3 + i * 1.6, 1.09, r.z0 + 0.65, 0.45, 0.5, 0.4, C.metal); }
      for (let i = 0; i < 6; i++) b.cyl(cx - 4 + i * 1.6, 0, r.z0 + 1.6, 0.18, 0.75, C.deskLeg);
      for (let i = 0; i < 4; i++) {
        const x = r.x0 + 2 + i * 3.4, z = cz + 1.8;
        b.roundTable(x, z, 0.5);
        b.chair(x - 0.8, z, Math.PI / 2); b.chair(x + 0.8, z, -Math.PI / 2);
      }
      b.plant(r.x1 - 0.6, r.z1 - 0.6, 1.3);
      b.plant(r.x0 + 0.6, r.z1 - 0.6, 1.1);
      break;
    }
    case 'garden': {
      b.box(cx, 0.03, cz, r.w - 0.4, 0.05, 1.2, C.path);
      b.box(cx - 4, 0.03, cz, 1.2, 0.05, r.d - 0.4, C.path);
      b.glow(cx + 5, 0.06, cz - 2.5, 4, 0.02, 2.2, '#3E5552');
      const trees: [number, number, TreeKind, number][] = [[-9, -3, 'oak', 4.8], [-6, 3, 'ash', 4.2], [-1, -3.2, 'aspen', 5.0], [2, 3.1, 'oak', 4.0], [8, 3, 'ash', 4.4], [10, -3, 'aspen', 4.8], [-10.5, 2.8, 'pine', 4.2]];
      for (const [dx, dz, kind, h] of trees) {
        b.cyl(cx + dx, 0, cz + dz, 0.55, 0.12, '#6B5442');
        b.tree(cx + dx, 0.05, cz + dz, kind, h);
      }
      for (let i = 0; i < 10; i++) b.tree(r.x0 + 0.8 + i * 2.3, 0.05, r.z0 + 0.5, 'bush', 0.7);
      for (let i = 0; i < 4; i++) b.box(cx - 8 + i * 5, 0, cz + 1.0, 1.6, 0.42, 0.45, C.wood);
      for (let i = 0; i < 6; i++) { b.box(r.x0 + 1 + i * 4, 0, r.z1 - 0.6, 1.6, 0.5, 0.6, C.plantPot); b.tree(r.x0 + 0.6 + i * 4, 0.5, r.z1 - 0.6, 'bush', 0.6); b.tree(r.x0 + 1.4 + i * 4, 0.5, r.z1 - 0.6, 'bush', 0.55); }
      break;
    }
    case 'solar': {
      for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) {
        b.tilt(r.x0 + 2.2 + i * 3.4, 0.5, r.z0 + 2.4 + j * 4, 3, 0.06, 2.6, '#3C4250', [-0.45, 0, 0]);
        b.box(r.x0 + 2.2 + i * 3.4, 0, r.z0 + 2.4 + j * 4, 0.1, 0.6, 0.1, C.metal);
      }
      break;
    }
    case 'server': case 'compute': {
      b.box(cx, 0.005, cz, r.w - 0.6, 0.04, r.d - 0.6, r.kind === 'server' ? '#D9D2C5' : '#E3DACB');
      const led = r.kind === 'server' ? '#D4AF5F' : '#E3CB8F';
      const rows = 3, per = Math.floor((r.w - 2) / 0.65);
      for (let row = 0; row < rows; row++) for (let i = 0; i < per; i++) {
        const x = r.x0 + 1.1 + i * 0.65, z = r.z0 + 1.4 + row * 2.9;
        b.rack(x, z, (i + row) % 5 === 0 ? '#E3CB8F' : led);
      }
      if (r.kind === 'compute') {
        b.glowCyl(r.x1 - 2.2, 0, r.z1 - 1.6, 0.6, 2.2, '#E3CB8F');
        b.cyl(r.x1 - 2.2, 2.2, r.z1 - 1.6, 0.8, 0.12, C.metal);
        b.cyl(r.x1 - 2.2, 0, r.z1 - 1.6, 0.8, 0.12, C.metal);
      }
      for (let row = 0; row < rows - 1; row++) b.seat(r, r.x0 + 2 + row * 4, r.z0 + 2.85 + row * 2.9, Math.PI / 2, false);
      b.seat(r, cx + 3, r.z0 + 2.85, -Math.PI / 2, false);
      break;
    }
    case 'network': case 'monitor': {
      b.screenWall(cx, r.z0 + 0.25, r.w - 1.6, 0, r.kind === 'monitor' ? '#C2553F' : '#E3CB8F');
      if (r.kind === 'monitor') for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++)
        b.glow(r.x0 + 1.3 + i * ((r.w - 2.6) / 5), 1.0 + j * 0.62, r.z0 + 0.31, (r.w - 3) / 6, 0.5, 0.01, j ? '#C9A86A' : '#D4AF5F');
      b.box(cx, 0, cz - 0.4, r.w - 3, 0.74, 0.9, C.deskLeg);
      b.box(cx, 0.74, cz - 0.4, r.w - 2.8, 0.04, 1.0, C.deskTop);
      for (let i = 0; i < 3; i++) {
        const x = cx - 2.2 + i * 2.2;
        b.box(x, 0.78, cz - 0.6, 0.62, 0.36, 0.03, C.monitor);
        b.glow(x, 0.8, cz - 0.62, 0.56, 0.3, 0.01, C.screen);
        b.chair(x, cz + 0.4, Math.PI);
        b.seat(r, x, cz + 0.4, Math.PI);
      }
      b.rack(r.x1 - 0.8, r.z1 - 1.2, '#D4AF5F');
      b.plant(r.x0 + 0.6, r.z1 - 0.6);
      break;
    }
    case 'maintenance': {
      b.box(cx - 1.5, 0, r.z0 + 1.2, 3.2, 0.9, 0.9, C.metal);
      b.box(cx + 2, 0, r.z0 + 1.2, 2.4, 0.9, 0.9, C.metal);
      for (let i = 0; i < 4; i++) b.box(r.x0 + 0.4, 0, r.z0 + 1 + i * 1.8, 0.5, 2.0, 1.4, '#B8AFA0');
      for (let i = 0; i < 5; i++) b.box(cx - 2 + i * 1.1, 0.9, r.z0 + 1.1, 0.5, 0.3, 0.4, i % 2 ? '#4F7A5A' : '#B8933F');
      b.seat(r, cx - 1.5, r.z0 + 2.1, Math.PI, false);
      b.seat(r, cx + 2, r.z0 + 2.1, Math.PI, false);
      b.table(cx, cz + 2, 2, 1);
      break;
    }
    case 'power': {
      for (let i = 0; i < 2; i++) {
        b.box(r.x0 + 2.2 + i * 3.4, 0, r.z0 + 2.2, 2.8, 1.6, 1.6, '#B8A27A');
        b.box(r.x0 + 2.2 + i * 3.4, 1.6, r.z0 + 2.2, 0.4, 0.6, 0.4, C.metal);
        b.glow(r.x0 + 2.2 + i * 3.4, 1.0, r.z0 + 3.01, 0.6, 0.12, 0.01, '#8FB39A');
      }
      for (let i = 0; i < 7; i++) {
        b.box(r.x0 + 1.2 + i * 1.0, 0, r.z1 - 1.4, 0.8, 1.9, 0.8, '#CFC6B6');
        b.glow(r.x0 + 1.2 + i * 1.0, 1.5, r.z1 - 1.79, 0.5, 0.06, 0.01, '#8FB39A');
      }
      b.cyl(r.x1 - 1.2, 0, r.z0 + 1.2, 0.5, 2.2, C.metal);
      break;
    }
    case 'reception': {
      b.box(cx, 0, cz + 0.6, r.w - 3.2, 1.08, 0.8, C.white);
      b.box(cx, 1.08, cz + 0.6, r.w - 3.0, 0.05, 1.0, '#D9CFBE');
      b.glow(cx, 0.08, cz + 1.01, r.w - 3.2, 0.05, 0.01, accent);
      b.box(cx, 0, r.z0 + 0.25, r.w - 1.5, WALL_H, 0.2, '#CFC6B6');
      b.chair(cx - 1.2, cz - 0.4, Math.PI); b.chair(cx + 1.2, cz - 0.4, Math.PI);
      b.seat(r, cx - 1.2, cz - 0.4, Math.PI); b.seat(r, cx + 1.2, cz - 0.4, Math.PI);
      b.plant(r.x0 + 0.6, r.z1 - 0.6, 1.3); b.plant(r.x1 - 0.6, r.z1 - 0.6, 1.3);
      break;
    }
    case 'security': {
      b.box(cx, 0, cz - 1.2, r.w - 1.2, 0.8, 0.8, C.deskLeg);
      for (let i = 0; i < 3; i++) b.glow(cx - 1.1 + i * 1.1, 0.9, cz - 1.5, 0.9, 0.5, 0.02, i === 1 ? '#C2553F' : '#D4AF5F');
      b.chair(cx - 0.6, cz - 0.3, Math.PI); b.chair(cx + 0.8, cz - 0.3, Math.PI);
      b.seat(r, cx - 0.6, cz - 0.3, Math.PI); b.seat(r, cx + 0.8, cz - 0.3, Math.PI);
      for (let i = 0; i < 2; i++) {
        b.box(cx - 1 + i * 2, 0, r.z1 - 1.6, 0.3, 1.0, 1.2, C.metal);
        b.glow(cx - 1 + i * 2, 1.0, r.z1 - 1.6, 0.3, 0.03, 1.2, '#8FB39A');
      }
      break;
    }
    case 'showroom': {
      for (let i = 0; i < 4; i++) {
        const x = r.x0 + 2 + i * 3.6, z = cz + (i % 2 ? 1.2 : -1.2);
        b.cyl(x, 0, z, 0.6, 0.9, C.white);
        b.glow(x, 0.9, z, 0.5, 0.02, 0.5, accent);
        if (i % 2) b.sph(x, 1.35, z, 0.35, '#F3EAD3'); else b.box(x, 0.95, z, 0.5, 0.7, 0.5, '#C9A86A');
      }
      b.screenWall(cx, r.z0 + 0.3, r.w - 4, 0, '#C9A86A');
      b.plant(r.x0 + 0.6, r.z0 + 0.6, 1.4);
      break;
    }
    case 'core': break;
  }
}

const SURFACE: Partial<Record<Room['kind'], Surface>> = {
  office: 'wood', exec: 'wood', training: 'wood', pavilion: 'wood', coffee: 'wood',
  meeting: 'carpet', board: 'carpet',
  lounge: 'stone', waiting: 'stone', reception: 'stone', showroom: 'stone', security: 'stone',
  server: 'raised', compute: 'raised', network: 'raised', monitor: 'raised', maintenance: 'concrete', power: 'concrete',
  garden: 'grass', solar: 'concrete'
};

const deptShort = (r: Room) => (r.dept || r.id.split('-')[1] || 'X').toUpperCase().slice(0, 4);

export function buildFloorLayout(floor: Floor, deptColor: (id?: string) => string | undefined): FloorLayout {
  const b = new Builder();
  const ox = -W / 2, oz = -D / 2;
  // 走廊
  b.L.tiles.push({ room: { id: `${floor.id}-hall`, name: { zh: '走廊', en: 'Corridor' }, kind: 'lounge', x: 0, z: 9.5, w: W, d: 3 }, x: 0, z: 11 + oz, w: W - 0.3, d: 3, color: '#E8E1D3', surface: floor.id === 'R' ? 'concrete' : 'stone' });
  for (const room of floor.rooms) {
    const r: RR = { ...room, x0: room.x + ox, z0: room.z + oz, x1: room.x + room.w + ox, z1: room.z + room.d + oz };
    const cx = (r.x0 + r.x1) / 2, cz = (r.z0 + r.z1) / 2;
    const dc = deptColor(room.dept) || floor.accent;
    if (room.kind === 'core') {
      elevatorLobby(b, r, floor);
      continue;
    }
    const surface = SURFACE[room.kind] ?? 'stone';
    // 地板本身有贴图；颜色只轻轻带一点部门色
    const tint = surface === 'grass' ? '#FFFFFF' : mix('#FFFFFF', dc, 0.12);
    b.L.tiles.push({ room, x: cx, z: cz, w: room.w - 0.12, d: room.d - 0.12, color: tint, surface });
    furnish(b, r, dc);
    // 工位编号：楼层-部门-序号
    (b.L.seats[room.id] || []).forEach((s, i) => { s.id = `${floor.code}-${deptShort(room)}-${String(i + 1).padStart(2, '0')}`; });
    b.L.labels.push({ room, x: cx, z: cz });
  }
  buildWalls(b, floor, ox, oz, deptColor);
  corridor(b, floor, ox, oz);
  return b.L;
}

// ---------- 墙、门、走廊、电梯厅（旅馆式：走廊两边一间一间，有门、有房号） ----------
const WALL_LOW = 1.2;          // 实心墙的高度；上面是玻璃（剖面看得到里面）
const WALL_T = 0.14;
const DOOR_W = 1.0;
const HALL_Z0 = 9.5, HALL_Z1 = 12.5;
const OPEN_KINDS: Room['kind'][] = ['garden', 'solar', 'pavilion', 'core'];

type DoorSpec = { room: Room; horizontal: boolean; x: number; z: number; into: 1 | -1 };   // 楼层座标；into：房间在门的哪一边（+ = 座标变大那边）

function doorSpec(room: Room): DoorSpec | null {
  if (OPEN_KINDS.includes(room.kind)) return null;
  const x = room.x + Math.min(1.6, room.w / 2);
  const back = room.z + room.d <= HALL_Z0 + 0.01;
  // 靠走廊：门开在走廊那面；不靠走廊（例如咖啡角在培训室后面）：开在靠走廊那一边，穿过隔壁房间出去
  if (back) return { room, horizontal: true, x, z: room.z + room.d, into: -1 };
  return { room, horizontal: true, x, z: room.z, into: 1 };
}

export function roomNumber(floor: Floor, i: number) {
  const n = String(i + 1).padStart(2, '0');
  if (floor.code === 'B1') return 'B1' + n;
  if (floor.code === 'R') return 'R' + n;
  return floor.code.replace('F', '') + n;
}

function buildWalls(b: Builder, floor: Floor, ox: number, oz: number, deptColor: (id?: string) => string | undefined) {
  const specs = floor.rooms.map(doorSpec).filter(Boolean) as DoorSpec[];
  // 门（世界座标）+ 门框 + 门板 + 门上的房号牌
  let no = 0;
  for (const d of specs) {
    const wx = d.x + ox, wz = d.z + oz;
    b.L.doors[d.room.id] = { room: d.room.id, x: wx, z: wz, nx: 0, nz: -d.into };
    const frame = '#6B4A33', leaf = '#B08458';
    const hw = DOOR_W / 2;
    b.box(wx - hw - 0.04, 0, wz, 0.08, 2.22, 0.2, frame);
    b.box(wx + hw + 0.04, 0, wz, 0.08, 2.22, 0.2, frame);
    b.box(wx, 2.22, wz, DOOR_W + 0.16, 0.1, 0.2, frame);
    b.glass(wx, 2.32, wz, DOOR_W, 2.5 - 2.32, 0.04);
    // 门板：开着 100°，往房间里推开
    const a = (100 * Math.PI) / 180;
    const dir = { x: Math.cos(a), z: d.into * Math.sin(a) };
    const hx = wx - hw + 0.02, hz = wz;
    b.box(hx + dir.x * 0.46, 0.02, hz + dir.z * 0.46, 0.92, 2.12, 0.05, leaf, Math.atan2(-dir.z, dir.x));
    b.box(hx + dir.x * 0.82, 1.0, hz + dir.z * 0.82 + 0.04 * d.into, 0.12, 0.03, 0.03, '#C9CDD1', Math.atan2(-dir.z, dir.x));
    // 地上的门槛
    b.box(wx, 0, wz, DOOR_W, 0.025, 0.2, '#9C8C78');
    const label = d.room.dept ? roomNumber(floor, no++) : '';
    if (label) b.L.plaques.push({ room: d.room, no: label, x: wx, y: 2.42, z: wz + 0.11, ry: 0, color: deptColor(d.room.dept) || floor.accent });
  }
  // 墙：每间房四边（外墙交给外观；相邻两间的共用墙只画一次），门的位置挖洞
  const edges: { ax: number; az: number; bx: number; bz: number; h: boolean }[] = [];
  const key = new Set<string>();
  const add = (ax: number, az: number, bx: number, bz: number) => {
    const h = Math.abs(az - bz) < 1e-6;
    if (h && (az <= 0.01 || az >= D - 0.01)) return;      // 前后外墙
    if (!h && (ax <= 0.01 || ax >= W - 0.01)) return;     // 左右外墙
    const k = [ax, az, bx, bz].map((v) => v.toFixed(2)).join(',');
    if (key.has(k)) return;
    key.add(k);
    edges.push({ ax, az, bx, bz, h });
  };
  for (const r of floor.rooms) {
    if (r.kind === 'core' || r.kind === 'garden' || r.kind === 'solar') continue;
    add(r.x, r.z, r.x + r.w, r.z); add(r.x, r.z + r.d, r.x + r.w, r.z + r.d);
    add(r.x, r.z, r.x, r.z + r.d); add(r.x + r.w, r.z, r.x + r.w, r.z + r.d);
  }
  // 共用墙：两间房的墙在同一条线上、重叠的部分只留一段
  const merged: typeof edges = [];
  for (const e of edges) {
    const same = merged.find((m) => m.h === e.h && (e.h ? Math.abs(m.az - e.az) < 0.01 && e.ax < m.bx - 0.01 && m.ax < e.bx - 0.01 : Math.abs(m.ax - e.ax) < 0.01 && e.az < m.bz - 0.01 && m.az < e.bz - 0.01));
    if (same) { if (e.h) { same.ax = Math.min(same.ax, e.ax); same.bx = Math.max(same.bx, e.bx); } else { same.az = Math.min(same.az, e.az); same.bz = Math.max(same.bz, e.bz); } }
    else merged.push({ ...e });
  }
  for (const e of merged) {
    const len = e.h ? e.bx - e.ax : e.bz - e.az;
    const holes = specs.filter((d) => e.h && Math.abs(d.z - e.az) < 0.02 && d.x > e.ax && d.x < e.bx).map((d) => d.x - e.ax).sort((p, q) => p - q);
    const segs: [number, number][] = [];
    let s0 = 0;
    for (const hx of holes) { segs.push([s0, hx - DOOR_W / 2 - 0.08]); s0 = hx + DOOR_W / 2 + 0.08; }
    segs.push([s0, len]);
    for (const [a0, a1] of segs) {
      const l = a1 - a0;
      if (l < 0.12) continue;
      const mid = (a0 + a1) / 2;
      const cx = e.h ? e.ax + mid + ox : e.ax + ox, cz = e.h ? e.az + oz : e.az + mid + oz;
      const sx = e.h ? l : WALL_T, sz = e.h ? WALL_T : l;
      b.box(cx, 0, cz, sx, WALL_LOW, sz, '#EFEBE4');                                       // 实心墙（乳胶漆）
      b.box(cx, 0, cz, e.h ? l : WALL_T + 0.03, 0.1, e.h ? WALL_T + 0.03 : l, '#A08C76');    // 踢脚板
      b.box(cx, WALL_LOW, cz, e.h ? l : WALL_T + 0.05, 0.05, e.h ? WALL_T + 0.05 : l, '#B8956A');   // 木扶手收边
      b.glass(cx, WALL_LOW + 0.05, cz, e.h ? l : 0.04, 2.5 - WALL_LOW - 0.05, e.h ? 0.04 : l);
      b.box(cx, 2.5, cz, e.h ? l : 0.07, 0.06, e.h ? 0.07 : l, '#A7ADB3');                    // 铝框
      const n = Math.max(1, Math.round(l / 1.5));
      for (let i = 1; i < n; i++) {
        const t = a0 + (l * i) / n;
        b.box(e.h ? e.ax + t + ox : cx, WALL_LOW + 0.05, e.h ? cz : e.az + t + oz, 0.05, 2.5 - WALL_LOW - 0.05, 0.05, '#A7ADB3');
      }
    }
  }
}

// 走廊：地毯、长凳、植物、两头的消防箱和逃生指示
function corridor(b: Builder, floor: Floor, ox: number, oz: number) {
  if (floor.id === 'R') return;
  const z = (HALL_Z0 + HALL_Z1) / 2 + oz;
  b.box(ox + W / 2, 0.012, z, W - 1.2, 0.015, 1.5, '#8E9AAF');           // 地毯
  b.box(ox + W / 2, 0.02, z - 0.72, W - 1.2, 0.012, 0.06, '#C9A86A');    // 地毯金边
  b.box(ox + W / 2, 0.02, z + 0.72, W - 1.2, 0.012, 0.06, '#C9A86A');
  b.plant(ox + 0.7, z - 1.0, 1.1);
  b.plant(ox + W - 0.7, z + 1.0, 1.1);
  b.box(ox + 0.25, 0.9, z + 0.9, 0.2, 0.55, 0.4, '#D93025');              // 消防箱
  b.glow(ox + 0.36, 2.2, z, 0.02, 0.18, 0.5, '#1E8E3E');                 // 逃生指示（绿）
  b.glow(ox + W - 0.36, 2.2, z, 0.02, 0.18, 0.5, '#1E8E3E');
  b.box(ox + W - 0.4, 0, z - 0.9, 0.5, 0.82, 1.2, '#6B4A33');            // 走廊尽头的边桌
  b.cyl(ox + W - 0.4, 0.82, z - 0.9, 0.12, 0.3, '#E8EAED');
}

// 电梯厅：三部电梯（不锈钢门、楼层灯）、楼梯门
function elevatorLobby(b: Builder, r: RR, floor: Floor) {
  const cx = (r.x0 + r.x1) / 2, cz = (r.z0 + r.z1) / 2;
  b.box(cx, 0, cz - 0.4, r.w - 0.3, 2.7, r.d - 1.1, '#D9D3C9');
  const face = r.z1 - 0.95;
  const n = 3, gap = (r.w - 0.8) / n;
  for (let i = 0; i < n; i++) {
    const x = r.x0 + 0.4 + gap * (i + 0.5);
    b.box(x, 0, face, 1.2, 2.3, 0.08, '#8A8F94');                        // 门框
    b.box(x - 0.27, 0.02, face + 0.05, 0.52, 2.15, 0.03, '#C7CBD0');      // 不锈钢门（左右两片）
    b.box(x + 0.27, 0.02, face + 0.05, 0.52, 2.15, 0.03, '#C7CBD0');
    b.glow(x, 2.38, face + 0.06, 0.34, 0.12, 0.01, i === 1 ? '#F9AB00' : '#FFE9B0');   // 楼层灯
    b.glow(x + 0.72, 1.1, face + 0.06, 0.05, 0.1, 0.01, '#FFFFFF');      // 叫梯按钮
  }
  b.box(cx, 0.005, r.z1 - 0.45, r.w - 0.4, 0.01, 0.9, '#C8BFB2');         // 电梯厅地垫
  if (floor.id !== 'B1') b.plant(r.x0 + 0.4, r.z1 - 0.4, 0.9);
}
