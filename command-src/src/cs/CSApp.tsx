// 客服中国仪表板（参考图 2）：国内客服登入直接进 2F 工作台，看不到其他楼层。
// 3D 办公室跟老板仪表板是同一份楼层资料（floors.json 的 2F），员工、AI 位置一模一样。
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Bell, BookOpen, Bot, Box, CheckCircle2, ClipboardCheck, Copy, FileSpreadsheet, GraduationCap, Headphones, HelpCircle,
  Home, ListTodo, Map, Maximize2, Megaphone, MessageSquare, Paperclip, Play, Plus, Search, Send, Settings, Smile, Ticket as TicketIcon, Users, ChevronDown, ChevronUp, ArrowLeft, Trash2
} from 'lucide-react';
import { useStore } from '../lib/store';
import { useLang } from '../lib/i18n';
import { Scene } from '../scene/Scene';
import { STATUS_COLOR } from '../scene/Avatars';
import { avatarUrl } from '../lib/look';
import { DEMO_SCRIPT, live, useLive, type ChatChannel, type Ticket, type TicketStatus } from '../lib/live';
import { describeEvent } from '../lib/company';
import type { Person } from '../types';
import { cn } from '../lib/cn';

type View = 'desk' | 'customers' | 'tickets' | 'tasks' | 'team' | 'kb' | 'training' | 'notices' | 'settings';
const NAV: { id: View; label: string; icon: ReactNode }[] = [
  { id: 'desk', label: '我的工作台', icon: <Home className="size-[18px]" /> },
  { id: 'customers', label: '客户对话', icon: <MessageSquare className="size-[18px]" /> },
  { id: 'tickets', label: '工单管理', icon: <TicketIcon className="size-[18px]" /> },
  { id: 'tasks', label: '任务清单', icon: <ListTodo className="size-[18px]" /> },
  { id: 'team', label: '团队成员', icon: <Users className="size-[18px]" /> },
  { id: 'kb', label: '知识库', icon: <BookOpen className="size-[18px]" /> },
  { id: 'training', label: '培训中心', icon: <GraduationCap className="size-[18px]" /> },
  { id: 'notices', label: '公告通知', icon: <Megaphone className="size-[18px]" /> }
];
const TS_LABEL: Record<TicketStatus, string> = { open: '待处理', progress: '处理中', pending: '等待客户', done: '已完成' };
const TS_TONE: Record<TicketStatus, string> = { open: 'bg-danger/10 text-danger', progress: 'bg-brand/10 text-brand', pending: 'bg-warn/15 text-[#B06000]', done: 'bg-ok/10 text-ok' };
const PR_LABEL = { low: '低', medium: '中', high: '高', urgent: '紧急' } as const;
const fmtTime = (t: number) => { const d = new Date(t); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
const ago = (t: number) => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? '刚刚' : m < 60 ? `${m} 分钟前` : m < 1440 ? `${Math.round(m / 60)} 小时前` : `${Math.round(m / 1440)} 天前`; };

