// 「功能」：客服一打开就看到。审核工具最大、放最上面，点了直接进去。
import { useMemo, useState } from 'react';
import { ArrowRight, BookOpen, Building2, Check, ClipboardCheck, Copy, FileSpreadsheet, LayoutGrid, Sparkles } from 'lucide-react';
import { useStore } from '../lib/store';
import { useAgo, useLang } from '../lib/i18n';
import { buildFeatures, lastRun, type Feature, type FeatureGroup } from '../lib/features';
import { Badge } from '../components/ui';
import { ViewShell } from './ViewShell';

const GROUPS: FeatureGroup[] = ['review', 'docs', 'claude', 'dept'];

function ReviewCard({ f }: { f: Feature }) {
  const s = useStore();
  const { t, tr } = useLang();
  const ago = useAgo();
  const run = lastRun(f.tool, s.model.events);
  const Icon = f.tool === 'name' ? ClipboardCheck : FileSpreadsheet;
  return (
    <a href={f.href} className="group relative flex flex-col overflow-hidden rounded-2xl border border-brand/40 bg-gradient-to-br from-brand/15 via-elevated/60 to-surface p-5 transition-[border-color,transform] duration-200 hover:border-accent active:scale-[0.99]">
      <div className="flex items-start gap-4">
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-brand text-canvas shadow-glow"><Icon className="size-7" aria-hidden /></span>
        <div className="min-w-0 flex-1">
          <h3 className="text-xl font-bold tracking-wide">{tr(f.name)}</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted">{tr(f.desc)}</p>
        </div>
      </div>
      {f.steps && (
        <ol className="mt-4 grid grid-cols-3 gap-2" aria-label={t('howTo')}>
          {f.steps.map((st, i) => (
            <li key={i} className="rounded-xl border border-line/10 bg-canvas/40 px-2.5 py-2 text-xs leading-snug">
              <span className="num mr-1 font-bold text-accent">{i + 1}</span>{tr(st)}
            </li>
          ))}
        </ol>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-base font-bold text-canvas transition-colors group-hover:bg-accent">
          {t('startReview')}<ArrowRight className="size-5 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1 text-xs text-faint">
          {run ? <>{t('lastRun')} · {ago(run.ago)} · {t('todayRuns').replace('{n}', String(run.today))}<span className="block truncate text-muted">{tr(run.text)}</span></> : t('neverRun')}
        </span>
      </div>
    </a>
  );
}

function DocCard({ f }: { f: Feature }) {
  const { t, tr } = useLang();
  return (
    <a href={f.href} className="group flex items-start gap-3 rounded-xl border border-line/10 bg-elevated/40 p-4 transition-colors hover:border-accent/50">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand/15 text-accent"><BookOpen className="size-5" aria-hidden /></span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{tr(f.name)}</span>
        <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-muted">{tr(f.desc)}</span>
      </span>
      <span className="self-center text-xs font-semibold text-accent opacity-80 group-hover:opacity-100">{t('openDoc')} →</span>
    </a>
  );
}

function SkillCard({ f }: { f: Feature }) {
  const s = useStore();
  const { t, tr } = useLang();
  const [done, setDone] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(`/${f.skill}`); setDone(true); window.setTimeout(() => setDone(false), 1600); }
    catch { s.flash(`/${f.skill}`); }
  };
  return (
    <button type="button" onClick={copy} className="group flex items-start gap-3 rounded-xl border border-line/10 bg-elevated/40 p-4 text-left transition-colors hover:border-accent/50">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-ai/15 text-ai"><Sparkles className="size-5" aria-hidden /></span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-1.5 font-semibold">{tr(f.name)}{f.owner && <Badge tone="ai">{tr(f.owner)}</Badge>}</span>
        <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-muted">{tr(f.desc)}</span>
        <code className="mt-1.5 block truncate font-mono text-2xs text-faint">/{f.skill}</code>
      </span>
      <span className="flex items-center gap-1 self-center whitespace-nowrap text-xs font-semibold text-accent">
        {done ? <><Check className="size-3.5" />{t('copied')}</> : <><Copy className="size-3.5" />{t('copySkill')}</>}
      </span>
    </button>
  );
}

export function FeaturesView() {
  const s = useStore();
  const { t } = useLang();
  const features = useMemo(() => buildFeatures(s.role), [s.role]);
  const goBuilding = () => { if (s.role === 'cs') s.selectFloor('2F'); s.setSection(s.role === 'cs' ? 'building' : 'overview'); };
  return (
    <ViewShell title={t('nav_features')} icon={<LayoutGrid className="size-5" />}
      actions={<button type="button" onClick={goBuilding} className="flex items-center gap-1.5 rounded-lg border border-line/15 px-3 py-1.5 text-xs text-muted hover:border-accent/50 hover:text-fg"><Building2 className="size-4" />{t('viewBuilding')}</button>}>
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-wide md:text-3xl">
            {t('featuresCount').split('{n}')[0]}<span className="num text-accent">{features.length}</span>{t('featuresCount').split('{n}')[1]}
          </h2>
          <p className="mt-1 text-sm text-muted">{t('featuresHint')}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {GROUPS.map((g) => {
              const n = features.filter((f) => f.group === g).length;
              return n ? <a key={g} href={`#fg-${g}`} className="rounded-full border border-line/15 px-3 py-1 text-xs text-muted hover:border-accent/50 hover:text-fg">{t(`fg_${g}`)} <span className="num font-semibold text-accent">{n}</span></a> : null;
            })}
          </div>
        </div>
        {GROUPS.map((g) => {
          const list = features.filter((f) => f.group === g);
          if (!list.length) return null;
          return (
            <section key={g} id={`fg-${g}`} className="mb-8 scroll-mt-4">
              <h3 className="mb-3 flex items-center gap-2 border-b border-brand/30 pb-2 text-sm font-semibold uppercase tracking-wider text-muted">
                {t(`fg_${g}`)}<span className="num rounded-full bg-brand/15 px-2 text-accent">{list.length}</span>
              </h3>
              {g === 'claude' || g === 'dept' ? <p className="-mt-1 mb-3 text-xs text-faint">{t('claudeHint')}</p> : null}
              <div className={g === 'review' ? 'grid gap-4 lg:grid-cols-2' : 'grid gap-3 md:grid-cols-2 xl:grid-cols-3'}>
                {list.map((f) => g === 'review' ? <ReviewCard key={f.id} f={f} /> : g === 'docs' ? <DocCard key={f.id} f={f} /> : <SkillCard key={f.id} f={f} />)}
              </div>
            </section>
          );
        })}
      </div>
    </ViewShell>
  );
}
