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
  return (
    <GLBoundary fallback={fallback}>
      <Canvas
        dpr={high ? [1, 1.75] : [1, 1]}
        gl={{ antialias: high, alpha: true, powerPreference: 'high-performance' }}
        camera={{ position: [48, 31, 56], fov: 40, near: 0.5, far: 800 }}
        onPointerMissed={() => s.selectPerson(null)}
      >
        <Env />
        <hemisphereLight args={['#C4DBFF', '#0A1024', 0.75]} />
        <directionalLight position={[30, 70, 28]} intensity={1.5} />
        <directionalLight position={[-40, 25, -20]} intensity={0.35} color="#6EA8FF" />
        <Building />
        <OrbitControls makeDefault enableDamping dampingFactor={0.08} minDistance={6} maxDistance={160} />
        <CameraRig />
      </Canvas>
    </GLBoundary>
  );
}
