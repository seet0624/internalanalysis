// 老板首页（简化版，照 mockup）：上面 Logo + 部门分页；最显眼的是「交给 AI 团队一个任务」；
// 下面左边是这个部门的 3D 办公室，右边是正在做的任务（6 步走到哪、计时、谁在做、停止）。
// 其他功能（功能、任务管理、知识库……）收进左上角的选单。
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ClipboardCheck, FileSpreadsheet, Menu, Square } from 'lucide-react';
import { useStore } from '../lib/store';
import { useLang } from '../lib/i18n';
import { live, useLive, MISSION_STEPS, type Mission } from '../lib/live';
import { CORE_DEPTS } from '../lib/company';
import { avatarUrl } from '../lib/look';
import { STATUS_COLOR } from '../scene/status';
import { Scene } from '../scene/Scene';
import { ACTIVE, CAPTION, elapsed, short, sortedDepts } from './OfficeHUD';
import { cn } from '../lib/cn';

const TARGETS = ['review', 'cs', 'uiux', 'tech', 'techsup'];   // 「交给」可以选的部门（不选 = AI CEO 决定）

export function HomeHeader({ onMenu }: { onMenu: () => void }) {
  const s = useStore();
  const { tr } = useLang();
  const depts = useMemo(() => sortedDepts(s.model, s.canEnter, false), [s.model, s.canEnter]);
  const core = depts.filter((d) => CORE_DEPTS.includes(d.id) && d.id !== 'claude');
  const rest = depts.filter((d) => !core.includes(d));
  const go = (id: string) => { s.setRoom(id); s.setSection('overview'); };
  return (
    <header className="flex shrink-0 flex-wrap items-center gap-x-5 gap-y-2 border-b border-[#232833] px-4 py-3 md:px-8">
      <button type="button" onClick={onMenu} aria-label="选单" className="grid size-10 place-items-center rounded-lg text-[#C8D0DC] hover:bg-white/10"><Menu className="size-5" /></button>
      <div className="flex items-center gap-2.5 text-base font-bold">
        <img src="../hq/brand/shuyi-logo-64.png" alt="" width={28} height={28} className="size-7" />数易 · AI 指挥中心
      </div>
      <nav aria-label="部门" className="order-last flex w-full min-w-0 items-center gap-1 overflow-x-auto md:order-none md:w-auto md:flex-1 md:flex-wrap">
        {core.map((d) => {
          const on = d.id === s.room;
          return (
            <button key={d.id} type="button" aria-pressed={on} onClick={() => go(d.id)}
              className={cn('h-9 shrink-0 rounded-lg px-3.5 text-sm transition-colors', on ? 'bg-[#2A303C] font-bold text-white' : 'text-[#9AA7BD] hover:text-white')}>
              {short(tr(d.name))}<span className="num ml-1.5 text-xs text-[#9AA7BD]">{s.model.people.filter((p) => p.dept === d.id).length}</span>
            </button>
          );
        })}
        {rest.length > 0 && (
          <select aria-label="其他部门" value={core.some((d) => d.id === s.room) ? '' : s.room} onChange={(e) => e.target.value && go(e.target.value)}
            className="h-9 shrink-0 rounded-lg border border-[#343B49] bg-transparent px-2 text-sm text-[#9AA7BD]">
            <option value="">其他部门…</option>
            {rest.map((d) => <option key={d.id} value={d.id}>{tr(d.name)}</option>)}
          </select>
        )}
      </nav>
      <div className="ml-auto flex items-center gap-1">
        <a href="../name/" className="flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm text-[#C8D0DC] hover:bg-white/10"><ClipboardCheck className="size-4" />名字审核</a>
        <a href="../tech/" className="flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm text-[#C8D0DC] hover:bg-white/10"><FileSpreadsheet className="size-4" />技术单审核</a>
      </div>
    </header>
  );
}

