import { BarChart3 } from 'lucide-react';
import { useStore } from '../lib/store';
import { useAgo, useLang } from '../lib/i18n';
import { describeEvent, tasksOfFloor } from '../lib/company';
import { Avatar, Badge, PanelTitle } from '../components/ui';
import { STATUSES, type TaskStatus } from '../types';
import { ViewShell } from './ViewShell';

// 颜色跟状态 token 一致
const TS_COLOR: Record<TaskStatus, string> = { pending: 'rgb(var(--faint))', active: 'rgb(var(--st-working))', review: 'rgb(var(--warn))', blocked: 'rgb(var(--danger))', completed: 'rgb(var(--ok))' };
const ST_COLOR = (s: string) => `rgb(var(--st-${s}))`;

export function AnalyticsView() {
  const s = useStore();
  const { t, tr } = useLang();
  const ago = useAgo();
  const m = s.model;
  const floors = [...m.floors].sort((a, b) => b.level - a.level);
  const rows = floors.map((f) => ({ f, tasks: tasksOfFloor(m, f.id) }));
  const max = Math.max(1, ...rows.map((r) => r.tasks.length));
  const ai = m.people.filter((p) => p.type === 'ai');
  const top = [...m.people].sort((a, b) => b.perf - a.perf).slice(0, 6);
  const order: TaskStatus[] = ['completed', 'active', 'review', 'pending', 'blocked'];
  return (
    <ViewShell title={t('analyticsTitle')} icon={<BarChart3 className="size-5" />}>
      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-xl border border-line/10 bg-elevated/30 p-4">
          <PanelTitle>{t('tasksByFloor')}</PanelTitle>
          <ul className="space-y-2" aria-label={t('tasksByFloor')}>
            {rows.map(({ f, tasks }) => (
              <li key={f.id} className="flex items-center gap-3 text-xs">
                <span className="w-8 font-mono font-bold" style={{ color: f.accent }}>{f.code}</span>
                <div className="flex h-5 flex-1 gap-px overflow-hidden rounded-md bg-line/5">
                  {order.map((st) => {
                    const n = tasks.filter((x) => x.status === st).length;
                    return n ? <div key={st} title={`${t(`ts_${st}`)} ${n}`} style={{ width: `${(n / max) * 100}%`, background: TS_COLOR[st] }} className="h-full first:rounded-l-md last:rounded-r-md" /> : null;
                  })}
                </div>
                <span className="num w-6 text-right text-muted">{tasks.length}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-3 text-2xs text-muted">
            {order.map((st) => <span key={st} className="flex items-center gap-1"><span className="size-2 rounded-sm" style={{ background: TS_COLOR[st] }} />{t(`ts_${st}`)}</span>)}
          </div>
        </section>
        <section className="rounded-xl border border-line/10 bg-elevated/30 p-4">
          <PanelTitle>{t('aiStatusMix')} · {ai.length}</PanelTitle>
          <div className="flex h-4 overflow-hidden rounded-full">
            {STATUSES.map((st) => { const n = ai.filter((p) => p.status === st).length; return n ? <div key={st} style={{ width: `${(n / ai.length) * 100}%`, background: ST_COLOR(st) }} title={`${t(`st_${st}`)} ${n}`} /> : null; })}
          </div>
          <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {STATUSES.map((st) => (
              <li key={st} className="rounded-lg bg-canvas/40 p-2">
                <div className="flex items-center gap-1.5 text-2xs text-muted"><span className="size-2 rounded-full" style={{ background: ST_COLOR(st) }} />{t(`st_${st}`)}</div>
                <div className="num mt-0.5 text-lg font-semibold">{ai.filter((p) => p.status === st).length}</div>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-xl border border-line/10 bg-elevated/30 p-4">
          <PanelTitle>{t('topPerformers')}</PanelTitle>
          <ul className="space-y-1.5">
            {top.map((p, i) => (
              <li key={p.id}>
                <button type="button" onClick={() => s.selectPerson(p.id)} className="flex w-full items-center gap-2.5 rounded-lg px-1 py-1 text-left hover:bg-elevated/50">
                  <span className="num w-4 text-xs text-faint">{i + 1}</span><Avatar person={p} size="sm" />
                  <span className="flex-1 text-xs">{tr(p.name)} <span className="text-faint">· {tr(p.title)}</span></span>
                  <span className="num text-sm font-semibold text-ok">{p.perf}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-xl border border-line/10 bg-elevated/30 p-4">
          <PanelTitle right={<Badge tone="real">{t('real')}</Badge>}>{t('reviewsToday')}</PanelTitle>
          {m.events.length === 0 ? <p className="text-xs leading-relaxed text-faint">{t('noReviews')}</p> : (
            <ul className="space-y-1.5">
              {m.events.slice(-8).reverse().map((e) => (
                <li key={e.id} className="rounded-lg bg-canvas/40 px-2.5 py-1.5 text-xs">
                  <div className="text-2xs text-faint">{ago((Date.now() - e.t) / 60000)}</div>{tr(describeEvent(e))}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </ViewShell>
  );
}
