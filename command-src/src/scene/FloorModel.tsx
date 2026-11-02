// 一层楼：楼板、房间地砖、玻璃隔间、家具（InstancedMesh）、员工、标签。
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Floor, Person } from '../types';
import { useStore } from '../lib/store';
import { useLang } from '../lib/i18n';
import { buildFloorLayout } from './layout';
import { Batch } from './Batch';
import { Avatars, STATUS_COLOR, type Placement } from './Avatars';
import { D, SLAB, W, WALL_H, siteOf } from './constants';
import { GEO, damp, makeFloorMats, setFloorOpacity } from './shared';
import { surfaceTexture } from './textures';
import { TreeField } from './Trees';
import { Robots } from './Robots';
import { Crew } from './Crew';
import { useLive, recentLine } from '../lib/live';
import { describeEvent } from '../lib/company';
import { buildLogoWall } from '../../../hq/campus.js';
import { Pavilion, makeShellMats, type ShellMode, type ShellKind } from './Pavilion';
import type { Art, Plaque, Prim } from './layout';
import { photoTexture } from './textures';

const LOGO = '../hq/brand/shuyi-logo-512.png';
import { cn } from '../lib/cn';

const invisible = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false });

export function FloorModel({ floor }: { floor: Floor }) {
  const s = useStore();
  const { tr, t } = useLang();
  const m = s.model;
  const { chat } = useLive();
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
  // 公司外观的一部分：天台的 Logo 招牌、1F 大厅的 Logo 墙（hq/campus.js，跟首页共用）
  const extra = useMemo(() => {
    if (floor.id === '1F') {
      const r = floor.rooms.find((rm) => rm.kind === 'reception');
      if (!r) return null;
      const x = buildLogoWall({ width: r.w - 2, height: 2.3, logoUrl: LOGO });
      x.group.position.set(r.x + r.w / 2 - W / 2, 0, r.z - D / 2 + 0.3); return x;
    }
    return null;
  }, [floor]);
  const seaside = floor.id === '2F';   // 听竹轩在海边：闽南红瓦燕尾脊
  const fmats = useMemo(() => makeShellMats(seaside ? 'red' : 'grey'), [seaside]);
  // 木头家具用胡桃木纹、台面用大理石纹（Krea 材质）；其他维持纯色
  const looks = useMemo(() => {
    const wood = new THREE.MeshStandardMaterial({ map: photoTexture('walnut', 1, 1), roughness: 0.55, metalness: 0.05 });
    const marble = new THREE.MeshStandardMaterial({ map: photoTexture('marble', 1, 1), roughness: 0.25, metalness: 0.05 });
    [wood, marble].forEach((x) => { x.userData.base = 1; });
    return { wood, marble };
  }, []);
  const split = useMemo(() => splitByMaterial(layout.box), [layout]);
  const shellKind: ShellKind = floor.id === 'R' ? 'garden' : floor.id === 'B1' ? 'earth' : 'hall';
  const site = siteOf(floor.id);
  const artMats = useMemo(() => layout.art.map((a) => {
    const x = new THREE.MeshStandardMaterial({ map: photoTexture(a.kind, 1, 1, false), roughness: a.kind === 'rug' ? 0.95 : 0.8 });
    x.userData.base = 1; return x;
  }), [layout]);
  const fadeList = useMemo(() => [...mats.all, edgeMat, ...tileMats, ...fmats.all, looks.wood, looks.marble, ...artMats, ...(extra?.materials ?? [])], [mats, edgeMat, tileMats, fmats, looks, artMats, extra]);
  const trees = useRef<THREE.Group>(null);

  // 公司资料每分钟重算一次（新物件）；人员没变就不要重排，不然走到一半的人会被拉回座位
  const peopleKey = m.people.map((p) => p.id + p.status + p.dept).join('|');
  // 员工排到自己部门房间的工位上；工位不够就站在房间中间
  const placements = useMemo<Placement[]>(() => {
    const out: Placement[] = [];
    for (const d of m.departments.filter((x) => x.floor === floor.id)) {
      const room = floor.rooms.find((r) => r.id === d.room);
      if (!room) continue;
      const seats = layout.seats[room.id] ?? [];
      const ppl = m.people.filter((p) => p.dept === d.id);
      // 人坐工位；AI 机器人不坐椅子（会卡进桌椅）→ 站在靠外墙那一排的 AI 工作站
      const humans = ppl.filter((p) => p.type === 'human'), bots = ppl.filter((p) => p.type === 'ai');
      const rx0 = room.x - W / 2, rz0 = room.z - D / 2, rx1 = rx0 + room.w, rz1 = rz0 + room.d;
      const back = room.z <= 0.01, front = room.z + room.d >= D - 0.01;
      const spots: { x: number; z: number; ry: number }[] = [];
      if (back || front) {
        const z = back ? rz0 + 0.65 : rz1 - 0.65, ry = back ? 0 : Math.PI;
        for (let row = 0; row < 2; row++) for (let x = rx0 + 1.5; x <= rx1 - 1.4; x += 0.95) spots.push({ x, z: back ? z + row * 0.85 : z - row * 0.85, ry });
      } else {
        for (let col = 0; col < 2; col++) for (let z = rz0 + 1.2; z <= rz1 - 1.0; z += 0.95) spots.push({ x: rx1 - 0.65 - col * 0.85, z, ry: -Math.PI / 2 });
      }
      humans.forEach((p, i) => {
        const seat = seats[i];
        if (seat) { out.push({ person: p, x: seat.x, z: seat.z, ry: seat.ry, sit: seat.sit, seatId: seat.id }); return; }
        const sp = spots.pop() ?? { x: rx0 + 1, z: rz0 + 1, ry: 0 };
        out.push({ person: p, x: sp.x, z: sp.z, ry: sp.ry, sit: false, seatId: `${floor.code}-${d.id.toUpperCase().slice(0, 4)}-S${i + 1}` });
      });
      bots.forEach((p, i) => {
        const sp = spots[i] ?? { x: rx0 + 1 + (i % 4) * 0.9, z: (rz0 + rz1) / 2, ry: 0 };
        out.push({ person: p, x: sp.x, z: sp.z, ry: sp.ry, sit: false, seatId: `${floor.code}-${d.id.toUpperCase().slice(0, 4)}-AI${i + 1}` });
      });
    }
    return out;
  }, [peopleKey, floor, layout]); // eslint-disable-line react-hooks/exhaustive-deps

  const visiblePlacements = useMemo(() => placements.filter((p) =>
    (p.person.type === 'human' ? s.filters.humans : s.filters.ai) && (s.filters.dept === 'all' || p.person.dept === s.filters.dept)
  ), [placements, s.filters]);
  // 固定同一个阵列：不然每次重画都会把走到一半的人拉回座位
  const floorOfPerson = useMemo(() => {
    const map = new Map(m.people.map((p) => [p.id, m.departments.find((d) => d.id === p.dept)?.floor]));
    return (id: string) => map.get(id);
  }, [m.people, m.departments]);
  const humans = useMemo(() => visiblePlacements.filter((p) => p.person.type === 'human'), [visiblePlacements]);
  const bots = useMemo(() => visiblePlacements.filter((p) => p.person.type === 'ai'), [visiblePlacements]);

  const focus = s.floor ? m.floors.find((f) => f.id === s.floor) : null;
  // 客服视图在外面看的时候：屋顶盖着（看得到海边的外观）
  const isSel = focus?.id === floor.id && !(s.csView && s.csOutside);
  const overview = !focus;
  // 度假村：每栋都在地面上；点进一栋 → 屋顶掀开、看里面；其他栋屋顶盖着（里面不用画，省效能）。2D 平面只留这一栋
  const targetOpacity = s.mode === '2d' && !isSel && focus ? 0 : 1;
  const facadeMode: ShellMode = s.mode === '2d' && isSel ? 'hidden' : isSel ? 'cut' : 'closed';
  const hoverPeek = overview && s.hoverFloor === floor.id;
  const interior = isSel || hoverPeek;
  const targetLift = isSel ? 60 : hoverPeek ? 6 : 0;
  // 名牌：每个房号牌一张小贴图
  const plaqueTex = useMemo(() => layout.plaques.map((pq) => plaqueTexture(pq, tr(pq.room.name))), [layout, tr]);

  const group = useRef<THREE.Group>(null);
  const cur = useRef({ lift: 0, op: 1 });
  const [lift, setLift] = useState(0);
  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    const k = damp(Math.min(dt, 0.1), 4.5);
    cur.current.op += (targetOpacity - cur.current.op) * k;
    if (Math.abs(targetOpacity - cur.current.op) < 0.002) cur.current.op = targetOpacity;
    const nl = cur.current.lift + (targetLift - cur.current.lift) * k;
    cur.current.lift = Math.abs(nl - targetLift) < 0.02 ? targetLift : nl;
    if (Math.abs(cur.current.lift - lift) > 0.05 || (cur.current.lift === targetLift && lift !== targetLift)) setLift(cur.current.lift);
    g.visible = cur.current.op > 0.01;
    // 滑鼠移到哪一栋，那栋的屋顶升起变透明，可以偷看里面
    fmats.roof.userData.base += ((hoverPeek ? 0.35 : 1) - fmats.roof.userData.base) * k;
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
  const aiLines = useMemo(() => {
    const out: Record<string, string> = {};
    const now = Date.now();
    for (const p of placements) {
      if (p.person.type !== 'ai') continue;
      const line = recentLine(chat, p.person.id, now);
      if (line) out[p.person.id] = line.text;
    }
    const ev = m.events[m.events.length - 1];
    if (ev && now - ev.t < 20000) {
      const id = ev.tool === 'name' ? 'cs-r0' : ev.tool === 'tech' ? 'techsup-r0' : '';
      if (id) out[id] = tr(describeEvent(ev));
    }
    return out;
  }, [placements, chat, m.events, tr]);
  const enter = () => {
    if (!s.canEnter(floor.id)) { s.flash(t('locked')); return; }
    s.selectFloor(floor.id);
  };
  const accentY = WALL_H + 0.55;
  // 左边选单开了工作面板（任务、AI 员工……）时，3D 标签先藏起来
  const labelsOn = s.section === 'overview' || s.section === 'building';

  return (
    <group ref={group} position={[site.x, 0, site.z]}>
      {/* 楼板 + 发光边 */}
      <mesh geometry={GEO.box} material={mats.slab} position={[0, -SLAB / 2, 0]} scale={[W + 0.6, SLAB, D + 0.6]} raycast={() => null} />
      <Pavilion kind={shellKind} mode={facadeMode} mats={fmats} roofLift={lift} swallowtail={seaside} />
      <group visible={interior}>
      {/* 房间地砖（选楼层后可以点部门） */}
      {layout.tiles.map((tile, i) => (
        <mesh key={tile.room.id} geometry={GEO.box} material={tileMats[i]} position={[tile.x, 0.01, tile.z]} scale={[tile.w, 0.02, tile.d]} receiveShadow
          raycast={isSel ? undefined : () => null}
          onClick={isSel && tile.room.dept ? (e) => { e.stopPropagation(); s.selectDept(tile.room.dept ?? null); s.selectPerson(null); } : undefined}
          onPointerOver={isSel && tile.room.dept ? () => { document.body.style.cursor = 'pointer'; } : undefined}
          onPointerOut={isSel ? () => { document.body.style.cursor = ''; } : undefined}
        />
      ))}
      <Batch prims={split.other} geometry={GEO.box} material={mats.std} />
      <Batch prims={split.wood} geometry={GEO.box} material={looks.wood} />
      <Batch prims={split.marble} geometry={GEO.box} material={looks.marble} />
      {layout.art.map((a, i) => <ArtPiece key={i} a={a} mat={artMats[i]} />)}
      <Batch prims={layout.cyl} geometry={GEO.cyl} material={mats.std} />
      <Batch prims={layout.sph} geometry={GEO.sph} material={mats.std} />
      <Batch prims={layout.glow} geometry={GEO.box} material={mats.glow} />
      <Batch prims={layout.glowCyl} geometry={GEO.cyl} material={mats.glow} />
      <Batch prims={layout.glass} geometry={GEO.box} material={mats.glass} />
      {layout.trees.length > 0 && <group ref={trees}><TreeField spots={layout.trees} /></group>}
      {extra && <primitive object={extra.group} />}
      {layout.plaques.map((pq, i) => <Sign key={pq.room.id} pq={pq} tex={plaqueTex[i]} />)}
      </group>

      {/* 看单层楼：员工是 Roblox 风格 3D 角色、AI 员工是会动的机器人；整栋大楼时用轻量的人形 */}
      {!isSel && <Avatars placements={visiblePlacements} mats={mats} active={overview} selected={null} onPick={() => undefined} onHover={() => undefined} />}
      {isSel && (
        <Crew floor={floor} placements={humans} others={bots} doors={layout.doors} floorOf={floorOfPerson} chat={chat} selected={s.person} showNames={s.csView}
          onPick={(id) => s.selectPerson(id)} onHover={setHovered} />
      )}
      {isSel && (
        <Suspense fallback={null}>
          <Robots placements={bots} lines={aiLines} showNames={false} nameOf={(p) => tr(p.person.name)}
            onPick={(id) => s.selectPerson(id)} onHover={setHovered} />
        </Suspense>
      )}

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
        if (room.id === '2f-train') {
          return (
            <Html key={room.id} position={[x, accentY, z]} center zIndexRange={[7, 0]} className="tag3d click">
              <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('open-handbook'))} className="flex items-center gap-1.5 rounded-lg border border-[#C9A86A] bg-[#FFF8E7]/95 px-2.5 py-1.5 text-xs font-semibold text-[#7A4A1E] shadow-glass hover:bg-[#FFEFC7]">📚 藏书阁 · 业务手册</button>
            </Html>
          );
        }
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
                {!s.csView && (
                  <span className="num text-2xs text-muted">
                    {ppl.length}{seats ? `/${seats}` : ''} · AI {ai} · <span className="text-st-working">{busy}</span>
                    {err && <span className="ml-1 text-danger">●</span>}
                  </span>
                )}
              </span>
            </button>
          </Html>
        );
      })}
      {isSel && labelsOn && s.settings.seatIds && s.dept && placements.filter((p) => p.person.dept === s.dept && p.person.type === 'human').map((p) => (
        <Html key={p.seatId + p.person.id} position={[p.x, 0.15, p.z]} center zIndexRange={[5, 0]} className="tag3d">
          <div className="num rounded bg-canvas/80 px-1 font-mono text-[9px] text-faint">{p.seatId}</div>
        </Html>
      ))}
      {isSel && labelsOn && hovered && <PersonTip p={hovered.person} x={hovered.x} z={hovered.z} />}
    </group>
  );
}

