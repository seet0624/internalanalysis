// 公司的「即时资料」：团队对话、工单、任务、我是谁。
// 现在存在这台电脑的浏览器（localStorage），同一台电脑的其他分页即时同步（BroadcastChannel）。
// 以后接 Supabase：只要把下面 load / save / 广播换成 Supabase 的资料表和 Realtime，界面不用改。
import { useSyncExternalStore } from 'react';

export type ChatChannel = 'team' | 'announce' | 'notice' | 'dm';
export type ChatMsg = {
  id: string; ch: ChatChannel; from: string;          // from：员工 id，或 'system'
  to?: string;                                         // 私讯对象
  text: string; t: number;
  files?: { name: string; size: number }[];
  demo?: boolean;                                      // 只有按「播放示范」才会出现，界面标示范
};
export type TicketStatus = 'open' | 'progress' | 'pending' | 'done';
export type Ticket = {
  id: string; no: string; title: string; customer: string; channel: string;
  status: TicketStatus; priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee: string; createdAt: number; updatedAt: number; demo?: boolean;
};
export type TaskItem = { id: string; text: string; done: boolean; owner: string; t: number; demo?: boolean };

type State = { chat: ChatMsg[]; tickets: Ticket[]; tasks: TaskItem[]; me: string | null; seeded: boolean };

const KEY = 'cmd-live-v1';
const bc = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('cmd-live') : null;
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

function load(): State {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s && Array.isArray(s.chat)) return { chat: s.chat, tickets: s.tickets || [], tasks: s.tasks || [], me: s.me ?? null, seeded: !!s.seeded };
  } catch { /* ignore */ }
  return { chat: [], tickets: [], tasks: [], me: null, seeded: false };
}

let state = load();
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

function commit(next: State, broadcast = true) {
  next.chat = next.chat.slice(-300);
  state = next;
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
  if (broadcast) bc?.postMessage('sync');
  emit();
}
bc?.addEventListener('message', () => { state = load(); emit(); });
window.addEventListener('storage', (e) => { if (e.key === KEY) { state = load(); emit(); } });

// 第一次用：放几张示范工单、任务（标示范，可以一键清掉）。对话不放假的。
function seedDemo() {
  if (state.seeded) return;
  const now = Date.now(), m = 60000;
  const T = (no: string, title: string, customer: string, channel: string, status: TicketStatus, priority: Ticket['priority'], assignee: string, ago: number): Ticket =>
    ({ id: uid(), no, title, customer, channel, status, priority, assignee, createdAt: now - ago * m, updatedAt: now - ago * m / 2, demo: true });
  commit({
    ...state, seeded: true,
    tickets: [
      T('T-1024', '学员订单改名进度查询', '王女士', '微信', 'progress', 'medium', 'cn-01', 42),
      T('T-1025', '充值记录没有到账', '李先生', '电话', 'open', 'high', 'cn-03', 30),
      T('T-1026', '退款申请（已审批）', '张同学', '微信', 'pending', 'medium', 'cn-02', 75),
      T('T-1027', '名正言顺技术单要繁体', '陈太太', '邮件', 'progress', 'low', 'cn-07', 18),
      T('T-1028', '物流显示已签收但没收到', '刘先生', '微信', 'open', 'urgent', 'cn-05', 9),
      T('T-1029', '投诉：回复太慢', '赵小姐', '电话', 'progress', 'high', 'cn-10', 55),
      T('T-1023', '更新学员联系电话', '周先生', '微信', 'done', 'low', 'cn-08', 140)
    ],
    tasks: [
      { id: uid(), text: '跟进待回复工单', done: false, owner: 'cn-01', t: now, demo: true },
      { id: uid(), text: '处理充值异常', done: false, owner: 'cn-03', t: now, demo: true },
      { id: uid(), text: '更新学员物流状态', done: false, owner: 'cn-05', t: now, demo: true }
    ]
  });
}

export const live = {
  get: () => state,
  subscribe: (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; },
  seedDemo,
  clearDemo: () => commit({ ...state, chat: state.chat.filter((x) => !x.demo), tickets: state.tickets.filter((x) => !x.demo), tasks: state.tasks.filter((x) => !x.demo) }),
  setMe: (id: string) => commit({ ...state, me: id }),
  send: (m: Omit<ChatMsg, 'id' | 't'> & { t?: number }) => commit({ ...state, chat: [...state.chat, { id: uid(), t: Date.now(), ...m }] }),
  addTicket: (t: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt'>) => commit({ ...state, tickets: [{ ...t, id: uid(), createdAt: Date.now(), updatedAt: Date.now() }, ...state.tickets] }),
  updateTicket: (id: string, patch: Partial<Ticket>, by: string) => {
    const tk = state.tickets.find((x) => x.id === id);
    if (!tk) return;
    const next = state.tickets.map((x) => (x.id === id ? { ...x, ...patch, updatedAt: Date.now() } : x));
    const words: Record<TicketStatus, string> = { open: '重新打开', progress: '开始处理', pending: '等待客户回复', done: '已经处理好了，工单状态已更新' };
    // 真实动作 → 系统通知（3D 里这个人的头上也会冒出这句话）
    const text = patch.status ? `工单 ${tk.no}「${tk.title}」${words[patch.status]}` : patch.assignee ? `工单 ${tk.no} 交给新的负责人` : `更新了工单 ${tk.no}`;
    commit({ ...state, tickets: next, chat: [...state.chat, { id: uid(), t: Date.now(), ch: 'notice', from: by, text, demo: tk.demo }] });
  },
  addTask: (text: string, owner: string) => commit({ ...state, tasks: [...state.tasks, { id: uid(), text, done: false, owner, t: Date.now() }] }),
  toggleTask: (id: string, by: string) => {
    const tk = state.tasks.find((x) => x.id === id);
    if (!tk) return;
    const tasks = state.tasks.map((x) => (x.id === id ? { ...x, done: !x.done } : x));
    const chat = !tk.done ? [...state.chat, { id: uid(), t: Date.now(), ch: 'notice' as const, from: by, text: `完成了任务「${tk.text}」`, demo: tk.demo }] : state.chat;
    commit({ ...state, tasks, chat });
  },
  removeTask: (id: string) => commit({ ...state, tasks: state.tasks.filter((x) => x.id !== id) })
};

export function useLive(): State {
  return useSyncExternalStore(live.subscribe, live.get, live.get);
}

// 某人最近 14 秒内说的话（3D 头上的对话泡泡只用真实讯息）
export function recentLine(chat: ChatMsg[], personId: string, now = Date.now()): ChatMsg | undefined {
  for (let i = chat.length - 1; i >= 0; i--) {
    const m = chat[i];
    if (now - m.t > 14000) break;
    if (m.from === personId && m.ch !== 'announce') return m;
  }
  return undefined;
}

// 按「播放示范」才出现的示范对话（标示范，不会自己乱生）
export const DEMO_SCRIPT: { from: string; text: string; ch?: ChatChannel }[] = [
  { from: 'cn-01', text: '我正在处理这个学员的订单。' },
  { from: 'cn-02', text: '可以帮我检查一下这个充值记录吗？' },
  { from: 'cn-03', text: '好的，我来跟进！' },
  { from: 'cn-07', text: '已经处理好了，我来更新工单状态。' },
  { from: 'cn-09', text: '下午三点会议室开个短会，大家同步一下本周目标。', ch: 'announce' },
  { from: 'claude-r0', text: '收到，我先起草 3 份回复给大家确认。' }
];
