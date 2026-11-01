import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const three = fileURLToPath(new URL('./node_modules/three', import.meta.url));

// 打包到网站的 /command/ 文件夹；相对路径，放到任何网址底下都能用（GitHub Pages、阿里云 OSS）
export default defineConfig({
  plugins: [react()],
  base: './',
  // hq/campus.js（首页和指挥中心共用的公司外观）放在 command-src 外面，它 import 的 three 要指到这里
  resolve: { alias: [{ find: /^three$/, replacement: three + '/build/three.module.js' }, { find: /^three\/(.*)$/, replacement: three + '/$1' }] },
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
