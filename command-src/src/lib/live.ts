// 公司的「即时资料」：团队对话、工单、任务、老板派的任务（missions）、AI CEO 报告。
// 两种模式，界面完全一样：
//   cloud —— 登入时连上了 Supabase：资料存在云端，所有人即时同步，谁能看什么由后端权限把关（客服账号只看到 2F）。
//   local —— 连不上云端（或离线）：存在这台电脑的浏览器，同一台电脑的分页即时同步。
// AI 团队（每小时自动执行的 Claude）只看得到云端资料，所以派任务一定要在 cloud 模式。
import { useSyncExternalStore } from 'react';
import { cloud, cloudSession, newId } from './cloud';

export type ChatChannel = 'team' | 'announce' | 'notice' | 'dm' | 'mission';
export type ChatMsg = {
  id: string; ch: ChatChannel; from: string;          // from：员工 id，或 'system'
  to?: string;                                         // 私讯对象
  text: string; t: number;
  files?: { name: string; size: number }[];
  scope?: Scope;
  mission?: string;                                    // 跟哪个任务有关
  smallTalk?: boolean;                                 // 闲聊（没任务时的小聊天，界面标「闲聊」）
  demo?: boolean;                                      // 只有按「播放示范」才会出现，界面标示范
};
export type Scope = '2F' | 'company';
export type TicketStatus = 'open' | 'progress' | 'pending' | 'done';
export type Ticket = {
  id: string; no: string; title: string; customer: string; channel: string;
  status: TicketStatus; priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee: string; createdAt: number; updatedAt: number; demo?: boolean;
};
export type TaskItem = { id: string; text: string; done: boolean; owner: string; t: number; demo?: boolean };

// 老板 → AI CEO 规划 → 审核部看计划 → 团队执行 → 审核部验收 → 完成
export type MissionStatus = 'new' | 'planning' | 'plan_review' | 'executing' | 'result_review' | 'done' | 'rework' | 'cancelled';
export type MissionKind = 'general' | 'code' | 'content' | 'research' | 'design' | 'ops' | 'cs';
export type Mission = {
  id: string; no: string; title: string; brief: string;
  kind: MissionKind; priority: Ticket['priority']; status: MissionStatus; scope: Scope;
  teams: string[]; assignees: string[];
  plan?: string; result?: string; links: { label: string; url: string }[];
  reviewRound: number; createdBy: string; createdAt: number; updatedAt: number;
};
export type MissionEventKind = 'created' | 'plan' | 'assign' | 'review' | 'approve' | 'revise' | 'progress' | 'result' | 'accept' | 'reject' | 'comment' | 'status';
export type MissionEvent = { id: string; mission: string; actor: string; kind: MissionEventKind; text: string; t: number };
export type CeoReport = { id: string; text: string; t: number; stats: Record<string, number> };

export type LiveMode = 'connecting' | 'cloud' | 'local';
type State = {
  mode: LiveMode;
  chat: ChatMsg[]; tickets: Ticket[]; tasks: TaskItem[];
  missions: Mission[]; events: MissionEvent[]; reports: CeoReport[];
  me: string | null; seeded: boolean;
};

const KEY = 'cmd-live-v1';
const ME_KEY = 'cmd-me';
const bc = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('cmd-live') : null;
const auth = () => window.HQAuth?.session() ?? null;
const myScope = (): Scope => (auth()?.role === 'boss' ? 'company' : '2F');
const readMe = () => { try { return localStorage.getItem(ME_KEY); } catch { return null; } };

function loadLocal(): State {
  const base: State = { mode: 'local', chat: [], tickets: [], tasks: [], missions: [], events: [], reports: [], me: readMe(), seeded: false };
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s && Array.isArray(s.chat)) return { ...base, chat: s.chat, tickets: s.tickets || [], tasks: s.tasks || [], missions: s.missions || [], events: s.events || [], me: readMe() ?? s.me ?? null, seeded: !!s.seeded };
  } catch { /* ignore */ }
  return base;
}

// AI 团队会先把整段讨论写好、时间排在接下来一小时；时间到了才显示，3D 办公室整个小时都有人在讨论。
let all = loadLocal();
let state: State = { ...all, mode: 'connecting', chat: due(all.chat) };
function due(chat: ChatMsg[], now = Date.now()) { return chat.filter((m) => m.t <= now); }

