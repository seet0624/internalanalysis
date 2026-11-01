// 一层楼里的员工（Roblox 风格 3D 角色）：坐在工位打字、站着说话、走去会议室 / 咖啡角。
// 头上的对话泡泡只显示真实讯息（团队对话、工单 / 任务更新）；没有讯息就只做工作、待机动作，不编对话。
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Floor } from '../types';
import { lookOf } from '../lib/look';
import { recentLine, type ChatMsg } from '../lib/live';
import { useLang } from '../lib/i18n';
import { animate, buildCharacter, type Pose, type Rig } from './Character';
import { STATUS_COLOR, type Placement } from './Avatars';
import { D, W } from './constants';

type Walker = { phase: 'seat' | 'go' | 'stay' | 'back'; timer: number; path: THREE.Vector3[]; leg: number; target: THREE.Vector3 };
type Member = { p: Placement; rig: Rig; root: THREE.Group; seat: THREE.Vector3; walker?: Walker; face: number };

const hash = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); };
const ringGeo = new THREE.RingGeometry(0.26, 0.34, 28);

export function Crew({ floor, placements, chat, selected, showNames, onPick, onHover }: {
  floor: Floor; placements: Placement[]; chat: ChatMsg[]; selected: string | null; showNames: boolean;
  onPick: (id: string) => void; onHover: (p: Placement | null) => void;
}) {
  const { tr } = useLang();
  // 走动的目的地：会议室、咖啡角、休息区（楼层平面里的房间中心）
  const spots = useMemo(() => floor.rooms.filter((r) => ['meeting', 'coffee', 'lounge', 'waiting'].includes(r.kind))
    .map((r) => new THREE.Vector3(r.x + r.w / 2 - W / 2, 0, r.z + r.d / 2 - D / 2 + 0.6)), [floor]);
  const members = useMemo<Member[]>(() => {
    let walkers = 0;
    return placements.map((p) => {
      const rig = buildCharacter(lookOf(p.person), hash(p.person.id) % 7);
      const root = new THREE.Group();
      root.add(rig.root);
      root.position.set(p.x, 0, p.z);
      root.rotation.y = p.ry;
      root.userData.personId = p.person.id;
      // 空闲 / 思考中的人偶尔起来走走（最多两位），其他人坐着工作
      const canWalk = spots.length > 0 && walkers < 2 && (p.person.status === 'available' || p.person.status === 'thinking');
      if (canWalk) walkers++;
      const walker: Walker | undefined = canWalk ? { phase: 'seat', timer: 4 + walkers * 6, path: [], leg: 0, target: spots[(hash(p.person.id) + walkers) % spots.length] } : undefined;
      return { p, rig, root, seat: new THREE.Vector3(p.x, 0, p.z), walker, face: hash(p.person.id) % 7 };
    });
  }, [placements, spots]);
  const now = useRef(Date.now());
  // 泡泡 14 秒后消失：每 2 秒重画一次
  const [, setTick] = useState(0);
  useEffect(() => { const id = window.setInterval(() => setTick((n) => n + 1), 2000); return () => window.clearInterval(id); }, []);

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    const d = Math.min(dt, 0.1);
    now.current = Date.now();
    for (const m of members) {
      const st = m.p.person.status;
      const talking = !!recentLine(chat, m.p.person.id, now.current);
      let pose: Pose = m.p.sit ? (st === 'working' || st === 'thinking' || st === 'error' || talking ? 'type' : 'sit') : talking ? 'talk' : st === 'available' ? 'wave' : 'idle';
      const w = m.walker;
      if (w) {
        w.timer -= d;
        if (w.phase === 'seat' && w.timer <= 0) {
          // 走出走廊（z=0 是走廊中线）→ 沿走廊 → 进目的地
          w.path = [new THREE.Vector3(m.seat.x, 0, 0), new THREE.Vector3(w.target.x, 0, 0), w.target.clone()];
          w.leg = 0; w.phase = 'go';
        } else if (w.phase === 'stay' && w.timer <= 0) {
          w.path = [new THREE.Vector3(w.target.x, 0, 0), new THREE.Vector3(m.seat.x, 0, 0), m.seat.clone()];
          w.leg = 0; w.phase = 'back';
        }
        if (w.phase === 'go' || w.phase === 'back') {
          const goal = w.path[w.leg];
          const to = goal.clone().sub(m.root.position); to.y = 0;
          const dist = to.length();
          if (dist < 0.05) {
            w.leg++;
            if (w.leg >= w.path.length) {
              if (w.phase === 'go') { w.phase = 'stay'; w.timer = 9; }
              else { w.phase = 'seat'; w.timer = 18 + (hash(m.p.person.id) % 10); m.root.rotation.y = m.p.ry; }
            }
          } else {
            m.root.position.addScaledVector(to.normalize(), Math.min(dist, d * 1.1));
            m.root.rotation.y = Math.atan2(to.x, to.z);
          }
          pose = 'walk';
        } else if (w.phase === 'stay') pose = talking ? 'talk' : 'idle';
      }
      animate(m.rig, pose, t, m.face * 1.3);
    }
  });

  const pickId = (e: ThreeEvent<MouseEvent | PointerEvent>) => {
    let o: THREE.Object3D | null = e.object;
    while (o && !o.userData.personId) o = o.parent;
    return o?.userData.personId as string | undefined;
  };

  return (
    <group>
      {members.map((m) => {
        const line = recentLine(chat, m.p.person.id, now.current);
        const sel = selected === m.p.person.id;
        return (
          <primitive key={m.p.person.id} object={m.root}
            onClick={(e: ThreeEvent<MouseEvent>) => { const id = pickId(e); if (id) { e.stopPropagation(); onPick(id); } }}
            onPointerOver={(e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; onHover(m.p); }}
            onPointerOut={() => { document.body.style.cursor = ''; onHover(null); }}>
            <mesh geometry={ringGeo} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} raycast={() => null}>
              <meshBasicMaterial color={sel ? '#1A73E8' : STATUS_COLOR[m.p.person.status]} transparent opacity={sel ? 1 : 0.8} toneMapped={false} />
            </mesh>
            {(line || showNames) && (
              <Html position={[0, m.p.sit ? 1.62 : 1.85, 0]} center zIndexRange={[9, 0]} className="tag3d">
                <div className="flex flex-col items-center gap-1">
                  {line && (
                    <div className="max-w-52 animate-slideUp rounded-2xl rounded-bl-sm border border-line/15 bg-surface px-3 py-1.5 text-xs leading-snug text-fg shadow-glass">
                      {line.text}{line.demo && <span className="ml-1 rounded bg-warn/15 px-1 text-[9px] text-warn">示范</span>}
                    </div>
                  )}
                  {showNames && (
                    <div className="flex items-center gap-1 whitespace-nowrap rounded-full bg-surface/90 px-1.5 py-px text-[9px] font-medium text-fg shadow-glass">
                      <span className="size-1.5 rounded-full" style={{ background: STATUS_COLOR[m.p.person.status] }} />{tr(m.p.person.name)}
                    </div>
                  )}
                </div>
              </Html>
            )}
          </primitive>
        );
      })}
    </group>
  );
}
