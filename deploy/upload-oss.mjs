// 把审核系统上传到阿里云 OSS。
//
// 要先设好这几个环境变量（GitHub 上线时放在仓库的 Secrets 里）：
//   OSS_ACCESS_KEY_ID      上传专用 RAM 用户的 AccessKey ID
//   OSS_ACCESS_KEY_SECRET  上传专用 RAM 用户的 AccessKey Secret
//   OSS_BUCKET             Bucket 名称，例如 shenhe-site
//   OSS_REGION             可不填，默认 oss-cn-hongkong（香港）
//   OSS_ENDPOINT           可不填，要走别的接入点（例如传输加速）才填
//
// 只想看会上传哪些文件、不真的上传：DRY_RUN=1 node deploy/upload-oss.mjs
// 只上传、不删除：Bucket 里以前上传过、现在仓库已经没有的文件会留着，要删到 OSS 控制台手动删。

import { readdir, readFile } from 'node:fs/promises';
import { join, relative, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

// 不放上网站的文件夹：仓库设置、上线工具
const SKIP_DIRS = new Set(['.git', '.github', 'deploy', 'node_modules']);

// 只上传网页用得到的文件类型。.xlsx / .zip / .json（名字审核存档）这类可能有客户资料，一律不传
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

// 网页每次打开都先问一下有没有新版（改了马上看得到）；组件、图片缓存一天
function cacheFor(ext) {
  return ext === '.html' ? 'no-cache' : 'public, max-age=86400';
}

const skipped = [];

async function listSite(dir) {
  const out = [];
  for (const ent of await readdir(dir, { withFileTypes: true })) {
    if (ent.name.startsWith('.')) continue;
    const full = join(dir, ent.name);
    if (ent.isDirectory()) {
      if (!SKIP_DIRS.has(ent.name)) out.push(...await listSite(full));
    } else if (TYPES[extname(ent.name).toLowerCase()]) {
      out.push(full);
    } else {
      skipped.push(relative(ROOT, full).split(sep).join('/'));
    }
  }
  return out;
}

const files = (await listSite(ROOT)).sort();
const plan = files.map((full) => {
  const ext = extname(full).toLowerCase();
  return { full, key: relative(ROOT, full).split(sep).join('/'), type: TYPES[ext], cache: cacheFor(ext) };
});
if (skipped.length) console.log('不上传（不是网页文件）：' + skipped.join('、'));

if (!plan.some((f) => f.key === 'index.html')) {
  console.error('找不到首页 index.html，停止上传');
  process.exit(1);
}

if (process.env.DRY_RUN) {
  for (const f of plan) console.log(`${f.key}\t${f.type}\t${f.cache}`);
  console.log(`共 ${plan.length} 个文件（DRY_RUN，没有上传）`);
  process.exit(0);
}

const missing = ['OSS_ACCESS_KEY_ID', 'OSS_ACCESS_KEY_SECRET', 'OSS_BUCKET'].filter((k) => !process.env[k]);
if (missing.length) {
  console.error('缺少环境变量：' + missing.join('、'));
  process.exit(1);
}

const { default: OSS } = await import('ali-oss');
const client = new OSS({
  region: process.env.OSS_REGION || 'oss-cn-hongkong',
  endpoint: process.env.OSS_ENDPOINT || undefined,
  accessKeyId: process.env.OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
  bucket: process.env.OSS_BUCKET,
  secure: true
});

let failed = 0;
for (const f of plan) {
  try {
    await client.put(f.key, await readFile(f.full), {
      mime: f.type,
      headers: { 'Content-Type': f.type, 'Cache-Control': f.cache }
    });
    console.log('已上传 ' + f.key);
  } catch (e) {
    failed++;
    console.error(`上传失败 ${f.key}：${e.code || ''} ${e.message}`);
  }
}

if (failed) {
  console.error(`${failed} 个文件上传失败`);
  process.exit(1);
}
console.log(`完成：${plan.length} 个文件已上传到 ${process.env.OSS_BUCKET}`);
