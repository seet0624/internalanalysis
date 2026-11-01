// 楼层平面 → 3D 小物件清单（只是资料，画的工作在 FloorModel 用 InstancedMesh 一次画完）。
import type { Floor, Room } from '../types';
import { COLORS as C, D, W, WALL_H } from './constants';
import type { TreeKind, TreeSpot } from './Trees';
import type { Surface } from './textures';

export type Prim = { p: [number, number, number]; s: [number, number, number]; c: string; r?: [number, number, number] };
export type Seat = { x: number; z: number; ry: number; id: string; room: string; sit: boolean };
export type RoomLabel = { room: Room; x: number; z: number };

export type FloorLayout = {
  box: Prim[]; cyl: Prim[]; sph: Prim[]; glow: Prim[]; glowCyl: Prim[]; glass: Prim[];
  tiles: { room: Room; x: number; z: number; w: number; d: number; color: string; surface: Surface }[];
  trees: TreeSpot[];   // 盆栽、花园的树（真实树模型）
  seats: Record<string, Seat[]>;   // room id → 工位
  labels: RoomLabel[];
};

const mix = (a: string, b: string, t: number) => {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
  return '#' + ((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0');
};

class Builder {
  L: FloorLayout = { box: [], cyl: [], sph: [], glow: [], glowCyl: [], glass: [], tiles: [], trees: [], seats: {}, labels: [] };
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
    const mz = z + facing * 0.2;
    this.box(x, 0.75, mz, 0.08, 0.2, 0.08, C.monitor);
    this.box(x, 0.92, mz, 0.62, 0.36, 0.03, C.monitor);
    this.glow(x, 0.94, mz - facing * 0.02, 0.56, 0.3, 0.01, screen);
    this.box(x + 0.4, 0.75, z - facing * 0.05, 0.3, 0.02, 0.12, C.deskLeg);
    const cz = z - facing * 0.62;
    this.chair(x, cz, ry);
    this.seat(room, x, cz, ry, true);
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
      b.glow(cx, 1.3, r.z0 + 0.36, 3.2, 0.7, 0.01, accent);
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
      b.box(cx, 0, cz, room.w - 0.3, WALL_H + 0.2, room.d - 0.3, C.core);
      for (let i = 0; i < 3; i++) b.glow(r.x0 + 1 + i * 1.6, 0.05, r.z1 - 0.12, 1.0, 2.1, 0.02, '#B8AFA0');
      b.glow(cx, WALL_H + 0.2, cz, room.w - 0.5, 0.02, room.d - 0.5, '#8C6B24');
      continue;
    }
    const surface = SURFACE[room.kind] ?? 'stone';
    // 地板本身有贴图；颜色只轻轻带一点部门色
    const tint = surface === 'grass' ? '#FFFFFF' : mix('#FFFFFF', dc, 0.12);
    b.L.tiles.push({ room, x: cx, z: cz, w: room.w - 0.12, d: room.d - 0.12, color: tint, surface });
    // 玻璃隔间（靠走廊那边留门）+ 顶边发光
    const touchesHall = Math.abs(room.z + room.d - 9.5) < 0.01 || Math.abs(room.z - 12.5) < 0.01;
    const doorZ = Math.abs(room.z + room.d - 9.5) < 0.01 ? r.z1 : r.z0;
    const edges: [number, number, number, number][] = [[r.x0, r.z0, r.x1, r.z0], [r.x0, r.z1, r.x1, r.z1], [r.x0, r.z0, r.x0, r.z1], [r.x1, r.z0, r.x1, r.z1]];
    const isOpen = room.kind === 'garden' || room.kind === 'solar' || room.kind === 'pavilion';
    for (const [ax, az, bx, bz] of edges) {
      if (isOpen) break;
      const horizontal = az === bz;
      const inset = 0.08;
      const doorHere = touchesHall ? horizontal && Math.abs(az - doorZ) < 0.01 : !horizontal && Math.abs(ax - r.x0) < 0.01;
      const len = horizontal ? bx - ax : bz - az;
      const segs: [number, number][] = doorHere ? [[0, len / 2 - 0.8], [len / 2 + 0.8, len]] : [[0, len]];
      for (const [s0, s1] of segs) {
        const l = s1 - s0 - 0.1;
        if (l <= 0.1) continue;
        const mid = (s0 + s1) / 2;
        if (horizontal) {
          const z = az + (az === r.z0 ? inset : -inset);
          b.glass(ax + mid, 0, z, l, WALL_H, 0.04);
          b.glow(ax + mid, WALL_H, z, l, 0.025, 0.05, dc);
        } else {
          const x = ax + (ax === r.x0 ? inset : -inset);
          b.glass(x, 0, az + mid, 0.04, WALL_H, l);
          b.glow(x, WALL_H, az + mid, 0.05, 0.025, l, dc);
        }
      }
    }
    furnish(b, r, dc);
    // 工位编号：楼层-部门-序号
    (b.L.seats[room.id] || []).forEach((s, i) => { s.id = `${floor.code}-${deptShort(room)}-${String(i + 1).padStart(2, '0')}`; });
    b.L.labels.push({ room, x: cx, z: cz });
  }
  // 外墙：后面和左边是玻璃帷幕（前、右切开看得到里面）
  for (let x = -W / 2; x <= W / 2 + 0.01; x += 3) b.box(x, 0, -D / 2, 0.12, WALL_H + 0.4, 0.12, '#B8AFA0');
  for (let z = -D / 2; z <= D / 2 + 0.01; z += 3) b.box(-W / 2, 0, z, 0.12, WALL_H + 0.4, 0.12, '#B8AFA0');
  b.glass(0, 0, -D / 2 - 0.02, W, WALL_H + 0.4, 0.06);
  b.glass(-W / 2 - 0.02, 0, 0, 0.06, WALL_H + 0.4, D);
  b.glow(0, WALL_H + 0.4, -D / 2, W, 0.04, 0.08, '#E3CB8F');
  b.glow(-W / 2, WALL_H + 0.4, 0, 0.08, 0.04, D, '#E3CB8F');
  return b.L;
}