const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
function publish(next: State) {
  all = next;
  state = { ...next, chat: due(next.chat) };
  emit();
}
window.setInterval(() => { if (all.chat.length !== state.chat.length) publish(all); }, 4000);

function commit(next: State, broadcast = true) {
  next.chat = next.chat.slice(-400);
  publish(next);
  if (next.mode !== 'local') return;                   // 云端模式不写本地，资料以云端为准
  try { localStorage.setItem(KEY, JSON.stringify({ ...next, mode: undefined })); } catch { /* ignore */ }
  if (broadcast) bc?.postMessage('sync');
}
bc?.addEventListener('message', () => { if (all.mode === 'local') publish({ ...loadLocal(), mode: 'local' }); });
window.addEventListener('storage', (e) => { if (e.key === KEY && all.mode === 'local') publish({ ...loadLocal(), mode: 'local' }); });

// ---------- 云端 ↔ 画面 ----------
type Row = Record<string, unknown>;
const ts = (v: unknown) => (typeof v === 'string' ? Date.parse(v) : Date.now());
const mapChat = (r: Row): ChatMsg => ({
  id: String(r.id), ch: r.ch as ChatChannel, from: String(r.sender), to: (r.recipient as string) ?? undefined,
  text: String(r.body), t: ts(r.at), files: (r.files as ChatMsg['files']) ?? undefined, scope: r.scope as Scope,
  mission: (r.mission_id as string) ?? undefined, smallTalk: !!r.small_talk, demo: !!r.demo
});
const mapTicket = (r: Row): Ticket => ({
  id: String(r.id), no: String(r.no), title: String(r.title), customer: String(r.customer), channel: String(r.channel),
  status: r.status as TicketStatus, priority: r.priority as Ticket['priority'], assignee: String(r.assignee),
  createdAt: ts(r.created_at), updatedAt: ts(r.updated_at), demo: !!r.demo
});
const mapTask = (r: Row): TaskItem => ({ id: String(r.id), text: String(r.text), done: !!r.done, owner: String(r.owner), t: ts(r.at), demo: !!r.demo });
const mapMission = (r: Row): Mission => ({
  id: String(r.id), no: String(r.no), title: String(r.title), brief: String(r.brief ?? ''),
  kind: r.kind as MissionKind, priority: r.priority as Ticket['priority'], status: r.status as MissionStatus, scope: r.scope as Scope,
  teams: (r.teams as string[]) ?? [], assignees: (r.assignees as string[]) ?? [],
  plan: (r.plan as string) ?? undefined, result: (r.result as string) ?? undefined, links: (r.links as Mission['links']) ?? [],
  reviewRound: Number(r.review_round ?? 0), createdBy: String(r.created_by), createdAt: ts(r.created_at), updatedAt: ts(r.updated_at)
});
const mapEvent = (r: Row): MissionEvent => ({ id: String(r.id), mission: String(r.mission_id), actor: String(r.actor), kind: r.kind as MissionEventKind, text: String(r.body), t: ts(r.at) });
const mapReport = (r: Row): CeoReport => ({ id: String(r.id), text: String(r.body), t: ts(r.at), stats: (r.stats as Record<string, number>) ?? {} });

type ListKey = 'chat' | 'tickets' | 'tasks' | 'missions' | 'events' | 'reports';
const TABLES: Record<string, [ListKey, (r: Row) => { id: string }]> = {
  chat: ['chat', mapChat], tickets: ['tickets', mapTicket], tasks: ['tasks', mapTask],
  missions: ['missions', mapMission], mission_events: ['events', mapEvent], ceo_reports: ['reports', mapReport]
};
function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  const i = list.findIndex((x) => x.id === item.id);
  if (i < 0) return [...list, item];
  const next = list.slice(); next[i] = item; return next;
}
const byTime = <T extends { t: number }>(l: T[]) => l.sort((a, b) => a.t - b.t);

