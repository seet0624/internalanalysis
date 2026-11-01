// 指挥中心的资料型别。资料本身在 src/data/*.json，界面只读这些型别。
export type L = { zh: string; en: string };
export type Lang = 'zh' | 'en';

export type Status = 'working' | 'available' | 'thinking' | 'waiting' | 'completed' | 'error';
export const STATUSES: Status[] = ['working', 'available', 'thinking', 'waiting', 'completed', 'error'];

export type RoomKind =
  | 'office' | 'exec' | 'meeting' | 'board' | 'lounge' | 'coffee' | 'garden' | 'solar' | 'pavilion'
  | 'server' | 'compute' | 'network' | 'power' | 'monitor' | 'maintenance'
  | 'reception' | 'waiting' | 'security' | 'showroom' | 'training' | 'core';

export type Room = {
  id: string; name: L; kind: RoomKind;
  x: number; z: number; w: number; d: number;   // 楼层平面上的位置（公尺），左上角为 0,0
  dept?: string;                                // 哪个部门的房间
  seats?: number;                               // 工位数（office / training）
};

export type Floor = {
  id: string; code: string; level: number;
  name: L; description: L; accent: string;
  rooms: Room[];
};

export type Department = {
  id: string; floor: string; room: string;
  name: L; summary: L; color: string;
  team?: string;   // 有写：员工从 hq/company.js 的真实名单来（客服部）
};

export type HistoryItem = { ago: number; text: L };   // ago：几分钟前

// 人物外观（Roblox 风格 3D 角色）；没写就按 id 自动配一套
export type HairStyle = 'short' | 'long' | 'spiky' | 'bun' | 'ponytail' | 'side' | 'bob' | 'bald';
export type Look = { skin: string; hair: HairStyle; hairColor: string; top: string; bottom: string; headset?: boolean; glasses?: boolean; tie?: boolean };

export type Person = {
  id: string; name: L; type: 'human' | 'ai';
  dept: string; title: L;
  status: Status; task: L; perf: number;
  demo?: boolean; real?: boolean;
  skill?: string; href?: string;
  history?: HistoryItem[];
  look?: Look;
};

export type TaskStatus = 'pending' | 'active' | 'review' | 'completed' | 'blocked';
export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type Task = {
  id: string; title: L; dept: string; owner?: string;
  status: TaskStatus; priority: Priority; progress: number;
  due: string; project?: string; demo?: boolean; real?: boolean;
};

export type Channel = 'company' | 'dept' | 'ai' | 'task' | 'notice';
export type Message = {
  id: string; ch: Channel; from: string; dept?: string;
  text: L; ago: number; demo?: boolean; real?: boolean;
};

export type Project = {
  id: string; name: L; depts: string[]; lead: string;
  progress: number; status: 'on-track' | 'at-risk' | 'blocked' | 'done';
  due: string; demo?: boolean;
};

export type Insight = { id: string; kind: 'recommend' | 'alert' | 'notice'; text: L; floor?: string; demo?: boolean };
