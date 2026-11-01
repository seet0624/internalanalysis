import { FolderKanban } from 'lucide-react';
import { useStore } from '../lib/store';
import { useLang } from '../lib/i18n';
import { deptById, personById } from '../lib/company';
import { Avatar, Badge, Progress } from '../components/ui';
import { ViewShell } from './ViewShell';

const TONE = { 'on-track': 'accent', 'at-risk': 'demo', blocked: 'danger', done: 'real' } as const;
const KEY = { 'on-track': 'pj_on_track', 'at-risk': 'pj_at_risk', blocked: 'pj_blocked', done: 'pj_done' } as const;

export function ProjectsView() {
  const s = useStore();
  const { t, tr } = useLang();
  return (
    <ViewShell title={t('nav_projects')} icon={<FolderKanban className="size-5" />}>
      <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
        {s.model.projects.map((p) => {
          const lead = personById(s.model, p.lead);
          const tasks = s.model.tasks.filter((x) => x.project === p.id);
          return (
            <article key={p.id} className="rounded-xl border border-line/10 bg-elevated/30 p-4">
              <div className="flex items-start gap-2">
                <h3 className="flex-1 text-sm font-semibold">{tr(p.name)}</h3>
                <Badge tone={TONE[p.status]}>{t(KEY[p.status])}</Badge>
                {p.demo && <Badge tone="demo">{t('demo')}</Badge>}
              </div>
              <div className="mt-3 flex items-center gap-2"><Progress value={p.progress} tone={p.status === 'at-risk' ? 'warn' : 'accent'} /><span className="num text-sm font-semibold">{p.progress}%</span></div>
              <div className="mt-3 flex flex-wrap gap-1">{p.depts.map((d) => { const dd = deptById(s.model, d); return dd ? <Badge key={d}><span className="size-1.5 rounded-full" style={{ background: dd.color }} />{tr(dd.name).split(' · ')[0]}</Badge> : null; })}</div>
              <div className="mt-3 flex items-center justify-between text-xs text-muted">
                {lead && <button type="button" onClick={() => s.selectPerson(lead.id)} className="flex items-center gap-1.5 hover:text-fg"><Avatar person={lead} size="sm" />{t('lead')} · {tr(lead.name)}</button>}
                <span className="num">{t('due')} {p.due.slice(5)} · {tasks.length} {t('tasks')}</span>
              </div>
            </article>
          );
        })}
      </div>
    </ViewShell>
  );
}