async function connect() {
  const who = auth();
  const ok = await cloudSession(who?.id);
  if (!ok) { publish({ ...all, mode: 'local' }); if (wantSeed) seedDemo(); return; }
  const sb = cloud();
  try {
    const [c, tk, ta, mi, ev, rp] = await Promise.all([
      sb.from('chat').select('*').order('at', { ascending: false }).limit(400),
      sb.from('tickets').select('*').order('created_at', { ascending: false }).limit(500),
      sb.from('tasks').select('*').order('at').limit(500),
      sb.from('missions').select('*').order('created_at', { ascending: false }).limit(200),
      sb.from('mission_events').select('*').order('at').limit(3000),
      sb.from('ceo_reports').select('*').order('at', { ascending: false }).limit(10)
    ]);
    const err = [c, tk, ta, mi, ev, rp].find((x) => x.error);
    if (err) throw err.error;
    publish({
      ...all, mode: 'cloud', seeded: true,
      chat: byTime((c.data ?? []).map(mapChat)), tickets: (tk.data ?? []).map(mapTicket), tasks: (ta.data ?? []).map(mapTask),
      missions: (mi.data ?? []).map(mapMission), events: (ev.data ?? []).map(mapEvent), reports: byTime((rp.data ?? []).map(mapReport))
    });
    const ch = sb.channel('hq-live');
    for (const table of Object.keys(TABLES)) {
      ch.on('postgres_changes', { event: '*', schema: 'public', table }, (p) => {
        const [key, map] = TABLES[table];
        const list = all[key] as { id: string }[];
        const next = p.eventType === 'DELETE'
          ? list.filter((x) => x.id !== String((p.old as Row).id))
          : upsert(list, map(p.new as Row));
        publish({ ...all, [key]: key === 'chat' || key === 'events' ? byTime(next as ChatMsg[]) : next });
      });
    }
    ch.subscribe();
  } catch (e) {
    console.warn('[live] 云端连不上，改用本机模式', e);
    publish({ ...loadLocal(), mode: 'local' });
    if (wantSeed) seedDemo();
  }
}
void connect();

// 云端写入：先更新画面（同一个 id），失败就提示
function push(table: string, op: 'insert' | 'update' | 'delete', row: Row, id?: string) {
  const sb = cloud().from(table);
  const q = op === 'insert' ? sb.insert(row) : op === 'update' ? sb.update(row).eq('id', id!) : sb.delete().eq('id', id!);
  void q.then(({ error }) => { if (error) { console.warn('[live]', table, error.message); window.dispatchEvent(new CustomEvent('live-error', { detail: error.message })); } });
}
const isCloud = () => all.mode === 'cloud';

// 第一次用（本机模式）：放几张示范工单、任务（标示范，可以一键清掉）。对话不放假的。云端只放真实资料。
let wantSeed = false;
function seedDemo() {
  if (all.mode === 'connecting') { wantSeed = true; return; }
  if (all.seeded || all.mode !== 'local') return;
  const now = Date.now(), m = 60000;
  const T = (no: string, title: string, customer: string, channel: string, status: TicketStatus, priority: Ticket['priority'], assignee: string, ago: number): Ticket =>
    ({ id: newId(), no, title, customer, channel, status, priority, assignee, createdAt: now - ago * m, updatedAt: now - ago * m / 2, demo: true });
  commit({
    ...all, seeded: true,
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
      { id: newId(), text: '跟进待回复工单', done: false, owner: 'cn-01', t: now, demo: true },
      { id: newId(), text: '处理充值异常', done: false, owner: 'cn-03', t: now, demo: true },
      { id: newId(), text: '更新学员物流状态', done: false, owner: 'cn-05', t: now, demo: true }
    ]
  });
}

const chatRow = (m: ChatMsg): Row => ({
  id: m.id, ch: m.ch, scope: m.scope ?? '2F', sender: m.from, recipient: m.to ?? null, body: m.text,
  files: m.files ?? null, mission_id: m.mission ?? null, small_talk: false, demo: !!m.demo, at: new Date(m.t).toISOString()
});
function addChat(m: ChatMsg, s: State): State {
  if (isCloud()) push('chat', 'insert', chatRow(m));
  return { ...s, chat: [...s.chat, m] };
}

