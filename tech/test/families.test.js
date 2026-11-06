// 审核部的考题：家人订单（哪些单会连成一家、为什么）。改规则前先跑 `npm test`，有一题不对就不要上线。
// 只用假名字：仓库是公开的，真实学员资料不能放进来。
const test = require('node:test');
const assert = require('node:assert');
const ExcelJS = require('exceljs');
const E = require('../review-engine.js');

const HEAD = ['序号', '订单编号', '使用人姓名', '会员姓名', '新名字姓氏', '父亲名字', '母亲名字', '兄弟姐妹', '子女', '备注'];
let seq = 0;
const no = () => '2611' + String(1000000000 + ++seq);   // 14 位订单编号

async function sheet(rows) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('命名');
  ws.addRow(['命名配制信息表']);
  ws.addRow(HEAD);
  rows.forEach((r, i) => ws.addRow(HEAD.map((h) => (h === '序号' ? i + 1 : r[h] ?? ''))));
  return { name: '名正言顺技术单.xlsx', buffer: Buffer.from(await wb.xlsx.writeBuffer()) };
}
const families = async (rows) => (await E.processFiles([await sheet(rows)], {})).families;
const persons = (g) => g.members.map((m) => m.person).sort();

test('还没取名的新生儿单不会互相连成一家', async () => {
  const rows = ['薛', '秦', '高', '杨', '王', '宋'].map((sn) => ({
    // 会员姓名是家长（真实单就是这样）：「新生儿」只出现在使用人姓名，才考得到占位字的规则
    订单编号: no(), 使用人姓名: sn === '薛' ? '薛新生儿' : '新生儿', 会员姓名: sn + '家长', 新名字姓氏: sn,
    父亲名字: sn + '大明', 母亲名字: '张小红' + sn, 兄弟姐妹: '外公外婆名字：无，爷爷奶奶：无', 备注: '新生儿还未出生，暂缓'
  }));
  assert.deepStrictEqual(await families(rows), []);
});

test('爷爷奶奶 / 外公外婆这些称呼不算人名', async () => {
  const rows = [
    { 订单编号: no(), 使用人姓名: '赵一鸣', 会员姓名: '赵一鸣', 兄弟姐妹: '爷爷奶奶：赵老三、钱老四；外公外婆：孙大有' },
    { 订单编号: no(), 使用人姓名: '周二妹', 会员姓名: '周二妹', 兄弟姐妹: '爷爷奶奶：周大福、吴小花；外公外婆：郑天明' }
  ];
  assert.deepStrictEqual(await families(rows), []);
});

test('妈妈的子女栏写了儿子，儿子也有单 → 一家，并写出为什么', async () => {
  const rows = [
    { 订单编号: no(), 使用人姓名: '林美玉', 会员姓名: '林美玉', 子女: '1人，儿子：黄子轩' },
    { 订单编号: no(), 使用人姓名: '黄子轩', 会员姓名: '林美玉', 母亲名字: '林美玉' }
  ];
  const fam = await families(rows);
  assert.strictEqual(fam.length, 1);
  assert.deepStrictEqual(persons(fam[0]), ['林美玉', '黄子轩']);
  assert.ok(fam[0].why.some((t) => t.includes('黄子轩')), '为什么要写出连起来的名字：' + fam[0].why.join('；'));
});

test('备注写了另一张单的订单号 → 一家', async () => {
  const a = no();
  const rows = [
    { 订单编号: a, 使用人姓名: '何晓东', 会员姓名: '何晓东' },
    { 订单编号: no(), 使用人姓名: '何晓西', 会员姓名: '何晓西', 备注: '哥哥的订单号：' + a }
  ];
  const fam = await families(rows);
  assert.strictEqual(fam.length, 1);
  assert.ok(fam[0].why.some((t) => t.includes('订单号')));
});

test('输出的 Excel：家人订单的订单编号有批注，还多一页「说明」', async () => {
  const rows = [
    { 订单编号: no(), 使用人姓名: '林美玉', 会员姓名: '林美玉', 子女: '1人，儿子：黄子轩' },
    { 订单编号: no(), 使用人姓名: '黄子轩', 会员姓名: '林美玉', 母亲名字: '林美玉' }
  ];
  const [res] = await E.processFiles([await sheet(rows)], {});
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(res.outputs[0].buffer);
  assert.ok(wb.getWorksheet('说明'), '要有说明页');
  const notes = [];
  wb.worksheets[0].eachRow((row) => row.eachCell((c) => { if (c.note) notes.push(String(c.note)); }));
  assert.ok(notes.length >= 2 && notes.every((n) => n.includes('家人订单')), '订单编号要有家人批注：' + notes.join(' | '));
});

