// 审核部的考题：单独发、订单状态备注写加急。只用假资料。
const test = require('node:test');
const assert = require('node:assert');
const ExcelJS = require('exceljs');
const E = require('../review-engine.js');

const HEAD = ['序号', '订单编号', '使用人姓名', '会员姓名', '商品标题', '公历生日', '订单状态备注', '备注'];
let seq = 0;
const no = () => '2611' + String(2000000000 + ++seq);

async function sheet(name, rows) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('技术单');
  ws.addRow(['技术单']);
  ws.addRow(HEAD);
  rows.forEach((r, i) => ws.addRow(HEAD.map((h) => (h === '序号' ? i + 1 : r[h] ?? ''))));
  return { name, buffer: Buffer.from(await wb.xlsx.writeBuffer()) };
}
const NAME = '天祥手表技术单 6.11.2026（2）.xlsx';
const two = () => [
  { 订单编号: no(), 使用人姓名: '陈大文', 会员姓名: '陈大文', 商品标题: '天祥手表', 公历生日: '1980年1月1日' },
  { 订单编号: no(), 使用人姓名: '李小明', 会员姓名: '李小明', 商品标题: '天祥手表', 公历生日: '1985年2月2日' }
];
const names = (r) => r.outputs.map((o) => o.name).sort();

test('单独发：这一单自己一个文件，文件名写学员名，不写特殊加急', async () => {
  const rows = two();
  const f = await sheet(NAME, rows);
  const [r] = await E.processFiles([f], { solos: { [NAME + '|' + rows[1].订单编号]: true } });
  assert.deepStrictEqual(names(r), ['天祥手表技术单 6.11.2026（1）.xlsx', '李小明天祥手表技术单 6.11.2026（1）.xlsx']);
  const solo = r.outputs.find((o) => o.solo);
  assert.ok(solo && !solo.urgent && !solo.problem);
});

test('没按单独发：两单同一个文件', async () => {
  const [r] = await E.processFiles([await sheet(NAME, two())], {});
  assert.deepStrictEqual(names(r), ['天祥手表技术单 6.11.2026（2）.xlsx']);
});

for (const [note, urgent] of [['客户要求加急', true], ['急件', true], ['不用加急', false], ['不急', false], ['已付款', false]]) {
  test('订单状态备注「' + note + '」→ ' + (urgent ? '特殊加急' : '普通'), async () => {
    const rows = [{ 订单编号: no(), 使用人姓名: '王一一', 会员姓名: '王一一', 商品标题: '天祥手表', 公历生日: '1990年3月3日', 订单状态备注: note, 备注: '身体健康' }];
    const [r] = await E.processFiles([await sheet('天祥手表技术单 6.11.2026（1）.xlsx', rows)], {});
    assert.strictEqual(r.orders[0].urgent, urgent);
    assert.deepStrictEqual(names(r), [urgent ? '王一一天祥手表技术单（特殊加急）6.11.2026（1）.xlsx' : '天祥手表技术单 6.11.2026（1）.xlsx']);
  });
}

test('整个文件每单都单独发：两单加急原本合成一个，分开后每单一个、写学员名', async () => {
  const rows = two().map((r) => ({ ...r, 备注: '请加急' }));
  const f = await sheet(NAME, rows);
  const [merged] = await E.processFiles([f], {});
  assert.deepStrictEqual(names(merged), ['天祥手表技术单（特殊加急）6.11.2026（2）.xlsx']);
  const solos = Object.fromEntries(rows.map((r) => [NAME + '|' + r.订单编号, true]));
  const [split] = await E.processFiles([f], { solos });
  assert.deepStrictEqual(names(split), ['李小明天祥手表技术单（特殊加急）6.11.2026（1）.xlsx', '陈大文天祥手表技术单（特殊加急）6.11.2026（1）.xlsx']);
});
