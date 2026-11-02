import { Bloom, EffectComposer, N8AO, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import type { QualityConfig } from '../lib/graphics';

// 后期处理（参考 Hermes3D）：环境光遮蔽（角落、桌底、屋檐下的自然阴影）、泛光（灯笼、台灯、屏幕）、暗角、电影色调、抗锯齿
export default function PostFx({ cfg }: { cfg: QualityConfig }) {
  if (!cfg.postFx) return null;
  return (
    <EffectComposer multisampling={0}>
      {cfg.ao ? <N8AO halfRes depthAwareUpsampling quality={cfg.aoQuality} aoRadius={0.6} distanceFalloff={0.9} intensity={2.2} /> : <></>}
      {cfg.bloom ? <Bloom mipmapBlur intensity={0.45} luminanceThreshold={0.95} luminanceSmoothing={0.25} /> : <></>}
      <Vignette eskil={false} offset={0.28} darkness={0.45} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      {cfg.smaa ? <SMAA /> : <></>}
    </EffectComposer>
  );
}

