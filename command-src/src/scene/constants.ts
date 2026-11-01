// 大楼尺寸（公尺）。楼层平面 36 × 22，整栋时每层间隔 GAP（剖面图的爆炸间距）。
export const W = 36;
export const D = 22;
export const GAP = 3.6;          // 一层楼高：楼层叠在一起，像一栋真的大楼（以前是分开飘着的剖面）
export const SLAB = 0.35;
export const WALL_H = 2.5;          // 内墙切到这个高度（剖面）
export const floorY = (level: number) => level * GAP;

export const COLORS = {
  slab: '#E2DCD1',
  slabTop: '#5C4A3A',
  corridor: '#6E665C',
  edge: '#D4AF5F',
  deskTop: '#EFE9DD',
  deskLeg: '#A79E90',
  chair: '#8E8578',
  chairBack: '#A39888',
  monitor: '#3A332C',
  screen: '#F3EAD3',
  screenAlt: '#E3CB8F',
  wood: '#6B4A33',
  sofa: '#C9B79A',
  sofaAlt: '#9FAE96',
  plantPot: '#D4D9E4',
  leaf: '#2F9E6B',
  leafDark: '#1F7A52',
  grass: '#1E5B3F',
  path: '#B9AE9C',
  rack: '#5E5650',
  rackFrame: '#8A8174',
  metal: '#9A9184',
  core: '#E8E1D3',
  glass: '#F3EAD3',
  white: '#F2F5FA',
  rug: '#D9CBB2'
} as const;

// ---------- 度假村园区：每一栋（原本的楼层）在园区里的位置。坐北朝南，围着中间的湖 ----------
export const SITE: Record<string, { x: number; z: number }> = {
  '5F': { x: 0, z: -78 },     // 听澜堂：最北的主楼
  '4F': { x: -62, z: -42 },   // 格物楼
  'R': { x: 62, z: -42 },     // 观云台
  '2F': { x: -66, z: 14 },    // 听竹轩
  '3F': { x: 66, z: 14 },     // 运筹院
  '1F': { x: 0, z: 62 },      // 迎宾阁：一进大门
  'B1': { x: -112, z: -84 }   // 云栖馆：山坡里
};
export const LAKE = { x: 0, z: -12, rx: 30, rz: 24 };
export const siteOf = (id: string) => SITE[id] ?? { x: 0, z: 0 };
