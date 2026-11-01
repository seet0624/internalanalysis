// 把 JSON 资料 + 真实名单（hq/company.js）+ 真实审核纪录（hq/bus.js）合成一份公司模型。
import floorsJson from '../data/floors.json';
import deptsJson from '../data/departments.json';
import peopleJson from '../data/people.json';
import tasksJson from '../data/tasks.json';
import messagesJson from '../data/messages.json';
import projectsJson from '../data/projects.json';
import insightsJson from '../data/insights.json';
import type { Department, Floor, HistoryItem, Insight, L, Message, Person, Project, Status, Task } from '../types';

export const floors = floorsJson as Floor[];
export const departments = deptsJson as Department[];
const demoPeople = peopleJson as Person[];
const demoTasks = tasksJson as Task[];
const demoMessages = messagesJson as Message[];
export const projects = projectsJson as Project[];
export const insights = insightsJson as Insight[];

// ---------- 真实名单（hq/company.js 的 window.COMPANY） ----------
type HQAgent = { name: string; role: string; duty?: string; skill?: string; trait?: string };
type HQTeam = { id: string; name: string; kind: string; href?: string; agents: HQAgent[] };
type HQDept = HQTeam & { teams?: HQTeam[] };
export type HQEvent = { id: string; t: number; tool: string; kind: string; demo?: boolean; [k: string]: unknown };

declare global {
  interface Window {
    COMPANY?: { departments: HQDept[] };
    HQBus?: { list: () => HQEvent[]; on: (cb: (e: HQEvent) => void) => void; emit: (e: Partial<HQEvent>) => HQEvent };
    HQAuth?: { session: () => { id: string; role: string; name: string } | null; logout: () => void; root: string };
  }
}

const ROLE_EN: Record<string, string> = {
  核名专员: 'Name Checker', 繁体专员: 'Traditional Chinese Specialist', 订单库管理员: 'Order DB Keeper',
  审单专员: 'Order Reviewer', 分拣员: 'File Sorter', 沟通专员: 'Customer Liaison',
  回复撰写: 'Reply Writer', 工单分拣: 'Ticket Triage', 知识库编辑: 'Knowledge Base Editor', 升级处理: 'Escalations',
  内容写手: 'Content Writer', 活动策划: 'Campaign Planner', 邮件营销: 'Email Marketer', 品牌把关: 'Brand Reviewer',
  催款专员: 'Collections', 现金流: 'Cash Flow Analyst', 报税准备: 'Tax Prep',
  招聘: 'Recruiter', 入职引导: 'Onboarding Guide', 绩效考核: 'Performance Reviews',
  合同审查: 'Contract Review', 合规检查: 'Compliance Check', 数据分析: 'Data Analyst', 看板制作: 'Dashboard Builder'
};
const NAME_EN: Record<string, string> = {
  阿名: 'A-Ming', 小繁: 'Xiao Fan', 库管: 'Ku Guan', 阿技: 'A-Ji', 小急: 'Xiao Ji', 阿问: 'A-Wen',
  小回: 'Xiao Hui', 分拣: 'Fen Jian', 小知: 'Xiao Zhi', 阿升: 'A-Sheng', 小文: 'Xiao Wen', 阿策: 'A-Ce',
  小邮: 'Xiao You', 把关: 'Ba Guan', 阿催: 'A-Cui', 小流: 'Xiao Liu', 阿税: 'A-Shui', 小招: 'Xiao Zhao',
  阿新: 'A-Xin', 小考: 'Xiao Kao', 阿约: 'A-Yue', 小规: 'Xiao Gui', 阿析: 'A-Xi', 小板: 'Xiao Ban'
};

function findTeam(ref: string): HQTeam | undefined {
  const [deptId, teamId] = ref.split('.');
  const d = window.COMPANY?.departments.find((x) => x.id === deptId);
  if (!d) return undefined;
  return teamId ? d.teams?.find((x) => x.id === teamId) : d;
}

// 审核工具对应的小组：名字审核 → cs.name，技术单 → cs.tech
const TOOL_OF_TEAM: Record<string, string> = { 'cs.name': 'name', 'cs.tech': 'tech' };
const n = (e: HQEvent, k: string) => Number(e[k] ?? 0);
const minsAgo = (t: number) => Math.max(0, (Date.now() - t) / 60000);

export function describeEvent(e: HQEvent): L {
  if (e.tool === 'name') {
    return {
      zh: `名册审核：${n(e, 'files')} 份名册、${n(e, 'students')} 位学员，${n(e, 'must')} 位必须改、${n(e, 'check')} 位请确认`,
      en: `Roster review: ${n(e, 'files')} files, ${n(e, 'students')} students — ${n(e, 'must')} must change, ${n(e, 'check')} to confirm`
    };
  }
  if (e.kind === 'downloaded') return { zh: '技术单文件已下载，可以转给专家', en: 'Order files downloaded, ready for experts' };
  return {
    zh: `技术单审核：${n(e, 'files')} 个文件、${n(e, 'orders')} 张单，${n(e, 'problem')} 张有问题、${n(e, 'urgent')} 张加急、要问下单者 ${n(e, 'ask')} 单`,
    en: `Order review: ${n(e, 'files')} files, ${n(e, 'orders')} orders — ${n(e, 'problem')} issues, ${n(e, 'urgent')} urgent, ${n(e, 'ask')} need customer follow-up`
  };
}

