// 办公室里的员工（方块小人，人和 AI 同一个模型）：坐在工位打字、站着说话、走去茶水间 / 沙发，还会拿文件去找同事「交接」。
// 有房间（门）的时候从门进出；部门小办公室没有隔间，就直接走过去。
// 交接只跟着真实对话：同一个任务 / 团队讨论里，A 回 B 的话 → A 拿着文件走去 B 那里讲；B 在别的楼层 → 走去电梯。
// 头上的对话泡泡只显示真实讯息；没有讯息就只做工作、待机动作，不编对话。
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Floor, Room } from '../types';
import { lookOf } from '../lib/look';
import { recentLine, type ChatMsg } from '../lib/live';
import { useLang } from '../lib/i18n';
import { animate, buildCharacter, type Pose, type Rig } from './Character';
import { STATUS_COLOR, type Placement } from './status';
import { D, W } from './constants';
import type { Door } from './layout';

type Trip = { kind: 'stroll' | 'handoff'; phase: 'go' | 'stay' | 'back'; path: THREE.Vector3[]; leg: number; timer: number; face?: THREE.Vector3; ride?: boolean; with?: string };
type Member = { p: Placement; rig: Rig; root: THREE.Group; seat: THREE.Vector3; room?: Room; trip?: Trip; strollIn: number; canStroll: boolean; face: number; folder: THREE.Mesh; attention: number; attentionTo?: THREE.Vector3 };

const hash = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); };
const ringGeo = new THREE.RingGeometry(0.26, 0.34, 28);
const folderGeo = new THREE.BoxGeometry(0.24, 0.32, 0.03);
const folderMat = new THREE.MeshStandardMaterial({ color: '#1A73E8', roughness: 0.6 });
const V = (x: number, z: number) => new THREE.Vector3(x, 0, z);
const SPEED = 1.15;

