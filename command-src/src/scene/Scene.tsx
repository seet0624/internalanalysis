import { Component, useEffect, useMemo, type ReactNode } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { useStore } from '../lib/store';
import { useLang } from '../lib/i18n';
import { Building } from './Building';
import { CameraRig } from './CameraRig';
import { Surroundings } from './Surroundings';
import { siteOf } from './constants';

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

// 太阳：看单层楼时开真实阴影（家具、人物投影到地板），整栋大楼时不开（上面的楼板会把下面整层遮暗）
function SunLight({ high }: { high: boolean }) {
  const s = useStore();
  const f = s.floor ? s.model.floors.find((x) => x.id === s.floor) : null;
  const st = f ? siteOf(f.id) : { x: 0, z: 0 };
  const light = useMemo(() => new THREE.DirectionalLight('#FFF4E2', 1.8), []);
  useEffect(() => {
    light.position.set(st.x + 18, 30, st.z + 22);
    light.target.position.set(st.x, 0, st.z);
    light.target.updateMatrixWorld();
    light.castShadow = high && !!f;
    Object.assign(light.shadow.camera, { left: -24, right: 24, top: 18, bottom: -18, near: 1, far: 90 });
    light.shadow.camera.updateProjectionMatrix();
    light.shadow.mapSize.set(2048, 2048);
    light.shadow.bias = -0.0004; light.shadow.normalBias = 0.03; light.shadow.radius = 4;
  }, [light, st.x, st.z, high, f]);
  return <primitive object={light}><primitive object={light.target} /></primitive>;
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
        shadows={high ? 'soft' : false}
        dpr={high ? [1, 1.75] : [1, 1]}
        gl={{ antialias: high, alpha: false, powerPreference: 'high-performance' }}
        camera={{ position: [70, 115, 175], fov: 40, near: 0.5, far: 1200 }}
        onPointerMissed={() => s.selectPerson(null)}
      >
        <Env />
        <color attach="background" args={['#D7E7F6']} />
        <fog attach="fog" args={['#E6EEF0', 220, 560]} />
        <Surroundings />
        <hemisphereLight args={['#FFFFFF', '#D9D2C5', 0.85]} />
        <SunLight high={high} />
        <directionalLight position={[-40, 25, -20]} intensity={0.3} color="#F3EAD3" />
        <Building />
        <OrbitControls makeDefault enableDamping dampingFactor={0.08} minDistance={6} maxDistance={320} maxPolarAngle={Math.PI * 0.47} />
        <CameraRig />
      </Canvas>
    </GLBoundary>
  );
}