function realStatus(team: string, idx: number, events: HQEvent[]): { status: Status; task: L; history: HistoryItem[] } {
  const tool = TOOL_OF_TEAM[team];
  if (!tool) {
    return { status: 'available', task: { zh: '在 Claude 里随时可用', en: 'Ready in Claude anytime' }, history: [] };
  }
  const mine = events.filter((e) => e.tool === tool);
  const history = mine.slice(-8).reverse().map((e) => ({ ago: minsAgo(e.t), text: describeEvent(e) }));
  const last = mine[mine.length - 1];
  if (!last) {
    return {
      status: 'available',
      task: tool === 'name' ? { zh: '等待新的名册', en: 'Waiting for the next roster' } : { zh: '等待新的技术单', en: 'Waiting for the next orders' },
      history
    };
  }
  const age = minsAgo(last.t);
  // 刚收到：第一位在做、后面的在等；过一阵子：大家都完成了
  const status: Status = age < 4 ? (idx === 0 ? 'working' : 'thinking') : age < 30 ? 'completed' : 'available';
  return { status, task: describeEvent(last), history };
}

function realPeople(events: HQEvent[]): Person[] {
  const out: Person[] = [];
  for (const d of departments) {
    if (!d.team) continue;
    const team = findTeam(d.team);
    if (!team) continue;
    team.agents.forEach((a, i) => {
      const s = realStatus(d.team as string, i, events);
      out.push({
        id: `${d.id}-r${i}`,
        name: { zh: a.name, en: NAME_EN[a.name] || a.name },
        type: 'ai', dept: d.id,
        title: { zh: a.role, en: ROLE_EN[a.role] || a.role },
        status: s.status, task: s.task, perf: 90 + ((i * 7) % 9),
        real: true, skill: a.skill,
        href: team.kind === 'site' && team.href ? `../${team.href}` : undefined,
        history: s.history.length ? s.history : (a.duty ? [{ ago: 0, text: { zh: a.duty, en: a.duty } }] : [])
      });
    });
  }
  return out;
}

function realTasks(events: HQEvent[]): Task[] {
  return events.filter((e) => e.kind !== 'downloaded').slice(-10).map((e): Task => ({
    id: `ev-${e.id}`, title: describeEvent(e),
    dept: e.tool === 'name' ? 'cs' : 'techsup', owner: e.tool === 'name' ? 'cs-r0' : 'techsup-r0',
    status: 'completed', priority: n(e, 'urgent') > 0 ? 'high' : 'medium', progress: 100,
    due: new Date(e.t).toISOString().slice(0, 10), real: true
  })).concat(
    events.filter((e) => e.tool === 'tech' && e.kind === 'processed' && n(e, 'ask') > 0).slice(-3).map((e): Task => ({
      id: `ask-${e.id}`,
      title: { zh: `回复 ${n(e, 'ask')} 位下单者（技术单）`, en: `Reply to ${n(e, 'ask')} customers (orders)` },
      dept: 'claude', owner: 'claude-r0', status: 'active', priority: 'high', progress: 30,
      due: new Date(e.t + 864e5).toISOString().slice(0, 10), real: true
    }))
  );
}

function realMessages(events: HQEvent[]): Message[] {
  return events.slice(-12).map((e) => ({
    id: `msg-${e.id}`, ch: 'task', from: e.tool === 'name' ? 'cs-r0' : 'techsup-r0',
    dept: e.tool === 'name' ? 'cs' : 'techsup', text: describeEvent(e), ago: minsAgo(e.t), real: true
  }));
}

export type CompanyModel = {
  floors: Floor[]; departments: Department[]; people: Person[]; tasks: Task[];
  messages: Message[]; projects: Project[]; insights: Insight[]; events: HQEvent[];
  rosterLoaded: boolean;
};

export function buildCompany(): CompanyModel {
  const events = (window.HQBus?.list() ?? []).filter((e) => !e.demo);
  const real = realPeople(events);
  return {
    floors, departments, projects, insights, events,
    people: [...demoPeople, ...real],
    tasks: [...realTasks(events).reverse(), ...demoTasks],
    messages: [...realMessages(events), ...demoMessages].sort((a, b) => a.ago - b.ago),
    rosterLoaded: real.length > 0
  };
}

// 查询小工具
export const deptById = (m: CompanyModel, id: string) => m.departments.find((d) => d.id === id);
export const floorById = (m: CompanyModel, id: string) => m.floors.find((f) => f.id === id);
export const peopleOfDept = (m: CompanyModel, id: string) => m.people.filter((p) => p.dept === id);
export const deptsOfFloor = (m: CompanyModel, id: string) => m.departments.filter((d) => d.floor === id);
export const peopleOfFloor = (m: CompanyModel, id: string) => {
  const ids = new Set(deptsOfFloor(m, id).map((d) => d.id));
  return m.people.filter((p) => ids.has(p.dept));
};
export const tasksOfFloor = (m: CompanyModel, id: string) => {
  const ids = new Set(deptsOfFloor(m, id).map((d) => d.id));
  return m.tasks.filter((t) => ids.has(t.dept));
};
export const personById = (m: CompanyModel, id: string) => m.people.find((p) => p.id === id);
