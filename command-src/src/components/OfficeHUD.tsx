// 办公室上面、下面的资讯（参考图）：
//   上面：部门分页（每个部门一间办公室）+ 任务横幅（哪个任务、在哪个阶段、几个人在做、计时、老板可以按停止）
//   中间下面：一句说明现在在做什么（例如「主管拆工作，成员同时开工」）
//   最下面：一排员工卡（头像、名字、职位、状态、目前任务、进度）
// 只用真实资料：任务来自「派任务」（云端 missions），状态来自公司名单；没有任务就写没有，不编。
import { useEffect, useMemo, useState } from 'react';
import { Clock, Plus, Rocket, Square } from 'lucide-react';
import { useStore } from '../lib/store';
import { useLang } from '../lib/i18n';
import { live, useLive, MISSION_STEPS, type Mission, type MissionStatus } from '../lib/live';
import { avatarUrl } from '../lib/look';
import { STATUS_COLOR } from '../scene/status';
import type { Person, Status } from '../types';
import { cn } from '../lib/cn';
import { CORE_DEPTS } from '../lib/company';

const ACTIVE: MissionStatus[] = ['new', 'planning', 'plan_review', 'executing', 'result_review', 'rework'];
// 任务走到哪一步 → 大概完成几成（员工卡上的进度条）
const STAGE_PCT: Partial<Record<MissionStatus, number>> = { new: 5, planning: 15, plan_review: 30, executing: 60, rework: 50, result_review: 85, done: 100 };
const CAPTION: Record<string, string> = {
  new: '任务刚派下来，AI CEO 马上来看',
  planning: 'AI CEO 正在拆工作、分给大家',
  plan_review: '审核部在看计划，没问题就开工',
  executing: '主管拆工作，成员同时开工',
  rework: '审核部退回来了，大家在修改',
  result_review: '做好了，审核部在验收',
  idle: '目前没有进行中的任务，大家处理日常工作'
};
const COUNTED: Status[] = ['working', 'thinking', 'waiting', 'available', 'error'];

export function elapsed(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s >= 86400) return `${Math.floor(s / 86400)} 天 ${Math.floor((s % 86400) / 3600)} 小时`;
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return `${h ? h + ':' : ''}${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}`;
}
const stageLabel = (st: MissionStatus) => MISSION_STEPS.find((x) => x.key === st)?.label ?? (st === 'rework' ? '退回修改' : st);
const short = (name: string) => name.split(' · ')[0];