function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn('rounded-2xl border border-[#DADCE0] bg-surface shadow-glass', className)}>{children}</section>;
}
function Avatar({ p, size = 32, ring = true }: { p: Person; size?: number; ring?: boolean }) {
  return (
    <span className="relative inline-block shrink-0" style={{ width: size, height: size }}>
      <img src={avatarUrl(p, size * 2)} alt="" width={size} height={size} className="rounded-full" />
      {ring && <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-surface" style={{ background: STATUS_COLOR[p.status] }} />}
    </span>
  );
}

// 这一层的人：2F 的部门（老板仪表板用的是同一份）
function useFloorPeople() {
  const s = useStore();
  return useMemo(() => {
    const ids = new Set(s.model.departments.filter((d) => d.floor === '2F').map((d) => d.id));
    const ppl = s.model.people.filter((p) => ids.has(p.dept));
    return { all: ppl, humans: ppl.filter((p) => p.type === 'human'), ai: ppl.filter((p) => p.type === 'ai') };
  }, [s.model]);
}

function useMe() {
  const { me } = useLive();
  const s = useStore();
  const { humans } = useFloorPeople();
  const fallback = s.role === 'boss' ? s.model.people.find((p) => p.dept === 'ceo' && p.type === 'human') : humans.find((p) => p.id === 'cn-01') ?? humans.find((p) => p.dept === 'cs' && p.demo) ?? humans[0];
  return s.model.people.find((p) => p.id === me) ?? fallback ?? humans[0];
}

// ---------- 左边 ----------
function CSSidebar({ view, setView }: { view: View; setView: (v: View) => void }) {
  const s = useStore();
  const me = useMe();
  const { tickets, chat } = useLive();
  const { humans } = useFloorPeople();
  const { tr } = useLang();
  const [pick, setPick] = useState(false);
  const badge: Partial<Record<View, number>> = {
    tickets: tickets.filter((x) => x.status !== 'done').length,
    customers: tickets.filter((x) => x.status === 'open').length,
    notices: chat.filter((x) => x.ch === 'announce' && Date.now() - x.t < 864e5).length
  };
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-[#DADCE0] bg-surface">
      <div className="flex items-center gap-2 px-5 pb-3 pt-4">
        <img src="../hq/brand/shuyi-logo-64.png" alt="" className="size-8" />
        <div className="text-[17px] font-semibold tracking-tight text-fg">数易 <span className="text-faint">Company</span></div>
      </div>
      {me && (
        <div className="relative mx-3 mb-2">
          <button type="button" onClick={() => setPick((v) => !v)} className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left hover:bg-elevated" aria-expanded={pick}>
            <Avatar p={me} size={44} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold">{tr(me.name)}</span>
              <span className="block truncate text-xs text-muted">CS China Team{me.demo ? ' · 示范' : ''}</span>
            </span>
            <ChevronDown className="size-4 text-faint" />
          </button>
          {pick && (
            <div className="absolute left-0 right-0 top-14 z-30 max-h-72 overflow-auto rounded-xl border border-[#DADCE0] bg-surface p-1 shadow-glass">
              <div className="px-2 py-1 text-[11px] text-faint">我是谁（共用账号时选自己）</div>
              {humans.map((p) => (
                <button key={p.id} type="button" onClick={() => { live.setMe(p.id); setPick(false); }} className={cn('flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-elevated', p.id === me.id && 'bg-brand/10')}>
                  <Avatar p={p} size={24} ring={false} />{tr(p.name)}<span className="ml-auto text-[11px] text-faint">{tr(p.title)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <nav className="flex-1 overflow-y-auto px-3">
        {NAV.map((n) => (
          <button key={n.id} type="button" onClick={() => setView(n.id)} aria-current={view === n.id ? 'page' : undefined}
            className={cn('mb-0.5 flex w-full items-center gap-3 rounded-full px-4 py-2.5 text-[15px] transition-colors',
              view === n.id ? 'bg-[#E8F0FE] font-semibold text-[#1967D2]' : 'text-fg hover:bg-elevated')}>
            <span className={view === n.id ? 'text-[#1967D2]' : 'text-muted'}>{n.icon}</span>{n.label}
            {!!badge[n.id] && <span className="ml-auto rounded-full bg-danger px-2 text-[11px] font-semibold leading-5 text-white">{badge[n.id]}</span>}
          </button>
        ))}
        <div className="mx-4 my-3 h-px bg-[#DADCE0]" />
        <div className="px-4 pb-1 text-[11px] font-medium text-faint">审核工具</div>
        <a href="../name/" className="mb-0.5 flex items-center gap-3 rounded-full px-4 py-2 text-sm text-fg hover:bg-elevated"><ClipboardCheck className="size-[18px] text-brand" />名字审核</a>
        <a href="../tech/" className="flex items-center gap-3 rounded-full px-4 py-2 text-sm text-fg hover:bg-elevated"><FileSpreadsheet className="size-[18px] text-ok" />技术单审核</a>
      </nav>
      <div className="flex items-center gap-2 border-t border-[#DADCE0] p-3">
        <button type="button" onClick={() => setView('settings')} className={cn('flex flex-1 items-center gap-2 rounded-full px-3 py-2 text-sm hover:bg-elevated', view === 'settings' && 'bg-[#E8F0FE] text-[#1967D2]')}><Settings className="size-4" />系统设置</button>
        {s.role === 'boss' && <button type="button" onClick={() => s.setCsView(false)} className="flex items-center gap-1 rounded-full px-3 py-2 text-xs text-brand hover:bg-brand/10" title="回老板仪表板"><ArrowLeft className="size-3.5" />老板</button>}
        <button type="button" onClick={() => { window.HQAuth?.logout(); location.href = window.HQAuth?.root ?? '../'; }} className="rounded-full px-3 py-2 text-xs text-muted hover:bg-elevated">登出</button>
      </div>
    </aside>
  );
}

// ---------- 上面 ----------
function CSTopBar({ onSearch }: { onSearch: (q: string) => void }) {
  const me = useMe();
  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-[#DADCE0] bg-surface px-5">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-[#E8F0FE] text-[#1967D2]"><Headphones className="size-5" /></span>
        <div><h1 className="text-[19px] font-semibold leading-tight">2F 客服部（中国团队）</h1><p className="text-xs text-muted">Customer Service – China Team</p></div>
      </div>
      <label className="ml-4 hidden h-11 max-w-xl flex-1 items-center gap-2 rounded-full bg-elevated px-4 text-sm focus-within:bg-surface focus-within:shadow-glass md:flex">
        <Search className="size-4 text-muted" /><input onChange={(e) => onSearch(e.target.value)} placeholder="搜索客户、工单、同事…" aria-label="搜索" className="min-w-0 flex-1 bg-transparent placeholder:text-faint focus:outline-none" />
      </label>
      <div className="ml-auto flex items-center gap-2">
        <a href="../name/" className="hidden h-9 items-center gap-1.5 rounded-full bg-brand px-4 text-sm font-medium text-white hover:bg-[#1765CC] lg:flex"><ClipboardCheck className="size-4" />名字审核</a>
        <a href="../tech/" className="hidden h-9 items-center gap-1.5 rounded-full border border-[#DADCE0] px-4 text-sm font-medium text-brand hover:bg-brand/5 lg:flex"><FileSpreadsheet className="size-4" />技术单审核</a>
        <button type="button" className="grid size-10 place-items-center rounded-full text-muted hover:bg-elevated" aria-label="通知"><Bell className="size-5" /></button>
        <a href="../handbook/" className="grid size-10 place-items-center rounded-full text-muted hover:bg-elevated" aria-label="帮助"><HelpCircle className="size-5" /></a>
        {me && <Avatar p={me} size={36} ring={false} />}
      </div>
    </header>
  );
}

// ---------- 团队对话（底部） ----------
const EMOJI = ['👍', '✅', '🙏', '😊', '🎉', '👀', '💪', '❓'];
function TeamChat({ compact = false, initial = 'team' }: { compact?: boolean; initial?: ChatChannel }) {
  const s = useStore();
  const { tr } = useLang();
  const me = useMe();
  const { chat } = useLive();
  const [tab, setTab] = useState<ChatChannel>(initial);
  const [text, setText] = useState('');
  const [emoji, setEmoji] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const list = useRef<HTMLDivElement>(null);
  const person = (id: string) => s.model.people.find((p) => p.id === id);
  // 系统通知 = 工单 / 任务更新 + 真实审核纪录
  const notices = useMemo(() => {
    const ev = s.model.events.slice(-20).map((e) => ({ id: 'ev' + e.id, ch: 'notice' as const, from: e.tool === 'name' ? 'cs-r0' : 'techsup-r0', text: tr(describeEvent(e)), t: e.t, demo: false }));
    return [...chat.filter((m) => m.ch === 'notice'), ...ev].sort((a, b) => a.t - b.t);
  }, [chat, s.model.events, tr]);
  const msgs = tab === 'notice' ? notices : chat.filter((m) => m.ch === tab || (tab === 'team' && m.ch === 'mission'));
  useEffect(() => { list.current?.scrollTo({ top: list.current.scrollHeight }); }, [msgs.length, tab]);
  const send = () => {
    const v = text.trim();
    if ((!v && !files.length) || !me) return;
    live.send({ ch: tab === 'notice' ? 'team' : tab, from: me.id, text: v || '（附件）', files: files.map((f) => ({ name: f.name, size: f.size })) });
    setText(''); setFiles([]); setEmoji(false);
  };
  const playDemo = () => DEMO_SCRIPT.forEach((d, i) => window.setTimeout(() => live.send({ ch: d.ch ?? 'team', from: d.from, text: d.text, demo: true }), i * 2600));
  const tabs: [ChatChannel, string][] = [['team', '团队讨论'], ['announce', '部门公告'], ['notice', '系统通知']];
  return (
    <Card className="flex min-h-0 flex-col">
      <div className="flex items-center gap-1 border-b border-[#DADCE0] px-3" role="tablist">
        {tabs.map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={cn('relative px-3 py-2.5 text-sm', tab === k ? 'font-semibold text-[#1967D2] after:absolute after:inset-x-2 after:bottom-0 after:h-[3px] after:rounded-t after:bg-[#1A73E8]' : 'text-muted hover:text-fg')}>{l}</button>
        ))}
        {!chat.some((m) => m.demo) && <button type="button" onClick={playDemo} className="ml-auto flex items-center gap-1 rounded-full px-2 py-1 text-[11px] text-faint hover:bg-elevated" title="只用来看效果，讯息会标示范"><Play className="size-3" />播放示范</button>}
      </div>
      <div ref={list} className={cn('min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3', compact && 'max-h-40')} aria-live="polite">
        {msgs.length === 0 && <p className="py-4 text-center text-xs text-faint">{tab === 'team' ? '还没有讨论。说点什么，同事和 3D 办公室里的你都会看到。' : tab === 'announce' ? '还没有公告。' : '还没有通知。处理工单、完成任务、用审核工具处理文件后会出现在这里。'}</p>}
        {msgs.map((m) => {
          const p = person(m.from);
          return (
            <div key={m.id} className="flex gap-3">
              {p ? <Avatar p={p} size={34} ring={false} /> : <span className="grid size-[34px] place-items-center rounded-full bg-elevated text-[10px] text-muted">系统</span>}
              <div className="min-w-0">
                <div className="flex items-baseline gap-2 text-sm"><b className="font-semibold">{p ? tr(p.name) : '系统'}</b><span className="text-xs text-faint">{fmtTime(m.t)}</span>{m.demo && <span className="rounded bg-warn/15 px-1 text-[10px] text-[#B06000]">示范</span>}{'smallTalk' in m && m.smallTalk && <span className="rounded bg-[#E6F4EA] px-1 text-[10px] text-[#137333]">闲聊</span>}{m.ch === 'mission' && <span className="rounded bg-[#F3E8FD] px-1 text-[10px] text-[#8430CE]">任务</span>}</div>
                <p className="text-sm leading-relaxed text-fg">{m.text}</p>
                {'files' in m && m.files?.map((f) => <span key={f.name} className="mt-1 inline-flex items-center gap-1 rounded-lg bg-elevated px-2 py-1 text-xs text-muted"><Paperclip className="size-3" />{f.name}</span>)}
              </div>
            </div>
          );
        })}
      </div>
      {tab !== 'notice' && (
        <div className="relative flex items-center gap-2 border-t border-[#DADCE0] p-2.5">
          <label className="flex h-10 min-w-0 flex-1 items-center gap-1 rounded-full border border-[#DADCE0] px-4 focus-within:border-brand">
            <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) send(); }}
              placeholder={tab === 'announce' ? '发布部门公告…' : '输入消息…'} aria-label="输入消息" className="min-w-0 flex-1 bg-transparent text-sm placeholder:text-faint focus:outline-none" />
            {files.length > 0 && <span className="text-[11px] text-brand">{files.length} 个附件</span>}
            <button type="button" onClick={() => setEmoji((v) => !v)} className="grid size-8 place-items-center rounded-full text-muted hover:bg-elevated" aria-label="表情"><Smile className="size-[18px]" /></button>
            <label className="grid size-8 cursor-pointer place-items-center rounded-full text-muted hover:bg-elevated" aria-label="附件"><Paperclip className="size-[18px]" /><input type="file" multiple className="hidden" onChange={(e) => setFiles(Array.from(e.target.files ?? []))} /></label>
          </label>
          <button type="button" onClick={send} className="grid size-10 place-items-center rounded-full bg-ok text-white hover:brightness-110" aria-label="发送"><Send className="size-[18px]" /></button>
          {emoji && <div className="absolute bottom-14 right-14 flex gap-1 rounded-xl border border-[#DADCE0] bg-surface p-1.5 shadow-glass">{EMOJI.map((e) => <button key={e} type="button" onClick={() => setText((t) => t + e)} className="grid size-8 place-items-center rounded-lg text-lg hover:bg-elevated">{e}</button>)}</div>}
        </div>
      )}
    </Card>
  );
}

// ---------- 今日任务 ----------
function TodayTasks({ full = false }: { full?: boolean }) {
  const me = useMe();
  const { tasks } = useLive();
  const s = useStore();
  const { tr } = useLang();
  const [text, setText] = useState('');
  const list = full ? tasks : tasks.filter((x) => !me || x.owner === me.id || !x.done).slice(0, 6);
  return (
    <Card className="flex min-h-0 flex-col">
      <h3 className="border-b border-[#DADCE0] px-4 py-3 text-[15px] font-semibold">{full ? '任务清单' : '今日任务'} <span className="text-muted">({tasks.filter((x) => !x.done).length})</span></h3>
      <ul className="min-h-0 flex-1 divide-y divide-[#F1F3F4] overflow-y-auto px-2">
        {list.map((x) => {
          const owner = s.model.people.find((p) => p.id === x.owner);
          return (
            <li key={x.id} className="group flex items-center gap-3 px-2 py-2.5">
              <input type="checkbox" checked={x.done} onChange={() => me && live.toggleTask(x.id, me.id)} className="size-[18px] rounded accent-[#1A73E8]" aria-label={x.text} />
              <span className={cn('min-w-0 flex-1 text-sm', x.done && 'text-faint line-through')}>{x.text}{x.demo && <span className="ml-1 rounded bg-warn/15 px-1 text-[10px] text-[#B06000]">示范</span>}</span>
              {owner && full && <span className="flex items-center gap-1 text-xs text-muted"><Avatar p={owner} size={20} ring={false} />{tr(owner.name)}</span>}
              {full && <button type="button" onClick={() => live.removeTask(x.id)} className="opacity-0 group-hover:opacity-100" aria-label="删除"><Trash2 className="size-4 text-faint" /></button>}
            </li>
          );
        })}
        {list.length === 0 && <li className="px-2 py-4 text-center text-xs text-faint">今天没有任务</li>}
      </ul>
      <form onSubmit={(e) => { e.preventDefault(); if (text.trim() && me) { live.addTask(text.trim(), me.id); setText(''); } }} className="flex gap-2 border-t border-[#DADCE0] p-2.5">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="加一个任务…" aria-label="加任务" className="h-9 min-w-0 flex-1 rounded-full bg-elevated px-3 text-sm placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-brand/30" />
        <button type="submit" className="grid size-9 place-items-center rounded-full text-brand hover:bg-brand/10" aria-label="新增"><Plus className="size-5" /></button>
      </form>
    </Card>
  );
}

// ---------- AI 助手卡片 ----------
function AICard() {
  const s = useStore();
  const { tr } = useLang();
  const { ai } = useFloorPeople();
  const main = ai.find((p) => p.skill) ?? ai[0];
  const copy = async () => {
    if (!main?.skill) return;
    try { await navigator.clipboard.writeText(`/${main.skill}`); s.flash(`已复制 /${main.skill}，到 Claude 里贴上就能用`); } catch { s.flash(`/${main.skill}`); }
  };
  return (
    <section className="relative flex min-h-0 flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-[#174EA6] via-[#1A73E8] to-[#4285F4] p-4 text-white shadow-glass">
      <div className="absolute -right-6 -top-6 size-32 rounded-full bg-white/10" />
      <div className="relative flex items-start gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/20"><Bot className="size-7" /></span>
        <div><h3 className="text-lg font-semibold">AI 助手</h3><p className="text-sm text-white/85">智能客服协助</p><p className="mt-1 text-xs text-white/70">自动回复 · 工单分类 · 资料查询</p></div>
      </div>
      <ul className="relative mt-2 space-y-1 text-xs">
        {ai.slice(0, 3).map((p) => <li key={p.id} className="flex items-center gap-2 text-white/90"><span className="size-1.5 rounded-full" style={{ background: STATUS_COLOR[p.status] }} />{tr(p.name)} · {tr(p.title)}<span className="ml-auto truncate text-white/60">{tr(p.task)}</span></li>)}
      </ul>
      <button type="button" onClick={copy} className="relative mt-3 flex h-10 items-center justify-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-[#1967D2] hover:bg-[#E8F0FE]"><Copy className="size-4" />立即使用（复制 Claude 指令）</button>
    </section>
  );
}

// ---------- 右边：部门概览、目标、团队在线 ----------
function RightPanel({ goTeam }: { goTeam: () => void }) {
  const { tr } = useLang();
  const { humans, ai } = useFloorPeople();
  const { tickets } = useLive();
  const today = new Date().toDateString();
  const active = tickets.filter((x) => x.status === 'open' || x.status === 'progress').length;
  const doneToday = tickets.filter((x) => x.status === 'done' && new Date(x.updatedAt).toDateString() === today).length;
  const weekAgo = Date.now() - 7 * 864e5;
  const doneWeek = tickets.filter((x) => x.status === 'done' && x.updatedAt > weekAgo).length;
  const goal = 48;
  const pct = Math.min(100, Math.round((doneWeek / goal) * 100));
  const online = humans.filter((p) => p.status !== 'error');
  const Stat = ({ icon, label, value, sub, tone }: { icon: ReactNode; label: string; value: ReactNode; sub?: string; tone: string }) => (
    <div className="rounded-xl border border-[#E8EAED] p-3">
      <div className="flex items-center gap-2 text-xs text-muted"><span className={tone}>{icon}</span>{label}</div>
      <div className="num mt-1 text-2xl font-semibold">{value}</div>{sub && <div className="text-[11px] text-faint">{sub}</div>}
    </div>
  );
  return (
    <aside className="flex min-h-0 w-80 shrink-0 flex-col gap-3 overflow-y-auto">
      <Card className="p-4">
        <div className="mb-3 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[#E8F0FE] text-[#1967D2]"><Users className="size-5" /></span><div><h3 className="font-semibold">部门概览</h3><p className="text-xs text-muted">CS China 团队</p></div></div>
        <div className="grid grid-cols-2 gap-2">
          <Stat icon={<Users className="size-4" />} label="团队人数" value={humans.length} sub={`在线 ${online.length}`} tone="text-brand" />
          <Stat icon={<Bot className="size-4" />} label="AI 助手" value={ai.length} tone="text-ai" />
          <Stat icon={<Headphones className="size-4" />} label="处理中工单" value={active} sub={`待处理 ${tickets.filter((x) => x.status === 'open').length}`} tone="text-warn" />
          <Stat icon={<CheckCircle2 className="size-4" />} label="今日完成" value={doneToday} sub={`等待客户 ${tickets.filter((x) => x.status === 'pending').length}`} tone="text-ok" />
        </div>
        <div className="mt-4 flex items-center gap-4">
          <div className="relative size-24 shrink-0">
            <svg viewBox="0 0 36 36" className="size-24 -rotate-90"><circle cx="18" cy="18" r="15.5" fill="none" stroke="#E8EAED" strokeWidth="3.5" /><circle cx="18" cy="18" r="15.5" fill="none" stroke="#1E8E3E" strokeWidth="3.5" strokeLinecap="round" strokeDasharray={`${pct * 0.974} 100`} /></svg>
            <span className="num absolute inset-0 grid place-items-center text-xl font-semibold">{pct}%</span>
          </div>
          <div className="text-sm"><div className="font-semibold">本周目标进度</div><div className="mt-1 text-muted">目标：{goal} 单</div><div className="text-muted">已完成：<b className="text-fg">{doneWeek}</b> 单</div></div>
        </div>
      </Card>
      <Card className="flex min-h-0 flex-col p-4">
        <div className="mb-2 flex items-center justify-between"><h3 className="font-semibold">团队在线 ({online.length})</h3><button type="button" onClick={goTeam} className="text-sm text-brand hover:underline">查看全部</button></div>
        <ul className="space-y-2.5">
          {humans.slice(0, 8).map((p) => (
            <li key={p.id} className="flex items-center gap-3">
              <Avatar p={p} size={34} />
              <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{tr(p.name)}{p.demo && <span className="ml-1 text-[10px] text-faint">示范</span>}</div><div className="truncate text-xs text-muted">{tr(p.task)}</div></div>
              <span className="flex items-center gap-1 text-xs text-ok"><span className="size-1.5 rounded-full bg-ok" />在线</span>
            </li>
          ))}
        </ul>
      </Card>
    </aside>
  );
}

// ---------- 工单管理 ----------
function Tickets({ q }: { q: string }) {
  const { tr } = useLang();
  const me = useMe();
  const { tickets } = useLive();
  const { humans, ai } = useFloorPeople();
  const [f, setF] = useState<TicketStatus | 'all'>('all');
  const [draft, setDraft] = useState({ title: '', customer: '', channel: '微信', priority: 'medium' as Ticket['priority'] });
  const people = [...humans, ...ai];
  const list = tickets.filter((x) => (f === 'all' || x.status === f) && (!q || (x.title + x.customer + x.no).includes(q)));
  const add = () => {
    if (!draft.title.trim() || !me) return;
    const n = 1000 + tickets.length + 1 + Math.floor(Math.random() * 9);
    live.addTicket({ no: `T-${n}`, title: draft.title.trim(), customer: draft.customer.trim() || '客户', channel: draft.channel, status: 'open', priority: draft.priority, assignee: me.id });
    setDraft({ ...draft, title: '', customer: '' });
  };
  return (
    <Card className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-[#DADCE0] px-4 py-3">
        <h2 className="mr-2 text-lg font-semibold">工单管理</h2>
        {(['all', 'open', 'progress', 'pending', 'done'] as const).map((k) => (
          <button key={k} type="button" onClick={() => setF(k)} className={cn('rounded-full border px-3 py-1 text-sm', f === k ? 'border-transparent bg-[#E8F0FE] font-medium text-[#1967D2]' : 'border-[#DADCE0] text-muted hover:bg-elevated')}>
            {k === 'all' ? '全部' : TS_LABEL[k]} <span className="num text-xs">{k === 'all' ? tickets.length : tickets.filter((x) => x.status === k).length}</span>
          </button>
        ))}
        {tickets.some((x) => x.demo) && <button type="button" onClick={() => live.clearDemo()} className="ml-auto rounded-full px-3 py-1 text-xs text-faint hover:bg-elevated">清除示范资料</button>}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); add(); }} className="flex flex-wrap items-center gap-2 border-b border-[#F1F3F4] px-4 py-2.5">
        <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="新工单：问题描述" aria-label="问题描述" className="h-9 min-w-48 flex-1 rounded-lg border border-[#DADCE0] px-3 text-sm focus:border-brand focus:outline-none" />
        <input value={draft.customer} onChange={(e) => setDraft({ ...draft, customer: e.target.value })} placeholder="客户" aria-label="客户" className="h-9 w-28 rounded-lg border border-[#DADCE0] px-3 text-sm focus:border-brand focus:outline-none" />
        <select value={draft.channel} onChange={(e) => setDraft({ ...draft, channel: e.target.value })} aria-label="渠道" className="h-9 rounded-lg border border-[#DADCE0] px-2 text-sm">{['微信', '电话', '邮件', '其他'].map((c) => <option key={c}>{c}</option>)}</select>
        <select value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value as Ticket['priority'] })} aria-label="优先" className="h-9 rounded-lg border border-[#DADCE0] px-2 text-sm">{(Object.keys(PR_LABEL) as Ticket['priority'][]).map((k) => <option key={k} value={k}>{PR_LABEL[k]}</option>)}</select>
        <button type="submit" className="flex h-9 items-center gap-1 rounded-full bg-brand px-4 text-sm font-medium text-white hover:bg-[#1765CC]"><Plus className="size-4" />新建工单</button>
      </form>
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="sticky top-0 bg-surface text-left text-xs text-muted"><tr className="border-b border-[#DADCE0]"><th className="px-4 py-2 font-medium">编号</th><th className="py-2 font-medium">问题</th><th className="py-2 font-medium">客户</th><th className="py-2 font-medium">优先</th><th className="py-2 font-medium">负责人</th><th className="py-2 font-medium">状态</th><th className="py-2 pr-4 font-medium">更新</th></tr></thead>
          <tbody>
            {list.map((x) => {
              const a = people.find((p) => p.id === x.assignee);
              return (
                <tr key={x.id} className="border-b border-[#F1F3F4] hover:bg-[#F8F9FA]">
                  <td className="num px-4 py-2.5 text-xs text-muted">{x.no}</td>
                  <td className="py-2.5 pr-3">{x.title}{x.demo && <span className="ml-1 rounded bg-warn/15 px-1 text-[10px] text-[#B06000]">示范</span>}</td>
                  <td className="py-2.5 text-muted">{x.customer} · {x.channel}</td>
                  <td className="py-2.5"><span className={cn('rounded-full px-2 py-0.5 text-xs', x.priority === 'urgent' ? 'bg-danger/10 text-danger' : x.priority === 'high' ? 'bg-warn/15 text-[#B06000]' : 'bg-elevated text-muted')}>{PR_LABEL[x.priority]}</span></td>
                  <td className="py-2.5">
                    <span className="flex items-center gap-1.5">{a && <Avatar p={a} size={22} ring={false} />}
                      <select value={x.assignee} onChange={(e) => me && live.updateTicket(x.id, { assignee: e.target.value }, me.id)} aria-label="负责人" className="max-w-28 rounded border-0 bg-transparent text-sm">
                        {people.map((p) => <option key={p.id} value={p.id}>{p.type === 'ai' ? 'AI · ' : ''}{tr(p.name)}</option>)}
                      </select></span>
                  </td>
                  <td className="py-2.5"><select value={x.status} onChange={(e) => me && live.updateTicket(x.id, { status: e.target.value as TicketStatus }, me.id)} aria-label="状态" className={cn('rounded-full border-0 px-2 py-1 text-xs font-medium', TS_TONE[x.status])}>
                    {(Object.keys(TS_LABEL) as TicketStatus[]).map((k) => <option key={k} value={k}>{TS_LABEL[k]}</option>)}</select></td>
                  <td className="py-2.5 pr-4 text-xs text-faint">{ago(x.updatedAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {list.length === 0 && <p className="py-10 text-center text-sm text-faint">没有工单</p>}
      </div>
    </Card>
  );
}

// ---------- 其他页面 ----------
function Customers() {
  const { tickets } = useLive();
  const by = tickets.reduce<Record<string, Ticket[]>>((o, t) => { (o[t.customer] ||= []).push(t); return o; }, {});
  return (
    <Card className="min-h-0 flex-1 overflow-auto p-5">
      <h2 className="text-lg font-semibold">客户对话</h2>
      <p className="mt-1 text-sm text-muted">要显示真正的客户聊天，需要接上你们的客服平台（例如企业微信）。现在先按客户整理工单纪录。</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Object.entries(by).map(([c, list]) => (
          <div key={c} className="rounded-xl border border-[#DADCE0] p-4">
            <div className="flex items-center gap-2 font-semibold"><span className="grid size-8 place-items-center rounded-full bg-[#E8F0FE] text-sm text-[#1967D2]">{c.slice(0, 1)}</span>{c}<span className="ml-auto text-xs text-faint">{list[0].channel}</span></div>
            <ul className="mt-2 space-y-1 text-sm">{list.map((t) => <li key={t.id} className="flex items-center gap-2"><span className={cn('rounded-full px-2 text-[11px]', TS_TONE[t.status])}>{TS_LABEL[t.status]}</span><span className="truncate">{t.title}</span></li>)}</ul>
          </div>
        ))}
      </div>
    </Card>
  );
}
function Team({ q }: { q: string }) {
  const { tr } = useLang();
  const { humans, ai } = useFloorPeople();
  const { tickets } = useLive();
  const me = useMe();
  const list = [...humans, ...ai].filter((p) => !q || tr(p.name).includes(q) || tr(p.title).includes(q));
  return (
    <Card className="min-h-0 flex-1 overflow-auto p-5">
      <h2 className="text-lg font-semibold">团队成员 <span className="text-muted">({list.length})</span></h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((p) => (
          <div key={p.id} className="flex gap-3 rounded-xl border border-[#DADCE0] p-4">
            <Avatar p={p} size={52} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 font-semibold">{tr(p.name)}{p.type === 'ai' && <span className="rounded bg-ai/10 px-1 text-[10px] text-ai">AI</span>}{p.demo && <span className="rounded bg-warn/15 px-1 text-[10px] text-[#B06000]">示范</span>}{p.real && <span className="rounded bg-ok/10 px-1 text-[10px] text-ok">真实</span>}</div>
              <div className="text-xs text-muted">{tr(p.title)}</div>
              <div className="mt-1 truncate text-xs">{tr(p.task)}</div>
              <div className="mt-1.5 flex items-center gap-2 text-[11px] text-faint">工单 {tickets.filter((t) => t.assignee === p.id && t.status !== 'done').length}
                {p.type === 'human' && me?.id !== p.id && <button type="button" onClick={() => live.setMe(p.id)} className="ml-auto text-brand hover:underline">我是这位</button>}
                {me?.id === p.id && <span className="ml-auto text-ok">（我）</span>}</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
function Links({ title, items }: { title: string; items: { href: string; title: string; desc: string }[] }) {
  return (
    <Card className="min-h-0 flex-1 overflow-auto p-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map((x) => (
          <a key={x.href} href={x.href} className="rounded-xl border border-[#DADCE0] p-4 transition-shadow hover:shadow-glass">
            <div className="flex items-center gap-2 font-semibold"><BookOpen className="size-4 text-brand" />{x.title}</div>
            <p className="mt-1 text-sm text-muted">{x.desc}</p>
          </a>
        ))}
      </div>
    </Card>
  );
}
function Notices() {
  return <div className="flex min-h-0 flex-1 flex-col"><TeamChat initial="announce" /></div>;
}
function CSSettings() {
  const s = useStore();
  const { lang, setLang } = useLang();
  return (
    <Card className="min-h-0 flex-1 overflow-auto p-5">
      <h2 className="text-lg font-semibold">系统设置</h2>
      <div className="mt-4 max-w-lg divide-y divide-[#F1F3F4] text-sm">
        <label className="flex items-center justify-between py-3">语言<select value={lang} onChange={(e) => setLang(e.target.value as 'zh' | 'en')} className="rounded-lg border border-[#DADCE0] px-2 py-1"><option value="zh">中文</option><option value="en">English</option></select></label>
        <label className="flex items-center justify-between py-3">3D 画质<select value={s.settings.quality} onChange={(e) => s.setSettings({ quality: e.target.value as 'high' | 'low' })} className="rounded-lg border border-[#DADCE0] px-2 py-1"><option value="high">高</option><option value="low">省电</option></select></label>
        <div className="py-3 text-xs leading-relaxed text-faint">对话、工单、任务现在存在这台电脑的浏览器，同一台电脑的分页会同步。接上 Supabase 后会变成全公司即时同步，权限也会在服务器端检查。</div>
      </div>
    </Card>
  );
}

// ---------- 整个画面 ----------
export function CSApp() {
  const s = useStore();
  const [view, setView] = useState<View>('desk');
  const [q, setQ] = useState('');
  const [bottomOpen, setBottomOpen] = useState(true);
  const [mode3d, setMode3d] = useState(true);
  useEffect(() => { live.seedDemo(); if (s.floor !== '2F') s.selectFloor('2F'); s.setSection('building'); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { s.setMode(mode3d ? '3d' : '2d'); }, [mode3d]); // eslint-disable-line react-hooks/exhaustive-deps
  const kb = ((window.COMPANY as unknown as { library?: { href: string; title: string; desc: string }[] } | undefined)?.library ?? []).map((x) => ({ ...x, href: '../' + x.href }));
  return (
    <div className="flex h-full bg-canvas text-fg">
      <CSSidebar view={view} setView={setView} />
      <main className="flex min-w-0 flex-1 flex-col">
        <CSTopBar onSearch={setQ} />
        <div className="flex min-h-0 flex-1 gap-3 p-3">
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            {view === 'desk' ? (
              <>
                <section className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-[#DADCE0] bg-[#F1EADC] shadow-glass" aria-label="2F 3D 办公室">
                  <Scene />
                  <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2">
                    <span className="pointer-events-auto flex items-center gap-2 rounded-full bg-surface/95 px-3 py-1.5 text-sm font-semibold shadow-glass"><Box className="size-4 text-brand" />2F 客服部（中国团队）</span>
                  </div>
                  <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-surface/95 p-1 shadow-glass">
                    <button type="button" onClick={() => setMode3d(true)} aria-pressed={mode3d} className={cn('rounded-full px-3 py-1 text-xs font-semibold', mode3d ? 'bg-brand text-white' : 'text-muted')}>3D</button>
                    <button type="button" onClick={() => setMode3d(false)} aria-pressed={!mode3d} className={cn('flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold', !mode3d ? 'bg-brand text-white' : 'text-muted')}><Map className="size-3" />2D</button>
                    <button type="button" onClick={() => { const el = document.querySelector('[aria-label="2F 3D 办公室"]'); if (document.fullscreenElement) void document.exitFullscreen(); else void (el as HTMLElement | null)?.requestFullscreen?.(); }} className="grid size-7 place-items-center rounded-full text-muted hover:bg-elevated" aria-label="全屏"><Maximize2 className="size-3.5" /></button>
                  </div>
                  {s.toast && <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-[#202124] px-4 py-2 text-xs text-white shadow-glass" role="status">{s.toast}</div>}
                </section>
                <div className={cn('grid shrink-0 gap-3 transition-[height] duration-300', bottomOpen ? 'h-60 grid-cols-[1.5fr_1fr_1fr]' : 'h-10 grid-cols-1')}>
                  {bottomOpen ? (<><TeamChat /><TodayTasks /><AICard /></>) : (
                    <button type="button" onClick={() => setBottomOpen(true)} className="flex items-center justify-center gap-2 rounded-2xl border border-[#DADCE0] bg-surface text-sm text-muted shadow-glass"><ChevronUp className="size-4" />展开团队讨论、今日任务、AI 助手</button>
                  )}
                </div>
                {bottomOpen && <button type="button" onClick={() => setBottomOpen(false)} className="-mt-2 flex items-center justify-center gap-1 self-center rounded-full px-3 text-xs text-faint hover:text-fg"><ChevronDown className="size-3.5" />收起</button>}
              </>
            ) : view === 'tickets' ? <Tickets q={q} />
              : view === 'tasks' ? <TodayTasks full />
              : view === 'team' ? <Team q={q} />
              : view === 'customers' ? <Customers />
              : view === 'kb' ? <Links title="知识库" items={[...kb, { href: '../name/', title: '名字审核', desc: '名正言顺技术单：核对新名、转繁体、下载结果。' }, { href: '../tech/', title: '技术单审核', desc: '按规则标红、分文件、改页脚，下载给专家。' }]} />
              : view === 'training' ? <Links title="培训中心" items={[{ href: '../handbook/', title: '客服业务门户（含售后培训）', desc: '标准流程、话术库、改线判定器、服务中心判定器、售后服务培训。' }, { href: '../guide/', title: '工具启动教程', desc: '工具怎么启动、怎么用。' }, { href: '../docs/dongfang/', title: '东方药林健康商城 · 手机端教程', desc: '登录、下单、订单管理、提现，31 页图文。' }]} />
              : view === 'notices' ? <Notices />
              : <CSSettings />}
          </div>
          <RightPanel goTeam={() => setView('team')} />
        </div>
      </main>
    </div>
  );
}