export const live = {
  get: () => state,
  subscribe: (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; },
  seedDemo,
  clearDemo: () => {
    if (isCloud()) {
      all.tickets.filter((x) => x.demo).forEach((x) => push('tickets', 'delete', {}, x.id));
      all.tasks.filter((x) => x.demo).forEach((x) => push('tasks', 'delete', {}, x.id));
      all.chat.filter((x) => x.demo).forEach((x) => push('chat', 'delete', {}, x.id));
    }
    commit({ ...all, chat: all.chat.filter((x) => !x.demo), tickets: all.tickets.filter((x) => !x.demo), tasks: all.tasks.filter((x) => !x.demo) });
  },
  setMe: (id: string) => { try { localStorage.setItem(ME_KEY, id); } catch { /* ignore */ } commit({ ...all, me: id }); },
  send: (m: Omit<ChatMsg, 'id' | 't'> & { t?: number }) =>
    commit(addChat({ id: newId(), t: Date.now(), scope: m.scope ?? (m.ch === 'mission' ? myScope() : '2F'), ...m }, all)),
  addTicket: (t: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt'>) => {
    const tk: Ticket = { ...t, id: newId(), createdAt: Date.now(), updatedAt: Date.now() };
    if (isCloud()) push('tickets', 'insert', { id: tk.id, no: tk.no, title: tk.title, customer: tk.customer, channel: tk.channel, status: tk.status, priority: tk.priority, assignee: tk.assignee, demo: !!tk.demo });
    commit({ ...all, tickets: [tk, ...all.tickets] });
  },
  updateTicket: (id: string, patch: Partial<Ticket>, by: string) => {
    const tk = all.tickets.find((x) => x.id === id);
    if (!tk) return;
    const tickets = all.tickets.map((x) => (x.id === id ? { ...x, ...patch, updatedAt: Date.now() } : x));
    if (isCloud()) push('tickets', 'update', { ...(patch.status && { status: patch.status }), ...(patch.assignee && { assignee: patch.assignee }), ...(patch.priority && { priority: patch.priority }) }, id);
    const words: Record<TicketStatus, string> = { open: '重新打开', progress: '开始处理', pending: '等待客户回复', done: '已经处理好了，工单状态已更新' };
    // 真实动作 → 系统通知（3D 里这个人的头上也会冒出这句话）
    const text = patch.status ? `工单 ${tk.no}「${tk.title}」${words[patch.status]}` : patch.assignee ? `工单 ${tk.no} 交给新的负责人` : `更新了工单 ${tk.no}`;
    commit(addChat({ id: newId(), t: Date.now(), ch: 'notice', from: by, text, scope: '2F', demo: tk.demo }, { ...all, tickets }));
  },
  addTask: (text: string, owner: string) => {
    const x: TaskItem = { id: newId(), text, done: false, owner, t: Date.now() };
    if (isCloud()) push('tasks', 'insert', { id: x.id, text, owner });
    commit({ ...all, tasks: [...all.tasks, x] });
  },
  toggleTask: (id: string, by: string) => {
    const tk = all.tasks.find((x) => x.id === id);
    if (!tk) return;
    if (isCloud()) push('tasks', 'update', { done: !tk.done }, id);
    const next = { ...all, tasks: all.tasks.map((x) => (x.id === id ? { ...x, done: !x.done } : x)) };
    commit(!tk.done ? addChat({ id: newId(), t: Date.now(), ch: 'notice', from: by, text: `完成了任务「${tk.text}」`, scope: '2F', demo: tk.demo }, next) : next);
  },
  removeTask: (id: string) => { if (isCloud()) push('tasks', 'delete', {}, id); commit({ ...all, tasks: all.tasks.filter((x) => x.id !== id) }); },

  // ---------- 老板派任务 ----------
  createMission: async (m: { title: string; brief: string; kind: MissionKind; priority: Ticket['priority']; teams: string[]; scope: Scope }, by: string): Promise<Mission | null> => {
    const id = newId(), now = Date.now();
    let mission: Mission = { id, no: 'M-' + String(all.missions.length + 1).padStart(3, '0'), ...m, status: 'new', assignees: [], links: [], reviewRound: 0, createdBy: by, createdAt: now, updatedAt: now };
    if (isCloud()) {
      const { data, error } = await cloud().from('missions')
        .insert({ id, title: m.title, brief: m.brief, kind: m.kind, priority: m.priority, teams: m.teams, scope: m.scope, created_by: by })
        .select().single();
      if (error || !data) { window.dispatchEvent(new CustomEvent('live-error', { detail: error?.message ?? '派任务失败' })); return null; }
      mission = mapMission(data as Row);
      push('mission_events', 'insert', { mission_id: id, actor: by, kind: 'created', body: m.brief || m.title });
    }
    const ev: MissionEvent = { id: newId(), mission: id, actor: by, kind: 'created', text: m.brief || m.title, t: now };
    const next = { ...all, missions: upsert(all.missions, mission), events: isCloud() ? all.events : [...all.events, ev] };
    commit(addChat({ id: newId(), t: now, ch: 'mission', from: by, scope: m.scope, mission: id, text: `派了新任务 ${mission.no}「${m.title}」，请 AI CEO 安排团队。` }, next));
    return mission;
  },
  commentMission: (missionId: string, text: string, by: string) => {
    const ev: MissionEvent = { id: newId(), mission: missionId, actor: by, kind: 'comment', text, t: Date.now() };
    if (isCloud()) push('mission_events', 'insert', { mission_id: missionId, actor: by, kind: 'comment', body: text });
    commit({ ...all, events: isCloud() ? all.events : [...all.events, ev] });
  },
  setMissionStatus: (missionId: string, status: MissionStatus, by: string, note: string) => {
    const mi = all.missions.find((x) => x.id === missionId);
    if (!mi) return;
    if (isCloud()) {
      push('missions', 'update', { status }, missionId);
      push('mission_events', 'insert', { mission_id: missionId, actor: by, kind: 'comment', body: note });
    }
    const ev: MissionEvent = { id: newId(), mission: missionId, actor: by, kind: 'comment', text: note, t: Date.now() };
    commit({ ...all, missions: all.missions.map((x) => (x.id === missionId ? { ...x, status, updatedAt: Date.now() } : x)), events: isCloud() ? all.events : [...all.events, ev] });
  }
};

