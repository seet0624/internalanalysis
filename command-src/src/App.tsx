import { useEffect, useState } from 'react';
import { Radio } from 'lucide-react';
import { StoreProvider, useStore } from './lib/store';
import { LangProvider, useLang } from './lib/i18n';
import { describeEvent } from './lib/company';
import { Sidebar } from './components/Sidebar';
import { Home, HomeHeader } from './components/Home';
import { RightPanel } from './components/RightPanel';
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

// 即时审核事件、提示（固定在画面上方）
function Toasts() {
  const s = useStore();
  const { tr } = useLang();
  const [live, setLive] = useState<string | null>(null);
  useEffect(() => {
    if (!s.lastEvent) return;
    setLive(tr(describeEvent(s.lastEvent)));
    const id = window.setTimeout(() => setLive(null), 6000);
    return () => window.clearTimeout(id);
  }, [s.lastEvent]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      {live && (
        <div className="glass fixed left-1/2 top-20 z-50 flex max-w-[90%] -translate-x-1/2 animate-slideUp items-center gap-2 rounded-full border-ok/40 px-4 py-2 text-xs" role="status">
          <Radio className="size-4 animate-pulseDot text-ok" />{live}
        </div>
      )}
      {s.toast && <div className="fixed left-1/2 top-20 z-50 -translate-x-1/2 animate-slideUp rounded-full bg-[#202124] px-4 py-2 text-sm text-white shadow-glass" role="status">{s.toast}</div>}
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

// 老板画面（简化版）：上面一条（选单、Logo、部门、两个审核工具）；中间派任务 + 办公室 + 进行中的任务。
// 其他功能在左上角选单（抽屉）；点员工 → 右边抽屉看资料。
function BossShell() {
  const s = useStore();
  const [navOpen, setNavOpen] = useState(false);
  const [intelOpen, setIntelOpen] = useState(false);
  useEffect(() => { if (s.person) setIntelOpen(true); }, [s.person]);
  // 快捷键：Esc 关掉面板 / 回首页
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || (e.target as HTMLElement)?.closest('input,textarea,select')) return;
      if (navOpen) setNavOpen(false);
      else if (s.person) { s.selectPerson(null); setIntelOpen(false); }
      else if (s.section !== 'overview' && s.section !== 'building') s.setSection('overview');
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [s, navOpen]);
  const closeIntel = () => { setIntelOpen(false); s.selectPerson(null); s.selectDept(null); };
  return (
    <div className="flex h-full flex-col bg-[#0F1217] text-[#E8EAED]">
      <HomeHeader onMenu={() => setNavOpen(true)} />
      <Sidebar drawer open={navOpen} onClose={() => setNavOpen(false)} />
      {(navOpen || intelOpen) && <div className="fixed inset-0 z-30 bg-black/50" onClick={() => { setNavOpen(false); closeIntel(); }} aria-hidden />}
      <div id="scene" className="relative min-h-0 flex-1">
        <Home />
        <Workspace />
      </div>
      <RightPanel drawer open={intelOpen} onClose={closeIntel} />
      <Toasts />
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