export function Crew({ floor, placements, others = [], doors, chat, selected, showNames, floorOf, strollSpots, via, relay, onPick, onHover }: {
  floor: Floor; placements: Placement[]; others?: Placement[]; doors: Record<string, Door>; chat: ChatMsg[]; selected: string | null; showNames: boolean;
  floorOf?: (personId: string) => string | undefined;
  strollSpots?: { x: number; z: number }[];   // 没有房间时：闲逛去哪里（茶水间、沙发、会议桌）
  via?: (from: THREE.Vector3, to: THREE.Vector3) => THREE.Vector3[];   // 没有房间时：走走道（不穿过桌子）
  relay?: string[];   // 同一个任务分到的人（按顺序）：轮流拿文件走去交给下一个人
  onPick: (id: string) => void; onHover: (p: Placement | null) => void;
}) {
  const { tr } = useLang();
  // 房间（世界座标）
  const rooms = useMemo(() => floor.rooms.map((r) => ({ r, x0: r.x - W / 2, z0: r.z - D / 2, x1: r.x + r.w - W / 2, z1: r.z + r.d - D / 2 })), [floor]);
  const roomAt = (x: number, z: number) => rooms.find((q) => x > q.x0 + 0.02 && x < q.x1 - 0.02 && z > q.z0 + 0.02 && z < q.z1 - 0.02)?.r;
  // 从房间里走到走廊：门里面一点 → 门外面一点；门外还是别的房间（例如咖啡角在培训室后面）就再穿过那一间
  const exitPath = (room: Room | undefined, depth = 0): THREE.Vector3[] => {
    if (!room || depth > 3) return [];
    const d = doors[room.id];
    if (!d) return [];
    const inside = V(d.x - d.nx * 0.7, d.z - d.nz * 0.7), outside = V(d.x + d.nx * 0.9, d.z + d.nz * 0.9);
    const next = roomAt(outside.x, outside.z);
    return [inside, outside, ...(next && next.id !== room.id ? exitPath(next, depth + 1) : [])];
  };
  const route = (from: THREE.Vector3, fromRoom: Room | undefined, to: THREE.Vector3, toRoom: Room | undefined) => {
    if (fromRoom && toRoom && fromRoom.id === toRoom.id) return [to.clone()];
    if (!fromRoom && !toRoom && via) return [...via(from, to), to.clone()];
    const out = exitPath(fromRoom), inn = exitPath(toRoom).reverse();
    return [...out, ...inn, to.clone()];
  };
  // 电梯厅（去别的楼层找人）
  const lift = useMemo(() => {
    const c = rooms.find((q) => q.r.kind === 'core');
    return c ? V((c.x0 + c.x1) / 2, c.z1 - 0.45) : null;
  }, [rooms]);
  // 闲逛的目的地：会议室、咖啡角、休息区
  const spots = useMemo(() => strollSpots ? strollSpots.map((p) => ({ room: undefined as Room | undefined, at: V(p.x, p.z) })) : rooms.filter((q) => ['meeting', 'coffee', 'lounge', 'waiting'].includes(q.r.kind)).map((q) => ({ room: q.r, at: V((q.x0 + q.x1) / 2, (q.z0 + q.z1) / 2 + 0.6) })), [rooms, strollSpots]);

  const members = useMemo<Member[]>(() => {
    let strollers = 0;
    return placements.map((p) => {
      const rig = buildCharacter(lookOf(p.person), hash(p.person.id) % 7, p.person.type === 'ai');
      const root = new THREE.Group();
      root.add(rig.root);
      root.position.set(p.x, 0, p.z);
      root.rotation.y = p.ry;
      root.userData.personId = p.person.id;
      const folder = new THREE.Mesh(folderGeo, folderMat);
      folder.position.set(0.16, 0.95, 0.2); folder.rotation.set(-0.3, 0, 0.1); folder.visible = false; folder.castShadow = true;
      root.add(folder);
      // 空闲 / 思考中的人偶尔起来走走（最多两位）
      const canStroll = spots.length > 0 && strollers < 2 && (p.person.status === 'available' || p.person.status === 'thinking');
      if (canStroll) strollers++;
      return { p, rig, root, seat: V(p.x, p.z), room: undefined, strollIn: 6 + strollers * 7, canStroll, face: hash(p.person.id) % 7, folder, attention: 0 };
    });
  }, [placements, spots]);
  useEffect(() => { for (const m of members) m.room = roomAt(m.seat.x, m.seat.z); }, [members]); // eslint-disable-line react-hooks/exhaustive-deps

  // 任务对接：同一个任务的人轮流把文件交给下一个人（只在真的有任务、分到 2 人以上时）
  const relayKey = relay?.join('|') ?? '';
  useEffect(() => {
    const ids = relayKey ? relayKey.split('|') : [];
    if (ids.length < 2) return;
    let i = 0;
    const tick = () => { startHandoff(ids[i % ids.length], ids[(i + 1) % ids.length]); i++; };
    const first = window.setTimeout(tick, 3000);
    const id = window.setInterval(tick, 16000);
    return () => { window.clearTimeout(first); window.clearInterval(id); };
  }, [relayKey, members]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- 交接：看新的真实讯息 ----------
  const seen = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!seen.current) { seen.current = new Set(chat.map((m) => m.id)); return; }   // 打开画面前的旧讯息不算
    const now = Date.now();
    for (let i = 0; i < chat.length; i++) {
      const m = chat[i];
      if (seen.current.has(m.id)) continue;
      seen.current.add(m.id);
      if (now - m.t > 30000 || m.smallTalk) continue;
      const thread = m.mission ?? (m.ch === 'team' ? 'team' : null);
      if (!thread) continue;
      let prev: ChatMsg | undefined;
      for (let j = i - 1; j >= 0; j--) {
        const q = chat[j];
        if (m.t - q.t > 5 * 60000) break;
        if ((q.mission ?? (q.ch === 'team' ? 'team' : null)) === thread && q.from !== m.from) { prev = q; break; }
      }
      if (prev) startHandoff(m.from, prev.from);
    }
  }, [chat]); // eslint-disable-line react-hooks/exhaustive-deps

  function spotNear(id: string): { at: THREE.Vector3; room?: Room; face: THREE.Vector3 } | null {
    const p = placements.find((x) => x.person.id === id) ?? others.find((x) => x.person.id === id);
    if (!p) return null;
    const side = V(Math.cos(p.ry), -Math.sin(p.ry));   // 站在对方旁边
    const at = V(p.x, p.z).addScaledVector(side, 0.8);
    return { at, room: roomAt(p.x, p.z), face: V(p.x, p.z) };
  }
  function startHandoff(fromId: string, toId: string) {
    let mover = members.find((x) => x.p.person.id === fromId);
    let targetId = toId;
    // 说话的人不在这间（例如 AI 在别的部门）：换成被回话的同事走过来
    if (!mover) { mover = members.find((x) => x.p.person.id === toId); targetId = fromId; }
    if (!mover || mover.trip) return;
    const here = spotNear(targetId);
    if (here) {
      mover.trip = { kind: 'handoff', phase: 'go', leg: 0, timer: 0, path: route(mover.root.position.clone(), mover.room, here.at, here.room), face: here.face, with: targetId };
    } else if (lift && floorOf?.(targetId) && floorOf(targetId) !== floor.id) {
      mover.trip = { kind: 'handoff', phase: 'go', leg: 0, timer: 0, path: route(mover.root.position.clone(), mover.room, lift, undefined), face: V(lift.x, lift.z - 2), ride: true, with: targetId };
    } else return;
    mover.folder.visible = true;
  }

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
      // 有同事走过来交接：转过去听
      if (m.attention > 0 && m.attentionTo && !m.trip) {
        m.attention -= d;
        const to = m.attentionTo.clone().sub(m.root.position);
        m.root.rotation.y = Math.atan2(to.x, to.z);
        pose = m.p.sit ? 'talk' : 'talk';
        if (m.attention <= 0) m.root.rotation.y = m.p.ry;
      }
      // 闲逛
      if (!m.trip && m.canStroll) {
        m.strollIn -= d;
        if (m.strollIn <= 0) {
          const sp = spots[(hash(m.p.person.id) + Math.floor(t)) % spots.length];
          m.trip = { kind: 'stroll', phase: 'go', leg: 0, timer: 0, path: route(m.root.position.clone(), m.room, sp.at, sp.room) };
        }
      }
      const tp = m.trip;
      if (tp) {
        if (tp.phase === 'stay') {
          tp.timer -= d;
          pose = tp.ride ? 'idle' : 'talk';
          if (tp.face) { const to = tp.face.clone().sub(m.root.position); m.root.rotation.y = Math.atan2(to.x, to.z); }
          m.root.visible = !(tp.ride && tp.timer > 1 && tp.timer < 9);      // 搭电梯去别层：消失一下再回来
          if (tp.timer <= 0) {
            m.root.visible = true;
            m.folder.visible = false;                                      // 文件交出去了
            const backRoom = tp.ride ? undefined : roomAt(m.root.position.x, m.root.position.z);
            tp.path = route(m.root.position.clone(), backRoom, m.seat, m.room);
            tp.leg = 0; tp.phase = 'back';
          }
        } else {
          const goal = tp.path[tp.leg];
          const to = goal.clone().sub(m.root.position); to.y = 0;
          const dist = to.length();
          if (dist < 0.05) {
            tp.leg++;
            if (tp.leg >= tp.path.length) {
              if (tp.phase === 'go') {
                tp.phase = 'stay'; tp.timer = tp.ride ? 10 : tp.kind === 'handoff' ? 7 : 9;
                if (tp.kind === 'handoff' && tp.with) {
                  const other = members.find((x) => x.p.person.id === tp.with);
                  if (other && !other.trip) { other.attention = tp.timer; other.attentionTo = m.root.position.clone(); }
                }
              } else {
                m.trip = undefined; m.root.rotation.y = m.p.ry; m.root.position.copy(m.seat);
                m.strollIn = 20 + (hash(m.p.person.id) % 12);
              }
            }
          } else {
            m.root.position.addScaledVector(to.normalize(), Math.min(dist, d * SPEED));
            m.root.rotation.y = Math.atan2(to.x, to.z);
          }
          if (m.trip) pose = 'walk';
        }
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
        const handoff = m.trip?.kind === 'handoff' && m.trip.phase === 'go';
        return (
          <primitive key={m.p.person.id} object={m.root}
            onClick={(e: ThreeEvent<MouseEvent>) => { const id = pickId(e); if (id) { e.stopPropagation(); onPick(id); } }}
            onPointerOver={(e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; onHover(m.p); }}
            onPointerOut={() => { document.body.style.cursor = ''; onHover(null); }}>
            <mesh geometry={ringGeo} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} raycast={() => null}>
              <meshBasicMaterial color={sel ? '#4FC3F7' : STATUS_COLOR[m.p.person.status]} transparent opacity={sel ? 1 : 0.8} toneMapped={false} />
            </mesh>
            {(line || showNames || handoff) && (
              <Html position={[0, m.p.sit && !m.trip ? 1.95 : 2.2, 0]} center zIndexRange={[9, 0]} className="tag3d">
                <div className="flex flex-col items-center gap-1">
                  {line && (
                    <div className="max-w-52 animate-slideUp rounded-2xl rounded-bl-sm border border-line/15 bg-surface px-3 py-1.5 text-xs leading-snug text-fg shadow-glass">
                      {line.text}{line.demo && <span className="ml-1 rounded bg-warn/15 px-1 text-[9px] text-warn">示范</span>}
                    </div>
                  )}
                  {handoff && !line && <div className="whitespace-nowrap rounded-full bg-[#E8F0FE] px-2 py-0.5 text-[10px] font-medium text-[#1967D2] shadow-glass">📁 交接中</div>}
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
