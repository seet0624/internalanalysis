import { Settings } from 'lucide-react';
import type { ReactNode } from 'react';
import { useStore } from '../lib/store';
import { useLang } from '../lib/i18n';
import { ViewShell } from './ViewShell';
import { cn } from '../lib/cn';

function Row({ label, children }: { label: string; children: ReactNode }) {
  return <div className="flex items-center justify-between gap-4 border-b border-line/5 py-3 text-sm"><span>{label}</span>{children}</div>;
}
function Seg<T extends string>({ value, options, onChange }: { value: T; options: { v: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex rounded-lg border border-line/15 bg-canvas/50 p-0.5">
      {options.map((o) => (
        <button key={o.v} type="button" aria-pressed={value === o.v} onClick={() => onChange(o.v)}
          className={cn('rounded-md px-3 py-1 text-xs', value === o.v ? 'bg-accent/15 font-semibold text-accent' : 'text-muted hover:text-fg')}>{o.label}</button>
      ))}
    </div>
  );
}
function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
      className={cn('relative h-6 w-11 rounded-full transition-colors', on ? 'bg-accent' : 'bg-line/25')}>
      <span className={cn('absolute top-0.5 size-5 rounded-full bg-surface shadow transition-transform', on ? 'translate-x-5' : 'translate-x-0.5')} />
    </button>
  );
}

export function SettingsView() {
  const s = useStore();
  const { t, lang, setLang } = useLang();
  return (
    <ViewShell title={t('settingsTitle')} icon={<Settings className="size-5" />}>
      <div className="max-w-xl">
        <Row label={t('language')}><Seg value={lang} onChange={setLang} options={[{ v: 'zh', label: '中文' }, { v: 'en', label: 'English' }]} /></Row>
        <Row label={t('quality')}><Seg value={s.settings.quality} onChange={(v) => s.setSettings({ quality: v })} options={[{ v: 'ultra', label: '极致' }, { v: 'balanced', label: '标准' }, { v: 'low', label: t('qLow') }]} /></Row>
        <Row label={t('showLabels')}><Toggle label={t('showLabels')} on={s.settings.labels} onChange={(v) => s.setSettings({ labels: v })} /></Row>
        <Row label={t('showSeatIds')}><Toggle label={t('showSeatIds')} on={s.settings.seatIds} onChange={(v) => s.setSettings({ seatIds: v })} /></Row>
        <Row label={t('autoRotate')}><Toggle label={t('autoRotate')} on={s.settings.autoRotate} onChange={(v) => s.setSettings({ autoRotate: v })} /></Row>
        <p className="mt-4 text-xs leading-relaxed text-faint">{t('demoNote')}</p>
        <a href="../" className="mt-3 inline-block text-xs text-accent hover:underline">← {t('oldHQ')}</a>
      </div>
    </ViewShell>
  );
}
