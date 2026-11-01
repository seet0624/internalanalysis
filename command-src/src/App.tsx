import { useEffect, useState } from 'react';
import { ArrowLeft, Lock, Radio } from 'lucide-react';
import { StoreProvider, useStore } from './lib/store';
import { LangProvider, useLang } from './lib/i18n';
import { describeEvent } from './lib/company';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { RightPanel } from './components/RightPanel';
import { CommPanel } from './components/CommPanel';
import { Assistant } from './components/Assistant';
import { Scene } from './scene/Scene';
import { STATUS_COLOR } from './scene/Avatars';
import { FeaturesView } from './views/FeaturesView';
import { DepartmentsView } from './views/DepartmentsView';
import { AIView } from './views/AIView';
import { TasksView } from './views/TasksView';
import { ProjectsView } from './views/ProjectsView';
import { CommsView } from './views/CommsView';
import { KBView } from './views/KBView';
import { AnalyticsView } from './views/AnalyticsView';
import { SettingsView } from './views/SettingsView';
import { STATUSES } from './types';
import { cn } from './lib/cn';

// 3D 区域上的小东西：返回、楼层快切、图例、提示、即时审核事件
function SceneOverlay() {
  const s = useStore();
  const { t, tr } = useLang();
  const floors = [...s.model.floors].sort((a, b) => b.level - a.level);
  const [live, setLive] = useState<string | null>(null);
  useEffect(() => {
    if (!s.lastEvent) return;
    setLive(tr(describeEvent(s.lastEvent)));
    const id = window.setTimeout(() => setLive(null), 6000);
    return () => window.clearTimeout(id);
  }, [s.lastEvent]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      {s.floor ? (
        <button type="button" onClick={() => { s.selectFloor(null); s.selectPerson(null); }}
          className="glass absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-fg hover:border-accent/40">
          <ArrowLeft className="size-4" />{t('backToBuilding')}
        </button>
      ) : (
        <p className="pointer-events-none absolute left-3 top-3 z-10 hidden max-w-xs rounded-lg bg-canvas/50 px-3 py-2 text-2xs text-muted backdrop-blur md:block">{t('selectFloorHint')}</p>
      )}
      {/* 楼层快切 */}
      <nav className="glass absolute right-3 top-1/2 z-10 hidden -translate-y-1/2 flex-col gap-1 rounded-xl p-1 sm:flex" aria-label={t('floor')}>
        {floors.map((f) => {
          const on = s.floor === f.id;
          const locked = !s.canEnter(f.id);
          return (
            <button key={f.id} type="button" title={tr(f.name)} aria-pressed={on}
              onMouseEnter={() => s.setHoverFloor(f.id)} onMouseLeave={() => s.setHoverFloor(null)}
              onClick={() => { if (locked) { s.flash(t('locked')); return; } s.selectFloor(on ? null : f.id); s.selectPerson(null); }}
              className={cn('relative grid h-8 w-10 place-items-center rounded-lg text-[11px] font-bold transition-colors',
                on ? 'text-canvas' : 'text-muted hover:bg-elevated hover:text-fg', locked && 'opacity-50')}
              style={on ? { background: f.accent } : undefined}>
              {f.code}{locked && <Lock className="absolute right-0.5 top-0.5 size-2" />}
            </button>
          );
        })}
      </nav>
      {/* 状态图例 */}
      <div className="glass absolute bottom-3 left-3 z-10 hidden flex-wrap gap-x-3 gap-y-1 rounded-lg px-3 py-2 text-2xs text-muted md:flex">
        {STATUSES.map((st) => <span key={st} className="flex items-center gap-1"><span className="size-2 rounded-full" style={{ background: STATUS_COLOR[st] }} />{t(`st_${st}`)}</span>)}
        <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-ai shadow-glow" />AI · {t('real')}</span>
        <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-muted" />AI · {t('demo')}</span>
      </div>
      {live && (
        <div className="glass absolute left-1/2 top-3 z-20 flex max-w-[90%] -translate-x-1/2 animate-slideUp items-center gap-2 rounded-full border-ok/40 px-4 py-2 text-xs" role="status">
          <Radio className="size-4 animate-pulseDot text-ok" />{live}
        </div>
      )}
      {s.toast && (
        <div className="glass absolute bottom-16 left-1/2 z-30 -translate-x-1/2 animate-slideUp rounded-full px-4 py-2 text-xs" role="status">{s.toast}</div>
      )}
    </>
  );
}

function Workspace() {
  const s = useStore();
  switch (s.section) {
    case 'features': return <FeaturesView />;
    case 'departments': return <DepartmentsView />;
    case 'ai': return <AIView />;
    case 'tasks': return <TasksView />;
    case 'projects': return <ProjectsView />;
    case 'comms': return <CommsView />;
    case 'kb': return <KBView />;
    case 'analytics': return <AnalyticsView />;
    case 'settings': return <SettingsView />;
    default: return null;
  }
}

function Shell() {
  const s = useStore();
  const { t } = useLang();
  const [navOpen, setNavOpen] = useState(false);
  const [intelOpen, setIntelOpen] = useState(false);
  // 选了员工 / 部门：小屏幕自动打开右边面板
  useEffect(() => { if (s.person || s.dept) setIntelOpen(true); }, [s.person, s.dept]);
  // 快捷键：/ 搜索、Esc 返回
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.closest('input,textarea,select');
      if (e.key === '/' && !typing) { e.preventDefault(); document.querySelector<HTMLInputElement>('header input')?.focus(); }
      if (e.key === 'Escape' && !typing) {
        if (s.person) s.selectPerson(null);
        else if (s.dept) s.selectDept(null);
        else if (s.section !== 'overview' && s.section !== 'building') s.setSection(s.floor ? 'building' : 'overview');
        else if (s.floor) s.selectFloor(null);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [s]);

  return (
    <div className="flex h-full bg-[radial-gradient(ellipse_at_60%_20%,rgb(var(--brand)/0.16),transparent_60%),radial-gradient(ellipse_at_10%_90%,rgb(var(--accent)/0.08),transparent_55%)]">
      <a href="#scene" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-accent focus:px-3 focus:py-1 focus:text-canvas">Skip</a>
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
      {(navOpen || intelOpen) && <div className="fixed inset-0 z-30 bg-canvas/60 backdrop-blur-sm xl:hidden" onClick={() => { setNavOpen(false); setIntelOpen(false); }} aria-hidden />}
      <main className="flex min-w-0 flex-1 flex-col">
        <TopBar onMenu={() => setNavOpen(true)} onIntel={() => setIntelOpen((v) => !v)} intelOpen={intelOpen} />
        <div id="scene" className="relative min-h-0 flex-1 overflow-hidden" aria-label={t('wholeBuilding')}>
          <Scene />
          <SceneOverlay />
          <Workspace />
          <Assistant />
        </div>
        <CommPanel />
      </main>
      <RightPanel open={intelOpen} onClose={() => setIntelOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <LangProvider>
      <StoreProvider>
        <Shell />
      </StoreProvider>
    </LangProvider>
  );
}
