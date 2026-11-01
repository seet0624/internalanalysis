// 整个指挥中心的界面状态：现在看哪一层、选了谁、镜头、筛选、设置。
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { buildCompany, type CompanyModel, type HQEvent } from './company';

export type Section = 'features' | 'overview' | 'building' | 'departments' | 'ai' | 'tasks' | 'projects' | 'comms' | 'kb' | 'analytics' | 'settings';
export type CamCmd = { kind: 'zoomIn' | 'zoomOut' | 'reset'; n: number };
export type Settings = { quality: 'high' | 'low'; labels: boolean; seatIds: boolean; autoRotate: boolean };
export type Filters = { humans: boolean; ai: boolean; dept: string };

type Role = 'boss' | 'cs' | 'guest';

type State = {
  model: CompanyModel;
  role: Role; userName: string;
  section: Section; setSection: (s: Section) => void;
  floor: string | null; selectFloor: (id: string | null) => void;
  mode: '3d' | '2d'; setMode: (m: '3d' | '2d') => void;
  dept: string | null; selectDept: (id: string | null) => void;
  person: string | null; selectPerson: (id: string | null) => void;
  hoverFloor: string | null; setHoverFloor: (id: string | null) => void;
  cam: CamCmd; camera: (k: CamCmd['kind']) => void;
  filters: Filters; setFilters: (f: Partial<Filters>) => void;
  settings: Settings; setSettings: (s: Partial<Settings>) => void;
  commOpen: boolean; setCommOpen: (v: boolean) => void;
  assistantOpen: boolean; setAssistantOpen: (v: boolean) => void;
  canEnter: (floorId: string) => boolean;
  toast: string | null; flash: (msg: string) => void;
  lastEvent: HQEvent | null;
};

const Ctx = createContext<State | null>(null);

const readSettings = (): Settings => {
  const base: Settings = { quality: 'high', labels: true, seatIds: false, autoRotate: false };
  try { return { ...base, ...JSON.parse(localStorage.getItem('cmd-settings') || '{}') }; } catch { return base; }
};

export function StoreProvider({ children }: { children: ReactNode }) {
  const session = window.HQAuth?.session() ?? null;
  const role: Role = session?.role === 'boss' ? 'boss' : session?.role === 'cs' ? 'cs' : 'guest';
  const [model, setModel] = useState<CompanyModel>(buildCompany);
  const [lastEvent, setLastEvent] = useState<HQEvent | null>(null);
  const [section, setSection] = useState<Section>('features');   // 功能先显示
  const [floor, setFloor] = useState<string | null>(role === 'cs' ? '2F' : null);   // 国内客服：大楼直接看自己的 2F
  const [mode, setMode] = useState<'3d' | '2d'>('3d');
  const [dept, selectDept] = useState<string | null>(null);
  const [person, selectPerson] = useState<string | null>(null);
  const [hoverFloor, setHoverFloor] = useState<string | null>(null);
  const [cam, setCam] = useState<CamCmd>({ kind: 'reset', n: 0 });
  const [filters, setFiltersState] = useState<Filters>({ humans: true, ai: true, dept: 'all' });
  const [settings, setSettingsState] = useState<Settings>(readSettings);
  const [commOpen, setCommOpen] = useState(() => window.innerWidth >= 768);   // 手机先收起，让大楼大一点
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // 真实审核纪录：别的分页（名字审核、技术单）处理完文件就重算
  useEffect(() => {
    window.HQBus?.on((e) => { setModel(buildCompany()); if (!e.demo) setLastEvent(e); });
    const id = window.setInterval(() => setModel(buildCompany()), 60000);   // 「几分钟前」跟着走
    return () => window.clearInterval(id);
  }, []);

  const canEnter = useCallback((id: string) => role === 'boss' || id === '2F', [role]);
  const flash = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 2600);
  }, []);
  const selectFloor = useCallback((id: string | null) => {
    setFloor(id);
    selectDept(null);
    if (id === null) setMode('3d');
  }, []);
  const camera = useCallback((kind: CamCmd['kind']) => setCam((c) => ({ kind, n: c.n + 1 })), []);
  const setFilters = useCallback((f: Partial<Filters>) => setFiltersState((s) => ({ ...s, ...f })), []);
  const setSettings = useCallback((s: Partial<Settings>) => setSettingsState((cur) => {
    const next = { ...cur, ...s };
    try { localStorage.setItem('cmd-settings', JSON.stringify(next)); } catch { /* ignore */ }
    return next;
  }), []);

  const value = useMemo<State>(() => ({
    model, role, userName: session?.name ?? '',
    section, setSection, floor, selectFloor, mode, setMode, dept, selectDept, person, selectPerson,
    hoverFloor, setHoverFloor, cam, camera, filters, setFilters, settings, setSettings,
    commOpen, setCommOpen, assistantOpen, setAssistantOpen, canEnter, toast, flash, lastEvent
  }), [model, role, session?.name, section, floor, selectFloor, mode, dept, person, hoverFloor, cam, camera, filters, setFilters,
    settings, setSettings, commOpen, assistantOpen, canEnter, toast, flash, lastEvent]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useStore 要放在 StoreProvider 里');
  return c;
}
