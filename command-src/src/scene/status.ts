// 员工状态的颜色（3D 地上的圈、员工卡、图例共用）和座位资料。
import type { Person, Status } from '../types';

export type Placement = { person: Person; x: number; z: number; ry: number; sit: boolean; seatId: string };

export const STATUS_COLOR: Record<Status, string> = {
  working: '#1A73E8', available: '#1E8E3E', thinking: '#9334E6', waiting: '#F9AB00', completed: '#12B5CB', error: '#D93025'
};
