// 整个度假村园区：七栋建筑（原本的七层楼）、园林、每栋头上的名牌。
import { Html } from '@react-three/drei';
import { Lock } from 'lucide-react';
import { useStore } from '../lib/store';
import { useLang } from '../lib/i18n';
import { peopleOfFloor, tasksOfFloor } from '../lib/company';
import { FloorModel } from './FloorModel';
import { Resort } from './Resort';
import { useWind } from './Trees';
import { siteOf } from './constants';
import { cn } from '../lib/cn';

function FloorMarkers() {
  const s = useStore();
  const { tr, t } = useLang();
  if (s.floor || (s.section !== 'overview' && s.section !== 'building')) return null;
  return (
    <>
      {s.model.floors.map((f) => {
        const ppl = peopleOfFloor(s.model, f.id);
        const ai = ppl.filter((p) => p.type === 'ai').length;
        const active = tasksOfFloor(s.model, f.id).filter((x) => x.status === 'active').length;
        const locked = !s.canEnter(f.id);
        const hot = s.hoverFloor === f.id;
        return (
          <Html key={f.id} position={[siteOf(f.id).x, f.id === 'R' ? 4 : 12.5, siteOf(f.id).z]} center zIndexRange={[8, 0]} className="tag3d click">
            <button type="button"
              onMouseEnter={() => s.setHoverFloor(f.id)} onMouseLeave={() => s.setHoverFloor(null)}
              onClick={() => (locked ? s.flash(t('locked')) : s.selectFloor(f.id))}
              className={cn('group flex items-center gap-2 rounded-xl border py-1 pl-1 pr-3 shadow-glass backdrop-blur-md transition-all duration-200',
                hot ? 'translate-x-1 border-accent/60 bg-elevated/95' : 'border-line/20 bg-surface/75')}>
              <span className="grid h-8 min-w-9 place-items-center rounded-lg px-1.5 text-xs font-bold text-canvas" style={{ background: f.accent }}>{f.code}</span>
              <span className="hidden flex-col text-left sm:flex">
                <span className="max-w-56 truncate text-xs font-semibold text-fg">{tr(f.name).replace(/^\w+ · /, '')}</span>
                <span className="num text-2xs text-muted">{ppl.length - ai} {t('people')} · {ai} AI · {active} {t('activeTasks')}</span>
              </span>
              {locked && <Lock className="size-3.5 text-faint" aria-label={t('locked')} />}
            </button>
          </Html>
        );
      })}
    </>
  );
}

export function Building() {
  const s = useStore();
  useWind();
  return (
    <group>
      <Resort />
      {/* 客服中国仪表板：只有 2F（看不到其他楼层）；老板：整栋 */}
      {s.model.floors.filter((f) => !s.csView || f.id === '2F').map((f) => <FloorModel key={f.id} floor={f} />)}
      {!s.csView && <FloorMarkers />}
    </group>
  );
}
