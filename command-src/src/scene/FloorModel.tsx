// 一层楼：楼板、房间地砖、玻璃隔间、家具（InstancedMesh）、员工、标签。
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Floor, Person } from '../types';
import { useStore } from '../lib/store';
import { useLang } from '../lib/i18n';
import { buildFloorLayout } from './layout';
import { Batch } from './Batch';
import { Avatars, STATUS_COLOR, type Placement } from './Avatars';
import { D, SLAB, W, WALL_H, floorY } from './constants';
import { GEO, damp, makeFloorMats, setFloorOpacity } from './shared';
import { surfaceTexture } from './textures';
import { TreeField } from './Trees';
import { cn } from '../lib/cn';

const invisible = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false });

export function FloorModel({ floor }: { floor: Floor }) {
  const s = useStore();
  const { tr, t } = useLang();
  const m = s.model;
  const deptColor = (id?: string) => m.departments.find((d) => d.id === id)?.color;
  const layout = useMemo(() => buildFloorLayout(floor, deptColor), [floor]); // eslint-disable-line react-hooks/exhaustive-deps
  const mats = useMemo(makeFloorMats, []);
  const edgeMat = useMemo(() => { const x = new THREE.MeshBasicMaterial({ color: floor.accent, toneMapped: false }); x.userData.base = 1; return x; }, [floor.accent]);
  const tileMats = useMemo(() => layout.tiles.map((tile) => {
    const x = new THREE.MeshStandardMaterial({
      color: tile.color, map: surfaceTexture(tile.surface, tile.w, tile.d, tile.surface === 'wood' ? 3 : 4),
      roughness: tile.surface === 'stone' ? 0.35 : tile.surface === 'wood' ? 0.6 : 0.9, metalness: 0.02
    });
    x.userData.base = 1; x.userData.color = tile.color;
    return x;
  }), [layout]);
  const fadeList = useMemo(() => [...mats.all, edgeMat, ...tileMats], [mats, edgeMat, tileMats]);
  const trees = useRef<THREE.Group>(null);

  // 员工排到自己部门房间的工位上；工位不够就站在房间中间
  const placements = useMemo<Placement[]>(() => {
    const out: Placement[] = [];
    for (const d of m.departments.filter((x) => x.floor === floor.id)) {
      const room = floor.rooms.find((r) => r.id === d.room);
      if (!room) continue;
      const seats = layout.seats[room.id] ?? [];
      const ppl = m.people.filter((p) => p.dept === d.id);
      ppl.forEach((p, i) => {
        const seat = seats[i];
        if (seat) { out.push({ person: p, x: seat.x, z: seat.z, ry: seat.ry, sit: seat.sit, seatId: seat.id }); return; }
        const k = i - seats.length;
        const cx = room.x + room.w / 2 - W / 2, cz = room.z + room.d / 2 - D / 2;
        out.push({ person: p, x: cx - 1.2 + (k % 4) * 0.8, z: cz + room.d / 2 - 1.2 - Math.floor(k / 4) * 0.8, ry: Math.PI, sit: false, seatId: `${floor.code}-${d.id.toUpperCase().slice(0, 4)}-S${k + 1}` });
      });
    }
    return out;
  }, [m.people, m.departments, floor, layout]);

  const visiblePlacements = useMemo(() => placements.filter((p) =>
    (p.person.type === 'human' ? s.filters.humans : s.filters.ai) && (s.filters.dept === 'all' || p.person.dept === s.filters.dept)
  ), [placements, s.filters]);

  const focus = s.floor ? m.floors.find((f) => f.id === s.floor) : null;
  const isSel = focus?.id === floor.id;
  const overview = !focus;
  const above = focus ? floor.level > focus.level : false;
  const targetOffset = overview ? (s.hoverFloor === floor.id ? 0.7 : 0) : above ? 46 : 0;
  // 下面只留紧邻的一层当背景（淡淡的），再下面的都藏起来，免得画面乱
  const targetOpacity = overview ? 1 : isSel ? 1 : above || s.mode === '2d' || floor.level < (focus?.level ?? 0) - 1 ? 0 : 0.07;

  const group = useRef<THREE.Group>(null);
  const cur = useRef({ off: 0, op: 1 });
  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    const k = damp(Math.min(dt, 0.1), 4.5);
    cur.current.off += (targetOffset - cur.current.off) * k;
    cur.current.op += (targetOpacity - cur.current.op) * k;
    if (Math.abs(targetOpacity - cur.current.op) < 0.002) cur.current.op = targetOpacity;
    g.position.y = floorY(floor.level) + cur.current.off;
    g.visible = cur.current.op > 0.01;
    setFloorOpacity(fadeList, cur.current.op);
    if (trees.current) trees.current.visible = cur.current.op > 0.5;   // 树不跟着半透明，淡出时直接藏
  });

  // 选中的部门：地砖亮一点
  useEffect(() => {
    layout.tiles.forEach((tile, i) => {
      const on = s.dept && tile.room.dept === s.dept;
      tileMats[i].color.set(tile.color);
      if (on) tileMats[i].color.lerp(new THREE.Color(deptColor(tile.room.dept) ?? '#D4AF5F'), 0.6);
    });
  }, [s.dept, layout, tileMats]); // eslint-disable-line react-hooks/exhaustive-deps

  const [hovered, setHovered] = useState<Placement | null>(null);
  const enter = () => {
    if (!s.canEnter(floor.id)) { s.flash(t('locked')); return; }
    s.selectFloor(floor.id);
  };
  const accentY = WALL_H + 0.55;
  // 左边选单开了工作面板（任务、AI 员工……）时，3D 标签先藏起来
  const labelsOn = s.section === 'overview' || s.section === 'building';

  return (
    <group ref={group} position={[0, floorY(floor.level), 0]}>
      {/* 楼板 + 发光边 */}
      <mesh geometry={GEO.box} material={mats.slab} position={[0, -SLAB / 2, 0]} scale={[W + 0.6, SLAB, D + 0.6]} raycast={() => null} />
      {[[0, D / 2 + 0.3, W + 0.6, 0.06], [0, -D / 2 - 0.3, W + 0.6, 0.06], [W / 2 + 0.3, 0, 0.06, D + 0.6], [-W / 2 - 0.3, 0, 0.06, D + 0.6]].map(([x, z, sx, sz], i) => (
        <mesh key={i} geometry={GEO.box} material={edgeMat} position={[x, -0.02, z]} scale={[sx, 0.05, sz]} raycast={() => null} />
      ))}
      {/* 房间地砖（选楼层后可以点部门） */}
      {layout.tiles.map((tile, i) => (
        <mesh key={tile.room.id} geometry={GEO.box} material={tileMats[i]} position={[tile.x, 0.01, tile.z]} scale={[tile.w, 0.02, tile.d]}
          raycast={isSel ? undefined : () => null}
          onClick={isSel && tile.room.dept ? (e) => { e.stopPropagation(); s.selectDept(tile.room.dept ?? null); s.selectPerson(null); } : undefined}
          onPointerOver={isSel && tile.room.dept ? () => { document.body.style.cursor = 'pointer'; } : undefined}
          onPointerOut={isSel ? () => { document.body.style.cursor = ''; } : undefined}
        />
      ))}
      <Batch prims={layout.box} geometry={GEO.box} material={mats.std} />
      <Batch prims={layout.cyl} geometry={GEO.cyl} material={mats.std} />
      <Batch prims={layout.sph} geometry={GEO.sph} material={mats.std} />
      <Batch prims={layout.glow} geometry={GEO.box} material={mats.glow} />
      <Batch prims={layout.glowCyl} geometry={GEO.cyl} material={mats.glow} />
      <Batch prims={layout.glass} geometry={GEO.box} material={mats.glass} />
      {layout.trees.length > 0 && <group ref={trees}><TreeField spots={layout.trees} /></group>}

      <Avatars placements={visiblePlacements} mats={mats} active={overview || isSel} selected={isSel ? s.person : null}
        onPick={(id) => { if (isSel) { s.selectPerson(id); } }} onHover={isSel ? setHovered : () => undefined} />

      {/* 整栋大楼时：一整层是一个点击区 */}
      {overview && (
        <mesh geometry={GEO.box} material={invisible} position={[0, (WALL_H + 0.8) / 2 - SLAB, 0]} scale={[W + 0.6, WALL_H + 0.8, D + 0.6]}
          onClick={(e) => { e.stopPropagation(); enter(); }}
          onPointerOver={(e) => { e.stopPropagation(); s.setHoverFloor(floor.id); document.body.style.cursor = 'pointer'; }}
          onPointerOut={() => { s.setHoverFloor(null); document.body.style.cursor = ''; }}
        />
      )}

      {/* 部门 / 房间标签 */}
      {isSel && labelsOn && s.settings.labels && layout.labels.map(({ room, x, z }) => {
        const d = room.dept ? m.departments.find((dd) => dd.id === room.dept) : undefined;
        if (!d) {
          return (
            <Html key={room.id} position={[x, accentY - 0.3, z]} center zIndexRange={[6, 0]} className="tag3d">
              <div className="rounded-md border border-line/20 bg-canvas/70 px-2 py-0.5 text-2xs text-muted backdrop-blur">{tr(room.name)}</div>
            </Html>
          );
        }
        const ppl = placements.filter((p) => p.person.dept === d.id);
        const ai = ppl.filter((p) => p.person.type === 'ai').length;
        const seats = layout.seats[room.id]?.length ?? 0;
        const busy = ppl.filter((p) => p.person.status === 'working' || p.person.status === 'thinking').length;
        const err = ppl.some((p) => p.person.status === 'error');
        const on = s.dept === d.id;
        return (
          <Html key={room.id} position={[x, accentY, z]} center zIndexRange={[7, 0]} className="tag3d click">
            <button type="button" onClick={() => { s.selectDept(d.id); s.selectPerson(null); }}
              className={cn('flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left shadow-glass backdrop-blur-md transition-colors',
                on ? 'border-accent/70 bg-elevated/95' : 'border-line/25 bg-surface/80 hover:border-accent/50')}>
              <span className="size-2 shrink-0 rounded-full" style={{ background: d.color }} />
              <span className="flex flex-col">
                <span className="text-xs font-semibold text-fg">{tr(d.name)}</span>
                <span className="num text-2xs text-muted">
                  {ppl.length}{seats ? `/${seats}` : ''} · AI {ai} · <span className="text-st-working">{busy}</span>
                  {err && <span className="ml-1 text-danger">●</span>}
                </span>
              </span>
            </button>
          </Html>
        );
      })}
      {isSel && labelsOn && s.settings.seatIds && placements.map((p) => (
        <Html key={p.seatId + p.person.id} position={[p.x, 0.15, p.z]} center zIndexRange={[5, 0]} className="tag3d">
          <div className="num rounded bg-canvas/80 px-1 font-mono text-[9px] text-faint">{p.seatId}</div>
        </Html>
      ))}
      {isSel && labelsOn && hovered && <PersonTip p={hovered.person} x={hovered.x} z={hovered.z} />}
    </group>
  );
}

function PersonTip({ p, x, z }: { p: Person; x: number; z: number }) {
  const { tr, t } = useLang();
  return (
    <Html position={[x, 2.3, z]} center zIndexRange={[9, 0]} className="tag3d">
      <div className="animate-slideUp rounded-lg border border-line/25 bg-surface/90 px-2.5 py-1.5 shadow-glass backdrop-blur-md">
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          {p.type === 'ai' && <span className="rounded bg-ai/20 px-1 text-[9px] font-bold text-ai">AI</span>}
          {tr(p.name)}
        </div>
        <div className="text-2xs text-muted">{tr(p.title)}</div>
        <div className="mt-0.5 flex items-center gap-1 text-2xs" style={{ color: STATUS_COLOR[p.status] }}>
          <span className="size-1.5 rounded-full" style={{ background: STATUS_COLOR[p.status] }} />
          {t(`st_${p.status}`)}
        </div>
      </div>
    </Html>
  );
}
