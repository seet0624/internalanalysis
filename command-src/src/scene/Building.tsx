// 整栋大楼：七层楼叠起来（剖面）、地面、地下室的坑、四角发光柱、楼层标签。
import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { Lock } from 'lucide-react';
import { useStore } from '../lib/store';
import { useLang } from '../lib/i18n';
import { peopleOfFloor, tasksOfFloor } from '../lib/company';
import { FloorModel } from './FloorModel';
import { Street } from './Street';
import { TreeField, useWind, type TreeSpot } from './Trees';
import { surfaceTexture } from './textures';
import { useFrame } from '@react-three/fiber';
import { buildEntrance, buildPlaza } from '../../../hq/campus.js';
import { D, GAP, SLAB, W, floorY } from './constants';
import { cn } from '../lib/cn';

// 园区：广场石材、草坪、马路、真实的树
const SITE_TREES: TreeSpot[] = (() => {
  const out: TreeSpot[] = [];
  const y = -SLAB - 0.03;
  // 镜头从右前方看，树种在马路对面、大楼后面和左边，不会挡住楼层
  for (let x = -60; x <= 60; x += 7) out.push({ x, y, z: D / 2 + 17.5, kind: 'ash', h: 6 + ((x * 13) % 3 + 3) % 3 * 0.6, ry: x });
  const groups: [number, number, TreeSpot['kind'], number][] = [
    [-W / 2 - 6, -4, 'oak', 7.5], [-W / 2 - 10, 3, 'aspen', 8], [-W / 2 - 7, 8, 'pine', 7], [-W / 2 - 13, -9, 'oak', 8.5],
    [W / 2 + 7, -12, 'pine', 7.5], [W / 2 + 14, -8, 'ash', 7],
    [-10, -D / 2 - 7, 'oak', 8], [2, -D / 2 - 9, 'pine', 8.5], [12, -D / 2 - 7, 'aspen', 7.5], [-20, -D / 2 - 10, 'ash', 7], [24, -D / 2 - 8, 'oak', 8]
  ];
  for (const [x, z, kind, h] of groups) out.push({ x, y, z, kind, h, ry: x + z });
  // 大楼边的绿篱
  for (let x = -W / 2 + 1; x < W / 2; x += 1.6) out.push({ x, y, z: -D / 2 - 1.6, kind: 'bush', h: 1.1, ry: x });
  for (let z = -D / 2 + 1; z < D / 2; z += 1.6) out.push({ x: -W / 2 - 1.6, y, z, kind: 'bush', h: 1.1, ry: z });
  return out;
})();

// 大门 + 门前广场：对着 1F 接待柜台（跟首页同一个 hq/campus.js）
function Entrance() {
  const parts = useMemo(() => {
    const ent = buildEntrance({ width: 6.4, height: 3.1, logoUrl: '../hq/brand/shuyi-logo-512.png' });
    const plaza = buildPlaza({ width: 22, depth: 4.6 });
    const g = new THREE.Group();
    ent.group.position.set(0, 0, 0.35); g.add(ent.group, plaza.group);
    g.position.set(-8, -SLAB + 0.02, D / 2);
    return { g, ent };
  }, []);
  useFrame(({ clock }) => parts.ent.update(clock.elapsedTime));
  return <primitive object={parts.g} />;
}

function Ground({ trees }: { trees: boolean }) {
  const y = -SLAB - 0.03;
  const geo = useMemo(() => {
    const ring = (hw: number, hd: number, ow: number, od: number) => {
      const s = new THREE.Shape();
      s.moveTo(-ow, -od); s.lineTo(ow, -od); s.lineTo(ow, od); s.lineTo(-ow, od); s.lineTo(-ow, -od);
      const h = new THREE.Path();
      h.moveTo(-hw, -hd); h.lineTo(-hw, hd); h.lineTo(hw, hd); h.lineTo(hw, -hd); h.lineTo(-hw, -hd);
      s.holes.push(h);
      return new THREE.ShapeGeometry(s);
    };
    return { far: ring(W / 2 + 7, D / 2 + 6, 120, 120), plaza: ring(W / 2 + 0.5, D / 2 + 0.5, W / 2 + 7, D / 2 + 6) };
  }, []);
  // ShapeGeometry 的 UV 就是公尺：重复 = 1 / 砖的大小
  const plazaTex = useMemo(() => { const t = surfaceTexture('stone', 1, 1); t.repeat.set(1 / 3, 1 / 3); return t; }, []);
  return (
    <group>
      <mesh geometry={geo.far} rotation={[-Math.PI / 2, 0, 0]} position={[0, y - 0.01, 0]} raycast={() => null}>
        <meshStandardMaterial color="#DCE5C8" roughness={1} />
      </mesh>
      <mesh geometry={geo.plaza} rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} raycast={() => null}>
        <meshStandardMaterial map={plazaTex} color="#D9CFBE" roughness={0.5} />
      </mesh>
      {/* 马路：柏油 + 白色虚线 */}
      <mesh position={[0, y + 0.015, D / 2 + 11]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
        <planeGeometry args={[240, 8]} />
        <meshStandardMaterial color="#B5ADA0" roughness={0.95} />
      </mesh>
      {Array.from({ length: 40 }, (_, i) => (
        <mesh key={i} position={[-117 + i * 6, y + 0.02, D / 2 + 11]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
          <planeGeometry args={[2.6, 0.16]} />
          <meshBasicMaterial color="#FFFDF8" />
        </mesh>
      ))}
      {/* 地下室的坑：后、左两面墙 */}
      <mesh position={[0, -GAP / 2 - SLAB, -D / 2 - 0.55]} raycast={() => null}>
        <boxGeometry args={[W + 1.2, GAP, 0.1]} />
        <meshStandardMaterial color="#D9D2C5" roughness={0.9} />
      </mesh>
      <mesh position={[-W / 2 - 0.55, -GAP / 2 - SLAB, 0]} raycast={() => null}>
        <boxGeometry args={[0.1, GAP, D + 1.2]} />
        <meshStandardMaterial color="#D9D2C5" roughness={0.9} />
      </mesh>
      {trees && <TreeField spots={SITE_TREES} />}
      {trees && <Entrance />}
      {trees && <Street />}
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
          <Html key={f.id} position={[W / 2 + 9, floorY(f.level) + 1.6, -1]} zIndexRange={[8, 0]} className="tag3d click">
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
      {/* 看单层楼（2F 以上）时园区的树会挡到，先藏起来 */}
      <Ground trees={!s.floor || (s.model.floors.find((f) => f.id === s.floor)?.level ?? 0) <= 0} />
      {/* 客服中国仪表板：只有 2F（看不到其他楼层）；老板：整栋 */}
      {s.model.floors.filter((f) => !s.csView || f.id === '2F').map((f) => <FloorModel key={f.id} floor={f} />)}
      {!s.csView && <FloorMarkers />}
    </group>
  );
}
