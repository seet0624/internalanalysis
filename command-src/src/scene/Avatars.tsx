// 员工（人）和 AI 员工。全部用 InstancedMesh：每层楼几十个人也只要几次绘制。
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import type { Person, Status } from '../types';
import { GEO, type FloorMats } from './shared';

export type Placement = { person: Person; x: number; z: number; ry: number; sit: boolean; seatId: string };

export const STATUS_COLOR: Record<Status, string> = {
  working: '#D4AF5F', available: '#6E9E78', thinking: '#B8AFA0', waiting: '#C9773A', completed: '#8FB39A', error: '#C2553F'
};
const OUTFITS = ['#5E564C', '#8C7A62', '#5B4A3A', '#F3EAD3', '#6F8A74', '#7A6A55', '#A88B5C', '#8C6B24', '#E8E1D3', '#6B4A33'];
const SKINS = ['#F1C9A5', '#E0AC83', '#C68B5E', '#F5D6BA', '#D9A07A'];
const HAIR = ['#1B1B1F', '#3B2A20', '#5A3B26', '#22201E', '#7A5A3A'];
const hash = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); };

type Props = {
  placements: Placement[]; mats: FloorMats; active: boolean;
  selected: string | null;
  onPick: (id: string) => void; onHover: (p: Placement | null) => void;
};

const o = new THREE.Object3D();
const col = new THREE.Color();

