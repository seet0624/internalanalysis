import { useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';
import type { Prim } from './layout';

// 一种形状的所有小物件，一次画完（InstancedMesh）
export function Batch({ prims, geometry, material }: { prims: Prim[]; geometry: THREE.BufferGeometry; material: THREE.Material }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    prims.forEach((p, i) => {
      o.position.set(p.p[0], p.p[1], p.p[2]);
      o.rotation.set(p.r?.[0] ?? 0, p.r?.[1] ?? 0, p.r?.[2] ?? 0);
      o.scale.set(p.s[0], p.s[1], p.s[2]);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
      mesh.setColorAt(i, c.set(p.c));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [prims]);
  if (!prims.length) return null;
  return <instancedMesh key={prims.length} ref={ref} args={[geometry, material, prims.length]} raycast={() => null} />;
}
