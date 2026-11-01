import { Component, useEffect, type ReactNode } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { useStore } from '../lib/store';
import { useLang } from '../lib/i18n';
import { Building } from './Building';
import { CameraRig } from './CameraRig';

// 环境反光（本地产生，不用下载 HDR）
function Env() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    const pm = new THREE.PMREMGenerator(gl);
    const env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.45;
    if (location.search.includes('debug')) Object.assign(window, { cmdGL: gl, cmdScene: scene });   // ?debug：主控台看绘制次数、三角形数
    return () => { env.dispose(); pm.dispose(); };
  }, [gl, scene]);
  return null;
}

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
  const fallback = <div className="grid h-full place-items-center p-6 text-center text-sm text-muted">{t('no3d')}</div>;
  if (!hasWebGL()) return fallback;
  const high = s.settings.quality === 'high';
  // 工作面板（功能、任务……）盖住大楼时，3D 只在需要时才画，省电
  const covered = s.section !== 'overview' && s.section !== 'building';
  return (
    <GLBoundary fallback={fallback}>
      <Canvas
        frameloop={covered ? 'demand' : 'always'}
        dpr={high ? [1, 1.75] : [1, 1]}
        gl={{ antialias: high, alpha: true, powerPreference: 'high-performance' }}
        camera={{ position: [48, 31, 56], fov: 40, near: 0.5, far: 800 }}
        onPointerMissed={() => s.selectPerson(null)}
      >
        <Env />
        <hemisphereLight args={['#FFF1DC', '#1A1410', 0.8]} />
        <directionalLight position={[30, 70, 28]} intensity={1.55} color="#FFEBD0" />
        <directionalLight position={[-40, 25, -20]} intensity={0.3} color="#F3EAD3" />
        <Building />
        <OrbitControls makeDefault enableDamping dampingFactor={0.08} minDistance={6} maxDistance={160} />
        <CameraRig />
      </Canvas>
    </GLBoundary>
  );
}
