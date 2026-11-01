// 背景：渐层天空 + 远处城市天际线（程序产生，不用下载图片），让大楼像站在城市里，不是飘在一片颜色上。
import { useMemo } from 'react';
import * as THREE from 'three';

function windowTexture() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 128;
  const g = c.getContext('2d') as CanvasRenderingContext2D;
  g.fillStyle = '#C9D3DE'; g.fillRect(0, 0, 64, 128);
  for (let y = 4; y < 128; y += 8) for (let x = 4; x < 64; x += 10) {
    const r = Math.random();
    g.fillStyle = r > 0.85 ? '#F7E7B8' : r > 0.4 ? '#9FB3C8' : '#B4C4D4';
    g.fillRect(x, y, 6, 5);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function Surroundings() {
  const sky = useMemo(() => new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color('#9CC4EC') }, mid: { value: new THREE.Color('#D7E7F6') }, bottom: { value: new THREE.Color('#F4F1EA') } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 bottom; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h > 0.0 ? mix(mid, top, smoothstep(0.0, 0.6, h)) : bottom; c = mix(bottom, c, smoothstep(-0.02, 0.08, h)); gl_FragColor = vec4(c,1.0); }'
  }), []);
  // 城市：一圈远处的大楼（固定种子，每次一样）
  const city = useMemo(() => {
    const tex = windowTexture();
    const out: { x: number; z: number; w: number; d: number; h: number; c: string; ry: number }[] = [];
    let seed = 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < 70; i++) {
      const a = (i / 70) * Math.PI * 2 + rnd() * 0.05;
      const r = 150 + rnd() * 90;
      const h = 18 + rnd() * rnd() * 90;
      out.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, w: 10 + rnd() * 18, d: 10 + rnd() * 16, h, c: rnd() > 0.5 ? '#D7DEE6' : '#E6E9EE', ry: a });
    }
    return { tex, out };
  }, []);
  const mats = useMemo(() => city.out.map((b) => {
    const t = city.tex.clone(); t.needsUpdate = true; t.repeat.set(b.w / 8, b.h / 10);
    return new THREE.MeshStandardMaterial({ color: b.c, map: t, roughness: 0.6, metalness: 0.15 });
  }), [city]);
  return (
    <group>
      <mesh material={sky} raycast={() => null}><sphereGeometry args={[480, 32, 16]} /></mesh>
      {/* 城市地面 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} raycast={() => null}>
        <ringGeometry args={[115, 470, 64]} />
        <meshStandardMaterial color="#D9DCD6" roughness={1} />
      </mesh>
      {city.out.map((b, i) => (
        <mesh key={i} material={mats[i]} position={[b.x, b.h / 2 - 0.5, b.z]} rotation={[0, -b.ry, 0]} raycast={() => null}>
          <boxGeometry args={[b.w, b.h, b.d]} />
        </mesh>
      ))}
    </group>
  );
}