function TaskBox() {
  const s = useStore();
  const { tr } = useLang();
  const [text, setText] = useState('');
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const title = text.trim();
    if (!title || busy) return;
    setBusy(true);
    const teams = to ? [to] : [];
    const m = await live.createMission({ title, brief: title, kind: 'general', priority: 'medium', teams, scope: s.model.departments.find((d) => d.id === to)?.floor === '2F' ? '2F' : 'company' }, 'ceo-01');
    setBusy(false);
    if (m) { setText(''); s.flash(`已派出 ${m.no}，AI 团队每小时 :35 接手`); }
  };
  const chip = (on: boolean) => cn('h-8 rounded-full border px-3 text-[13px] transition-colors', on ? 'border-[#1A73E8] bg-[#1A73E8]/20 text-white' : 'border-[#343B49] text-[#C8D0DC] hover:border-[#5F6B80]');
  return (
    <form onSubmit={submit} aria-label="派任务" className="flex flex-col gap-3 rounded-2xl border border-[#2A303C] bg-[#161A21]/90 p-4 backdrop-blur md:p-5">
      <label htmlFor="home-task" className="text-sm text-[#9AA7BD]">交给 AI 团队一个任务</label>
      <div className="flex flex-wrap gap-3">
        <input id="home-task" value={text} onChange={(e) => setText(e.target.value)} placeholder="例如：把客服话术改得更亲切，审核部看过再上线"
          className="h-[52px] min-w-0 flex-[999_1_420px] rounded-xl border border-[#343B49] bg-[#0F1217] px-4 text-base text-[#E8EAED] placeholder:text-[#6B7385] focus:border-[#1A73E8] focus:outline-none" />
        <button type="submit" disabled={!text.trim() || busy} className="h-[52px] flex-[1_1_140px] rounded-xl bg-[#1A73E8] text-base font-bold text-white disabled:opacity-50">{busy ? '派出中…' : '派出去'}</button>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[13px] text-[#9AA7BD]">
        交给：
        <button type="button" aria-pressed={!to} onClick={() => setTo('')} className={chip(!to)}>AI CEO 决定</button>
        {TARGETS.map((id) => {
          const d = s.model.departments.find((x) => x.id === id);
          return d && <button key={id} type="button" aria-pressed={to === id} onClick={() => setTo(id)} className={chip(to === id)}>{short(tr(d.name))}</button>;
        })}
      </div>
    </form>
  );
}

// 6 步：做完 / 正在做 / 还没到（退回修改 = 回到「团队执行」）
const ORDER = MISSION_STEPS.map((x) => x.key);
function ActiveTask({ mission }: { mission?: Mission }) {
  const s = useStore();
  const { tr, t } = useLang();
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(id); }, []);
  if (!mission) {
    return (
      <section aria-label="进行中的任务" className="flex flex-col gap-2 rounded-2xl border border-[#2A303C] bg-[#161A21]/90 p-5 text-center backdrop-blur">
        <p className="text-base font-semibold">目前没有进行中的任务</p>
        <p className="text-sm text-[#9AA7BD]">在上面写一个任务交给 AI 团队，这里会显示它走到哪一步、谁在做。</p>
      </section>
    );
  }
  const cur = ORDER.indexOf(mission.status === 'rework' ? 'executing' : mission.status);
  const crew = mission.assignees.map((id) => s.model.people.find((p) => p.id === id)).filter((p): p is NonNullable<typeof p> => !!p);
  const stop = () => {
    if (!confirm(`停止任务 ${mission.no}「${mission.title}」？\n任务会标成「已取消」。`)) return;
    live.setMissionStatus(mission.id, 'cancelled', 'ceo-01', '老板在首页按了「停止」。');
    s.flash(`已停止 ${mission.no}`);
  };
  return (
    <section aria-label="进行中的任务" className="flex flex-col gap-4 rounded-2xl border border-[#2A303C] bg-[#161A21]/90 p-5 backdrop-blur">
      <div className="flex items-start justify-between gap-2 pr-8">
        <div className="min-w-0">
          <div className="text-xs text-[#9AA7BD]">进行中 · {mission.no}</div>
          <div className="mt-0.5 truncate text-base font-bold">{mission.title}</div>
        </div>
        <span className="num font-mono text-sm text-[#C8D0DC]" title="从派任务到现在">{elapsed(now - mission.createdAt)}</span>
      </div>
      <ol className="flex flex-col gap-2.5">
        {MISSION_STEPS.map((st, i) => {
          const done = i < cur || mission.status === 'done', on = i === cur && mission.status !== 'done';
          return (
            <li key={st.key} className="flex items-center gap-2.5 text-sm" aria-current={on ? 'step' : undefined}>
              <span className={cn('size-3 shrink-0 rounded-full', done ? 'bg-[#81C995]' : on ? 'bg-[#1A73E8] shadow-[0_0_0_4px_rgba(26,115,232,.3)]' : 'border-2 border-[#3C4352]')} />
              <span className={cn('flex-1', !done && !on && 'text-[#6B7385]')}>{st.label}{on && mission.status === 'rework' && '（退回修改）'}</span>
              <span className="text-xs text-[#9AA7BD]">{st.who}</span>
            </li>
          );
        })}
      </ol>
      <div className="flex flex-col gap-2.5 border-t border-[#2A303C] pt-3.5">
        <div className="text-xs text-[#9AA7BD]">谁在做</div>
        {crew.length === 0 && <p className="text-sm text-[#9AA7BD]">等 AI CEO 分工</p>}
        {crew.slice(0, 6).map((p) => (
          <button key={p.id} type="button" onClick={() => s.selectPerson(p.id)} className="flex items-center gap-2.5 rounded-lg text-left text-sm hover:bg-white/5">
            <img src={avatarUrl(p, 56)} alt="" className="size-7 rounded-lg" />
            <span className="min-w-0 flex-1 truncate">{tr(p.name)}{p.type === 'ai' && <span className="ml-1.5 text-[11px] text-[#7CF0FF]">AI</span>}</span>
            <span className="text-xs" style={{ color: STATUS_COLOR[p.status] }}>{t(`st_${p.status}`)}</span>
          </button>
        ))}
        {crew.length > 6 && <p className="text-xs text-[#9AA7BD]">还有 {crew.length - 6} 位</p>}
      </div>
      <button type="button" onClick={stop} className="h-10 rounded-xl border border-[#5C2B29] text-sm text-[#F28B82] hover:bg-[#5C2B29]/30"><Square className="mr-1.5 inline size-3 fill-current" />停止这个任务</button>
    </section>
  );
}

