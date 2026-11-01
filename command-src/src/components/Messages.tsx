import { useMemo, useState } from 'react';
import { useStore } from '../lib/store';
import { useAgo, useLang, type UIKey } from '../lib/i18n';
import { deptById, personById } from '../lib/company';
import { Avatar, Badge, SourceTag } from './ui';
import type { Channel, Message } from '../types';
import { cn } from '../lib/cn';

export type CommTab = Channel | 'timeline';
export const COMM_TABS: { id: CommTab; key: UIKey }[] = [
  { id: 'company', key: 'comm_company' }, { id: 'dept', key: 'comm_dept' }, { id: 'ai', key: 'comm_ai' },
  { id: 'task', key: 'comm_task' }, { id: 'notice', key: 'comm_notice' }, { id: 'timeline', key: 'comm_timeline' }
];

export function MessageList({ tab, dense = false }: { tab: CommTab; dense?: boolean }) {
  const s = useStore();
  const { tr, t } = useLang();
  const ago = useAgo();
  const list: Message[] = useMemo(() => (tab === 'timeline' ? s.model.messages : s.model.messages.filter((m) => m.ch === tab)), [s.model.messages, tab]);
  if (!list.length) return <p className="px-3 py-4 text-xs text-faint">{tab === 'task' ? t('noReviews') : '—'}</p>;
  return (
    <ul className={cn('divide-y divide-line/5', dense && 'text-xs')}>
      {list.map((m) => {
        const p = personById(s.model, m.from);
        const d = m.dept ? deptById(s.model, m.dept) : p ? deptById(s.model, p.dept) : undefined;
        return (
          <li key={m.id} className="flex gap-2.5 px-3 py-2 hover:bg-elevated/30">
            {p ? <button type="button" onClick={() => s.selectPerson(p.id)} aria-label={tr(p.name)}><Avatar person={p} size="sm" /></button>
              : <span className="grid size-7 shrink-0 place-items-center rounded-full bg-danger/15 text-[10px] font-bold text-danger">SYS</span>}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 text-2xs text-faint">
                <span className="font-semibold text-muted">{p ? tr(p.name) : 'System'}</span>
                {p?.type === 'ai' && <Badge tone="ai">AI</Badge>}
                {d && <span>· {d.floor} {tr(d.name)}</span>}
                <span>· {ago(m.ago)}</span>
                <SourceTag demo={m.demo} real={m.real} />
                {tab === 'timeline' && <Badge>{t(COMM_TABS.find((x) => x.id === m.ch)?.key ?? 'comm_company')}</Badge>}
              </div>
              <p className="mt-0.5 text-xs leading-snug text-fg/90">{tr(m.text)}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function CommTabs({ tab, setTab }: { tab: CommTab; setTab: (t: CommTab) => void }) {
  const s = useStore();
  const { t } = useLang();
  return (
    <div className="flex min-w-0 gap-0.5 overflow-x-auto" role="tablist">
      {COMM_TABS.map((x) => {
        const n = x.id === 'timeline' ? s.model.messages.length : s.model.messages.filter((m) => m.ch === x.id).length;
        return (
          <button key={x.id} type="button" role="tab" aria-selected={tab === x.id} onClick={() => setTab(x.id)}
            className={cn('flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-colors',
              tab === x.id ? 'bg-accent/15 font-semibold text-accent' : 'text-muted hover:bg-elevated/50 hover:text-fg')}>
            {t(x.key)}<span className="num text-2xs opacity-70">{n}</span>
          </button>
        );
      })}
    </div>
  );
}

export function useCommTab(initial: CommTab = 'timeline') { return useState<CommTab>(initial); }
