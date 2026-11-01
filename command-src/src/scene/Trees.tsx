// 真实的树：ez-tree 程序化产生（树枝 + 树皮贴图 + 树叶贴图），每种树只产生一次，用 InstancedMesh 种很多棵。
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Tree } from '../vendor/ez-tree/index.js';

export type TreeKind = 'oak' | 'ash' | 'aspen' | 'pine' | 'bush';
export type TreeSpot = { x: number; y: number; z: number; kind: TreeKind; h: number; ry: number };

const PRESET: Record<TreeKind, string> = { oak: 'Oak Medium', ash: 'Ash Medium', aspen: 'Aspen Medium', pine: 'Pine Medium', bush: 'Bush 1' };

const LOD: Record<TreeKind, { sections: number; segments: number; leaves: number; leafSize: number; levels?: number; children?: number }> = {
  oak: { sections: 0.4, segments: 0.5, leaves: 0.7, leafSize: 1.5, children: 0.6 },
  ash: { sections: 0.4, segments: 0.5, leaves: 0.7, leafSize: 1.5, children: 0.6 },
  aspen: { sections: 0.5, segments: 0.6, leaves: 0.8, leafSize: 1.4, children: 0.7 },
  pine: { sections: 0.4, segments: 0.5, leaves: 0.6, leafSize: 1.4, children: 0.7 },
  bush: { sections: 0.4, segments: 0.5, leaves: 0.9, leafSize: 1.5, levels: -1 }
};

type Variant = { branches: THREE.BufferGeometry; leaves: THREE.BufferGeometry; bm: THREE.Material; lm: THREE.Material; height: number };
const cache: Partial<Record<TreeKind, Variant>> = {};

function variant(kind: TreeKind): Variant {
  const hit = cache[kind];
  if (hit) return hit;
  const t = new Tree();
  t.loadPreset(PRESET[kind]);   // 会顺便产生几何
  const o = t.options as unknown as { seed: number; branch: { levels: number; sections: Record<string, number>; segments: Record<string, number>; children: Record<string, number> }; leaves: { count: number; size: number } };
  o.seed = 4242 + kind.length * 31;
  // 降低细节：远看一样真，但三角形少很多（整栋大楼几十棵树、上百盆植物）
  const lod = LOD[kind];
  for (const k of Object.keys(o.branch.sections)) o.branch.sections[k] = Math.max(1, Math.round(o.branch.sections[k] * lod.sections));
  for (const k of Object.keys(o.branch.segments)) o.branch.segments[k] = Math.max(3, Math.round(o.branch.segments[k] * lod.segments));
  o.leaves.count = Math.max(2, Math.round(o.leaves.count * lod.leaves));
  if (lod.children) for (const k of Object.keys(o.branch.children)) o.branch.children[k] = Math.max(1, Math.round(o.branch.children[k] * (lod.children as number)));
  if (lod.levels) o.branch.levels = Math.max(1, o.branch.levels + lod.levels);
  o.leaves.size *= lod.leafSize;
  t.generate();
  if (location.search.includes('debug')) console.info('tree', kind, 'h', new THREE.Box3().setFromObject(t).getSize(new THREE.Vector3()).toArray().map((x) => x.toFixed(1)).join(','), ((t.branchesMesh.geometry.index?.count ?? 0) + (t.leavesMesh.geometry.index?.count ?? 0)) / 3, 'tris');
  const bm = t.branchesMesh.material as THREE.Material;
  const lm = t.leavesMesh.material as THREE.MeshPhongMaterial;
  // 远看（小盆栽、天台的树）树叶贴图缩小后透明度会被平均掉，0.5 的门槛会把叶子整片切掉
  lm.alphaTest = 0.18;
  lm.alphaToCoverage = true;
  lm.needsUpdate = true;
  const box = new THREE.Box3().setFromObject(t);
  const v = { branches: t.branchesMesh.geometry, leaves: t.leavesMesh.geometry, bm, lm, height: Math.max(0.1, box.max.y - box.min.y) };
  cache[kind] = v;
  return v;
}

// 树叶随风摇（原版材质才有风的 shader）
const windMats = new Set<THREE.Material>();
export function useWind() {
  useFrame(({ clock }) => {
    for (const m of windMats) {
      const sh = m.userData.shader as { uniforms: { uTime: { value: number } } } | undefined;
      if (sh) sh.uniforms.uTime.value = clock.elapsedTime;
    }
  });
}

function Instanced({ geo, mat, spots, scale }: { geo: THREE.BufferGeometry; mat: THREE.Material; spots: TreeSpot[]; scale: (s: TreeSpot) => number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    spots.forEach((s, i) => {
      const k = scale(s);
      o.position.set(s.x, s.y, s.z); o.rotation.set(0, s.ry, 0); o.scale.set(k, k, k); o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [spots, scale]);
  return <instancedMesh key={spots.length} ref={ref} args={[geo, mat, spots.length]} raycast={() => null} />;
}

// 所有楼层共用同一组材质（复制出来的材质树叶会不见）；楼层淡出时由楼层把整片树藏起来
export function TreeField({ spots }: { spots: TreeSpot[] }) {
  const groups = useMemo(() => {
    const by: Partial<Record<TreeKind, TreeSpot[]>> = {};
    for (const s of spots) (by[s.kind] ||= []).push(s);
    return (Object.keys(by) as TreeKind[]).map((kind) => {
      const v = variant(kind);
      windMats.add(v.lm);
      return { kind, list: by[kind] as TreeSpot[], v, bm: v.bm, lm: v.lm, scale: (s: TreeSpot) => s.h / v.height };
    });
  }, [spots]);
  return (
    <group>
      {groups.map((g) => (
        <group key={g.kind}>
          <Instanced geo={g.v.branches} mat={g.bm} spots={g.list} scale={g.scale} />
          <Instanced geo={g.v.leaves} mat={g.lm} spots={g.list} scale={g.scale} />
        </group>
      ))}
    </group>
  );
}
