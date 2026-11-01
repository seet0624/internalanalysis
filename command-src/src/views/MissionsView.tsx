// 老板派任务：你派 → AI CEO 规划 → 审核部看计划、给意见 → 团队执行（开发组写程序）→ 审核部验收 → 你看成果
// 资料在云端（Supabase）；每小时整点，自动执行的 Claude 会照这个流程把任务往前推，所有讨论都写回这里和 3D 办公室。
import { useMemo, useState } from 'react';
import { Check, CircleDot, Cloud, CloudOff, ExternalLink, Flag, MessageSquare, Plus, Rocket, RotateCcw, Send, X } from 'lucide-react';
import { useStore } from '../lib/store';
import { useLang } from '../lib/i18n';
import { live, useLive, MISSION_KINDS, MISSION_STEPS, type Mission, type MissionEvent, type MissionKind, type MissionStatus, type Ticket } from '../lib/live';
import { Avatar } from '../components/ui';
import { ViewShell } from './ViewShell';
import { cn } from '../lib/cn';

const STATUS_LABEL: Record<MissionStatus, string> = {
  new: '等 AI CEO 接手', planning: 'AI CEO 规划中', plan_review: '审核部看计划', executing: '团队执行中',
  result_review: '审核部验收', done: '完成', rework: '要重做', cancelled: '已取消'
};
const STATUS_TONE: Record<MissionStatus, string> = {
  new: 'bg-[#E8F0FE] text-[#1967D2]', planning: 'bg-[#F3E8FD] text-[#8430CE]', plan_review: 'bg-[#FCE8E6] text-[#C5221F]',
  executing: 'bg-[#E8F0FE] text-[#1967D2]', result_review: 'bg-[#FCE8E6] text-[#C5221F]', done: 'bg-[#E6F4EA] text-[#137333]',
  rework: 'bg-[#FEF7E0] text-[#B06000]', cancelled: 'bg-elevated text-faint'
};
const EVENT_LABEL: Record<MissionEvent['kind'], [string, string]> = {
  created: ['派任务', 'text-[#1967D2]'], plan: ['计划', 'text-[#8430CE]'], assign: ['分工', 'text-[#8430CE]'],
  review: ['审核意见', 'text-[#C5221F]'], approve: ['审核通过', 'text-[#137333]'], revise: ['要修改', 'text-[#B06000]'],
  progress: ['进度', 'text-[#1967D2]'], result: ['成果', 'text-[#137333]'], accept: ['验收通过', 'text-[#137333]'],
  reject: ['退回重做', 'text-[#C5221F]'], comment: ['留言', 'text-muted'], status: ['状态', 'text-muted']
};
const stepIndex = (st: MissionStatus) => (st === 'rework' ? 3 : st === 'cancelled' ? -1 : MISSION_STEPS.findIndex((x) => x.key === st));
const ago = (t: number) => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? '刚刚' : m < 60 ? `${m} 分钟前` : m < 1440 ? `${Math.round(m / 60)} 小时前` : `${Math.round(m / 1440)} 天前`; };

