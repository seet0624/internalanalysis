// 背景：渐层天空 + 远处城市天际线（程序产生，不用下载图片），让大楼像站在城市里，不是飘在一片颜色上。
import { useMemo } from 'react';
import * as THREE from 'three';


export function windowTexture() {
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
  // 喀斯特山峰：三圈，近的绿、远的蓝灰
  const karst = useMemo(() => {
    let sd = 41;
    const rr = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
    const out: { x: number; z: number; r: number; h: number; c: string }[] = [];
    const rings: [number, number, string[]][] = [[250, 26, ['#8FA894', '#98B09B', '#86A08B']], [330, 30, ['#A7B9B0', '#AFC0B8']], [420, 34, ['#C3CFCC', '#CAD5D3']]];
    for (const [rad, n, cols] of rings) for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rr() * 0.2;
      const r = rad + (rr() - 0.5) * 40;
      out.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, r: 16 + rr() * 16, h: 40 + rr() * 50 + (rad - 250) * 0.15, c: cols[Math.floor(rr() * cols.length)] });
    }
    return out;
  }, []);
  // 山峰的形状：陡峭的山壁 + 圆圆的山顶（桂林）
  const peak = useMemo(() => new THREE.LatheGeometry([[1, 0], [0.97, 0.25], [0.88, 0.5], [0.72, 0.72], [0.5, 0.88], [0.25, 0.97], [0, 1]].map(([x, y]) => new THREE.Vector2(x, y)), 14), []);
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
      {/* 远山：桂林那样一座一座的喀斯特山峰，越远越淡（雾） */}
      {karst.map((k, i) => (
        <mesh key={'k' + i} geometry={peak} position={[k.x, -6, k.z]} scale={[k.r, k.h, k.r * (0.8 + (i % 3) * 0.15)]} rotation={[0, i, 0]} raycast={() => null}>
          <meshBasicMaterial color={k.c} fog={false} />
        </mesh>
      ))}
    </group>
  );
}