export function OfficeHUD({ cards = true, className }: { cards?: boolean; className?: string }) {
  const s = useStore();
  const { tr, t } = useLang();
  const { missions } = useLive();
  const m = s.model;
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(id); }, []);

  const depts = useMemo(() => {
    const order = [...m.floors].sort((a, b) => b.level - a.level).map((f) => f.id);
    const rank = (id: string) => (CORE_DEPTS.includes(id) ? CORE_DEPTS.indexOf(id) : 100);
    return m.departments.filter((d) => s.canEnter(d.floor) && (!s.csView || d.floor === '2F')).sort((a, b) => rank(a.id) - rank(b.id) || order.indexOf(a.floor) - order.indexOf(b.floor));
  }, [m.floors, m.departments, s.canEnter, s.csView]); // eslint-disable-line react-hooks/exhaustive-deps
  const dept = m.departments.find((d) => d.id === s.room);
  const ppl = useMemo(() => {
    const list = m.people.filter((p) => p.dept === s.room && (p.type === 'human' ? s.filters.humans : s.filters.ai));
    return [...list.filter((p) => p.type === 'human'), ...list.filter((p) => p.type === 'ai')];
  }, [m.people, s.room, s.filters.humans, s.filters.ai]);
  // 这间办公室正在做的任务：指定给这个部门，或分给了这里的人；最近有动的那个
  const mission = useMemo<Mission | undefined>(() => {
    const ids = new Set(ppl.map((p) => p.id));
    return missions.filter((x) => ACTIVE.includes(x.status) && (x.teams.includes(s.room) || x.assignees.some((a) => ids.has(a))))
      .sort((a, b) => b.updatedAt - a.updatedAt)[0];
  }, [missions, ppl, s.room]);
  const counts = useMemo(() => {
    const c: Partial<Record<Status, number>> = {};
    for (const p of ppl) c[p.status] = (c[p.status] ?? 0) + 1;
    return c;
  }, [ppl]);
  const boss = s.role === 'boss' && !s.csView;
  const stop = () => {
    if (!mission || !confirm(`停止任务 ${mission.no}「${mission.title}」？\n大家会停下手上的工作，任务标成「已取消」。`)) return;
    live.setMissionStatus(mission.id, 'cancelled', 'ceo-01', '老板在办公室按了「停止」。');
    s.flash(`已停止 ${mission.no}`);
  };
  const onMission = (p: Person) => !!mission && (mission.assignees.includes(p.id) || (mission.assignees.length === 0 && mission.teams.includes(s.room)));
  const taskOf = (p: Person) => {
    if (onMission(p) && mission) return `${mission.no}「${mission.title}」`;
    const other = missions.find((x) => ACTIVE.includes(x.status) && x.assignees.includes(p.id));
    return other ? `${other.no}「${other.title}」` : tr(p.task);
  };

  return (
    <div className={cn('pointer-events-none absolute inset-0 z-10 flex flex-col justify-between text-white', className)}>
      {/* ---------- 上面：部门分页 + 任务横幅 ---------- */}
      <div className="flex flex-col gap-2 p-2 sm:p-3">
        <nav className="pointer-events-auto flex max-w-full gap-1 overflow-x-auto rounded-xl border border-white/10 bg-[#12151B]/85 p-1 backdrop-blur [scrollbar-width:none]" aria-label="部门办公室">
          {depts.map((d) => {
            const on = d.id === s.room;
            const n = m.people.filter((p) => p.dept === d.id).length;
            return (
              <button key={d.id} type="button" title={tr(d.name)} aria-pressed={on} onClick={() => s.setRoom(d.id)}
                className={cn('flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition-colors',
                  on ? 'bg-white/15 font-semibold text-white' : 'text-[#9AA7BD] hover:bg-white/5 hover:text-white')}>
                <span className="size-2 rounded-sm" style={{ background: d.color }} />
                {short(tr(d.name))}
                <span className={cn('num rounded px-1 text-[10px]', on ? 'bg-white/20' : 'bg-white/5')}>{n}</span>
                {CORE_DEPTS.includes(d.id) && <span className="rounded bg-[#FBBC04]/20 px-1 text-[9px] font-bold text-[#FDD663]">核心</span>}
              </button>
            );
          })}
        </nav>
        {dept && (
          <section className="pointer-events-auto flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-white/10 bg-[#12151B]/85 px-3 py-2 backdrop-blur" aria-label="任务横幅">
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg" style={{ background: mission ? '#9334E6' : dept.color }}>
                {mission ? <Rocket className="size-4" /> : <span className="text-sm font-bold">{short(tr(dept.name)).slice(0, 1)}</span>}
              </span>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{mission ? `${mission.no}「${mission.title}」` : `${tr(dept.name)} · 办公室`}</div>
                <div className="truncate text-2xs text-[#9AA7BD]">
                  {mission ? <>阶段：<b className="text-[#D7AEFB]">{stageLabel(mission.status)}</b>{mission.reviewRound > 0 && ` · 第 ${mission.reviewRound + 1} 轮`}</> : tr(dept.summary)}
                </div>
              </div>
            </div>
            <div className="hidden items-center gap-1.5 md:flex">
              {COUNTED.filter((st) => counts[st]).map((st) => (
                <span key={st} className="flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-2xs text-[#C8D0DC]">
                  <span className="size-1.5 rounded-full" style={{ background: STATUS_COLOR[st] }} />{t(`st_${st}`)} <b className="num text-white">{counts[st]}</b>
                </span>
              ))}
            </div>
            {mission ? (
              <div className="flex items-center gap-2">
                <span className="num flex items-center gap-1 rounded-lg bg-white/5 px-2 py-1 font-mono text-xs" title="从派任务到现在"><Clock className="size-3.5 text-[#9AA7BD]" />{elapsed(now - mission.createdAt)}</span>
                {boss && <button type="button" onClick={stop} className="flex items-center gap-1 rounded-lg bg-[#D93025] px-2.5 py-1 text-xs font-semibold hover:brightness-110"><Square className="size-3 fill-current" />停止</button>}
              </div>
            ) : boss && (
              <button type="button" onClick={() => s.setSection('missions')} className="flex items-center gap-1 rounded-lg bg-[#1A73E8] px-2.5 py-1 text-xs font-semibold hover:brightness-110"><Plus className="size-3.5" />派任务</button>
            )}
          </section>
        )}
      </div>

      {/* ---------- 下面：说明 + 员工卡 ---------- */}
      <div className="flex flex-col items-center gap-2 p-2 sm:p-3">
        <p className="flex items-center gap-2 rounded-full bg-[#12151B]/80 px-4 py-1.5 text-xs text-[#E8EAED] backdrop-blur sm:text-sm" role="status">
          <span className={cn('size-2 rounded-full', mission ? 'animate-pulseDot bg-[#81C995]' : 'bg-[#5F6368]')} />
          {CAPTION[mission?.status ?? 'idle']}
        </p>
        {cards && ppl.length > 0 && (
          <div className="pointer-events-auto flex w-full gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]" aria-label="员工">
            {ppl.map((p) => {
              const on = onMission(p);
              const pct = on && mission ? STAGE_PCT[mission.status] ?? 0 : null;
              const sel = s.person === p.id;
              return (
                <button key={p.id} type="button" onClick={() => s.selectPerson(sel ? null : p.id)} aria-pressed={sel}
                  className={cn('flex w-48 shrink-0 flex-col gap-1.5 rounded-xl border bg-[#161A21]/90 p-2.5 text-left backdrop-blur transition-colors',
                    sel ? 'border-[#4FC3F7]' : 'border-white/10 hover:border-white/30')}>
                  <span className="flex items-center gap-2">
                    <img src={avatarUrl(p, 72)} alt="" className="size-9 shrink-0 rounded-lg" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1 text-[13px] font-semibold">
                        <span className="truncate">{tr(p.name)}</span>
                        {p.type === 'ai' && <span className="shrink-0 rounded bg-[#12B5CB]/25 px-1 text-[9px] font-bold text-[#7CF0FF]">AI</span>}
                      </span>
                      <span className="mt-0.5 inline-block max-w-full truncate rounded px-1.5 py-px text-[10px] text-[#E8EAED]" style={{ background: `${dept?.color ?? '#5F6368'}55` }}>{tr(p.title)}</span>
                    </span>
                  </span>
                  <span className="flex items-center justify-between text-2xs">
                    <span className="flex items-center gap-1" style={{ color: STATUS_COLOR[p.status] }}>
                      <span className="size-1.5 rounded-full" style={{ background: STATUS_COLOR[p.status] }} />{t(`st_${p.status}`)}
                    </span>
                    {on && mission && <span className="num font-mono text-[#9AA7BD]">{elapsed(now - mission.createdAt)}</span>}
                  </span>
                  <span className="truncate text-2xs text-[#9AA7BD]" title={taskOf(p)}>{taskOf(p)}</span>
                  {pct !== null && (
                    <span className="flex items-center gap-1.5">
                      <span className="h-1 flex-1 overflow-hidden rounded-full bg-white/10"><span className="block h-full rounded-full bg-[#81C995] transition-[width] duration-700" style={{ width: `${pct}%` }} /></span>
                      <span className="num text-[10px] text-[#9AA7BD]">{pct}%</span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
