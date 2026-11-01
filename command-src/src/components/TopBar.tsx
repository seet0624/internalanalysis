import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, Bot, Box, ChevronRight, Filter, Languages, Map, Maximize2, Menu, Minimize2, PanelRight, RotateCcw, Search, ZoomIn, ZoomOut } from 'lucide-react';
import { useStore } from '../lib/store';
import { useLang } from '../lib/i18n';
import { deptById, floorById } from '../lib/company';
import { Avatar, Badge, IconButton } from './ui';
import { cn } from '../lib/cn';
import type { L } from '../types';

const match = (v: L, q: string) => v.zh.toLowerCase().includes(q) || v.en.toLowerCase().includes(q);

function useOutside(ref: React.RefObject<HTMLElement>, close: () => void) {
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) close(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [ref, close]);
}

function SearchBox() {
  const s = useStore();
  const { t, tr } = useLang();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useOutside(box, () => setOpen(false));
  const res = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return null;
    const m = s.model;
    return {
      floors: m.floors.filter((f) => match(f.name, k) || f.code.toLowerCase() === k).slice(0, 3),
      depts: m.departments.filter((d) => match(d.name, k)).slice(0, 5),
      people: m.people.filter((p) => match(p.name, k) || match(p.title, k)).slice(0, 6),
      tasks: m.tasks.filter((x) => match(x.title, k)).slice(0, 4)
    };
  }, [q, s.model]);
  const total = res ? res.floors.length + res.depts.length + res.people.length + res.tasks.length : 0;
  const goFloor = (id: string) => { if (!s.canEnter(id)) { s.flash(t('locked')); return false; } s.setSection('building'); s.selectFloor(id); return true; };
  const done = () => { setOpen(false); setQ(''); };

  return (
    <div ref={box} className="relative min-w-32 flex-1 md:max-w-md">
      <label className="flex h-9 items-center gap-2 rounded-lg border border-line/15 bg-canvas/50 px-3 text-sm focus-within:border-accent/50">
        <Search className="size-4 shrink-0 text-faint" aria-hidden />
        <input value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
          onKeyDown={(e) => { if (e.key === 'Escape') done(); }}
          placeholder={t('search')} aria-label={t('search')}
          className="min-w-0 flex-1 bg-transparent text-fg placeholder:text-faint focus:outline-none" />
        <kbd className="hidden rounded border border-line/20 px-1.5 text-[10px] text-faint xl:inline">/</kbd>
      </label>
      {open && res && (
        <div className="glass absolute left-0 right-0 top-11 z-50 max-h-[70vh] animate-slideUp overflow-y-auto rounded-xl p-1.5" role="listbox">
          {total === 0 && <div className="px-3 py-4 text-center text-sm text-faint">{t('noResults')}</div>}
          {res.floors.map((f) => (
            <button key={f.id} type="button" className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-elevated" onClick={() => { goFloor(f.id); done(); }}>
              <span className="grid h-6 w-8 place-items-center rounded text-[10px] font-bold text-canvas" style={{ background: f.accent }}>{f.code}</span>{tr(f.name)}
            </button>
          ))}
          {res.depts.map((d) => (
            <button key={d.id} type="button" className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-elevated"
              onClick={() => { if (goFloor(d.floor)) s.selectDept(d.id); done(); }}>
              <span className="size-2.5 rounded-full" style={{ background: d.color }} />{tr(d.name)}<span className="ml-auto text-2xs text-faint">{d.floor}</span>
            </button>
          ))}
          {res.people.map((p) => {
            const d = deptById(s.model, p.dept);
            return (
              <button key={p.id} type="button" className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm hover:bg-elevated"
                onClick={() => { if (d && goFloor(d.floor)) { s.selectDept(d.id); s.selectPerson(p.id); } else s.selectPerson(p.id); done(); }}>
                <Avatar person={p} size="sm" />
                <span className="min-w-0 flex-1 truncate">{tr(p.name)} <span className="text-faint">· {tr(p.title)}</span></span>
                {p.type === 'ai' && <Badge tone="ai">AI</Badge>}
              </button>
            );
          })}
          {res.tasks.map((x) => (
            <button key={x.id} type="button" className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-elevated" onClick={() => { s.setSection('tasks'); done(); }}>
              <span className="text-2xs text-faint">{t('tasks')}</span><span className="truncate">{tr(x.title)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function FiltersMenu() {
  const s = useStore();
  const { t, tr } = useLang();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useOutside(box, () => setOpen(false));
  const active = !s.filters.humans || !s.filters.ai || s.filters.dept !== 'all';
  return (
    <div ref={box} className="relative hidden sm:block">
      <IconButton label={t('filters')} active={active || open} onClick={() => setOpen((v) => !v)}><Filter className="size-4" /></IconButton>
      {open && (
        <div className="glass absolute right-0 top-11 z-50 w-64 animate-slideUp rounded-xl p-3 text-sm">
          <div className="mb-2 text-2xs font-semibold uppercase tracking-wider text-muted">{t('filters')}</div>
          {(['humans', 'ai'] as const).map((k) => (
            <label key={k} className="flex cursor-pointer items-center justify-between rounded-lg px-1 py-1.5 hover:bg-elevated/50">
              {k === 'humans' ? t('showHumans') : t('showAI')}
              <input type="checkbox" checked={s.filters[k]} onChange={(e) => s.setFilters({ [k]: e.target.checked })} className="size-4 accent-[rgb(var(--accent))]" />
            </label>
          ))}
          <select value={s.filters.dept} onChange={(e) => s.setFilters({ dept: e.target.value })} aria-label={t('department')}
            className="mt-2 w-full rounded-lg border border-line/20 bg-canvas px-2 py-1.5 text-sm">
            <option value="all">{t('allDepts')}</option>
            {s.model.departments.map((d) => <option key={d.id} value={d.id}>{d.floor} · {tr(d.name)}</option>)}
          </select>
        </div>
      )}
    </div>
  );
}

function Notifications() {
  const s = useStore();
  const { t, tr } = useLang();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useOutside(box, () => setOpen(false));
  const items = s.model.messages.filter((m) => m.ch === 'notice' || m.real).slice(0, 8);
  const alerts = s.model.insights.filter((i) => i.kind === 'alert');
  return (
    <div ref={box} className="relative">
      <IconButton label={t('notifications')} active={open} onClick={() => setOpen((v) => !v)}>
        <Bell className="size-4" />
        {(alerts.length + (s.lastEvent ? 1 : 0)) > 0 && <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-danger ring-2 ring-surface" />}
      </IconButton>
      {open && (
        <div className="glass absolute right-0 top-11 z-50 w-80 animate-slideUp rounded-xl p-2">
          <div className="px-2 py-1 text-2xs font-semibold uppercase tracking-wider text-muted">{t('notifications')}</div>
          <ul className="max-h-96 space-y-1 overflow-y-auto">
            {alerts.map((a) => (
              <li key={a.id} className="rounded-lg bg-danger/8 px-2.5 py-2 text-xs text-fg">
                <span className="mr-1 font-semibold text-danger">{a.floor}</span>{tr(a.text)} {a.demo && <Badge tone="demo">{t('demo')}</Badge>}
              </li>
            ))}
            {items.map((m) => (
              <li key={m.id} className="rounded-lg px-2.5 py-2 text-xs text-muted hover:bg-elevated/50">
                {tr(m.text)} {m.real ? <Badge tone="real">{t('real')}</Badge> : m.demo ? <Badge tone="demo">{t('demo')}</Badge> : null}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function TopBar({ onMenu, onIntel, intelOpen }: { onMenu: () => void; onIntel: () => void; intelOpen: boolean }) {
  const s = useStore();
  const { t, tr, lang, setLang } = useLang();
  const [fs, setFs] = useState(false);
  useEffect(() => {
    const h = () => setFs(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);
  const toggleFs = () => { if (document.fullscreenElement) void document.exitFullscreen(); else void document.documentElement.requestFullscreen?.(); };
  const f = s.floor ? floorById(s.model, s.floor) : null;
  const d = s.dept ? deptById(s.model, s.dept) : null;

  return (
    <header className="glass relative z-30 flex h-14 shrink-0 items-center gap-2 rounded-none border-x-0 border-t-0 px-2 md:px-3">
      <IconButton label="Menu" onClick={onMenu} className="lg:hidden"><Menu className="size-5" /></IconButton>
      <nav className="hidden min-w-0 items-center gap-1 text-sm 2xl:flex" aria-label="breadcrumb">
        <button type="button" onClick={() => { s.selectFloor(null); s.selectPerson(null); }} className={cn('whitespace-nowrap rounded-md px-1.5 py-1 hover:text-fg', f ? 'text-muted' : 'font-semibold text-fg')}>{t('wholeBuilding')}</button>
        {f && <><ChevronRight className="size-3.5 text-faint" /><button type="button" onClick={() => s.selectDept(null)} className={cn('whitespace-nowrap rounded-md px-1.5 py-1', d ? 'text-muted hover:text-fg' : 'font-semibold')}>{f.code}</button></>}
        {d && <><ChevronRight className="size-3.5 text-faint" /><span className="max-w-40 truncate font-semibold">{tr(d.name)}</span></>}
      </nav>
      <SearchBox />
      <div className="ml-auto flex items-center gap-0.5 md:gap-1">
        <select value={s.floor ?? ''} aria-label={t('floor')}
          onChange={(e) => { const v = e.target.value || null; if (v && !s.canEnter(v)) { s.flash(t('locked')); return; } s.selectFloor(v); s.selectPerson(null); }}
          className="hidden h-9 w-40 rounded-lg border border-line/15 bg-canvas/50 px-2 text-sm text-fg md:block 2xl:w-48">
          <option value="">{t('wholeBuilding')}</option>
          {[...s.model.floors].sort((a, b) => b.level - a.level).map((x) => <option key={x.id} value={x.id}>{x.code} · {tr(x.name).replace(/^\w+ · /, '')}</option>)}
        </select>
        <div className="hidden rounded-lg border border-line/15 bg-canvas/50 p-0.5 md:flex" role="group" aria-label="3D / 2D">
          {(['3d', '2d'] as const).map((m) => (
            <button key={m} type="button" aria-pressed={s.mode === m} title={m === '3d' ? t('view3d') : t('view2d')}
              onClick={() => { if (m === '2d' && !s.floor) { const first = s.canEnter('2F') ? '2F' : null; if (first) s.selectFloor(first); } s.setMode(m); }}
              className={cn('flex h-7 items-center gap-1 rounded-md px-2 text-xs transition-colors', s.mode === m ? 'bg-accent/15 font-semibold text-accent' : 'text-muted hover:text-fg')}>
              {m === '3d' ? <Box className="size-3.5" /> : <Map className="size-3.5" />}<span className="whitespace-nowrap">{m === '3d' ? '3D' : '2D'}</span>
            </button>
          ))}
        </div>
        <IconButton label={t('zoomIn')} onClick={() => s.camera('zoomIn')} className="hidden xl:inline-grid"><ZoomIn className="size-4" /></IconButton>
        <IconButton label={t('zoomOut')} onClick={() => s.camera('zoomOut')} className="hidden xl:inline-grid"><ZoomOut className="size-4" /></IconButton>
        <IconButton label={t('resetCam')} onClick={() => s.camera('reset')}><RotateCcw className="size-4" /></IconButton>
        <IconButton label={t('fullscreen')} onClick={toggleFs} className="hidden xl:inline-grid">{fs ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}</IconButton>
        <FiltersMenu />
        <IconButton label={t('language')} onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')} className="hidden sm:inline-grid">
          <span className="flex items-center gap-0.5 text-[11px] font-bold"><Languages className="size-3.5" />{lang === 'zh' ? 'EN' : '中'}</span>
        </IconButton>
        <Notifications />
        <button type="button" onClick={() => s.setAssistantOpen(!s.assistantOpen)} aria-pressed={s.assistantOpen}
          aria-label={t('aiAssistant')} title={t('aiAssistant')} className="ml-1 hidden h-9 items-center gap-1.5 rounded-lg bg-gradient-to-r from-brand to-accent px-3 text-sm font-semibold text-canvas shadow-glow transition-transform active:scale-95 sm:flex">
          <Bot className="size-4" /><span className="hidden whitespace-nowrap 2xl:inline">{t('aiAssistant')}</span>
        </button>
        <IconButton label={t('intel')} onClick={onIntel} active={intelOpen} className="xl:hidden"><PanelRight className="size-4" /></IconButton>
      </div>
    </header>
  );
}