export function MissionsView() {
  const { missions, mode } = useLive();
  const [sel, setSel] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const sorted = useMemo(() => [...missions].sort((a, b) => b.updatedAt - a.updatedAt), [missions]);
  const open = sorted.filter((m) => m.status !== 'done' && m.status !== 'cancelled');
  const closed = sorted.filter((m) => m.status === 'done' || m.status === 'cancelled');
  const current = sorted.find((m) => m.id === sel) ?? (creating ? undefined : open[0] ?? closed[0]);
  const showForm = creating || missions.length === 0;

  return (
    <ViewShell title="派任务 · AI 团队帮你做事" icon={<Rocket className="size-5" />}
      actions={<>
        <ModeBadge mode={mode} />
        <button type="button" onClick={() => { setCreating(true); setSel(null); }} className="flex items-center gap-1.5 rounded-full bg-brand px-3.5 py-1.5 text-xs font-semibold text-white hover:brightness-110"><Plus className="size-3.5" />新任务</button>
      </>}>
      <div className="grid min-h-0 gap-4 lg:grid-cols-[340px_1fr]">
        <aside className="min-w-0 space-y-4">
          <Pipeline />
          <MissionList title="进行中" list={open} sel={current?.id} onPick={(id) => { setSel(id); setCreating(false); }} />
          {closed.length > 0 && <MissionList title="完成 / 取消" list={closed} sel={current?.id} onPick={(id) => { setSel(id); setCreating(false); }} />}
        </aside>
        <section className="min-w-0">
          {showForm ? <NewMission onDone={(id) => { setCreating(false); if (id) setSel(id); }} onCancel={missions.length ? () => setCreating(false) : undefined} />
            : current ? <MissionDetail m={current} /> : null}
        </section>
      </div>
    </ViewShell>
  );
}

function ModeBadge({ mode }: { mode: string }) {
  if (mode === 'cloud') return <span className="flex items-center gap-1.5 rounded-full bg-[#E6F4EA] px-3 py-1 text-xs text-[#137333]"><Cloud className="size-3.5" />云端 · 即时同步 · AI 团队每小时处理</span>;
  if (mode === 'connecting') return <span className="flex items-center gap-1.5 rounded-full bg-elevated px-3 py-1 text-xs text-muted"><Cloud className="size-3.5" />连云端中…</span>;
  return <span className="flex items-center gap-1.5 rounded-full bg-[#FEF7E0] px-3 py-1 text-xs text-[#B06000]" title="重新登入一次就会连上云端"><CloudOff className="size-3.5" />本机模式：AI 团队看不到，请重新登入</span>;
}

// 六个步骤：一眼看懂任务怎么走
function Pipeline() {
  return (
    <div className="rounded-xl border border-[#DADCE0] bg-surface p-3">
      <div className="mb-2 text-xs font-semibold text-muted">每个任务都这样走</div>
      <ol className="space-y-1.5">
        {MISSION_STEPS.map((x, i) => (
          <li key={x.key} className="flex items-center gap-2 text-xs">
            <span className={cn('grid size-5 place-items-center rounded-full text-[10px] font-bold text-white', ['bg-[#1A73E8]', 'bg-[#9334E6]', 'bg-[#D93025]', 'bg-[#1A73E8]', 'bg-[#D93025]', 'bg-[#1E8E3E]'][i])}>{i + 1}</span>
            <b className="font-medium">{x.label}</b><span className="text-faint">· {x.who}</span>
          </li>
        ))}
      </ol>
      <p className="mt-2 text-[11px] leading-relaxed text-faint">审核部一定先看计划、给意见，才开始做；做完再验收。写程序的任务会交一个 PR，你说「合并」才会上线。</p>
    </div>
  );
}

