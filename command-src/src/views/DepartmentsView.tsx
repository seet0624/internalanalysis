import { Bot, Lock, Users } from 'lucide-react';
import { useStore } from '../lib/store';
import { useLang } from '../lib/i18n';
import { peopleOfDept } from '../lib/company';
import { Avatar, Badge } from '../components/ui';
import { ViewShell } from './ViewShell';

export function DepartmentsView() {
  const s = useStore();
  const { t, tr } = useLang();
  const floors = [...s.model.floors].sort((a, b) => b.level - a.level);
  const open = (deptId: string, floorId: string) => {
    s.selectPerson(null);
    if (s.canEnter(floorId)) { s.selectFloor(floorId); s.setSection('building'); }
    s.selectDept(deptId);
  };
  return (
    <ViewShell title={t('nav_departments')} icon={<Users className="size-5" />}>
      <div className="space-y-6">
        {floors.map((f) => {
          const depts = s.model.departments.filter((d) => d.floor === f.id);
          if (!depts.length) return null;
          return (
            <section key={f.id}>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <span className="grid h-6 w-9 place-items-center rounded-md text-[10px] font-bold text-canvas" style={{ background: f.accent }}>{f.code}</span>
                {tr(f.name).replace(/^\w+ · /, '')}
                {!s.canEnter(f.id) && <Lock className="size-3.5 text-faint" />}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {depts.map((d) => {
                  const ppl = peopleOfDept(s.model, d.id);
                  const ai = ppl.filter((p) => p.type === 'ai');
                  return (
                    <button key={d.id} type="button" onClick={() => open(d.id, f.id)}
                      className="group rounded-xl border border-line/10 bg-elevated/30 p-3 text-left transition-colors hover:border-accent/40 hover:bg-elevated/60">
                      <div className="flex items-center gap-2">
                        <span className="h-8 w-1 rounded-full" style={{ background: d.color }} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold">{tr(d.name)}</div>
                          <div className="flex items-center gap-2 text-2xs text-faint"><Users className="size-3" />{ppl.length - ai.length}<Bot className="size-3" />{ai.length}</div>
                        </div>
                        {d.team ? <Badge tone="real">{t('real')}</Badge> : <Badge tone="demo">{t('demo')}</Badge>}
                      </div>
                      <p className="mt-2 line-clamp-2 text-xs text-muted">{tr(d.summary)}</p>
                      <div className="mt-2.5 flex -space-x-1.5">{ppl.slice(0, 7).map((p) => <Avatar key={p.id} person={p} size="sm" />)}</div>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </ViewShell>
  );
}
