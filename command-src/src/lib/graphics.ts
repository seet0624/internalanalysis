// 画质分三档（做法参考开源的 Hermes3D，MIT 授权：https://github.com/iamlukethedev/Hermes3D）
// low 低：不做后期处理、阴影小，弱电脑 / 没有显卡（软件绘图）自动用这档
// balanced 标准：环境光遮蔽（角落、桌底的自然阴影）、泛光（灯笼、台灯会发光）、柔和阴影、抗锯齿
// ultra 极致：更大的阴影图、整个园区都有阴影
export type Quality = 'low' | 'balanced' | 'ultra';

export type QualityConfig = {
  shadowMapSize: number;
  maxDpr: number;
  postFx: boolean;
  ao: boolean;
  aoQuality: 'performance' | 'low' | 'medium' | 'high';
  bloom: boolean;
  smaa: boolean;
  siteShadows: boolean;      // 整个园区看的时候也有阴影
  env: boolean;              // HDRI 环境光（木头、大理石、金属的真实反光）
};

const CONFIGS: Record<Quality, QualityConfig> = {
  low: { shadowMapSize: 1024, maxDpr: 1.25, postFx: false, ao: false, aoQuality: 'performance', bloom: false, smaa: false, siteShadows: false, env: false },
  balanced: { shadowMapSize: 2048, maxDpr: 1.5, postFx: true, ao: true, aoQuality: 'low', bloom: true, smaa: true, siteShadows: false, env: true },
  ultra: { shadowMapSize: 4096, maxDpr: 2, postFx: true, ao: true, aoQuality: 'medium', bloom: true, smaa: true, siteShadows: true, env: true }
};
export const qualityConfig = (q: Quality) => CONFIGS[q];
export const isQuality = (v: unknown): v is Quality => v === 'low' || v === 'balanced' || v === 'ultra';

// 显卡是软件模拟的（SwiftShader、llvmpipe…）：跑不动整套效果，还可能整个 3D 白掉，要先降到低档
let softwareProbe: boolean | null = null;
export function detectSoftwareWebGL(): boolean {
  if (softwareProbe !== null) return softwareProbe;
  try {
    const c = document.createElement('canvas');
    const gl = (c.getContext('webgl2') ?? c.getContext('webgl')) as WebGLRenderingContext | null;
    if (!gl) return (softwareProbe = true);
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const name = String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    softwareProbe = /swiftshader|llvmpipe|softpipe|software|basic render/i.test(name);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  } catch { softwareProbe = false; }
  return softwareProbe;
}
export const defaultQuality = (): Quality => (detectSoftwareWebGL() ? 'low' : 'balanced');
