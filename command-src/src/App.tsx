import { useEffect, useState } from 'react';
import { Radio } from 'lucide-react';
import { StoreProvider, useStore } from './lib/store';
import { LangProvider, useLang } from './lib/i18n';
import { describeEvent } from './lib/company';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { RightPanel } from './components/RightPanel';
import { CommPanel } from './components/CommPanel';
import { Assistant } from './components/Assistant';
import { Scene } from './scene/Scene';
import { OfficeHUD } from './components/OfficeHUD';
import { FeaturesView } from './views/FeaturesView';
import { DepartmentsView } from './views/DepartmentsView';
import { AIView } from './views/AIView';
import { MissionsView } from './views/MissionsView';
import { TasksView } from './views/TasksView';
import { ProjectsView } from './views/ProjectsView';
import { CommsView } from './views/CommsView';
import { KBView } from './views/KBView';
import { AnalyticsView } from './views/AnalyticsView';
import { SettingsView } from './views/SettingsView';
import { CSApp } from './cs/CSApp';

// 3D 区域上的东西：部门分页、任务横幅、员工卡（OfficeHUD）、即时审核事件、提示
function SceneOverlay() {
  const s = useStore();
  const { tr } = useLang();
  const [live, setLive] = useState<string | null>(null);
  useEffect(() => {
    if (!s.lastEvent) return;
    setLive(tr(describeEvent(s.lastEvent)));
    const id = window.setTimeout(() => setLive(null), 6000);
    return () => window.clearTimeout(id);
  }, [s.lastEvent]); // eslint-disable-line react-hooks/exhaustive-deps
  const covered = s.section !== 'overview' && s.section !== 'building';
  return (
    <>
      {!covered && <OfficeHUD />}
      {live && (
        <div className="glass absolute left-1/2 top-28 z-20 flex max-w-[90%] -translate-x-1/2 animate-slideUp items-center gap-2 rounded-full border-ok/40 px-4 py-2 text-xs" role="status">
          <Radio className="size-4 animate-pulseDot text-ok" />{live}
        </div>
      )}
      {s.toast && (
        <div className="glass absolute left-1/2 top-1/2 z-30 -translate-x-1/2 animate-slideUp rounded-full px-4 py-2 text-xs" role="status">{s.toast}</div>
      )}
    </>
  );
}

function Workspace() {
  const s = useStore();
  switch (s.section) {
    case 'features': return <FeaturesView />;
    case 'missions': return <MissionsView />;
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
  if (s.csView) return <CSApp />;
  return <BossShell />;
}

function BossShell() {
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
        else if (s.section !== 'overview' && s.section !== 'building') s.setSection('overview');
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [s]);

  return (
    <div className="flex h-full bg-canvas">
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
