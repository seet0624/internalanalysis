import { LayoutGrid, BarChart3, BookOpen, Bot, Building2, FolderKanban, LayoutDashboard, ListChecks, Lock, LogOut, MessagesSquare, Settings, Users, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useStore, type Section } from '../lib/store';
import { useLang, type UIKey } from '../lib/i18n';
import { peopleOfFloor } from '../lib/company';
import { buildFeatures } from '../lib/features';
import { cn } from '../lib/cn';

const NAV: { id: Section; key: UIKey; icon: ReactNode }[] = [
  { id: 'features', key: 'nav_features', icon: <LayoutGrid className="size-4" /> },
  { id: 'overview', key: 'nav_overview', icon: <LayoutDashboard className="size-4" /> },
  { id: 'building', key: 'nav_building', icon: <Building2 className="size-4" /> },
  { id: 'departments', key: 'nav_departments', icon: <Users className="size-4" /> },
  { id: 'ai', key: 'nav_ai', icon: <Bot className="size-4" /> },
  { id: 'tasks', key: 'nav_tasks', icon: <ListChecks className="size-4" /> },
  { id: 'projects', key: 'nav_projects', icon: <FolderKanban className="size-4" /> },
  { id: 'comms', key: 'nav_comms', icon: <MessagesSquare className="size-4" /> },
  { id: 'kb', key: 'nav_kb', icon: <BookOpen className="size-4" /> },
  { id: 'analytics', key: 'nav_analytics', icon: <BarChart3 className="size-4" /> },
  { id: 'settings', key: 'nav_settings', icon: <Settings className="size-4" /> }
];

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useStore();
  const { t, tr } = useLang();
  const featureCount = buildFeatures(s.role).length;
  const floorsTopDown = [...s.model.floors].sort((a, b) => b.level - a.level);
  const go = (id: Section) => {
    s.setSection(id);
    if (id === 'overview') { s.selectFloor(null); s.selectPerson(null); }
    onClose();
  };
  const logout = () => { window.HQAuth?.logout(); location.href = window.HQAuth?.root ?? '../'; };

  return (
    <aside className={cn(
      'glass fixed inset-y-0 left-0 z-40 flex w-64 flex-col rounded-none border-y-0 border-l-0 transition-transform duration-300 lg:static lg:w-60 lg:translate-x-0',
      open ? 'translate-x-0' : '-translate-x-full'
    )} aria-label={t('appName')}>
      <div className="flex items-center gap-2.5 px-4 pb-3 pt-4">
        <img src="../hq/brand/shuyi-logo-64.png" alt="" width={36} height={36} className="size-9 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold tracking-tight">{t('company')} · {t('appName')}</div>
          <div className="text-2xs text-faint">AI Company HQ</div>
        </div>
        <button type="button" onClick={onClose} className="rounded-md p-1 text-muted hover:text-fg lg:hidden" aria-label={t('close')}><X className="size-4" /></button>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        <ul className="space-y-0.5">
          {NAV.map((n) => {
            const on = s.section === n.id;
            return (
              <li key={n.id}>
                <button type="button" onClick={() => go(n.id)} aria-current={on ? 'page' : undefined}
                  className={cn('flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                    on ? 'bg-gradient-to-r from-accent/15 to-transparent font-semibold text-fg shadow-[inset_2px_0_0_rgb(var(--accent))]' : 'text-muted hover:bg-elevated/60 hover:text-fg')}>
                  <span className={on ? 'text-accent' : ''}>{n.icon}</span>
                  {t(n.key)}
                  {n.id === 'features' && <span className="num ml-auto rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-canvas">{featureCount}</span>}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="mt-4 px-3 text-2xs font-semibold uppercase tracking-wider text-faint">{t('nav_building')}</div>
        <ul className="mt-1.5 space-y-0.5">
          {floorsTopDown.map((f) => {
            const on = s.floor === f.id;
            const n = peopleOfFloor(s.model, f.id).length;
            const locked = !s.canEnter(f.id);
            return (
              <li key={f.id}>
                <button type="button"
                  onMouseEnter={() => s.setHoverFloor(f.id)} onMouseLeave={() => s.setHoverFloor(null)}
                  onClick={() => { if (locked) { s.flash(t('locked')); return; } s.setSection('building'); s.selectFloor(f.id); s.selectPerson(null); onClose(); }}
                  className={cn('group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors',
                    on ? 'bg-elevated text-fg' : 'text-muted hover:bg-elevated/50 hover:text-fg')}>
                  <span className="grid h-6 w-8 shrink-0 place-items-center rounded-md text-[10px] font-bold"
                    style={{ background: on ? f.accent : `${f.accent}22`, color: on ? '#14110F' : f.accent }}>{f.code}</span>
                  <span className="min-w-0 flex-1 truncate">{tr(f.name).replace(/^\w+ · /, '')}</span>
                  {locked ? <Lock className="size-3 text-faint" aria-label={t('locked')} /> : <span className="num text-2xs text-faint">{n}</span>}
                </button>
              </li>
            );
          })}
        </ul>
        <a href="../" className="mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-faint hover:bg-elevated/50 hover:text-fg">← {t('oldHQ')}</a>
      </nav>

      <div className="flex items-center gap-2.5 border-t border-line/10 p-3">
        <div className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-warn to-danger text-sm font-bold text-canvas">
          {(s.userName || 'M').replace(/^老板\s*/, '').slice(0, 1)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{s.userName || t('admin')}</div>
          <div className="text-2xs text-faint">{s.role === 'boss' ? t('admin') : s.role === 'cs' ? 'CS' : ''}</div>
        </div>
        <button type="button" onClick={() => go('settings')} className="rounded-md p-1.5 text-muted hover:bg-elevated hover:text-fg" aria-label={t('settings')} title={t('settings')}><Settings className="size-4" /></button>
        <button type="button" onClick={logout} className="rounded-md p-1.5 text-muted hover:bg-elevated hover:text-danger" aria-label={t('logout')} title={t('logout')}><LogOut className="size-4" /></button>
      </div>
    </aside>
  );
}
