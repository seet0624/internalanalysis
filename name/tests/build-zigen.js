// 重做名字审核网页里的大小字根表（ZIGEN）：
//   curl -O https://raw.githubusercontent.com/cjkvi/cjkvi-ids/master/ids.txt
//   node name/tests/build-zigen.js ids.txt
// 拆字资料来自 cjkvi-ids（CHISE IDS）；这里只整理出「哪些字含这些字根」，印出来贴进 index.html 的 var ZIGEN。
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const PY = JSON.parse(html.match(/var PY = (\{.*?\});/)[1]);
const have = new Set(); for (const s in PY) for (const c of PY[s]) have.add(c);
const ids = {};
for (const line of fs.readFileSync(process.argv[2], 'utf8').split('\n')) {
  const f = line.split('\t'); if (f.length < 3) continue;
  ids[f[1]] = f.slice(2).map(x => x.replace(/\[[^\]]*\]/g, ''));
}
// 手动补正：壴 上面是士（喜、嘉、鼓、彭…）；寺 上面是土不是士
ids['壴'] = ['⿱士豆']; ids['寺'] = ['⿱土寸'];
const memo = {};
function parts(ch, seen) {
  if (memo[ch]) return memo[ch]; const out = new Set([ch]); seen = seen || new Set(); if (seen.has(ch)) return out; seen.add(ch);
  for (const d of ids[ch] || []) for (const c of Array.from(d)) { if (/[⿰-⿿]/.test(c) || c === ch) continue; for (const p of parts(c, seen)) out.add(p); }
  return (memo[ch] = out);
}
const TARGET = { big: ['君', '大', '王', '冠', '首', '令', '长', '長', '至', '尊'], small: ['小', '次', '亚', '亞', '丞', '臣', '士', '工', '力', '少', '寸'] };
const out = {};
for (const k of [...TARGET.big, ...TARGET.small]) out[k] = '';
for (const ch of have) { const ps = parts(ch); for (const k in out) if (ps.has(k)) out[k] += ch; }
console.log(JSON.stringify(out));
