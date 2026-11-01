import { useMemo, useState } from 'react';
import { Bot } from 'lucide-react';
import { useStore } from '../lib/store';
import { useLang } from '../lib/i18n';
import { deptById } from '../lib/company';
import { Avatar, Progress, SourceTag, StatusPill } from '../components/ui';
import { STATUSES, type Status } from '../types';
import { Chip, ViewShell } from './ViewShell';

export function AIView() {
  const s = useStore();
  const { t, tr } = useLang();
  const [st, setSt] = useState<Status | 'all'>('all');
  const ai = useMemo(() => s.model.people.filter((p) => p.type === 'ai'), [s.model.people]);
  const list = st === 'all' ? ai : ai.filter((p) => p.status === st);
  return (
    <ViewShell title={`${t('nav_ai')} · ${ai.length}`} icon={<Bot className="size-5" />}
      actions={<div className="flex flex-wrap gap-1.5">
        <Chip on={st === 'all'} onClick={() => setSt('all')}>{t('all')}</Chip>
        {STATUSES.map((x) => <Chip key={x} on={st === x} onClick={() => setSt(x)}>{t(`st_${x}`)} {ai.filter((p) => p.status === x).length}</Chip>)}
      </div>}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-2xs uppercase tracking-wider text-faint">
            <tr><th className="pb-2 font-semibold">AI</th><th className="pb-2 font-semibold">{t('department')}</th><th className="pb-2 font-semibold">{t('currentTask')}</th><th className="pb-2 font-semibold">{t('status')}</th><th className="w-32 pb-2 font-semibold">{t('performance')}</th></tr>
          </thead>
          <tbody className="divide-y divide-line/5">
            {list.map((p) => {
              const d = deptById(s.model, p.dept);
              return (
                <tr key={p.id} onClick={() => s.selectPerson(p.id)} className="cursor-pointer hover:bg-elevated/40">
                  <td className="py-2 pr-3"><div className="flex items-center gap-2.5"><Avatar person={p} size="sm" /><div><div className="flex items-center gap-1.5 font-medium">{tr(p.name)}<SourceTag demo={p.demo} real={p.real} /></div><div className="text-2xs text-faint">{tr(p.title)}</div></div></div></td>
                  <td className="py-2 pr-3 text-xs text-muted">{d?.floor} · {d ? tr(d.name) : ''}</td>
                  <td className="max-w-xs py-2 pr-3 text-xs">{tr(p.task)}</td>
                  <td className="py-2 pr-3"><StatusPill status={p.status} /></td>
                  <td className="py-2"><div className="flex items-center gap-2"><Progress value={p.perf} tone={p.perf >= 90 ? 'ok' : 'accent'} /><span className="num w-7 text-xs">{p.perf}</span></div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </ViewShell>
  );
}
