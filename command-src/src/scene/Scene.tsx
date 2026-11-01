import { Component, lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerformanceMonitor } from '@react-three/drei';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { qualityConfig, type QualityConfig } from '../lib/graphics';
import { useStore } from '../lib/store';
import { useLang } from '../lib/i18n';
import { Building } from './Building';
import { CameraRig } from './CameraRig';
import { Surroundings } from './Surroundings';
import { siteOf } from './constants';
import { setLeafCoverage } from './Trees';

// 环境反光：先用本地产生的（马上有），标准 / 极致画质再换成 HDRI（真实天光，1.2 MB，放在自己网站，国内快）
// HDRI 来自开源的 Hermes3D（CC0）。只当光源，不当背景（背景是我们自己的天空和远山）
function Env({ hdri }: { hdri: boolean }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    const pm = new THREE.PMREMGenerator(gl);
    const env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.45;
    let hdr: THREE.Texture | null = null;
    let alive = true;
    if (hdri) {
      new RGBELoader().load('../hq/env/office_env_1k.hdr', (t) => {
        if (!alive) { t.dispose(); return; }
        hdr = pm.fromEquirectangular(t).texture;
        t.dispose();
        scene.environment = hdr;
        scene.environmentIntensity = 0.55;
        scene.environmentRotation.set(0, Math.PI * 0.85, 0);
      }, undefined, () => { /* 下载失败就继续用本地的 */ });
    }
    if (location.search.includes('debug')) Object.assign(window, { cmdGL: gl, cmdScene: scene });   // ?debug：主控台看绘制次数、三角形数
    return () => { alive = false; env.dispose(); hdr?.dispose(); pm.dispose(); };
  }, [gl, scene, hdri]);
  return null;
}

// 太阳：走进一栋时，那一栋有真实阴影；极致画质整个园区都有阴影。
// 阳光会很慢地在暖金色和自然白之间变化（参考 Hermes3D 的 DaylightDrift），画面才不会死板
function SunLight({ cfg, shadows }: { cfg: QualityConfig; shadows: boolean }) {
  const s = useStore();
  const f = s.floor ? s.model.floors.find((x) => x.id === s.floor) : null;
  const st = f ? siteOf(f.id) : { x: 0, z: 0 };
  const light = useMemo(() => new THREE.DirectionalLight('#FFF4E2', 2.2), []);
  const base = useRef(new THREE.Vector3());
  useEffect(() => {
    const site = !f;                                   // 整个园区
    base.current.set(st.x + (site ? 60 : 18), site ? 110 : 30, st.z + (site ? 70 : 22));
    light.position.copy(base.current);
    light.target.position.set(st.x, 0, st.z);
    light.target.updateMatrixWorld();
    light.castShadow = shadows && (site ? cfg.siteShadows : true);
    const e = site ? 170 : 26;
    Object.assign(light.shadow.camera, { left: -e, right: e, top: e * 0.8, bottom: -e * 0.8, near: 1, far: site ? 400 : 90 });
    light.shadow.camera.updateProjectionMatrix();
    if (light.shadow.mapSize.x !== cfg.shadowMapSize) { light.shadow.mapSize.set(cfg.shadowMapSize, cfg.shadowMapSize); light.shadow.map?.dispose(); light.shadow.map = null as unknown as THREE.WebGLRenderTarget; }
    light.shadow.bias = -0.00015; light.shadow.normalBias = 0.025; light.shadow.radius = 4;
  }, [light, st.x, st.z, f, cfg, shadows]);
  const warm = useMemo(() => new THREE.Color('#FFE3BD'), []), neutral = useMemo(() => new THREE.Color('#FFF4E4'), []);
  const tt = useRef(0);
  useFrame((_, dt) => {
    tt.current += dt;
    const ph = (Math.sin((tt.current / 480) * Math.PI * 2) + 1) / 2;
    light.intensity = 2.1 + ph * 0.35;
    light.color.copy(warm).lerp(neutral, ph);
    light.position.set(base.current.x + (ph - 0.5) * 6, base.current.y, base.current.z - (ph - 0.5) * 3);
  });
  return <primitive object={light}><primitive object={light.target} /></primitive>;
}

// 后期处理放在另一个档案：低画质的电脑不用下载（省 ~600 KB）
const PostFx = lazy(() => import('./PostFx'));

class GLBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

const hasWebGL = () => {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
};

export function Scene() {
  const s = useStore();
  const { t } = useLang();
  // 显卡出错（WebGL context lost）：先降到低画质，再重新建立画布，不会整片白掉
  const [gen, setGen] = useState(0);
  const [lost, setLost] = useState(false);
  const [dpr, setDpr] = useState(1.25);
  const fallback = <div className="grid h-full place-items-center p-6 text-center text-sm text-muted">{t('no3d')}</div>;
  if (!hasWebGL()) return fallback;
  const quality = lost ? 'low' : s.settings.quality;
  const cfg = qualityConfig(quality);
  const shadows = quality !== 'low';
  setLeafCoverage(!cfg.postFx);
  // 工作面板（功能、任务……）盖住园区时，3D 只在需要时才画，省电
  const covered = s.section !== 'overview' && s.section !== 'building';
  return (
    <GLBoundary fallback={fallback}>
      <Canvas
        key={gen}
        frameloop={covered ? 'demand' : 'always'}
        shadows={shadows ? 'soft' : false}
        dpr={[1, Math.min(dpr, cfg.maxDpr)]}
        gl={{ antialias: !cfg.postFx && quality !== 'low', alpha: false, powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.0 }}
        camera={{ position: [70, 115, 175], fov: 40, near: 0.5, far: 1200 }}
        onPointerMissed={() => s.selectPerson(null)}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); setLost(true); s.setSettings({ quality: 'low' }); });
          gl.domElement.addEventListener('webglcontextrestored', () => setGen((n) => n + 1));
        }}
      >
        {/* 画面卡就自动降解析度，顺了再升回去 */}
        <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(cfg.maxDpr)} />
        <Env hdri={cfg.env} />
        <color attach="background" args={['#D7E7F6']} />
        <fog attach="fog" args={['#E6EEF0', 220, 560]} />
        <Surroundings />
        <hemisphereLight args={['#E8F0F8', '#C9BFAE', cfg.env ? 0.45 : 0.85]} />
        <SunLight cfg={cfg} shadows={shadows} />
        <directionalLight position={[-40, 25, -20]} intensity={0.35} color="#A7C4EF" />
        <Building />
        <OrbitControls makeDefault enableDamping dampingFactor={0.08} minDistance={6} maxDistance={320} maxPolarAngle={Math.PI * 0.47} />
        <CameraRig />
        {cfg.postFx && <Suspense fallback={null}><PostFx cfg={cfg} /></Suspense>}
      </Canvas>
    </GLBoundary>
  );
}
