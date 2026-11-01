// 整栋大楼：七层楼叠起来（剖面）、地面、地下室的坑、四角发光柱、楼层标签。
import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { Lock } from 'lucide-react';
import { useStore } from '../lib/store';
import { useLang } from '../lib/i18n';
import { peopleOfFloor, tasksOfFloor } from '../lib/company';
import { FloorModel } from './FloorModel';
import { D, GAP, SLAB, W, floorY } from './constants';
import { cn } from '../lib/cn';

function Ground() {
  const geo = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-90, -90); s.lineTo(90, -90); s.lineTo(90, 90); s.lineTo(-90, 90); s.lineTo(-90, -90);
    const h = new THREE.Path();
    const hw = W / 2 + 0.5, hd = D / 2 + 0.5;
    h.moveTo(-hw, -hd); h.lineTo(-hw, hd); h.lineTo(hw, hd); h.lineTo(hw, -hd); h.lineTo(-hw, -hd);
    s.holes.push(h);
    return new THREE.ShapeGeometry(s);
  }, []);
  const y = -SLAB - 0.03;
  return (
    <group>
      <mesh geometry={geo} rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} raycast={() => null}>
        <meshStandardMaterial color="#070E22" roughness={0.95} transparent opacity={0.92} />
      </mesh>
      <gridHelper args={[180, 90, '#13306A', '#0C1E45']} position={[0, y + 0.01, 0]} />
      {/* 马路 + 人行道发光线 */}
      <mesh position={[0, y + 0.02, D / 2 + 7]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
        <planeGeometry args={[180, 6]} />
        <meshStandardMaterial color="#0B1530" roughness={0.9} />
      </mesh>
      {[-1, 1].map((k) => (
        <mesh key={k} position={[0, y + 0.03, D / 2 + 7 + k * 3]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
          <planeGeometry args={[180, 0.08]} />
          <meshBasicMaterial color="#1D4ED8" toneMapped={false} />
        </mesh>
      ))}
      {/* 地下室的坑：后、左两面墙 */}
      <mesh position={[0, -GAP / 2 - SLAB, -D / 2 - 0.55]} raycast={() => null}>
        <boxGeometry args={[W + 1.2, GAP, 0.1]} />
        <meshStandardMaterial color="#0A1430" roughness={0.9} />
      </mesh>
      <mesh position={[-W / 2 - 0.55, -GAP / 2 - SLAB, 0]} raycast={() => null}>
        <boxGeometry args={[0.1, GAP, D + 1.2]} />
        <meshStandardMaterial color="#0A1430" roughness={0.9} />
      </mesh>
      {/* 广场上的树 */}
      {[[-W / 2 - 4, D / 2 + 2.5], [-W / 2 - 10, -2], [W / 2 + 5, -D / 2 - 3], [W / 2 + 9, 4], [-6, -D / 2 - 5], [12, -D / 2 - 6], [W / 2 + 4, D / 2 + 2]].map(([x, z], i) => (
        <group key={i} position={[x, y, z]}>
          <mesh position={[0, 0.8, 0]} raycast={() => null}><cylinderGeometry args={[0.12, 0.16, 1.6, 8]} /><meshStandardMaterial color="#4B3A2A" /></mesh>
          <mesh position={[0, 2.2, 0]} raycast={() => null}><sphereGeometry args={[1.1, 14, 10]} /><meshStandardMaterial color="#1F7A52" roughness={0.8} /></mesh>
        </group>
      ))}
    </group>
  );
}

// 四角的发光柱，让七层楼看起来是同一栋
function Frame() {
  const minY = floorY(-1) - SLAB, maxY = floorY(5) + 3;
  const h = maxY - minY;
  return (
    <group>
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
        <mesh key={i} position={[sx * (W / 2 + 0.3), minY + h / 2, sz * (D / 2 + 0.3)]} raycast={() => null}>
          <boxGeometry args={[0.14, h, 0.14]} />
          <meshBasicMaterial color={i === 3 ? '#22D3EE' : '#1E40AF'} toneMapped={false} transparent opacity={0.8} />
        </mesh>
      ))}
    </group>
  );
}

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
          <Html key={f.id} position={[W / 2 + 1.2, floorY(f.level) + 1.4, D / 2 + 0.4]} zIndexRange={[8, 0]} className="tag3d click">
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
  return (
    <group>
      <Ground />
      <Frame />
      {s.model.floors.map((f) => <FloorModel key={f.id} floor={f} />)}
      <FloorMarkers />
    </group>
  );
}