// 哪些颜色是木头、哪些是大理石：改用照片材质；颜色换成明暗（照片本身就有颜色）
const WOOD: Record<string, string> = { '#6B4A33': '#FFFFFF', '#5A3A28': '#D9CFC7', '#8C6A4C': '#FFF1E2', '#4A3326': '#BFB2A6', '#3A2A20': '#A89B90', '#B8956A': '#FFF6EA', '#A08C76': '#F5EDE4' };
const MARBLE: Record<string, string> = { '#EDEAE4': '#FFFFFF', '#F6F3EE': '#FFFFFF', '#ECE8E1': '#F7F5F2', '#ECE6DC': '#FFFFFF' };
function splitByMaterial(prims: Prim[]) {
  const wood: Prim[] = [], marble: Prim[] = [], other: Prim[] = [];
  for (const p of prims) {
    const k = p.c.toUpperCase();
    if (WOOD[k]) wood.push({ ...p, c: WOOD[k] });
    else if (MARBLE[k]) marble.push({ ...p, c: MARBLE[k] });
    else other.push(p);
  }
  return { wood, marble, other };
}
function ArtPiece({ a, mat }: { a: Art; mat: THREE.Material }) {
  return (
    <mesh position={[a.x, a.y, a.z]} rotation={a.flat ? [-Math.PI / 2, 0, 0] : [0, 0, 0]} material={mat} receiveShadow raycast={() => null}>
      <planeGeometry args={[a.w, a.h]} />
    </mesh>
  );
}

// 门上的房号牌：房号 + 部门名，部门色的一条
function plaqueTexture(pq: Plaque, name: string) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const g = c.getContext('2d') as CanvasRenderingContext2D;
  g.fillStyle = '#2B2F33'; g.fillRect(0, 0, 256, 64);
  g.fillStyle = pq.color; g.fillRect(0, 0, 8, 64);
  g.fillStyle = '#E8C77A'; g.font = 'bold 30px "PingFang SC","Microsoft YaHei",sans-serif'; g.textBaseline = 'middle';
  g.fillText(pq.no, 18, 33);
  g.fillStyle = '#FFFFFF'; g.font = '22px "PingFang SC","Microsoft YaHei",sans-serif';
  const short = name.length > 7 ? name.slice(0, 7) + '…' : name;
  g.fillText(short, 92, 34);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
function Sign({ pq, tex }: { pq: Plaque; tex: THREE.Texture }) {
  return (
    <mesh position={[pq.x, pq.y, pq.z]} rotation={[0, pq.ry, 0]} raycast={() => null}>
      <planeGeometry args={[0.96, 0.24]} />
      <meshBasicMaterial map={tex} toneMapped={false} side={THREE.DoubleSide} />
    </mesh>
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