function MissionList({ title, list, sel, onPick }: { title: string; list: Mission[]; sel?: string; onPick: (id: string) => void }) {
  return (
    <div>
      <div className="mb-1.5 px-1 text-xs font-semibold text-muted">{title} <span className="text-faint">({list.length})</span></div>
      {list.length === 0 && <p className="rounded-xl border border-dashed border-[#DADCE0] p-4 text-center text-xs text-faint">还没有任务。按右上角「新任务」派一个。</p>}
      <ul className="space-y-1.5">
        {list.map((m) => (
          <li key={m.id}>
            <button type="button" onClick={() => onPick(m.id)} className={cn('w-full rounded-xl border p-3 text-left transition-colors', sel === m.id ? 'border-brand bg-[#E8F0FE]' : 'border-[#DADCE0] bg-surface hover:bg-elevated')}>
              <div className="flex items-center gap-2 text-[11px] text-faint"><span className="font-mono">{m.no}</span><span className={cn('rounded-full px-2 py-0.5 font-medium', STATUS_TONE[m.status])}>{STATUS_LABEL[m.status]}</span><span className="ml-auto">{ago(m.updatedAt)}</span></div>
              <div className="mt-1 line-clamp-2 text-sm font-medium">{m.title}</div>
              <MiniSteps st={m.status} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MiniSteps({ st }: { st: MissionStatus }) {
  const k = stepIndex(st);
  return <div className="mt-2 flex gap-1">{MISSION_STEPS.map((x, i) => <span key={x.key} className={cn('h-1 flex-1 rounded-full', st === 'cancelled' ? 'bg-[#E8EAED]' : i < k || st === 'done' ? 'bg-[#1E8E3E]' : i === k ? (st === 'rework' ? 'bg-[#F9AB00]' : 'bg-[#1A73E8]') : 'bg-[#E8EAED]')} />)}</div>;
}

function NewMission({ onDone, onCancel }: { onDone: (id?: string) => void; onCancel?: () => void }) {
  const s = useStore();
  const { tr } = useLang();
  const [title, setTitle] = useState('');
  const [brief, setBrief] = useState('');
  const [kind, setKind] = useState<MissionKind>('general');
  const [priority, setPriority] = useState<Ticket['priority']>('medium');
  const [teams, setTeams] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const depts = s.model.departments.filter((d) => !['reception', 'security', 'ceo'].includes(d.id));
  const submit = async () => {
    if (!title.trim() || busy) return;
    setBusy(true);
    const m = await live.createMission({ title: title.trim(), brief: brief.trim(), kind, priority, teams, scope: kind === 'cs' || teams.some((t) => depts.find((d) => d.id === t)?.floor === '2F') ? '2F' : 'company' }, 'ceo-01');
    setBusy(false);
    if (m) { s.flash(`已派出 ${m.no}，AI CEO 下一个整点会接手`); onDone(m.id); }
  };
  return (
    <div className="rounded-2xl border border-[#DADCE0] bg-surface p-5">
      <div className="flex items-center gap-2"><h3 className="text-lg font-semibold">派一个新任务</h3>{onCancel && <button type="button" onClick={onCancel} className="ml-auto rounded-full p-1.5 text-muted hover:bg-elevated" aria-label="取消"><X className="size-4" /></button>}</div>
      <p className="mt-1 text-sm text-muted">用平常说话的方式写就好。AI CEO 会拆成计划、选团队，审核部看过才开始做。</p>
      <label className="mt-4 block text-sm font-medium">要做什么<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例如：名字审核工具加一个「一键导出 Excel」按钮" className="mt-1.5 w-full rounded-xl border border-[#DADCE0] px-3.5 py-2.5 text-sm focus:border-brand focus:outline-none" /></label>
      <label className="mt-3 block text-sm font-medium">细节、要求、参考（可以不写）<textarea value={brief} onChange={(e) => setBrief(e.target.value)} rows={4} placeholder="谁要用、要做到什么程度、什么时候要、有什么不能做……" className="mt-1.5 w-full resize-y rounded-xl border border-[#DADCE0] px-3.5 py-2.5 text-sm focus:border-brand focus:outline-none" /></label>
      <div className="mt-3 text-sm font-medium">种类</div>
      <div className="mt-1.5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {MISSION_KINDS.map((k) => (
          <button key={k.key} type="button" onClick={() => setKind(k.key)} className={cn('rounded-xl border p-2.5 text-left', kind === k.key ? 'border-brand bg-[#E8F0FE]' : 'border-[#DADCE0] hover:bg-elevated')}>
            <div className="text-sm font-medium">{k.label}</div><div className="text-[11px] text-faint">{k.hint}</div>
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm"><span className="font-medium">急不急</span>
        {(['low', 'medium', 'high', 'urgent'] as const).map((p) => <button key={p} type="button" onClick={() => setPriority(p)} className={cn('rounded-full border px-3 py-1 text-xs', priority === p ? 'border-brand bg-[#E8F0FE] text-[#1967D2]' : 'border-[#DADCE0] text-muted')}>{{ low: '不急', medium: '一般', high: '急', urgent: '很急' }[p]}</button>)}
      </div>
      <details className="mt-3">
        <summary className="cursor-pointer text-sm text-muted">指定团队（不选就让 AI CEO 决定）{teams.length > 0 && <b className="text-brand"> · 已选 {teams.length}</b>}</summary>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {depts.map((d) => <button key={d.id} type="button" onClick={() => setTeams((t) => (t.includes(d.id) ? t.filter((x) => x !== d.id) : [...t, d.id]))}
            className={cn('rounded-full border px-2.5 py-1 text-xs', teams.includes(d.id) ? 'border-brand bg-[#E8F0FE] text-[#1967D2]' : 'border-[#DADCE0] text-muted hover:text-fg')}>{d.floor} · {tr(d.name)}</button>)}
        </div>
      </details>
      <button type="button" disabled={!title.trim() || busy} onClick={submit} className="mt-5 flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-40"><Send className="size-4" />{busy ? '派出中…' : '派给 AI CEO'}</button>
    </div>
  );
}

function MissionDetail({ m }: { m: Mission }) {
  const s = useStore();
  const { tr } = useLang();
  const { events } = useLive();
  const [text, setText] = useState('');
  const person = (id: string) => s.model.people.find((p) => p.id === id);
  const evs = events.filter((e) => e.mission === m.id);
  const k = stepIndex(m.status);
  const crew = [...new Set(m.assignees)].map(person).filter(Boolean);
  const send = () => { const v = text.trim(); if (!v) return; live.commentMission(m.id, v, 'ceo-01'); setText(''); };
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#DADCE0] bg-surface p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs text-faint"><span className="font-mono">{m.no}</span><span className={cn('rounded-full px-2 py-0.5 font-medium', STATUS_TONE[m.status])}>{STATUS_LABEL[m.status]}</span>
          <span>{MISSION_KINDS.find((x) => x.key === m.kind)?.label}</span>{m.reviewRound > 0 && <span>· 审核第 {m.reviewRound} 轮</span>}<span className="ml-auto">派出 {ago(m.createdAt)}</span></div>
        <h3 className="mt-1.5 text-xl font-semibold">{m.title}</h3>
        {m.brief && <p className="mt-1.5 whitespace-pre-wrap text-sm text-muted">{m.brief}</p>}
        <ol className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {MISSION_STEPS.map((x, i) => {
            const doneStep = m.status === 'done' || (k > i);
            const now = k === i && m.status !== 'done';
            return (
              <li key={x.key} className={cn('rounded-xl border p-2 text-center', now ? (m.status === 'rework' ? 'border-[#F9AB00] bg-[#FEF7E0]' : 'border-brand bg-[#E8F0FE]') : doneStep ? 'border-[#CEEAD6] bg-[#E6F4EA]' : 'border-[#DADCE0]')}>
                <div className="mx-auto grid size-6 place-items-center rounded-full bg-surface">{doneStep ? <Check className="size-4 text-[#1E8E3E]" /> : now ? <CircleDot className="size-4 animate-pulseDot text-brand" /> : <span className="text-[11px] text-faint">{i + 1}</span>}</div>
                <div className="mt-1 text-[11px] font-medium leading-tight">{x.label}</div>
              </li>
            );
          })}
        </ol>
        {(m.teams.length > 0 || crew.length > 0) && (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            {m.teams.map((t) => { const d = s.model.departments.find((x) => x.id === t); return d && <span key={t} className="rounded-full px-2.5 py-1 text-white" style={{ background: d.color }}>{d.floor} · {tr(d.name)}</span>; })}
            {crew.map((p) => p && <span key={p.id} className="flex items-center gap-1.5 rounded-full border border-[#DADCE0] py-0.5 pl-0.5 pr-2.5"><Avatar person={p} size="sm" />{tr(p.name)}{p.skill && <span className="text-faint">· {p.skill.split(':').pop()}</span>}</span>)}
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {(m.status === 'done' || m.status === 'result_review') && <button type="button" onClick={() => live.setMissionStatus(m.id, 'rework', 'ceo-01', '老板：这个要重做，请看我的留言。')} className="flex items-center gap-1.5 rounded-full border border-[#DADCE0] px-3 py-1.5 text-xs hover:bg-elevated"><RotateCcw className="size-3.5" />要重做</button>}
          {m.status !== 'done' && m.status !== 'cancelled' && <button type="button" onClick={() => { if (confirm(`取消任务 ${m.no}？`)) live.setMissionStatus(m.id, 'cancelled', 'ceo-01', '老板取消了这个任务。'); }} className="flex items-center gap-1.5 rounded-full border border-[#DADCE0] px-3 py-1.5 text-xs text-[#C5221F] hover:bg-[#FCE8E6]"><X className="size-3.5" />取消任务</button>}
        </div>
      </div>

      {m.plan && <Block title="AI CEO 的计划" tone="border-l-[#9334E6]">{m.plan}</Block>}
      {m.result && <Block title="成果" tone="border-l-[#1E8E3E]">{m.result}</Block>}
      {m.links.length > 0 && (
        <div className="flex flex-wrap gap-2">{m.links.map((l) => <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-full border border-[#DADCE0] bg-surface px-3 py-1.5 text-xs text-[#1967D2] hover:bg-[#E8F0FE]"><ExternalLink className="size-3.5" />{l.label}</a>)}</div>
      )}

      <div className="rounded-2xl border border-[#DADCE0] bg-surface">
        <h4 className="flex items-center gap-2 border-b border-[#DADCE0] px-4 py-3 text-sm font-semibold"><MessageSquare className="size-4 text-brand" />讨论和进度 <span className="text-faint">({evs.length})</span></h4>
        <ul className="space-y-3 px-4 py-3">
          {evs.length === 0 && <li className="py-3 text-center text-xs text-faint">AI CEO 下一个整点会接手，到时候计划、审核意见、进度都会出现在这里，3D 办公室里也看得到他们讨论。</li>}
          {evs.map((e) => {
            const p = person(e.actor);
            const [label, tone] = EVENT_LABEL[e.kind];
            return (
              <li key={e.id} className="flex gap-3">
                {p ? <Avatar person={p} size="sm" /> : <span className="grid size-7 place-items-center rounded-full bg-elevated"><Flag className="size-3.5 text-muted" /></span>}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-2 text-xs"><b className="text-sm font-semibold">{p ? tr(p.name) : e.actor}</b>{p && <span className="text-faint">{tr(p.title)}</span>}<span className={cn('font-medium', tone)}>{label}</span><span className="ml-auto text-faint">{ago(e.t)}</span></div>
                  <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed">{e.text}</p>
                </div>
              </li>
            );
          })}
        </ul>
        {m.status !== 'cancelled' && (
          <div className="flex items-center gap-2 border-t border-[#DADCE0] p-2.5">
            <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) send(); }} placeholder="给团队留言、补充要求（AI CEO 下次会看到）" aria-label="留言"
              className="h-10 min-w-0 flex-1 rounded-full border border-[#DADCE0] px-4 text-sm focus:border-brand focus:outline-none" />
            <button type="button" onClick={send} className="grid size-10 place-items-center rounded-full bg-brand text-white hover:brightness-110" aria-label="发送"><Send className="size-[18px]" /></button>
          </div>
        )}
      </div>
    </div>
  );
}

function Block({ title, tone, children }: { title: string; tone: string; children: string }) {
  return (
    <div className={cn('rounded-2xl border border-l-4 border-[#DADCE0] bg-surface p-4', tone)}>
      <div className="text-sm font-semibold">{title}</div>
      <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed">{children}</p>
    </div>
  );
}
