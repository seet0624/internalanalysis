// 检查指挥中心资料（src/data/*.json）有没有写错：npm run check
import { readFileSync } from 'node:fs';
const read = (f) => JSON.parse(readFileSync(new URL(`../src/data/${f}.json`, import.meta.url), 'utf8'));
const floors = read('floors'), depts = read('departments'), people = read('people'), tasks = read('tasks'), msgs = read('messages'), projects = read('projects');
const W = 36, D = 22, KINDS = ['office', 'exec', 'meeting', 'board', 'lounge', 'coffee', 'garden', 'solar', 'pavilion', 'server', 'compute', 'network', 'power', 'monitor', 'maintenance', 'reception', 'waiting', 'security', 'showroom', 'training', 'core'];
const STATUS = ['working', 'available', 'thinking', 'waiting', 'completed', 'error'];
const errors = [], warns = [];
const isL = (v) => v && typeof v.zh === 'string' && typeof v.en === 'string' && v.zh && v.en;
const dup = (list, what) => { const seen = new Set(); for (const x of list) { if (seen.has(x.id)) errors.push(`${what} id 重复：${x.id}`); seen.add(x.id); } };
dup(floors, '楼层'); dup(depts, '部门'); dup(people, '员工'); dup(tasks, '任务'); dup(msgs, '讯息'); dup(projects, '项目');
const rooms = new Map();
for (const f of floors) {
  if (!isL(f.name) || !isL(f.description)) errors.push(`楼层 ${f.id} 的 name / description 要有 zh 和 en`);
  for (const r of f.rooms) {
    if (rooms.has(r.id)) errors.push(`房间 id 重复：${r.id}`);
    rooms.set(r.id, { ...r, floor: f.id });
    if (!KINDS.includes(r.kind)) errors.push(`房间 ${r.id} 的 kind「${r.kind}」不认识`);
    if (r.x < 0 || r.z < 0 || r.x + r.w > W + 1e-6 || r.z + r.d > D + 1e-6) errors.push(`房间 ${r.id} 超出楼层（${W}×${D}）`);
    if (r.z < 12.5 && r.z + r.d > 9.5) errors.push(`房间 ${r.id} 压到中间走廊（z 9.5–12.5）`);
  }
  for (let i = 0; i < f.rooms.length; i++) for (let j = i + 1; j < f.rooms.length; j++) {
    const a = f.rooms[i], b = f.rooms[j];
    if (a.x < b.x + b.w - 1e-6 && b.x < a.x + a.w - 1e-6 && a.z < b.z + b.d - 1e-6 && b.z < a.z + a.d - 1e-6) errors.push(`${f.id} 房间重叠：${a.id} 和 ${b.id}`);
  }
}
const deptIds = new Set(depts.map((d) => d.id));
for (const d of depts) {
  const r = rooms.get(d.room);
  if (!r) errors.push(`部门 ${d.id} 的房间 ${d.room} 不存在`);
  else if (r.floor !== d.floor) errors.push(`部门 ${d.id} 写 ${d.floor}，房间 ${d.room} 却在 ${r.floor}`);
  if (!/^#[0-9a-f]{6}$/i.test(d.color)) errors.push(`部门 ${d.id} 的颜色要写 #RRGGBB`);
  if (!isL(d.name) || !isL(d.summary)) errors.push(`部门 ${d.id} 的 name / summary 要有 zh 和 en`);
}
for (const p of people) {
  if (!deptIds.has(p.dept)) errors.push(`员工 ${p.id} 的部门 ${p.dept} 不存在`);
  if (!STATUS.includes(p.status)) errors.push(`员工 ${p.id} 的 status「${p.status}」不认识`);
  if (!['human', 'ai'].includes(p.type)) errors.push(`员工 ${p.id} 的 type 要写 human 或 ai`);
  if (!p.demo && !p.real) warns.push(`员工 ${p.id} 没标 demo 也没标 real（示范资料请加 "demo": true）`);
}
const pids = new Set(people.map((p) => p.id));
for (const t of tasks) { if (!deptIds.has(t.dept)) errors.push(`任务 ${t.id} 的部门 ${t.dept} 不存在`); if (t.owner && !pids.has(t.owner)) warns.push(`任务 ${t.id} 的负责人 ${t.owner} 不在 people.json`); }
for (const m of msgs) if (m.from !== 'system' && !pids.has(m.from)) warns.push(`讯息 ${m.id} 的发送人 ${m.from} 不在 people.json`);
// 工位够不够（客服部真实名单在 hq/company.js，执行时才合进来，这里不算）
for (const d of depts) {
  const r = rooms.get(d.room); if (!r || d.team) continue;
  const n = people.filter((p) => p.dept === d.id).length;
  if (r.kind === 'office' && r.seats && n > r.seats) warns.push(`部门 ${d.id} 有 ${n} 人，房间只有 ${r.seats} 个工位（多的人会站着）`);
}
for (const w of warns) console.log('⚠ ' + w);
for (const e of errors) console.log('✗ ' + e);
console.log(errors.length ? `资料有 ${errors.length} 个错误` : `资料没问题：${floors.length} 层、${depts.length} 个部门、${people.length} 位示范员工、${tasks.length} 个任务`);
process.exit(errors.length ? 1 : 0);
