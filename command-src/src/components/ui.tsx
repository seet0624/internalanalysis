// 小元件：徽章、状态、按钮、头像、进度条、面板标题
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { tv, type VariantProps } from 'tailwind-variants';
import { Bot } from 'lucide-react';
import type { Person, Priority, Status, TaskStatus } from '../types';
import { useLang } from '../lib/i18n';
import { cn } from '../lib/cn';

export const STATUS_TEXT: Record<Status, string> = {
  working: 'text-st-working', available: 'text-st-available', thinking: 'text-st-thinking',
  waiting: 'text-st-waiting', completed: 'text-st-completed', error: 'text-st-error'
};
export const STATUS_BG: Record<Status, string> = {
  working: 'bg-st-working', available: 'bg-st-available', thinking: 'bg-st-thinking',
  waiting: 'bg-st-waiting', completed: 'bg-st-completed', error: 'bg-st-error'
};

export function StatusPill({ status, compact = false }: { status: Status; compact?: boolean }) {
  const { t } = useLang();
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap text-2xs font-medium', STATUS_TEXT[status])}>
      <span className={cn('size-1.5 rounded-full', STATUS_BG[status], (status === 'working' || status === 'thinking') && 'animate-pulseDot')} />
      {!compact && t(`st_${status}`)}
    </span>
  );
}

const badge = tv({
  base: 'inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[10px] font-semibold leading-none tracking-wide',
  variants: {
    tone: {
      demo: 'bg-warn/12 text-warn ring-1 ring-warn/25',
      real: 'bg-ok/12 text-ok ring-1 ring-ok/25',
      ai: 'bg-ai/15 text-ai ring-1 ring-ai/30',
      neutral: 'bg-line/10 text-muted ring-1 ring-line/20',
      accent: 'bg-accent/12 text-accent ring-1 ring-accent/30',
      danger: 'bg-danger/12 text-danger ring-1 ring-danger/30'
    }
  },
  defaultVariants: { tone: 'neutral' }
});
export function Badge({ tone, children, className }: VariantProps<typeof badge> & { children: ReactNode; className?: string }) {
  return <span className={badge({ tone, class: className })}>{children}</span>;
}
export function SourceTag({ demo, real }: { demo?: boolean; real?: boolean }) {
  const { t } = useLang();
  if (real) return <Badge tone="real">{t('real')}</Badge>;
  if (demo) return <Badge tone="demo">{t('demo')}</Badge>;
  return null;
}

const iconBtn = tv({
  base: 'inline-grid shrink-0 place-items-center rounded-lg text-muted transition-[background-color,color,transform] duration-150 hover:bg-elevated hover:text-fg active:scale-95 disabled:pointer-events-none disabled:opacity-40',
  variants: {
    size: { sm: 'size-8', md: 'size-9', lg: 'size-10' },
    active: { true: 'bg-accent/15 text-accent hover:bg-accent/20 hover:text-accent' }
  },
  defaultVariants: { size: 'md' }
});
type IconBtnProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof iconBtn> & { label: string };
export function IconButton({ label, size, active, className, children, ...rest }: IconBtnProps) {
  return (
    <button type="button" aria-label={label} title={label} className={iconBtn({ size, active, class: className })} {...rest}>
      {children}
    </button>
  );
}

const PALETTE = ['#8C6B24', '#5B4A3A', '#4F7A5A', '#7A5A44', '#6B6250', '#A07C30', '#3A3430', '#8E6A4A'];
const hash = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); };

export function Avatar({ person, size = 'md' }: { person: Person; size?: 'sm' | 'md' | 'lg' }) {
  const { tr } = useLang();
  const name = tr(person.name);
  const dim = size === 'sm' ? 'size-7 text-[11px]' : size === 'lg' ? 'size-14 text-lg' : 'size-9 text-xs';
  const ai = person.type === 'ai';
  return (
    <span className={cn('relative inline-grid shrink-0 place-items-center rounded-full font-semibold text-white', dim,
      ai ? 'bg-gradient-to-br from-accent/80 to-ai/80 ring-1 ring-accent/50' : '')}
      style={ai ? undefined : { background: PALETTE[hash(person.id) % PALETTE.length] }}>
      {ai ? <Bot className={size === 'lg' ? 'size-7' : 'size-4'} aria-hidden /> : name.slice(0, 1)}
      <span className={cn('absolute -bottom-0.5 -right-0.5 rounded-full ring-2 ring-surface', STATUS_BG[person.status], size === 'lg' ? 'size-3.5' : 'size-2.5')} />
    </span>
  );
}

export function Progress({ value, tone = 'accent' }: { value: number; tone?: 'accent' | 'warn' | 'danger' | 'ok' }) {
  const bar = { accent: 'from-brand to-accent', warn: 'from-warn/70 to-warn', danger: 'from-danger/70 to-danger', ok: 'from-ok/70 to-ok' }[tone];
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-line/10" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn('h-full rounded-full bg-gradient-to-r transition-[width] duration-500', bar)} style={{ width: `${Math.max(2, Math.min(100, value))}%` }} />
    </div>
  );
}

export function PanelTitle({ icon, children, right }: { icon?: ReactNode; children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2">
      <h3 className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wider text-muted">{icon}{children}</h3>
      {right}
    </div>
  );
}

export const TASK_TONE: Record<TaskStatus, 'accent' | 'warn' | 'danger' | 'ok' | 'neutral'> = {
  pending: 'neutral', active: 'accent', review: 'warn', completed: 'ok', blocked: 'danger'
};
export const PRIORITY_DOT: Record<Priority, string> = { low: 'bg-faint', medium: 'bg-brand', high: 'bg-warn', urgent: 'bg-danger' };

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const { t } = useLang();
  const tone = TASK_TONE[status];
  return <Badge tone={tone === 'ok' ? 'real' : tone === 'warn' ? 'demo' : tone}>{t(`ts_${status}`)}</Badge>;
}

export function Kpi({ label, value, icon, tone = 'text-fg', sub }: { label: string; value: ReactNode; icon: ReactNode; tone?: string; sub?: ReactNode }) {
  return (
    <div className="rounded-xl border border-line/10 bg-elevated/40 p-2.5">
      <div className="flex items-center gap-1.5 text-2xs text-muted">{icon}{label}</div>
      <div className={cn('num mt-1 text-xl font-semibold leading-none', tone)}>{value}</div>
      {sub && <div className="mt-1 text-2xs text-faint">{sub}</div>}
    </div>
  );
}
