import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { L, Lang } from '../types';

// 界面上的固定文字。资料里的文字（部门、员工……）本身就是 { zh, en }。
const UI = {
  appName: { zh: 'AI 公司指挥中心', en: 'AI Company Command Center' },
  company: { zh: '数易', en: 'Shuyi' },
  nav_features: { zh: '功能', en: 'Features' },
  nav_overview: { zh: '公司总览', en: 'Company Overview' },
  nav_missions: { zh: '派任务给 AI 团队', en: 'Missions for AI teams' },
  featuresCount: { zh: '我们有 {n} 个功能', en: 'We have {n} features' },
  featuresHint: { zh: '点一下就能用。审核工具在最上面。', en: 'Click to use. Review tools are at the top.' },
  fg_review: { zh: '审核工具', en: 'Review tools' },
  fg_docs: { zh: '客服资料', en: 'CS resources' },
  fg_claude: { zh: 'Claude 客服助手', en: 'Claude CS assistants' },
  fg_dept: { zh: '各部门 Claude 助手', en: 'Department Claude assistants' },
  startReview: { zh: '开始审核', en: 'Start review' },
  openDoc: { zh: '打开', en: 'Open' },
  lastRun: { zh: '上次', en: 'Last run' },
  todayRuns: { zh: '今天 {n} 次', en: '{n} today' },
  neverRun: { zh: '这台电脑还没用过', en: 'Not used on this computer yet' },
  claudeHint: { zh: '复制指令，到 Claude 里贴上，就会叫出这位助手。', en: 'Copy the command and paste it in Claude to call this assistant.' },
  howTo: { zh: '怎么用', en: 'How it works' },
  viewBuilding: { zh: '看 3D 大楼', en: 'View 3D building' },
  nav_building: { zh: '大楼与楼层', en: 'Building & Floors' },
  nav_departments: { zh: '部门与团队', en: 'Departments & Teams' },
  nav_ai: { zh: 'AI 员工', en: 'AI Employees' },
  nav_tasks: { zh: '任务管理', en: 'Task Management' },
  nav_projects: { zh: '项目管理', en: 'Project Management' },
  nav_comms: { zh: '公司沟通', en: 'Company Communication' },
  nav_kb: { zh: '知识库', en: 'Knowledge Base' },
  nav_analytics: { zh: '分析与报表', en: 'Analytics & Reports' },
  nav_settings: { zh: '系统设置', en: 'System Settings' },
  search: { zh: '搜索部门、员工、AI、任务…', en: 'Search departments, people, AI, tasks…' },
  noResults: { zh: '没有找到', en: 'No results' },
  wholeBuilding: { zh: '整栋大楼', en: 'Whole building' },
  backToBuilding: { zh: '回到整栋大楼', en: 'Back to building' },
  view3d: { zh: '3D', en: '3D' },
  view2d: { zh: '2D 平面', en: '2D plan' },
  zoomIn: { zh: '放大', en: 'Zoom in' },
  zoomOut: { zh: '缩小', en: 'Zoom out' },
  resetCam: { zh: '重设镜头', en: 'Reset camera' },
  fullscreen: { zh: '全屏', en: 'Fullscreen' },
  filters: { zh: '筛选', en: 'Filters' },
  showHumans: { zh: '员工', en: 'People' },
  showAI: { zh: 'AI 员工', en: 'AI agents' },
  allDepts: { zh: '全部部门', en: 'All departments' },
  notifications: { zh: '通知', en: 'Notifications' },
  aiAssistant: { zh: 'AI 助理', en: 'AI Assistant' },
  intel: { zh: '公司情报', en: 'Company Intelligence' },
  employees: { zh: '员工', en: 'Employees' },
  aiAgents: { zh: 'AI 员工', en: 'AI agents' },
  departments: { zh: '部门', en: 'Departments' },
  activeTasks: { zh: '进行中任务', en: 'Active tasks' },
  completedTasks: { zh: '已完成', en: 'Completed' },
  pendingTasks: { zh: '待处理', en: 'Pending' },
  aiActivity: { zh: 'AI 动态', en: 'AI activity' },
  recommendations: { zh: 'AI 建议', en: 'Recommendations' },
  alerts: { zh: '警报', en: 'Alerts' },
  floorInfo: { zh: '楼层资讯', en: 'Floor info' },
  floorDirectory: { zh: '部门目录', en: 'Department directory' },
  activityTimeline: { zh: '动态时间线', en: 'Activity timeline' },
  tasks: { zh: '任务', en: 'Tasks' },
  members: { zh: '成员', en: 'Members' },
  occupancy: { zh: '在座', en: 'Occupancy' },
  seats: { zh: '工位', en: 'seats' },
  currentTask: { zh: '目前任务', en: 'Current task' },
  performance: { zh: '表现', en: 'Performance' },
  history: { zh: '执行纪录', en: 'Execution history' },
  department: { zh: '部门', en: 'Department' },
  floor: { zh: '楼层', en: 'Floor' },
  status: { zh: '状态', en: 'Status' },
  priority: { zh: '优先', en: 'Priority' },
  progress: { zh: '进度', en: 'Progress' },
  due: { zh: '截止', en: 'Due' },
  owner: { zh: '负责', en: 'Owner' },
  demo: { zh: '示范', en: 'Demo' },
  real: { zh: '真实', en: 'Live' },
  demoNote: { zh: '标「示范」的是示范资料；客服部名单和审核纪录是真实的。', en: 'Items tagged "Demo" are sample data; the CS roster and review events are live.' },
  locked: { zh: '需要老板账号才能进入这一层', en: 'Boss account required for this floor' },
  openTool: { zh: '打开工具', en: 'Open tool' },
  copySkill: { zh: '复制 Claude 指令', en: 'Copy Claude command' },
  copied: { zh: '已复制', en: 'Copied' },
  close: { zh: '关闭', en: 'Close' },
  logout: { zh: '登出', en: 'Log out' },
  settings: { zh: '设置', en: 'Settings' },
  admin: { zh: '管理员', en: 'Administrator' },
  minutesAgo: { zh: '分钟前', en: 'min ago' },
  hoursAgo: { zh: '小时前', en: 'h ago' },
  justNow: { zh: '刚刚', en: 'just now' },
  people: { zh: '人', en: 'people' },
  ai: { zh: 'AI', en: 'AI' },
  human: { zh: '员工', en: 'Human' },
  viewDetails: { zh: '查看详情', en: 'View details' },
  enterFloor: { zh: '进入楼层', en: 'Enter floor' },
  comm_company: { zh: '全公司', en: 'Company-wide' },
  comm_dept: { zh: '部门', en: 'Departmental' },
  comm_ai: { zh: 'AI 沟通', en: 'AI communication' },
  comm_task: { zh: '任务更新', en: 'Task updates' },
  comm_notice: { zh: '系统通知', en: 'Notifications' },
  comm_timeline: { zh: '时间线', en: 'Timeline' },
  comm_title: { zh: '公司沟通', en: 'Company communication' },
  st_working: { zh: '工作中', en: 'Working' },
  st_available: { zh: '空闲', en: 'Available' },
  st_thinking: { zh: '思考中', en: 'Thinking' },
  st_waiting: { zh: '等待批准', en: 'Waiting for approval' },
  st_completed: { zh: '已完成', en: 'Completed' },
  st_error: { zh: '错误', en: 'Error' },
  ts_pending: { zh: '待处理', en: 'Pending' },
  ts_active: { zh: '进行中', en: 'In progress' },
  ts_review: { zh: '待审核', en: 'In review' },
  ts_completed: { zh: '已完成', en: 'Completed' },
  ts_blocked: { zh: '卡住', en: 'Blocked' },
  pr_low: { zh: '低', en: 'Low' },
  pr_medium: { zh: '中', en: 'Medium' },
  pr_high: { zh: '高', en: 'High' },
  pr_urgent: { zh: '紧急', en: 'Urgent' },
  pj_on_track: { zh: '正常', en: 'On track' },
  pj_at_risk: { zh: '有风险', en: 'At risk' },
  pj_blocked: { zh: '卡住', en: 'Blocked' },
  pj_done: { zh: '完成', en: 'Done' },
  taskCenter: { zh: '公司任务中心', en: 'Company Task Center' },
  projects: { zh: '项目', en: 'Projects' },
  lead: { zh: '负责人', en: 'Lead' },
  kbTitle: { zh: '知识库', en: 'Knowledge Base' },
  kbHint: { zh: '审核总部合进来的手册和教程，点开在新分页看。', en: 'Handbooks and guides merged into the HQ — opens in a new tab.' },
  analyticsTitle: { zh: '分析与报表', en: 'Analytics & Reports' },
  tasksByFloor: { zh: '各楼层任务', en: 'Tasks by floor' },
  aiStatusMix: { zh: 'AI 员工状态', en: 'AI agent status' },
  topPerformers: { zh: '表现最好', en: 'Top performers' },
  reviewsToday: { zh: '真实审核纪录', en: 'Live review events' },
  noReviews: { zh: '这个浏览器还没有审核纪录。用名字审核或技术单审核处理一次文件，这里会即时更新。', en: 'No review events in this browser yet. Process a file in Name or Tech review and this updates live.' },
  settingsTitle: { zh: '系统设置', en: 'System Settings' },
  language: { zh: '语言', en: 'Language' },
  quality: { zh: '画质', en: 'Render quality' },
  qHigh: { zh: '高', en: 'High' },
  qLow: { zh: '省电', en: 'Battery saver' },
  showLabels: { zh: '显示部门标签', en: 'Show department labels' },
  showSeatIds: { zh: '显示工位编号', en: 'Show workstation IDs' },
  autoRotate: { zh: '整栋大楼自动旋转', en: 'Auto-rotate building' },
  oldHQ: { zh: '审核总部（原 3D 办公室）', en: 'Review HQ (classic 3D office)' },
  deptDetail: { zh: '部门详情', en: 'Department detail' },
  realRosterNote: { zh: '名单来自 hq/company.js，状态跟着这台电脑的审核纪录更新。', en: 'Roster from hq/company.js; status follows this browser\'s review events.' },
  selectFloorHint: { zh: '点楼层标签或楼层进入；拖曳旋转，滚轮缩放。', en: 'Click a floor or its marker to enter. Drag to orbit, scroll to zoom.' },
  workstation: { zh: '工位', en: 'Workstation' },
  assistantGreeting: { zh: '我是公司的 AI 助理。问我楼层、部门、员工或任务，例如「2F 有谁在工作」「卡住的任务」。', en: 'I\'m the company AI assistant. Ask about floors, departments, people or tasks — e.g. "who is working on 2F", "blocked tasks".' },
  askPlaceholder: { zh: '问 AI 助理…', en: 'Ask the AI assistant…' },
  send: { zh: '送出', en: 'Send' },
  loading3d: { zh: '载入 3D 大楼…', en: 'Loading 3D building…' },
  no3d: { zh: '这台电脑显示不了 3D，左边的选单一样可以用。', en: '3D is not available on this device — the menus still work.' },
  all: { zh: '全部', en: 'All' },
  members_count: { zh: '位成员', en: 'members' }
} satisfies Record<string, L>;

