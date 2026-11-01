// 右侧「公司情报」：没选东西看全公司；选了楼层 / 部门 / 员工就看那一个。
import { useState, type ReactNode } from 'react';
import { Rocket, Activity, AlertTriangle, ArrowLeft, Bell, Bot, Building2, CheckCircle2, Clock, Copy, ExternalLink, Headphones, Layers, Lightbulb, ListChecks, Sparkles, Users, X } from 'lucide-react';
import { useStore } from '../lib/store';
import { useAgo, useLang } from '../lib/i18n';
import { deptById, deptsOfFloor, floorById, peopleOfDept, peopleOfFloor, personById, tasksOfFloor } from '../lib/company';
import { Avatar, Badge, Kpi, PanelTitle, PRIORITY_DOT, Progress, SourceTag, StatusPill, TaskStatusBadge } from './ui';
import type { Person, Task } from '../types';
import { cn } from '../lib/cn';
import { useLive, missionTaskOf } from '../lib/live';

function PersonRow({ p }: { p: Person }) {
  const s = useStore();
  const { tr } = useLang();
  return (
    <button type="button" onClick={() => s.selectPerson(p.id)}
      className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-elevated/60">
      <Avatar person={p} size="sm" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-xs font-medium">{tr(p.name)}{p.type === 'ai' && <Badge tone="ai">AI</Badge>}</span>
        <span className="block truncate text-2xs text-faint">{missionTaskOf(useLive().missions, p.id) ?? tr(p.task)}</span>
      </span>
      <StatusPill status={p.status} compact />
    </button>
  );
}

function TaskRow({ x }: { x: Task }) {
  const { tr } = useLang();
  return (
    <li className="rounded-lg border border-line/10 bg-elevated/30 p-2">
      <div className="flex items-start gap-2">
        <span className={cn('mt-1.5 size-1.5 shrink-0 rounded-full', PRIORITY_DOT[x.priority])} />
        <span className="min-w-0 flex-1 text-xs leading-snug">{tr(x.title)}</span>
        <TaskStatusBadge status={x.status} />
      </div>
      <div className="mt-1.5 flex items-center gap-2 pl-3.5">
        <Progress value={x.progress} tone={x.status === 'blocked' ? 'danger' : x.status === 'completed' ? 'ok' : 'accent'} />
        <span className="num w-8 text-right text-2xs text-faint">{x.progress}%</span>
      </div>
    </li>
  );
}

