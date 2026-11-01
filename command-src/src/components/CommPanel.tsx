import { ChevronDown, ChevronUp, MessagesSquare } from 'lucide-react';
import { useStore } from '../lib/store';
import { useLang } from '../lib/i18n';
import { CommTabs, MessageList, useCommTab } from './Messages';
import { cn } from '../lib/cn';

// 底部的公司沟通面板（可收起）
export function CommPanel() {
  const s = useStore();
  const { t } = useLang();
  const [tab, setTab] = useCommTab('timeline');
  return (
    <section className={cn('glass relative z-20 flex shrink-0 flex-col rounded-none border-x-0 border-b-0 transition-[height] duration-300', s.commOpen ? 'h-52' : 'h-10')}
      aria-label={t('comm_title')}>
      <div className="flex h-10 shrink-0 items-center gap-2 px-2 md:px-3">
        <button type="button" onClick={() => s.setCommOpen(!s.commOpen)} aria-expanded={s.commOpen}
          className="flex shrink-0 items-center gap-1.5 rounded-md px-1.5 py-1 text-xs font-semibold text-fg hover:bg-elevated/50">
          <MessagesSquare className="size-4 text-accent" />
          <span className="hidden sm:inline">{t('comm_title')}</span>
          {s.commOpen ? <ChevronDown className="size-3.5 text-muted" /> : <ChevronUp className="size-3.5 text-muted" />}
        </button>
        {s.commOpen && <CommTabs tab={tab} setTab={setTab} />}
      </div>
      {s.commOpen && <div className="min-h-0 flex-1 overflow-y-auto"><MessageList tab={tab} dense /></div>}
    </section>
  );
}