export function useLive(): State {
  return useSyncExternalStore(live.subscribe, live.get, live.get);
}

// 某人最近 14 秒内说的话（3D 头上的对话泡泡只用真实讯息）
export function recentLine(chat: ChatMsg[], personId: string, now = Date.now()): ChatMsg | undefined {
  for (let i = chat.length - 1; i >= 0; i--) {
    const m = chat[i];
    if (m.t > now) continue;
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

export const MISSION_STEPS: { key: MissionStatus; label: string; who: string }[] = [
  { key: 'new', label: '你派任务', who: '老板' },
  { key: 'planning', label: 'AI CEO 规划', who: 'AI CEO' },
  { key: 'plan_review', label: '审核部看计划', who: '审核部' },
  { key: 'executing', label: '团队执行', who: '负责团队' },
  { key: 'result_review', label: '审核部验收', who: '审核部' },
  { key: 'done', label: '完成', who: '你看成果' }
];
export const MISSION_KINDS: { key: MissionKind; label: string; hint: string }[] = [
  { key: 'general', label: '一般', hint: '让 AI CEO 决定谁来做' },
  { key: 'code', label: '写程序', hint: '开发组改网站 / 工具，交程序给你合并' },
  { key: 'content', label: '文案内容', hint: '营销、公告、话术' },
  { key: 'research', label: '调查分析', hint: '市场、竞争对手、资料分析' },
  { key: 'design', label: '设计', hint: '界面、图片、版面' },
  { key: 'ops', label: '营运流程', hint: '流程、制度、表格' },
  { key: 'cs', label: '客服', hint: '国内客服部（2F）一起看得到' }
];

// 这个人现在在做哪个任务（AI CEO 分工后，员工卡上的「目前任务」就是真实任务）
const ACTIVE: MissionStatus[] = ['planning', 'plan_review', 'executing', 'result_review', 'rework'];
export function missionTaskOf(missions: Mission[], personId: string): string | undefined {
  const m = missions.find((x) => ACTIVE.includes(x.status) && x.assignees.includes(personId));
  return m ? `${m.no}「${m.title}」` : undefined;
}