// 首页：整个画面就是办公室（全屏 3D）；派任务框浮在上面、进行中的任务浮在右边（手机可以收起来）
export function Home() {
  const s = useStore();
  const { tr } = useLang();
  const { missions } = useLive();
  const [panel, setPanel] = useState(() => window.innerWidth >= 768);
  const dept = s.model.departments.find((d) => d.id === s.room);
  // 右边显示：这个部门在做的任务；这个部门没有，就显示最新一个进行中的（刚派、还没分工的任务也看得到）
  const mission = useMemo(() => {
    const ids = new Set(s.model.people.filter((p) => p.dept === s.room).map((p) => p.id));
    const open = missions.filter((x) => ACTIVE.includes(x.status)).sort((a, b) => b.updatedAt - a.updatedAt);
    return open.find((x) => x.teams.includes(s.room) || x.assignees.some((a) => ids.has(a))) ?? open[0];
  }, [missions, s.model.people, s.room]);
  const mine = mission && (mission.teams.includes(s.room) || mission.assignees.some((a) => s.model.people.find((p) => p.id === a)?.dept === s.room));
  return (
    <div className="relative h-full">
      <div className="absolute inset-0"><Scene /></div>
      <div className="pointer-events-none absolute inset-0 flex flex-col gap-3 p-3 md:p-5">
        <div className="pointer-events-auto mx-auto w-full max-w-3xl"><TaskBox /></div>
        <div className="flex min-h-0 flex-1 items-start justify-end">
          {panel ? (
            <div className="pointer-events-auto relative max-h-full w-full max-w-[340px] overflow-y-auto">
              <button type="button" onClick={() => setPanel(false)} aria-label="收起任务面板" className="absolute right-2 top-2 z-10 grid size-8 place-items-center rounded-lg text-[#9AA7BD] hover:bg-white/10">×</button>
              <ActiveTask mission={mission} />
            </div>
          ) : (
            <button type="button" onClick={() => setPanel(true)} className="pointer-events-auto rounded-full border border-[#2A303C] bg-[#161A21]/90 px-4 py-2 text-sm backdrop-blur">
              {mission ? `进行中 · ${mission.no}` : '没有进行中的任务'} ▸
            </button>
          )}
        </div>
        <p className="mx-auto flex items-center gap-2 rounded-full bg-[#12151B]/85 px-4 py-1.5 text-xs backdrop-blur sm:text-sm">
          <span className={cn('size-2 rounded-full', mine ? 'animate-pulseDot bg-[#81C995]' : 'bg-[#5F6368]')} />
          <b className="font-semibold">{dept ? short(tr(dept.name)) : ''}</b>
          <span className="text-[#C8D0DC]">{CAPTION[mine && mission ? mission.status : 'idle']}</span>
        </p>
      </div>
    </div>
  );
}