function Intel() {
  const s = useStore();
  const { t, tr } = useLang();
  const ago = useAgo();
  const m = s.model;
  const ai = m.people.filter((p) => p.type === 'ai');
  const aiMsgs = m.messages.filter((x) => x.ch === 'ai' || x.real).slice(0, 5);
  return (
    <div className="space-y-4">
      {/* 参考图 1：KPI、任务环图、部门表现、快捷操作 */}
      <div className="grid grid-cols-2 gap-2">
        <Kpi label={t('employees')} value={m.people.length - ai.length} icon={<Users className="size-3.5 text-brand" />} />
        <Kpi label={t('aiAgents')} value={ai.length} icon={<Sparkles className="size-3.5 text-ai" />} tone="text-ai" />
        <Kpi label={t('departments')} value={m.departments.length} icon={<Building2 className="size-3.5 text-ok" />} />
        <Kpi label={t('floor')} value={m.floors.length} icon={<Layers className="size-3.5 text-warn" />} />
      </div>
      <CeoCard />
      <TaskDonut />
      <DeptPerformance />
      <QuickActions />
      <section>
        <PanelTitle icon={<Sparkles className="size-3.5 text-accent" />}>{t('aiActivity')}</PanelTitle>
        <ul className="space-y-1.5">
          {aiMsgs.map((x) => {
            const p = personById(m, x.from);
            return (
              <li key={x.id} className="flex gap-2 rounded-lg px-1 py-1">
                {p ? <Avatar person={p} size="sm" /> : <span className="size-7" />}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-2xs text-faint">{p && <span className="font-semibold text-muted">{tr(p.name)}</span>}{ago(x.ago)}<SourceTag demo={x.demo} real={x.real} /></div>
                  <div className="text-xs leading-snug text-fg/90">{tr(x.text)}</div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
      {(['recommend', 'alert', 'notice'] as const).map((kind) => {
        const list = m.insights.filter((i) => i.kind === kind);
        const meta = {
          recommend: { icon: <Lightbulb className="size-3.5 text-accent" />, title: t('recommendations'), box: 'border-accent/20 bg-accent/5' },
          alert: { icon: <AlertTriangle className="size-3.5 text-danger" />, title: t('alerts'), box: 'border-danger/25 bg-danger/5' },
          notice: { icon: <Bell className="size-3.5 text-warn" />, title: t('notifications'), box: 'border-line/10 bg-elevated/30' }
        }[kind];
        return (
          <section key={kind}>
            <PanelTitle icon={meta.icon}>{meta.title}</PanelTitle>
            <ul className="space-y-1.5">
              {list.map((i) => (
                <li key={i.id}>
                  <button type="button" onClick={() => { if (i.floor && s.canEnter(i.floor)) { s.setSection('building'); s.selectFloor(i.floor); } }}
                    className={cn('w-full rounded-lg border p-2 text-left text-xs leading-snug transition-colors hover:border-accent/40', meta.box)}>
                    {i.floor && <span className="mr-1.5 font-mono text-2xs font-bold text-muted">{i.floor}</span>}{tr(i.text)} {i.demo && <Badge tone="demo">{t('demo')}</Badge>}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      <p className="text-2xs leading-relaxed text-faint">{t('demoNote')}</p>
    </div>
  );
}

function TaskDonut() {
  const s = useStore();
  const { t } = useLang();
  const tasks = s.model.tasks;
  const done = tasks.filter((x) => x.status === 'completed').length;
  const act = tasks.filter((x) => x.status === 'active' || x.status === 'review').length;
  const pend = tasks.length - done - act;
  const seg = [[done, '#1E8E3E', t('completedTasks')], [act, '#1A73E8', t('activeTasks')], [pend, '#F9AB00', t('pendingTasks')]] as const;
  let off = 0;
  return (
    <section className="rounded-xl border border-line/15 p-3">
      <PanelTitle>{t('taskCenter')}</PanelTitle>
      <div className="flex items-center gap-4">
        <div className="relative size-24 shrink-0">
          <svg viewBox="0 0 36 36" className="size-24 -rotate-90" aria-hidden>
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="#E8EAED" strokeWidth="4" />
            {seg.map(([n, c], i) => { const len = tasks.length ? (n / tasks.length) * 97.4 : 0; const el = <circle key={i} cx="18" cy="18" r="15.5" fill="none" stroke={c} strokeWidth="4" strokeDasharray={`${len} 100`} strokeDashoffset={-off} />; off += len; return el; })}
          </svg>
          <span className="absolute inset-0 grid place-items-center text-center"><span><b className="num block text-xl leading-none">{tasks.length}</b><span className="text-[10px] text-muted">{t('tasks')}</span></span></span>
        </div>
        <ul className="flex-1 space-y-1.5 text-xs">
          {seg.map(([n, c, l]) => <li key={l} className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ background: c }} />{l}<b className="num ml-auto">{n}</b><span className="w-9 text-right text-faint">{tasks.length ? Math.round((n / tasks.length) * 100) : 0}%</span></li>)}
        </ul>
      </div>
    </section>
  );
}

function DeptPerformance() {
  const s = useStore();
  const { tr } = useLang();
  const rows = s.model.departments.map((d) => {
    const ppl = s.model.people.filter((p) => p.dept === d.id);
    return { d, v: ppl.length ? Math.round(ppl.reduce((a, p) => a + p.perf, 0) / ppl.length) : 0 };
  }).filter((r) => r.v).sort((a, b) => b.v - a.v).slice(0, 5);
  const colors = ['#1E8E3E', '#1A73E8', '#F9AB00', '#EA4335', '#9334E6'];
  return (
    <section className="rounded-xl border border-line/15 p-3">
      <PanelTitle>部门表现</PanelTitle>
      <ul className="space-y-2">
        {rows.map((r, i) => (
          <li key={r.d.id} className="flex items-center gap-2 text-xs">
            <span className="w-24 truncate">{tr(r.d.name).split(' · ')[0]}</span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-[#F1F3F4]"><span className="block h-full rounded-full" style={{ width: `${r.v}%`, background: colors[i % colors.length] }} /></span>
            <span className="num w-8 text-right font-semibold">{r.v}%</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

// AI CEO（Aria）：每小时看全公司运作，写一段报告；也显示派出去的任务走到哪
function CeoCard() {
  const s = useStore();
  const { missions, reports, mode } = useLive();
  const aria = personById(s.model, 'ceo-02');
  const last = reports[reports.length - 1];
  const open = missions.filter((m) => m.status !== 'done' && m.status !== 'cancelled');
  const waitingReview = open.filter((m) => m.status === 'plan_review' || m.status === 'result_review').length;
  const done = missions.filter((m) => m.status === 'done').length;
  const mins = last ? Math.round((Date.now() - last.t) / 60000) : 0;
  return (
    <section className="rounded-xl border border-[#E9D2FD] bg-gradient-to-br from-[#F3E8FD] to-white p-3">
      <div className="flex items-center gap-2">
        {aria && <Avatar person={aria} size="sm" />}
        <div className="min-w-0 flex-1"><div className="text-sm font-semibold">AI CEO · Aria</div><div className="text-[11px] text-muted">每小时看一次全公司运作</div></div>
        <button type="button" onClick={() => s.setSection('missions')} className="rounded-full bg-brand px-2.5 py-1 text-[11px] font-semibold text-white hover:brightness-110">派任务</button>
      </div>
      <div className="mt-2.5 grid grid-cols-3 gap-1.5 text-center">
        {([['进行中', open.length, 'text-[#1967D2]'], ['等审核', waitingReview, 'text-[#C5221F]'], ['已完成', done, 'text-[#137333]']] as const).map(([l, n, c]) => (
          <div key={l} className="rounded-lg bg-white/80 py-1.5"><div className={cn('num text-lg font-bold', c)}>{n}</div><div className="text-[10px] text-muted">{l}</div></div>
        ))}
      </div>
      <p className="mt-2.5 line-clamp-4 whitespace-pre-wrap text-xs leading-relaxed text-fg">
        {last ? last.text : mode === 'cloud' ? '还没有报告。派第一个任务后，Aria 下一个整点会开始工作并写报告。' : mode === 'connecting' ? '连云端中…' : '现在是本机模式，Aria 看不到资料。请登出再登入一次连上云端。'}
      </p>
      {last && <div className="mt-1 text-[10px] text-faint">{mins < 60 ? `${mins} 分钟前` : `${Math.round(mins / 60)} 小时前`}的报告</div>}
    </section>
  );
}

function QuickActions() {
  const s = useStore();
  const acts: [string, ReactNode, () => void][] = [
    ['派任务', <Rocket key="r" className="size-5 text-brand" />, () => s.setSection('missions')],
    ['任务分配', <CheckCircle2 key="c" className="size-5 text-ok" />, () => s.setSection('tasks')],
    ['楼层编辑', <Layers key="l" className="size-5 text-ai" />, () => s.setSection('building')],
    ['客服视图', <Headphones key="h" className="size-5 text-warn" />, () => s.setCsView(true)]
  ];
  return (
    <section className="rounded-xl border border-line/15 p-3">
      <PanelTitle>快捷操作</PanelTitle>
      <div className="grid grid-cols-4 gap-2">
        {acts.map(([l, ic, fn]) => (
          <button key={l} type="button" onClick={fn} className="flex flex-col items-center gap-1.5 rounded-xl bg-[#F8F9FA] px-1 py-2.5 text-[11px] hover:bg-[#E8F0FE]">{ic}{l}</button>
        ))}
      </div>
    </section>
  );
}

function FloorInfo({ id }: { id: string }) {
  const s = useStore();
  const { t, tr } = useLang();
  const ago = useAgo();
  const m = s.model;
  const f = floorById(m, id);
  if (!f) return null;
  const depts = deptsOfFloor(m, id);
  const ppl = peopleOfFloor(m, id);
  const ai = ppl.filter((p) => p.type === 'ai');
  const tasks = tasksOfFloor(m, id);
  const deptIds = new Set(depts.map((d) => d.id));
  const timeline = m.messages.filter((x) => (x.dept && deptIds.has(x.dept)) || deptIds.has(personById(m, x.from)?.dept ?? '')).slice(0, 8);
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <span className="grid h-8 min-w-10 place-items-center rounded-lg px-2 text-sm font-bold text-canvas" style={{ background: f.accent }}>{f.code}</span>
          <h2 className="text-base font-semibold leading-tight">{tr(f.name).replace(/^\w+ · /, '')}</h2>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted">{tr(f.description)}</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Kpi label={t('employees')} value={ppl.length - ai.length} icon={<Users className="size-3" />} />
        <Kpi label={t('aiAgents')} value={ai.length} icon={<Bot className="size-3" />} tone="text-accent" />
        <Kpi label={t('activeTasks')} value={tasks.filter((x) => x.status === 'active').length} icon={<Activity className="size-3" />} tone="text-st-working" />
      </div>
      {depts.length > 0 && (
        <section>
          <PanelTitle icon={<Layers className="size-3.5" />}>{t('floorDirectory')}</PanelTitle>
          <ul className="space-y-1">
            {depts.map((d) => {
              const dp = peopleOfDept(m, d.id);
              return (
                <li key={d.id}>
                  <button type="button" onClick={() => s.selectDept(d.id)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-elevated/60">
                    <span className="size-2.5 rounded-full" style={{ background: d.color }} />
                    <span className="min-w-0 flex-1 truncate">{tr(d.name)}</span>
                    {d.team && <Badge tone="real">{t('real')}</Badge>}
                    <span className="num text-2xs text-faint">{dp.filter((p) => p.type === 'human').length} · AI {dp.filter((p) => p.type === 'ai').length}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {ai.length > 0 && <section><PanelTitle icon={<Bot className="size-3.5 text-accent" />}>{t('aiAgents')}</PanelTitle>{ai.map((p) => <PersonRow key={p.id} p={p} />)}</section>}
      {ppl.length - ai.length > 0 && <section><PanelTitle icon={<Users className="size-3.5" />}>{t('employees')}</PanelTitle>{ppl.filter((p) => p.type === 'human').map((p) => <PersonRow key={p.id} p={p} />)}</section>}
      {tasks.length > 0 && <section><PanelTitle icon={<ListChecks className="size-3.5" />}>{t('tasks')}</PanelTitle><ul className="space-y-1.5">{tasks.slice(0, 6).map((x) => <TaskRow key={x.id} x={x} />)}</ul></section>}
      {timeline.length > 0 && (
        <section>
          <PanelTitle icon={<Clock className="size-3.5" />}>{t('activityTimeline')}</PanelTitle>
          <ol className="relative ml-1.5 space-y-2.5 border-l border-line/15 pl-3.5">
            {timeline.map((x) => (
              <li key={x.id} className="relative text-xs">
                <span className="absolute -left-[19px] top-1 size-2 rounded-full bg-accent ring-4 ring-surface" />
                <div className="flex items-center gap-1.5 text-2xs text-faint">{ago(x.ago)}<SourceTag demo={x.demo} real={x.real} /></div>
                <div className="leading-snug text-fg/90">{tr(x.text)}</div>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

function DeptInfo({ id }: { id: string }) {
  const s = useStore();
  const { t, tr } = useLang();
  const m = s.model;
  const d = deptById(m, id);
  if (!d) return null;
  const ppl = peopleOfDept(m, id);
  const tasks = m.tasks.filter((x) => x.dept === id);
  const avg = ppl.length ? Math.round(ppl.reduce((a, p) => a + p.perf, 0) / ppl.length) : 0;
  return (
    <div className="space-y-4">
      <button type="button" onClick={() => s.selectDept(null)} className="flex items-center gap-1 text-xs text-muted hover:text-fg"><ArrowLeft className="size-3.5" />{d.floor}</button>
      <div>
        <div className="flex items-center gap-2"><span className="size-3 rounded-full" style={{ background: d.color }} /><h2 className="text-base font-semibold">{tr(d.name)}</h2></div>
        <p className="mt-1.5 text-xs leading-relaxed text-muted">{tr(d.summary)}</p>
        {d.team && <p className="mt-1.5 text-2xs text-ok">{t('realRosterNote')}</p>}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Kpi label={t('members')} value={ppl.length} icon={<Users className="size-3" />} />
        <Kpi label={t('aiAgents')} value={ppl.filter((p) => p.type === 'ai').length} icon={<Bot className="size-3" />} tone="text-accent" />
        <Kpi label={t('performance')} value={avg} icon={<Activity className="size-3" />} tone="text-ok" />
      </div>
      <section><PanelTitle icon={<Users className="size-3.5" />}>{t('members')}</PanelTitle>{ppl.map((p) => <PersonRow key={p.id} p={p} />)}</section>
      {tasks.length > 0 && <section><PanelTitle icon={<ListChecks className="size-3.5" />}>{t('tasks')}</PanelTitle><ul className="space-y-1.5">{tasks.map((x) => <TaskRow key={x.id} x={x} />)}</ul></section>}
    </div>
  );
}

export function Profile({ id, onClose }: { id: string; onClose: () => void }) {
  const s = useStore();
  const { t, tr } = useLang();
  const ago = useAgo();
  const [copied, setCopied] = useState(false);
  const { missions } = useLive();
  const m = s.model;
  const p = personById(m, id);
  if (!p) return null;
  const d = deptById(m, p.dept);
  const tasks = m.tasks.filter((x) => x.owner === p.id);
  const copy = async () => {
    if (!p.skill) return;
    try { await navigator.clipboard.writeText(`/${p.skill}`); setCopied(true); window.setTimeout(() => setCopied(false), 1600); } catch { s.flash(`/${p.skill}`); }
  };
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <button type="button" onClick={onClose} className="flex items-center gap-1 text-xs text-muted hover:text-fg"><ArrowLeft className="size-3.5" />{d ? tr(d.name) : ''}</button>
        <button type="button" onClick={onClose} className="rounded-md p-1 text-muted hover:text-fg" aria-label={t('close')}><X className="size-4" /></button>
      </div>
      <div className="flex items-center gap-3">
        <Avatar person={p} size="lg" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <h2 className="text-lg font-semibold leading-tight">{tr(p.name)}</h2>
            {p.type === 'ai' && <Badge tone="ai">AI</Badge>}<SourceTag demo={p.demo} real={p.real} />
          </div>
          <div className="text-xs text-muted">{tr(p.title)}</div>
          <div className="mt-0.5 text-2xs text-faint">{d?.floor} · {d ? tr(d.name) : ''}</div>
        </div>
      </div>
      <div className="rounded-xl border border-line/10 bg-elevated/40 p-3">
        <div className="flex items-center justify-between"><span className="text-2xs text-muted">{t('status')}</span><StatusPill status={p.status} /></div>
        <div className="mt-2.5 text-2xs text-muted">{t('currentTask')}</div>
        <div className="mt-0.5 text-sm leading-snug">{missionTaskOf(missions, p.id) ?? tr(p.task)}</div>
        <div className="mt-3 flex items-center justify-between text-2xs text-muted"><span>{t('performance')}</span><span className="num font-semibold text-fg">{p.perf}</span></div>
        <div className="mt-1"><Progress value={p.perf} tone={p.perf >= 90 ? 'ok' : p.perf >= 82 ? 'accent' : 'warn'} /></div>
      </div>
      {(p.href || p.skill) && (
        <div className="flex gap-2">
          {p.href && <a href={p.href} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-brand to-accent px-3 py-2 text-sm font-semibold text-canvas"><ExternalLink className="size-4" />{t('openTool')}</a>}
          {p.skill && (
            <button type="button" onClick={copy} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-accent/40 px-3 py-2 text-sm font-semibold text-accent hover:bg-accent/10">
              <Copy className="size-4" />{copied ? t('copied') : t('copySkill')}
            </button>
          )}
        </div>
      )}
      {p.skill && <code className="block rounded-lg bg-canvas/60 px-2.5 py-1.5 font-mono text-2xs text-muted">/{p.skill}</code>}
      {tasks.length > 0 && <section><PanelTitle icon={<ListChecks className="size-3.5" />}>{t('tasks')}</PanelTitle><ul className="space-y-1.5">{tasks.map((x) => <TaskRow key={x.id} x={x} />)}</ul></section>}
      <section>
        <PanelTitle icon={<Clock className="size-3.5" />}>{t('history')}</PanelTitle>
        {(p.history ?? []).length === 0 && <p className="text-xs text-faint">—</p>}
        <ol className="relative ml-1.5 space-y-2.5 border-l border-line/15 pl-3.5">
          {(p.history ?? []).map((h, i) => (
            <li key={i} className="relative text-xs">
              <span className={cn('absolute -left-[19px] top-1 size-2 rounded-full ring-4 ring-surface', i === 0 ? 'bg-accent' : 'bg-line/40')} />
              {h.ago > 0 && <div className="text-2xs text-faint">{ago(h.ago)}</div>}
              <div className="leading-snug text-fg/90">{tr(h.text)}</div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

export function RightPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useStore();
  const { t } = useLang();
  const title = s.person ? t('viewDetails') : s.dept ? t('deptDetail') : s.floor ? t('floorInfo') : t('intel');
  return (
    <aside className={cn('glass fixed inset-y-0 right-0 z-40 flex w-[22rem] max-w-[92vw] flex-col rounded-none border-y-0 border-r-0 transition-transform duration-300 xl:static xl:z-auto xl:w-80 xl:translate-x-0 2xl:w-[22rem]',
      open ? 'translate-x-0' : 'translate-x-full')} aria-label={t('intel')}>
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-line/10 px-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="size-4 text-accent" />{title}</h2>
        <button type="button" onClick={onClose} className="rounded-md p-1 text-muted hover:text-fg xl:hidden" aria-label={t('close')}><X className="size-4" /></button>
      </div>
      <div key={`${s.person}-${s.dept}-${s.floor}`} className="min-h-0 flex-1 animate-slideIn overflow-y-auto p-4">
        {s.person ? <Profile id={s.person} onClose={() => s.selectPerson(null)} /> : s.dept ? <DeptInfo id={s.dept} /> : s.floor ? <FloorInfo id={s.floor} /> : <Intel />}
      </div>
    </aside>
  );
}
