// 整个指挥中心的界面状态：现在看哪个部门的办公室、选了谁、镜头、筛选、设置。
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { buildCompany, type CompanyModel, type HQEvent } from './company';
import { defaultQuality, isQuality, type Quality } from './graphics';

export type Section = 'features' | 'missions' | 'overview' | 'building' | 'departments' | 'ai' | 'tasks' | 'projects' | 'comms' | 'kb' | 'analytics' | 'settings';
export type CamCmd = { kind: 'zoomIn' | 'zoomOut' | 'reset'; n: number };
export type Settings = { quality: Quality; labels: boolean; seatIds: boolean; autoRotate: boolean };
export type Filters = { humans: boolean; ai: boolean; dept: string };

type Role = 'boss' | 'cs' | 'guest';

type State = {
  model: CompanyModel;
  role: Role; userName: string;
  section: Section; setSection: (s: Section) => void;
  room: string; setRoom: (deptId: string) => void;          // 现在看哪个部门的办公室（上面的分页）
  floor: string | null; selectFloor: (id: string | null) => void;   // 旧的「楼层」：= 这个部门在哪一层；选楼层 → 跳到那层第一个部门
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
  csView: boolean; setCsView: (v: boolean) => void;   // 客服中国仪表板（客服账号一定是；老板可以切过去看）
  toast: string | null; flash: (msg: string) => void;
  lastEvent: HQEvent | null;
};

const Ctx = createContext<State | null>(null);

const readSettings = (): Settings => {
  const base: Settings = { quality: defaultQuality(), labels: true, seatIds: false, autoRotate: false };
  try {
    const saved = JSON.parse(localStorage.getItem('cmd-settings') || '{}');
    // 旧版只有「高 / 省电」：高 → 依电脑能力自动选
    if (!isQuality(saved.quality)) saved.quality = saved.quality === 'low' ? 'low' : base.quality;
    return { ...base, ...saved };
  } catch { return base; }
};

export function StoreProvider({ children }: { children: ReactNode }) {
  const session = window.HQAuth?.session() ?? null;
  const role: Role = session?.role === 'boss' ? 'boss' : session?.role === 'cs' ? 'cs' : 'guest';
  const [model, setModel] = useState<CompanyModel>(buildCompany);
  const [lastEvent, setLastEvent] = useState<HQEvent | null>(null);
  const [section, setSection] = useState<Section>(role === 'boss' ? 'overview' : 'features');   // 老板先看公司总览
  const [room, setRoomState] = useState<string>(role === 'cs' ? 'cs' : 'dev');   // 国内客服：自己的客服部；老板先看开发部
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
  const [csViewBoss, setCsView] = useState(false);
  const csView = role === 'cs' || csViewBoss;

  // 云端没存到（权限、断线）：要让人知道，不能默默失败
  useEffect(() => {
    const h = (e: Event) => flashRef.current('云端没有存到，请检查网络后再试一次（' + String((e as CustomEvent).detail ?? '').slice(0, 60) + '）');
    window.addEventListener('live-error', h);
    return () => window.removeEventListener('live-error', h);
  }, []);
  // 真实审核纪录：别的分页（名字审核、技术单）处理完文件就重算
  useEffect(() => {
    window.HQBus?.on((e) => { setModel(buildCompany()); if (!e.demo) setLastEvent(e); });
    const id = window.setInterval(() => setModel(buildCompany()), 60000);   // 「几分钟前」跟着走
    return () => window.clearInterval(id);
  }, []);

  const canEnter = useCallback((id: string) => role === 'boss' || id === '2F', [role]);
  const floor = model.departments.find((d) => d.id === room)?.floor ?? null;
  // 客服视图只看 2F 的部门；老板切到客服视图时，如果正在看别的部门就换到客服部
  useEffect(() => { if (csView && floor !== '2F') setRoomState('cs'); }, [csView, floor]);
  const flash = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 2600);
  }, []);
  const flashRef = useRef(flash);
  const setRoom = useCallback((id: string) => {
    const d = model.departments.find((x) => x.id === id);
    if (!d) return;
    if (!canEnter(d.floor)) { flashRef.current('这个部门你没有权限进去'); return; }
    setRoomState(id); selectDept(null); selectPerson(null);
  }, [model.departments, canEnter]);
  const selectFloor = useCallback((id: string | null) => {
    selectDept(null);
    if (id === null) return;
    const d = model.departments.find((x) => x.floor === id);
    if (d) setRoom(d.id);
  }, [model.departments, setRoom]);
  const camera = useCallback((kind: CamCmd['kind']) => setCam((c) => ({ kind, n: c.n + 1 })), []);
  const setFilters = useCallback((f: Partial<Filters>) => setFiltersState((s) => ({ ...s, ...f })), []);
  const setSettings = useCallback((s: Partial<Settings>) => setSettingsState((cur) => {
    const next = { ...cur, ...s };
    try { localStorage.setItem('cmd-settings', JSON.stringify(next)); } catch { /* ignore */ }
    return next;
  }), []);

  const value = useMemo<State>(() => ({
    model, role, userName: session?.name ?? '',
    section, setSection, room, setRoom, floor, selectFloor, mode, setMode, dept, selectDept, person, selectPerson,
    hoverFloor, setHoverFloor, cam, camera, filters, setFilters, settings, setSettings,
    commOpen, setCommOpen, assistantOpen, setAssistantOpen, canEnter, toast, flash, lastEvent, csView, setCsView
  }), [csView, model, role, session?.name, section, room, setRoom, floor, selectFloor, mode, dept, person, hoverFloor, cam, camera, filters, setFilters,
    settings, setSettings, commOpen, assistantOpen, canEnter, toast, flash, lastEvent]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useStore 要放在 StoreProvider 里');
  return c;
}
