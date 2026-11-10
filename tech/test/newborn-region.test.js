// 审核部的考题：新生儿判断、国内 / 海外判断。制表日 10.11.2026。只用假资料。
const test = require('node:test');
const assert = require('node:assert');
const ExcelJS = require('exceljs');
const E = require('../review-engine.js');

const HEAD = ['序号', '订单编号', '使用人姓名', '会员姓名', '商品标题', '新名字姓氏', '公历生日', '父亲名字', '母亲名字', '名册展示', '备注'];
let seq = 0;
const no = () => '2611' + String(3000000000 + ++seq);
const OPTS = { date: '10.11.2026' };

async function sheet(name, rows, head = HEAD) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('命名');
  ws.addRow(['命名配制信息表']);
  ws.addRow(head);
  rows.forEach((r, i) => ws.addRow(head.map((h) => (h === '序号' ? i + 1 : r[h] ?? ''))));
  return { name, buffer: Buffer.from(await wb.xlsx.writeBuffer()) };
}
const order = (o) => ({ 订单编号: no(), 会员姓名: '陈家长', 商品标题: '名正言顺命名', 新名字姓氏: '陈', 父亲名字: '陈大文', 母亲名字: '李小红', 备注: '身体健康', ...o });
async function one(o, opts = OPTS) {
  const [r] = await E.processFiles([await sheet('名正言顺技术单 10.11.2026（1）.xlsx', [order(o)])], opts);
  return r.orders[0];
}

// [使用人姓名, 公历生日, 备注, 期望新生儿]
const NEWBORN = [
  ['陈新生儿', '', '', true],
  ['陈宝宝', '', '', true],
  ['宝 宝', '', '', true],
  ['陈BB', '', '', true],
  ['ＢＢ', '', '', true],
  ['baby', '', '', true],
  ['陈婴儿', '', '', true],
  ['待产', '', '', true],
  ['未出生', '', '', true],
  ['未取名', '', '', true],
  ['陈男宝', '', '', true],
  ['', '1.10.2026', '', true],            // 日.月.年
  ['', '01-10-2026', '', true],
  ['', '20261001', '', true],
  ['', '46296', '', true],               // Excel 日期数字 = 2026-10-01
  ['陈小明', '2026年10月01日', '', true],  // 已取名的新生儿
  ['', '2025年11月11日', '', true],       // 差一天满一岁
  ['', '2026年12月20日', '', true],       // 还没出生（预产期写在生日栏）
  ['', '未出生', '', true],
  ['', '', '预产期2026年12月20日', true],
  ['陈大明', '1990年01月01日', '', false],
  ['王宝强', '1990年01月01日', '', false],  // 真名有「宝」
  ['林宝儿', '1990年01月01日', '', false],
  ['陈小明', '1990年01月01日', '祝小宝贝健康', false],
  ['Bobby', '1990年01月01日', '', false],   // 英文名里有 bb 不算
  ['', '2025年11月10日', '', false],       // 刚好满一岁
  ['二宝', '', '', true],                  // 整格只写二宝 = 还没取名
  ['张三宝', '', '', false],               // 真名
  ['李二宝', '', '', false],
  ['陈囡囡', '', '', false],
];
for (const [name, bd, note, want] of NEWBORN) {
  test(`新生儿：姓名「${name}」生日「${bd}」备注「${note}」→ ${want ? '是' : '否'}`, async () => {
    const o = await one({ 使用人姓名: name, 公历生日: bd, 备注: note || '身体健康' });
    assert.strictEqual(o.newborn, want, o.flags.map((f) => f.text).join(' | '));
  });
}

test('名字写宝宝、生日却已满一岁 → 有问题，问下单者', async () => {
  const o = await one({ 使用人姓名: '陈宝宝', 公历生日: '2020年01月01日' });
  assert.ok(o.problem, o.flags.map((f) => f.text).join(' | '));
});
test('生日不是真的日期（2月30日）→ 提醒看不懂', async () => {
  const o = await one({ 使用人姓名: '陈大明', 公历生日: '2026年02月30日' });
  assert.ok(!o.newborn && o.flags.some((f) => f.kind === 'birth-odd'));
});
test('生日是很久以后（年份打错）→ 提醒', async () => {
  const o = await one({ 使用人姓名: '陈大明', 公历生日: '2062年10月01日' });
  assert.ok(!o.newborn && o.flags.some((f) => f.kind === 'birth-odd'));
});
test('新生儿文件名：新生儿开头、不写学员名', async () => {
  const [r] = await E.processFiles([await sheet('名正言顺技术单 10.11.2026（1）.xlsx', [order({ 使用人姓名: '陈BB' })])], OPTS);
  assert.deepStrictEqual(r.outputs.map((o) => o.name), ['新生儿名正言顺技术单 10.11.2026（1）.xlsx']);
});

// 国内 / 海外
const adult = (disp) => order({ 使用人姓名: '陈大明', 公历生日: '1990年01月01日', 名册展示: disp });
async function region(file, rows, opts = OPTS, head) { const [r] = await E.processFiles([await sheet(file, rows, head)], opts); return r; }

test('名册展示写简体 → 海外（文件名没有 H 也一样），并提醒', async () => {
  const r = await region('名正言顺技术单 10.11.2026（1）.xlsx', [adult('简体')]);
  assert.strictEqual(r.overseas, true);
  assert.ok(/H\.xlsx$/.test(r.outputs[0].name), r.outputs[0].name);
  assert.ok(r.regionNote);
});
test('名册展示写繁體 → 海外', async () => {
  assert.strictEqual((await region('名正言顺技术单 10.11.2026（1）H.xlsx', [adult('繁體')])).overseas, true);
});
test('名册展示都空 → 国内（文件名有 H 也一样），并提醒', async () => {
  const r = await region('名正言顺技术单 10.11.2026（1）H.xlsx', [adult('')]);
  assert.strictEqual(r.overseas, false);
  assert.ok(!/H\.xlsx$/.test(r.outputs[0].name), r.outputs[0].name);
  assert.ok(r.regionNote);
});
test('名册展示写「无」→ 当空，国内', async () => {
  assert.strictEqual((await region('名正言顺技术单 10.11.2026（1）.xlsx', [adult('无')])).overseas, false);
});
test('名册展示写看不懂的字 → 照文件名，并提醒', async () => {
  const r = await region('名正言顺技术单 10.11.2026（1）H.xlsx', [adult('英文')]);
  assert.strictEqual(r.overseas, true);
  assert.ok(r.regionNote);
});
test('有的单写繁体、有的空 → 海外，并提醒', async () => {
  const r = await region('名正言顺技术单 10.11.2026（2）.xlsx', [adult('繁体'), adult('')]);
  assert.strictEqual(r.overseas, true);
  assert.ok(r.regionNote);
});
test('没有名册展示这一栏（手表）→ 照文件名的 H，不提醒', async () => {
  const head = HEAD.filter((h) => h !== '名册展示');
  const r = await region('天祥手表技术单 10.11.2026（1）H.xlsx', [adult(undefined)], OPTS, head);
  assert.strictEqual(r.overseas, true);
  assert.ok(!r.regionNote);
  const r2 = await region('天祥手表技术单 10.11.2026（1）.xlsx', [adult(undefined)], OPTS, head);
  assert.strictEqual(r2.overseas, false);
});
test('审核人自己选的国内 / 海外最优先', async () => {
  const r = await region('名正言顺技术单 10.11.2026（1）.xlsx', [adult('简体')], { ...OPTS, region: 'domestic' });
  assert.strictEqual(r.overseas, false);
});
