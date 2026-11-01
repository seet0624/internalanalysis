// 大楼尺寸（公尺）。楼层平面 36 × 22，整栋时每层间隔 GAP（剖面图的爆炸间距）。
export const W = 36;
export const D = 22;
export const GAP = 6.2;
export const SLAB = 0.35;
export const WALL_H = 2.5;          // 内墙切到这个高度（剖面）
export const floorY = (level: number) => level * GAP;

export const COLORS = {
  slab: '#8A8174',
  slabTop: '#5C4A3A',
  corridor: '#6E665C',
  edge: '#D4AF5F',
  deskTop: '#EFE9DD',
  deskLeg: '#2B2622',
  chair: '#2B2622',
  chairBack: '#3A3430',
  monitor: '#121010',
  screen: '#F3EAD3',
  screenAlt: '#E3CB8F',
  wood: '#6B4A33',
  sofa: '#8C7A62',
  sofaAlt: '#4F5B4F',
  plantPot: '#D4D9E4',
  leaf: '#2F9E6B',
  leafDark: '#1F7A52',
  grass: '#1E5B3F',
  path: '#B9AE9C',
  rack: '#141211',
  rackFrame: '#2B2622',
  metal: '#9A9184',
  core: '#2B2622',
  glass: '#F3EAD3',
  white: '#F2F5FA',
  rug: '#6B5A48'
} as const;
