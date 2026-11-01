import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 打包到网站的 /command/ 文件夹；相对路径，放到任何网址底下都能用（GitHub Pages、阿里云 OSS）
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: '../command',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: { three: ['three'], r3f: ['@react-three/fiber', '@react-three/drei'] }
      }
    }
  }
});
