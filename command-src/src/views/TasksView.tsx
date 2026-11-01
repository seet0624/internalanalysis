import { useState } from 'react';
import { CalendarClock, ListChecks } from 'lucide-react';
import { useStore } from '../lib/store';
import { useLang } from '../lib/i18n';
import { deptById, personById } from '../lib/company';
import { Avatar, PRIORITY_DOT, Progress, SourceTag } from '../components/ui';
import type { TaskStatus } from '../types';
import { Chip, ViewShell } from './ViewShell';
import { cn } from '../lib/cn';

const COLS: TaskStatus[] = ['pending', 'active', 'review', 'blocked', 'completed'];
const COL_TONE: Record<TaskStatus, string> = { pending: 'bg-faint', active: 'bg-st-working', review: 'bg-warn', blocked: 'bg-danger', completed: 'bg-ok' };

export function TasksView() {
  const s = useStore();
  const { t, tr } = useLang();
  const [floor, setFloor] = useState<string>('all');
  const tasks = s.model.tasks.filter((x) => floor === 'all' || deptById(s.model, x.dept)?.floor === floor);
  return (
    <ViewShell title={t('taskCenter')} icon={<ListChecks className="size-5" />}
      actions={<div className="flex flex-wrap gap-1.5">
        <Chip on={floor === 'all'} onClick={() => setFloor('all')}>{t('all')}</Chip>
        {[...s.model.floors].sort((a, b) => b.level - a.level).map((f) => <Chip key={f.id} on={floor === f.id} onClick={() => setFloor(f.id)}>{f.code}</Chip>)}
      </div>}>
      <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-5">
        {COLS.map((c) => {
          const list = tasks.filter((x) => x.status === c);
          return (
            <section key={c} className="flex min-w-0 flex-col rounded-xl border border-line/10 bg-canvas/30 p-2">
              <h3 className="mb-2 flex items-center gap-2 px-1 text-xs font-semibold"><span className={cn('size-2 rounded-full', COL_TONE[c])} />{t(`ts_${c}`)}<span className="num ml-auto text-faint">{list.length}</span></h3>
              <ul className="space-y-2">
                {list.map((x) => {
                  const d = deptById(s.model, x.dept);
                  const o = x.owner ? personById(s.model, x.owner) : undefined;
                  return (
                    <li key={x.id} className="rounded-lg border border-line/10 bg-elevated/50 p-2.5">
                      <div className="flex items-start gap-1.5"><span className={cn('mt-1.5 size-1.5 shrink-0 rounded-full', PRIORITY_DOT[x.priority])} title={t(`pr_${x.priority}`)} /><span className="text-xs font-medium leading-snug">{tr(x.title)}</span></div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-2xs text-faint"><span>{d?.floor} · {d ? tr(d.name) : ''}</span><SourceTag demo={x.demo} real={x.real} /></div>
                      <div className="mt-2 flex items-center gap-2"><Progress value={x.progress} tone={c === 'blocked' ? 'danger' : c === 'completed' ? 'ok' : 'accent'} /><span className="num text-2xs text-faint">{x.progress}%</span></div>
                      <div className="mt-2 flex items-center justify-between">
                        {o ? <button type="button" onClick={() => s.selectPerson(o.id)} className="flex items-center gap-1.5 text-2xs text-muted hover:text-fg"><Avatar person={o} size="sm" />{tr(o.name)}</button> : <span />}
                        <span className="flex items-center gap-1 text-2xs text-faint"><CalendarClock className="size-3" />{x.due.slice(5)}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </ViewShell>
  );
}