export function Avatars({ placements, mats, active, selected, onPick, onHover }: Props) {
  const humans = useMemo(() => placements.filter((p) => p.person.type === 'human'), [placements]);
  const ais = useMemo(() => placements.filter((p) => p.person.type === 'ai'), [placements]);
  const torso = useRef<THREE.InstancedMesh>(null);
  const head = useRef<THREE.InstancedMesh>(null);
  const hair = useRef<THREE.InstancedMesh>(null);
  const legs = useRef<THREE.InstancedMesh>(null);
  const aiBody = useRef<THREE.InstancedMesh>(null);
  const aiHead = useRef<THREE.InstancedMesh>(null);
  const halo = useRef<THREE.InstancedMesh>(null);
  const disc = useRef<THREE.InstancedMesh>(null);
  const marker = useRef<THREE.InstancedMesh>(null);
  const flagged = useMemo(() => placements.filter((p) => ['working', 'thinking', 'waiting', 'error'].includes(p.person.status)), [placements]);

  // 人：坐着 / 站着的身体、头、头发、腿（不动的部分只算一次）
  useLayoutEffect(() => {
    humans.forEach((p, i) => {
      const h = hash(p.person.id);
      const sitY = p.sit ? 0 : 0.22;
      const set = (m: THREE.InstancedMesh | null, x: number, y: number, z: number, sx: number, sy: number, sz: number, c: string) => {
        if (!m) return;
        o.position.set(x, y, z); o.rotation.set(0, p.ry, 0); o.scale.set(sx, sy, sz); o.updateMatrix();
        m.setMatrixAt(i, o.matrix); m.setColorAt(i, col.set(c));
      };
      const fx = Math.sin(p.ry) * 0.18, fz = Math.cos(p.ry) * 0.18;
      set(torso.current, p.x, 0.86 + sitY, p.z, 1, 1, 0.8, OUTFITS[h % OUTFITS.length]);
      set(head.current, p.x, 1.36 + sitY, p.z, 0.3, 0.32, 0.3, SKINS[h % SKINS.length]);
      set(hair.current, p.x - fx * 0.25, 1.43 + sitY, p.z - fz * 0.25, 0.32, 0.26, 0.32, HAIR[(h >> 3) % HAIR.length]);
      // 腿是 box（中心在一半高）：坐着往前伸，站着直立
      if (p.sit) set(legs.current, p.x + fx, 0.5, p.z + fz, 0.3, 0.14, 0.5, '#5E564C');
      else set(legs.current, p.x, 0.33, p.z, 0.28, 0.66, 0.2, '#5E564C');
    });
    for (const m of [torso.current, head.current, hair.current, legs.current]) {
      if (!m) continue;
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
      m.computeBoundingSphere();
    }
    placements.forEach((p, i) => {
      if (!disc.current) return;
      o.position.set(p.x, 0.02, p.z); o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1); o.updateMatrix();
      disc.current.setMatrixAt(i, o.matrix); disc.current.setColorAt(i, col.set(STATUS_COLOR[p.person.status]));
    });
    if (disc.current) { disc.current.instanceMatrix.needsUpdate = true; if (disc.current.instanceColor) disc.current.instanceColor.needsUpdate = true; }
    ais.forEach((p, i) => {
      const c = p.person.real ? '#D4AF5F' : '#B8AFA0';
      aiBody.current?.setColorAt(i, col.set(c));
      aiHead.current?.setColorAt(i, col.set(p.person.real ? '#FFF1C9' : '#F5F1EA'));
      halo.current?.setColorAt(i, col.set(c));
    });
    for (const m of [aiBody.current, aiHead.current, halo.current]) if (m?.instanceColor) m.instanceColor.needsUpdate = true;
    flagged.forEach((p, i) => marker.current?.setColorAt(i, col.set(STATUS_COLOR[p.person.status])));
    if (marker.current?.instanceColor) marker.current.instanceColor.needsUpdate = true;
  }, [humans, ais, placements, flagged]);

  // AI 员工浮动、光环转、任务标记上下跳（只有看得到的楼层才动）
  useFrame(({ clock }) => {
    if (!active) return;
    const t = clock.elapsedTime;
    ais.forEach((p, i) => {
      const bob = Math.sin(t * 2 + i * 1.7) * 0.06;
      const y = (p.sit ? 0.95 : 1.05) + bob;
      if (aiBody.current) { o.position.set(p.x, y, p.z); o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1); o.updateMatrix(); aiBody.current.setMatrixAt(i, o.matrix); }
      if (aiHead.current) { o.position.set(p.x, y + 0.5, p.z); o.scale.set(0.3, 0.3, 0.3); o.updateMatrix(); aiHead.current.setMatrixAt(i, o.matrix); }
      if (halo.current) { o.position.set(p.x, y + 0.1, p.z); o.rotation.set(Math.PI / 2 + Math.sin(t + i) * 0.25, 0, t * 1.5 + i); o.scale.set(1, 1, 1); o.updateMatrix(); halo.current.setMatrixAt(i, o.matrix); }
    });
    flagged.forEach((p, i) => {
      if (!marker.current) return;
      const top = p.person.type === 'ai' ? 1.95 : (p.sit ? 1.85 : 2.05);
      o.position.set(p.x, top + Math.sin(t * 3 + i) * 0.06, p.z); o.rotation.set(0, t * 2 + i, 0); o.scale.set(1, 1.4, 1); o.updateMatrix();
      marker.current.setMatrixAt(i, o.matrix);
    });
    for (const m of [aiBody.current, aiHead.current, halo.current, marker.current]) if (m) { m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere(); }
  });

  const pick = (list: Placement[]) => (e: ThreeEvent<MouseEvent>) => {
    if (e.instanceId === undefined) return;
    e.stopPropagation();
    onPick(list[e.instanceId].person.id);
  };
  const hover = (list: Placement[]) => (e: ThreeEvent<PointerEvent>) => {
    if (e.instanceId === undefined) return;
    e.stopPropagation();
    document.body.style.cursor = 'pointer';
    onHover(list[e.instanceId]);
  };
  const out = () => { document.body.style.cursor = ''; onHover(null); };
  const sel = placements.find((p) => p.person.id === selected);

  return (
    <group>
      {humans.length > 0 && (
        <>
          <instancedMesh key={`t${humans.length}`} ref={torso} args={[GEO.capsule, mats.person, humans.length]} onClick={pick(humans)} onPointerOver={hover(humans)} onPointerOut={out} />
          <instancedMesh key={`h${humans.length}`} ref={head} args={[GEO.sph, mats.person, humans.length]} onClick={pick(humans)} onPointerOver={hover(humans)} onPointerOut={out} />
          <instancedMesh key={`r${humans.length}`} ref={hair} args={[GEO.sph, mats.person, humans.length]} raycast={() => null} />
          <instancedMesh key={`l${humans.length}`} ref={legs} args={[GEO.box, mats.person, humans.length]} raycast={() => null} />
        </>
      )}
      {ais.length > 0 && (
        <>
          <instancedMesh key={`ab${ais.length}`} ref={aiBody} args={[GEO.aiBody, mats.aiBody, ais.length]} onClick={pick(ais)} onPointerOver={hover(ais)} onPointerOut={out} />
          <instancedMesh key={`ah${ais.length}`} ref={aiHead} args={[GEO.sph, mats.aiGlow, ais.length]} onClick={pick(ais)} onPointerOver={hover(ais)} onPointerOut={out} />
          <instancedMesh key={`ar${ais.length}`} ref={halo} args={[GEO.ring, mats.aiGlow, ais.length]} raycast={() => null} />
        </>
      )}
      {placements.length > 0 && <instancedMesh key={`d${placements.length}`} ref={disc} args={[GEO.disc, mats.glow, placements.length]} raycast={() => null} />}
      {flagged.length > 0 && <instancedMesh key={`m${flagged.length}`} ref={marker} args={[GEO.diamond, mats.aiGlow, flagged.length]} raycast={() => null} />}
      {sel && (
        <mesh position={[sel.x, 0.04, sel.z]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
          <ringGeometry args={[0.42, 0.56, 36]} />
          <meshBasicMaterial color="#B8933F" toneMapped={false} transparent opacity={0.95} />
        </mesh>
      )}
    </group>
  );
}
