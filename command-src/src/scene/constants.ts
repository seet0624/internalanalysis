// 大楼尺寸（公尺）。楼层平面 36 × 22，整栋时每层间隔 GAP（剖面图的爆炸间距）。
export const W = 36;
export const D = 22;
export const GAP = 6.2;
export const SLAB = 0.35;
export const WALL_H = 2.5;          // 内墙切到这个高度（剖面）
export const floorY = (level: number) => level * GAP;

export const COLORS = {
  slab: '#0C1734',
  slabTop: '#16244A',
  corridor: '#1B2C57',
  edge: '#22D3EE',
  deskTop: '#E6EBF5',
  deskLeg: '#2A3550',
  chair: '#1F2E57',
  chairBack: '#25407F',
  monitor: '#0A0F1C',
  screen: '#38BDF8',
  screenAlt: '#818CF8',
  wood: '#6B4A33',
  sofa: '#2E4A8A',
  sofaAlt: '#3A3F63',
  plantPot: '#D4D9E4',
  leaf: '#2F9E6B',
  leafDark: '#1F7A52',
  grass: '#1E5B3F',
  path: '#8A97B3',
  rack: '#0B1324',
  rackFrame: '#1A2540',
  metal: '#7B879F',
  core: '#0F1B3A',
  glass: '#8FD8FF',
  white: '#F2F5FA',
  rug: '#22325E'
} as const;
