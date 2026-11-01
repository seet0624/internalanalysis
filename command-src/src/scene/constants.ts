// 大楼尺寸（公尺）。楼层平面 36 × 22，整栋时每层间隔 GAP（剖面图的爆炸间距）。
export const W = 36;
export const D = 22;
export const GAP = 6.2;
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
