// AI 员工的机器人（CC0，hq/models/RobotExpressive.glb）：只在看单层楼时用，整栋大楼时还是轻量的发光人形。
import { useEffect, useMemo } from 'react';
import { useFrame, useLoader, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { Status } from '../types';
import type { Placement } from './Avatars';

const URL_ROBOT = '../hq/models/RobotExpressive.glb';
// 状态 → 动作
const CLIP: Record<Status, string> = { working: 'Idle', thinking: 'Idle', waiting: 'Standing', available: 'Wave', completed: 'ThumbsUp', error: 'No' };
const HEIGHT = 1.35;

// 换成品牌色：主体金（真实名单）/ 米白（示范），灰色部分米白，黑色部分暖灰（不用黑）
function recolor(root: THREE.Object3D, real: boolean) {
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const src = m.material as THREE.MeshStandardMaterial;
    const mat = src.clone();
    if (src.name === 'Main') mat.color.set(real ? '#D4AF5F' : '#CFC6B6');
    else if (src.name === 'Grey') mat.color.set('#F3EAD3');
    else if (src.name === 'Black') mat.color.set('#5E5650');
    mat.metalness = 0.15; mat.roughness = 0.55;
    m.material = mat;
    m.castShadow = false;
    m.frustumCulled = false;
  });
}

type Bot = { root: THREE.Group; mixer: THREE.AnimationMixer; id: string };

export function Robots({ placements, onPick, onHover }: { placements: Placement[]; onPick: (id: string) => void; onHover: (p: Placement | null) => void }) {
  const gltf = useLoader(GLTFLoader, URL_ROBOT);
  const scale = useMemo(() => {
    const box = new THREE.Box3().setFromObject(gltf.scene);
    return HEIGHT / Math.max(0.1, box.max.y - box.min.y);
  }, [gltf]);
  const bots = useMemo<Bot[]>(() => placements.map((p, i) => {
    const root = cloneSkinned(gltf.scene) as THREE.Group;
    recolor(root, !!p.person.real);
    root.scale.setScalar(scale);
    // 坐着的工位：机器人站在椅子旁边一点，不会卡进桌子
    const back = p.sit ? 0.35 : 0;
    root.position.set(p.x - Math.sin(p.ry) * back, 0, p.z - Math.cos(p.ry) * back);
    root.rotation.y = p.ry;
    root.userData.personId = p.person.id;
    const mixer = new THREE.AnimationMixer(root);
    const clip = THREE.AnimationClip.findByName(gltf.animations, CLIP[p.person.status]) ?? gltf.animations[0];
    const act = mixer.clipAction(clip);
    act.timeScale = p.person.status === 'thinking' ? 0.6 : 0.85;
    act.time = (i * 0.37) % clip.duration;   // 不要大家同步动
    act.play();
    return { root, mixer, id: p.person.id };
  }), [gltf, placements, scale]);
  useEffect(() => () => { bots.forEach((b) => b.mixer.stopAllAction()); }, [bots]);
  useFrame((_, dt) => { const d = Math.min(dt, 0.1); for (const b of bots) b.mixer.update(d); });

  const idOf = (e: ThreeEvent<PointerEvent | MouseEvent>) => {
    let o: THREE.Object3D | null = e.object;
    while (o && !o.userData.personId) o = o.parent;
    return o?.userData.personId as string | undefined;
  };
  return (
    <group>
      {bots.map((b) => (
        <primitive key={b.id} object={b.root}
          onClick={(e: ThreeEvent<MouseEvent>) => { const id = idOf(e); if (id) { e.stopPropagation(); onPick(id); } }}
          onPointerOver={(e: ThreeEvent<PointerEvent>) => { const id = idOf(e); if (!id) return; e.stopPropagation(); document.body.style.cursor = 'pointer'; onHover(placements.find((p) => p.person.id === id) ?? null); }}
          onPointerOut={() => { document.body.style.cursor = ''; onHover(null); }} />
      ))}
    </group>
  );
}
