import { Component, lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerformanceMonitor } from '@react-three/drei';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { qualityConfig, type QualityConfig } from '../lib/graphics';
import { useStore } from '../lib/store';
import { useLang } from '../lib/i18n';
import { CameraRig } from './CameraRig';
import { Office } from './Office';

// 环境反光：先用本地产生的（马上有），标准 / 极致画质再换成 HDRI（真实天光，1.2 MB，放在自己网站，国内快）
// HDRI 来自开源的 Hermes3D（CC0）。只当光源，不当背景（背景是深色，像参考图）
function Env({ hdri }: { hdri: boolean }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    const pm = new THREE.PMREMGenerator(gl);
    const env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.35;
    let hdr: THREE.Texture | null = null;
    let alive = true;
    if (hdri) {
      new RGBELoader().load('../hq/env/office_env_1k.hdr', (t) => {
        if (!alive) { t.dispose(); return; }
        hdr = pm.fromEquirectangular(t).texture;
        t.dispose();
        scene.environment = hdr;
        scene.environmentIntensity = 0.4;
        scene.environmentRotation.set(0, Math.PI * 0.85, 0);
      }, undefined, () => { /* 下载失败就继续用本地的 */ });
    }
    if (location.search.includes('debug')) Object.assign(window, { cmdGL: gl, cmdScene: scene });   // ?debug：主控台看绘制次数、三角形数
    return () => { alive = false; env.dispose(); hdr?.dispose(); pm.dispose(); };
  }, [gl, scene, hdri]);
  return null;
}

// 主光：从右前上方照进办公室，有阴影（办公室小，阴影贴图很清楚）。光色很慢地在暖白和自然白之间变化（参考 Hermes3D 的 DaylightDrift）
function KeyLight({ cfg, shadows }: { cfg: QualityConfig; shadows: boolean }) {
  const light = useMemo(() => new THREE.DirectionalLight('#FFF1DC', 2.0), []);
  useEffect(() => {
    light.position.set(9, 16, 11);
    light.target.position.set(-1, 0, 0);
    light.target.updateMatrixWorld();
    light.castShadow = shadows;
    Object.assign(light.shadow.camera, { left: -11, right: 11, top: 9, bottom: -9, near: 1, far: 50 });
    light.shadow.camera.updateProjectionMatrix();
    if (light.shadow.mapSize.x !== cfg.shadowMapSize) { light.shadow.mapSize.set(cfg.shadowMapSize, cfg.shadowMapSize); light.shadow.map?.dispose(); light.shadow.map = null as unknown as THREE.WebGLRenderTarget; }
    light.shadow.bias = -0.0002; light.shadow.normalBias = 0.02; light.shadow.radius = 3;
  }, [light, cfg, shadows]);
  const warm = useMemo(() => new THREE.Color('#FFE6C4'), []), neutral = useMemo(() => new THREE.Color('#FFF6EA'), []);
  const tt = useRef(0);
  useFrame((_, dt) => {
    tt.current += dt;
    const ph = (Math.sin((tt.current / 300) * Math.PI * 2) + 1) / 2;
    light.intensity = 1.9 + ph * 0.25;
    light.color.copy(warm).lerp(neutral, ph);
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
  // 工作面板（功能、任务……）盖住办公室时，3D 只在需要时才画，省电
  const covered = s.section !== 'overview' && s.section !== 'building';
  return (
    <GLBoundary fallback={fallback}>
      <Canvas
        key={gen}
        frameloop={covered ? 'demand' : 'always'}
        shadows={shadows ? 'soft' : false}
        dpr={[1, Math.min(dpr, cfg.maxDpr)]}
        gl={{ antialias: !cfg.postFx && quality !== 'low', alpha: false, powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.0 }}
        camera={{ position: [17, 17, 19.5], fov: 32, near: 0.5, far: 200 }}
        onPointerMissed={() => s.selectPerson(null)}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); setLost(true); s.setSettings({ quality: 'low' }); });
          gl.domElement.addEventListener('webglcontextrestored', () => setGen((n) => n + 1));
        }}
      >
        {/* 画面卡就自动降解析度，顺了再升回去 */}
        <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(cfg.maxDpr)} />
        <Env hdri={cfg.env} />
        {/* 深色背景（像参考图）：办公室像一个摆在暗处、打了灯的模型 */}
        <color attach="background" args={['#0F1217']} />
        <hemisphereLight args={['#C9D6F0', '#2A2420', cfg.env ? 0.55 : 0.95]} />
        <KeyLight cfg={cfg} shadows={shadows} />
        <directionalLight position={[-12, 9, 6]} intensity={0.45} color="#9DB8FF" />
        <pointLight position={[4.6, 2.4, -1.3]} intensity={6} distance={7} color="#FFD9A0" />
        <pointLight position={[-2.3, 2.6, -0.4]} intensity={8} distance={10} color="#FFE7C2" />
        <Office />
        <OrbitControls makeDefault enableDamping dampingFactor={0.08} minDistance={8} maxDistance={70} maxPolarAngle={1.25} />
        <CameraRig />
        {cfg.postFx && <Suspense fallback={null}><PostFx cfg={cfg} /></Suspense>}
      </Canvas>
    </GLBoundary>
  );
}
