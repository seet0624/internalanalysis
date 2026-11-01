// 背景：渐层天空 + 远处城市天际线（程序产生，不用下载图片），让大楼像站在城市里，不是飘在一片颜色上。
import { useMemo } from 'react';
import * as THREE from 'three';
import { D } from './constants';

const D_ROAD = D / 2 + 11;   // 马路中线（跟 Building 一样）

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
  // 近一点的街区：马路对面、大楼后面的中低层楼（有窗户、屋顶水塔），不再是一片空地
  const near = useMemo(() => {
    const out: { x: number; z: number; w: number; d: number; h: number; c: string }[] = [];
    let seed = 23;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const colors = ['#E9E4DA', '#D8DEE5', '#EEE9E1', '#CFD6DE', '#E2D9CB'];
    for (let x = -110; x <= 110; x += 15 + rnd() * 4) {          // 马路对面一排（镜头在右前方，镜头前那一段不放，免得挡住）
      if (x > -60 && x < 75) continue;
      const w = 10 + rnd() * 5;
      out.push({ x, z: D_ROAD + 16 + rnd() * 3, w, d: 12 + rnd() * 6, h: 6 + rnd() * 14, c: colors[Math.floor(rnd() * colors.length)] });
    }
    for (let x = -90; x <= 90; x += 17 + rnd() * 5) {           // 大楼后面一排
      if (Math.abs(x) < 30) continue;
      out.push({ x, z: -40 - rnd() * 10, w: 12 + rnd() * 5, d: 12 + rnd() * 5, h: 12 + rnd() * 30, c: colors[Math.floor(rnd() * colors.length)] });
    }
    for (let z = -70; z <= 10; z += 18 + rnd() * 4) for (const sx of [-1, 1]) {   // 两侧（右边往后退，别挡镜头）
      if (sx > 0 && z > -20) continue;
      out.push({ x: sx * (62 + rnd() * 8), z, w: 13 + rnd() * 4, d: 13 + rnd() * 4, h: 10 + rnd() * 26, c: colors[Math.floor(rnd() * colors.length)] });
    }
    return out;
  }, []);
  const nearMats = useMemo(() => near.map((b) => {
    const t = city.tex.clone(); t.needsUpdate = true; t.repeat.set(Math.max(1, b.w / 6), Math.max(1, b.h / 7));
    return new THREE.MeshStandardMaterial({ color: b.c, map: t, roughness: 0.7, metalness: 0.05 });
  }), [near, city]);
  // 云：几片柔和的云（canvas 画的）
  const cloud = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 128;
    const g = c.getContext('2d') as CanvasRenderingContext2D;
    for (let i = 0; i < 14; i++) {
      const x = 40 + Math.random() * 176, y = 50 + Math.random() * 40, r = 22 + Math.random() * 30;
      const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    return new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, fog: false, opacity: 0.85 });
  }, []);
  return (
    <group>
      <mesh material={sky} raycast={() => null}><sphereGeometry args={[480, 32, 16]} /></mesh>
      {[[-160, 120, -300, 140], [80, 140, -320, 180], [260, 110, -150, 120], [-300, 130, 40, 150], [180, 150, 260, 160], [-60, 160, 330, 130]].map(([x, y, z, sc], i) => (
        <sprite key={i} material={cloud} position={[x, y, z]} scale={[sc, sc * 0.45, 1]} />
      ))}
      {/* 远山：一圈低矮的山 */}
      <mesh position={[0, -0.5, 0]} raycast={() => null}>
        <cylinderGeometry args={[400, 410, 1, 64, 1, true]} />
        <meshBasicMaterial color="#C9D3CF" side={THREE.BackSide} fog={false} />
      </mesh>
      {Array.from({ length: 18 }, (_, i) => {
        const a = (i / 18) * Math.PI * 2 + 0.2;
        const h = 28 + ((i * 37) % 30);
        return (
          <mesh key={'hill' + i} position={[Math.cos(a) * 380, h / 2 - 6, Math.sin(a) * 380]} rotation={[0, -a, 0]} raycast={() => null}>
            <coneGeometry args={[70 + ((i * 13) % 40), h, 5]} />
            <meshBasicMaterial color={i % 2 ? '#BFCBC8' : '#C8D2CE'} fog={false} />
          </mesh>
        );
      })}
      {near.map((b, i) => (
        <group key={'n' + i} position={[b.x, -0.4, b.z]}>
          <mesh material={nearMats[i]} position={[0, b.h / 2, 0]} castShadow receiveShadow raycast={() => null}><boxGeometry args={[b.w, b.h, b.d]} /></mesh>
          <mesh position={[0, b.h + 0.4, 0]} raycast={() => null}><boxGeometry args={[b.w + 0.4, 0.8, b.d + 0.4]} /><meshStandardMaterial color="#BDB6AA" roughness={0.9} /></mesh>
          {i % 3 === 0 && <mesh position={[b.w * 0.2, b.h + 1.8, 0]} raycast={() => null}><cylinderGeometry args={[0.9, 0.9, 2, 12]} /><meshStandardMaterial color="#9AA0A6" roughness={0.6} /></mesh>}
        </group>
      ))}
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