test('输出文件再上传一次：「说明」不会重复加', async () => {
  const rows = [
    { 订单编号: no(), 使用人姓名: '林美玉', 会员姓名: '林美玉', 子女: '1人，儿子：黄子轩' },
    { 订单编号: no(), 使用人姓名: '黄子轩', 会员姓名: '林美玉', 母亲名字: '林美玉' }
  ];
  const [first] = await E.processFiles([await sheet(rows)], {});
  const [again] = await E.processFiles([{ name: '名正言顺技术单.xlsx', buffer: Buffer.from(first.outputs[0].buffer) }], {});
  const count = async (buf) => { const wb = new ExcelJS.Workbook(); await wb.xlsx.load(buf); return wb.getWorksheet('说明').rowCount; };
  assert.strictEqual(await count(again.outputs[0].buffer), await count(first.outputs[0].buffer));
});

// 你的规则：同一个文件里查到家人才上色；文件里只有一个人，就不能有颜色
const FAMILY_ARGB = ['FFBDD7EE', 'FFC6EFCE', 'FFFFEB9C', 'FFF8CBAD', 'FFD9C3E9', 'FFB7E4E0', 'FFF4CCE0', 'FFD9D9D9'];
async function look(buf) {
  const wb = new ExcelJS.Workbook(); await wb.xlsx.load(buf);
  let colored = 0, notes = 0;
  wb.worksheets[0].eachRow((row, r) => { if (r < 3) return; row.eachCell((c) => {
    const a = c.fill && c.fill.fgColor && String(c.fill.fgColor.argb).toUpperCase();
    if (FAMILY_ARGB.includes(a)) colored++;
    if (c.note) notes++;
  }); });
  return { colored, notes, hasNote: !!wb.getWorksheet('说明') };
}

test('家人被分到不同文件（妈妈有问题、儿子没问题）：两个文件都只有一个人 → 都不上色', async () => {
  const rows = [
    { 订单编号: no(), 使用人姓名: '林美玉', 会员姓名: '林美玉', 子女: '1人，儿子：黄子轩', 备注: '暂缓，等资料' },
    { 订单编号: no(), 使用人姓名: '黄子轩', 会员姓名: '林美玉', 母亲名字: '林美玉' }
  ];
  const [res] = await E.processFiles([await sheet(rows)], {});
  assert.ok(res.outputs.length >= 2, '应该分成两个文件：' + res.outputs.map((o) => o.name).join(' | '));
  for (const o of res.outputs) assert.deepStrictEqual(await look(o.buffer), { colored: 0, notes: 0, hasNote: false }, o.name);
});

test('旧的输出文件（一个人、有家人颜色 / 批注 / 说明页）再上传 → 全部拿掉', async () => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load((await sheet([{ 订单编号: no(), 使用人姓名: '林美玉', 会员姓名: '林美玉', 子女: '1人，儿子：黄子轩' }])).buffer);
  wb.worksheets[0].getRow(3).eachCell((c) => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEB9C' } }; });
  wb.worksheets[0].getRow(3).getCell(2).note = '家人订单 第2组（绿色）\n同组还有：黄子轩（名正言顺）';
  wb.addWorksheet('说明').addRow(['第2组（绿色）', '林美玉、黄子轩']);
  const [res] = await E.processFiles([{ name: '名正言顺技术单.xlsx', buffer: Buffer.from(await wb.xlsx.writeBuffer()) }], {});
  for (const o of res.outputs) assert.deepStrictEqual(await look(o.buffer), { colored: 0, notes: 0, hasNote: false }, o.name);
});

// 网页用 review-engine.js?v=<版本> 载入：改了引擎却没换版本号，客服的浏览器会继续用旧的引擎
test('tech/index.html 载入的引擎版本号 = 引擎档案的 md5 前 10 码', () => {
  const fs = require('fs'), path = require('path'), crypto = require('crypto');
  const dir = path.join(__dirname, '..');
  const want = crypto.createHash('md5').update(fs.readFileSync(path.join(dir, 'review-engine.js'))).digest('hex').slice(0, 10);
  const got = (fs.readFileSync(path.join(dir, 'index.html'), 'utf8').match(/review-engine\.js\?v=([0-9a-f]+)/) || [])[1];
  assert.strictEqual(got, want, '把 tech/index.html 的 review-engine.js?v= 改成 ' + want);
});
