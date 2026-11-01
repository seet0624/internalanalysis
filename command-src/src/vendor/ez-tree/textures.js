// 原版 ez-tree 会把 16 张 1K 贴图全部打包（约 4MB）。这里只留指挥中心用到的几张、缩小过，国内载入快。
import * as THREE from 'three';
import oakColor from './assets/bark_oak_color.jpg';
import oakNormal from './assets/bark_oak_normal.jpg';
import birchColor from './assets/bark_birch_color.jpg';
import ashLeaves from './assets/leaves_ash.png';
import aspenLeaves from './assets/leaves_aspen.png';
import oakLeaves from './assets/leaves_oak.png';
import pineLeaves from './assets/leaves_pine.png';

const textureLoader = new THREE.TextureLoader();
const loadTexture = (url, srgb = true) => {
  const texture = textureLoader.load(url);
  texture.premultiplyAlpha = true;
  if (srgb) texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

const oak = { color: loadTexture(oakColor), normal: loadTexture(oakNormal, false) };
const birch = { color: loadTexture(birchColor), normal: oak.normal };
const textures = {
  bark: { oak, pine: oak, willow: oak, birch },
  leaves: { ash: loadTexture(ashLeaves), aspen: loadTexture(aspenLeaves), oak: loadTexture(oakLeaves), pine: loadTexture(pineLeaves) }
};

export function getBarkTexture(barkType, fileType, scale = { x: 1, y: 1 }) {
  const set = textures.bark[barkType] || oak;
  const texture = set[fileType];
  if (!texture) return null;   // 没有 ao / roughness 贴图
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.x = scale.x;
  texture.repeat.y = 1 / scale.y;
  return texture;
}

export function getLeafTexture(leafType) {
  return textures.leaves[leafType] || textures.leaves.oak;
}
