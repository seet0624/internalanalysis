// 镜头：整栋 / 单层 3D / 单层 2D 之间平滑移动；放大缩小、重设。
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { OrbitControls as OrbitImpl } from 'three-stdlib';
import { useStore } from '../lib/store';
import { damp } from './shared';
import { floorY } from './constants';

const OVERVIEW = { pos: new THREE.Vector3(48, 31, 56), target: new THREE.Vector3(0, 10.5, 0) };

export function CameraRig() {
  const s = useStore();
  const camera = useThree((st) => st.camera);
  const controls = useThree((st) => st.controls) as unknown as OrbitImpl | null;
  const goal = useRef({ pos: OVERVIEW.pos.clone(), target: OVERVIEW.target.clone() });
  const moving = useRef(true);
  const lastCam = useRef(s.cam.n);
  const narrow = useThree((st) => st.size.width < 900);

  const home = () => {
    const f = s.floor ? s.model.floors.find((x) => x.id === s.floor) : null;
    if (!f) {
      const k = narrow ? 1.35 : 1;
      return { pos: OVERVIEW.pos.clone().sub(OVERVIEW.target).multiplyScalar(k).add(OVERVIEW.target), target: OVERVIEW.target.clone() };
    }
    const y = floorY(f.level);
    if (s.mode === '2d') return { pos: new THREE.Vector3(0, y + (narrow ? 62 : 44), 0.6), target: new THREE.Vector3(0, y, 0) };
    // 客服中国仪表板：镜头近一点，看得清每个人
    const k = (narrow ? 1.5 : 1.08) * (s.csView ? 0.78 : 1);
    return { pos: new THREE.Vector3(18 * k, y + 24 * k, 26 * k), target: new THREE.Vector3(-0.5, y, 1.5) };
  };

  // 换楼层 / 换 2D-3D：飞过去
  useEffect(() => {
    goal.current = home();
    moving.current = true;
  }, [s.floor, s.mode, narrow, s.csView]); // eslint-disable-line react-hooks/exhaustive-deps

  // 放大、缩小、重设
  useEffect(() => {
    if (s.cam.n === lastCam.current || !controls) return;
    lastCam.current = s.cam.n;
    if (s.cam.kind === 'reset') { goal.current = home(); moving.current = true; return; }
    const target = controls.target.clone();
    const off = camera.position.clone().sub(target).multiplyScalar(s.cam.kind === 'zoomIn' ? 0.72 : 1.38);
    if (off.length() < 6) off.setLength(6);
    if (off.length() > 150) off.setLength(150);
    goal.current = { pos: target.clone().add(off), target };
    moving.current = true;
  }, [s.cam, controls]); // eslint-disable-line react-hooks/exhaustive-deps

  // 使用者自己拖曳就停止飞行
  useEffect(() => {
    if (!controls) return;
    const stop = () => { moving.current = false; };
    controls.addEventListener('start', stop);
    return () => controls.removeEventListener('start', stop);
  }, [controls]);

  // 2D 只能平移、缩放；3D 不能转到地面下
  useEffect(() => {
    if (!controls) return;
    const flat = s.mode === '2d' && !!s.floor;
    controls.enableRotate = !flat;
    controls.maxPolarAngle = flat ? 0.05 : 1.38;
    controls.minPolarAngle = 0;
    controls.autoRotate = !s.floor && s.settings.autoRotate;
    controls.autoRotateSpeed = 0.5;
  }, [controls, s.mode, s.floor, s.settings.autoRotate]);

  useFrame((_, dt) => {
    if (!moving.current || !controls) return;
    const k = damp(Math.min(dt, 0.1), 3.2);
    camera.position.lerp(goal.current.pos, k);
    controls.target.lerp(goal.current.target, k);
    // 飞行中不套用 OrbitControls 的角度限制（不然切 2D 时会卡在斜的方向），到了再交还
    camera.lookAt(controls.target);
    if (camera.position.distanceTo(goal.current.pos) < 0.05 && controls.target.distanceTo(goal.current.target) < 0.05) {
      moving.current = false;
      controls.update();
    }
  });
  return null;
}
