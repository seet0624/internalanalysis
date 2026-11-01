import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { useStore } from '../lib/store';
import { useLang } from '../lib/i18n';

// 盖在 3D 大楼上的工作面板；关掉回到大楼（大楼一直在后面，不用重新载入）
export function ViewShell({ title, icon, actions, children }: { title: string; icon: ReactNode; actions?: ReactNode; children: ReactNode }) {
  const s = useStore();
  const { t } = useLang();
  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-canvas/70 p-2 backdrop-blur-sm md:p-4">
      <div className="glass flex min-h-0 flex-1 animate-slideUp flex-col overflow-hidden rounded-2xl">
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line/10 px-4 py-3">
          <h2 className="flex items-center gap-2 text-base font-semibold"><span className="text-accent">{icon}</span>{title}</h2>
          <div className="ml-auto flex flex-wrap items-center gap-2">{actions}
            <button type="button" onClick={() => s.setSection(s.floor ? 'building' : 'overview')} className="rounded-lg p-1.5 text-muted hover:bg-elevated hover:text-fg" aria-label={t('close')}><X className="size-4" /></button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}

export function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on}
      className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${on ? 'border-accent/50 bg-accent/15 text-accent' : 'border-line/15 text-muted hover:text-fg'}`}>
      {children}
    </button>
  );
}
