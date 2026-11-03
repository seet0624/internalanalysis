// 镜头：斜上方看整间办公室（像参考图的等距视角）；2D 从正上方看。换部门、放大缩小、重设都平滑移动。
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { OrbitControls as OrbitImpl } from 'three-stdlib';
import { useStore } from '../lib/store';
import { damp } from './shared';

const DIR = new THREE.Vector3(1, 1.02, 1.16).normalize();   // 从右前方高处看（看得到后墙和左墙）
const TARGET = new THREE.Vector3(1.0, 0.3, 0.7);   // 稍微往右前：画面右边有任务面板，办公室往左一点

export function CameraRig() {
  const s = useStore();
  const camera = useThree((st) => st.camera);
  const controls = useThree((st) => st.controls) as unknown as OrbitImpl | null;
  const size = useThree((st) => st.size);
  const goal = useRef({ pos: new THREE.Vector3(17, 17, 19.5), target: TARGET.clone() });
  const moving = useRef(true);
  const lastCam = useRef(s.cam.n);
  // 画面窄（手机、旁边有面板）就站远一点，整间都看得到
  const aspect = size.width / Math.max(1, size.height);
  const far = aspect < 0.8 ? 1.75 : aspect < 1.2 ? 1.35 : 1;

  const home = () => {
    if (s.mode === '2d') return { pos: new THREE.Vector3(-0.3, 30 * far, 0.6), target: new THREE.Vector3(-0.3, 0, 0.2) };
    return { pos: TARGET.clone().addScaledVector(DIR, 26.5 * far), target: TARGET.clone() };
  };

  // 换部门 / 换 2D-3D / 画面大小变了：飞回去
  useEffect(() => {
    goal.current = home();
    moving.current = true;
  }, [s.room, s.mode, far]); // eslint-disable-line react-hooks/exhaustive-deps

  // 放大、缩小、重设
  useEffect(() => {
    if (s.cam.n === lastCam.current || !controls) return;
    lastCam.current = s.cam.n;
    if (s.cam.kind === 'reset') { goal.current = home(); moving.current = true; return; }
    const target = controls.target.clone();
    const off = camera.position.clone().sub(target).multiplyScalar(s.cam.kind === 'zoomIn' ? 0.75 : 1.33);
    off.setLength(THREE.MathUtils.clamp(off.length(), 8, 65));
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

  // 2D 只能平移、缩放；3D 只能从前面、右边看（后面、左边是墙）
  useEffect(() => {
    if (!controls) return;
    const flat = s.mode === '2d';
    controls.enableRotate = !flat;
    controls.maxPolarAngle = flat ? 0.05 : 1.25;
    controls.minPolarAngle = 0;
    controls.minAzimuthAngle = flat ? -Infinity : -0.15;
    controls.maxAzimuthAngle = flat ? Infinity : Math.PI / 2 + 0.1;
    controls.autoRotate = false;
  }, [controls, s.mode]);

  useFrame((_, dt) => {
    if (!moving.current || !controls) return;
    const k = damp(Math.min(dt, 0.1), 3.4);
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