export type UIKey = keyof typeof UI;

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (k: UIKey) => string; tr: (v: L | undefined) => string };
const LangCtx = createContext<Ctx | null>(null);

const readLang = (): Lang => {
  try { return localStorage.getItem('cmd-lang') === 'en' ? 'en' : 'zh'; } catch { return 'zh'; }
};

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readLang);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    document.documentElement.lang = l === 'zh' ? 'zh-CN' : 'en';
    try { localStorage.setItem('cmd-lang', l); } catch { /* 无痕模式 */ }
  }, []);
  const value = useMemo<Ctx>(() => ({
    lang, setLang,
    t: (k) => UI[k][lang],
    tr: (v) => (v ? v[lang] || v.zh : '')
  }), [lang, setLang]);
  return <LangCtx.Provider value={value}>{children}</LangCtx.Provider>;
}

export function useLang() {
  const c = useContext(LangCtx);
  if (!c) throw new Error('useLang 要放在 LangProvider 里');
  return c;
}

export function useAgo() {
  const { t, lang } = useLang();
  return (ago: number) => {
    if (ago < 1) return t('justNow');
    if (ago < 60) return `${Math.round(ago)}${lang === 'zh' ? ' ' : ' '}${t('minutesAgo')}`;
    return `${Math.round(ago / 60)} ${t('hoursAgo')}`;
  };
}
