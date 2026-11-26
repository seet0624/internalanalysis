// 检查员工自己做的技术单。只用假资料。
const test = require('node:test');
const assert = require('node:assert');
const ExcelJS = require('exceljs');
const E = require('../review-engine.js');

const HEAD = ['序号', '订单编号', '使用人姓名', '会员姓名', '商品标题', '公历生日', '订单状态备注', '备注'];
let seq = 0;
const no = () => '2611' + String(4000000000 + ++seq);
async function raw(name, rows) {
  const wb = new ExcelJS.Workbook(), ws = wb.addWorksheet('技术单');
  ws.addRow(['技术单']); ws.addRow(HEAD);
  rows.forEach((r, i) => ws.addRow(HEAD.map((h) => (h === '序号' ? i + 1 : r[h] ?? ''))));
  ws.addRow([]); ws.addRow(['审核人：']); ws.addRow(['制表时间：']); ws.addRow(['回传时间：']);
  return { name, buffer: Buffer.from(await wb.xlsx.writeBuffer()) };
}
const row = (person, extra) => Object.assign({ 订单编号: no(), 使用人姓名: person, 会员姓名: person, 商品标题: '天祥手表', 公历生日: '1980年1月1日' }, extra);
// what a staff member who did everything right hands in = the review page's own output
async function perfect(rows) {
  const [r] = await E.processFiles([await raw('天祥手表技术单 20.11.2026（2）.xlsx', rows)], { date: '20.11.2026', reviewer: '小美' });
  return r.outputs.map((o) => ({ name: o.name, buffer: Buffer.from(o.buffer) }));
}
async function edit(file, fn) {
  const wb = new ExcelJS.Workbook(); await wb.xlsx.load(file.buffer); fn(wb.worksheets[0]);
  return { name: file.name, buffer: Buffer.from(await wb.xlsx.writeBuffer()) };
}
const cellOf = (ws, head, person) => {
  let col, hit;
  ws.getRow(2).eachCell((c, i) => { if (String(c.value).trim() === head) col = i; });
  ws.eachRow((r) => { if (!hit && String(r.getCell(3).value) === person) hit = r.getCell(col); });
  return hit;
};

test('做得全对：没有错、没有红字差别、没有要确认', async () => {
  const files = await perfect([row('甲一', { 订单状态备注: '已付款' }), row('乙二')]);
  const res = await E.checkFiles(files, {});
  res.forEach((r) => { assert.deepStrictEqual(r.errors, [], r.errors.join(' / ')); assert.deepStrictEqual(r.red, []); assert.deepStrictEqual(r.confirms, []); });
});

test('该红的没红：列出哪一格', async () => {
  const [f] = await perfect([row('甲一', { 订单状态备注: '已付款' }), row('乙二')]);
  const bad = await edit(f, (ws) => { const c = cellOf(ws, '订单状态备注', '甲一'); c.font = Object.assign({}, c.font, { color: { argb: 'FF000000' } }); });
  const [r] = await E.checkFiles([bad], {});
  assert.deepStrictEqual(r.red.map((x) => [x.person, x.h, x.want]), [['甲一', '订单状态备注', true]]);
});

test('不该红的红了', async () => {
  const [f] = await perfect([row('甲一'), row('乙二')]);
  const bad = await edit(f, (ws) => { const c = cellOf(ws, '使用人姓名', '乙二'); c.font = { color: { argb: 'FFFF0000' } }; });
  const [r] = await E.checkFiles([bad], {});
  assert.deepStrictEqual(r.red.map((x) => [x.person, x.h, x.want]), [['乙二', '使用人姓名', false]]);
});

test('文件名写错（单数不对）', async () => {
  const [f] = await perfect([row('甲一'), row('乙二')]);
  const [r] = await E.checkFiles([{ name: '天祥手表技术单 20.11.2026（3）.xlsx', buffer: f.buffer }], {});
  assert.ok(r.errors.some((e) => /文件名应该是「天祥手表技术单 20\.11\.2026（2）\.xlsx」/.test(e)), r.errors.join(' / '));
});

test('页脚回传时间写错、审核人没写', async () => {
  const [f] = await perfect([row('甲一'), row('乙二')]);
  const bad = await edit(f, (ws) => ws.eachRow((r) => r.eachCell((c) => {
    const t = String(c.value || '');
    if (/^回传时间/.test(t)) c.value = '回传时间：1.12.2026';
    if (/^审核人/.test(t)) r.eachCell((x) => { x.value = x === c ? '审核人：' : null; });
  })));
  const [r] = await E.checkFiles([bad], {});
  assert.ok(r.errors.some((e) => /回传时间应该是 30\.11\.2026/.test(e)), r.errors.join(' / '));
  assert.ok(r.errors.some((e) => /审核人没写/.test(e)), r.errors.join(' / '));
});

test('规则会加急，员工没加急：放在「请确认」，不算错', async () => {
  // the staff member left 甲一 (备注 asks for 加急) in the normal file with 乙二
  const both = await raw('天祥手表技术单 20.11.2026（2）.xlsx', [row('甲一', { 备注: '客户要求加急' }), row('乙二')]);
  const [r] = await E.checkFiles([both], { date: '20.11.2026' });
  assert.ok(r.confirms.some((c) => /甲一：规则会设特殊加急/.test(c)), r.confirms.join(' / '));
});

test('同一单交了两次（两个文件都有）', async () => {
  const a = row('甲一');
  const f1 = await raw('天祥手表技术单 20.11.2026（1）.xlsx', [a]);
  const f2 = await raw('天祥手表技术单 20.11.2026（2）.xlsx', [Object.assign({}, a), row('乙二')]);
  const res = await E.checkFiles([f1, f2], { date: '20.11.2026' });
  assert.ok(res[1].errors.some((e) => /交了两次/.test(e)), res[1].errors.join(' / '));
});

test('表头下面第一行是空的：不能显示「全对」', async () => {
  const [f] = await perfect([row('甲一'), row('乙二')]);
  const bad = await edit(f, (ws) => ws.spliceRows(3, 0, []));
  const [r] = await E.checkFiles([bad], {});
  assert.ok(r.errors.length, '应该报错');
});

test('中间有空行：空行下面的单要报出来', async () => {
  const [f] = await perfect([row('甲一'), row('乙二')]);
  const bad = await edit(f, (ws) => ws.spliceRows(4, 0, []));
  const [r] = await E.checkFiles([bad], {});
  assert.ok(r.errors.some((e) => /空行下面/.test(e)), r.errors.join(' / '));
});

test('zip 叫 …H.zip：里面的文件照样算海外，不乱报文件名', async () => {
  const [f] = await perfect([row('甲一'), row('乙二')]);
  const [r] = await E.checkFiles([{ name: f.name, buffer: f.buffer, overseas: false }], {});
  assert.deepStrictEqual(r.errors, [], r.errors.join(' / '));
});

test('新生儿名正言顺：回传时间是 +7 天，不算错', async () => {
  const raw2 = await raw('名正言顺技术单 20.11.2026（1）.xlsx', [row('新生儿', { 商品标题: '名正言顺命名', 公历生日: '', 备注: '预产期 20.12.2026' })]);
  const [r0] = await E.processFiles([raw2], { date: '20.11.2026', reviewer: '小美' });
  const files = r0.outputs.map((o) => ({ name: o.name, buffer: Buffer.from(o.buffer) }));
  assert.ok(/^新生儿/.test(files[0].name), files[0].name);
  const [r] = await E.checkFiles(files, {});
  assert.ok(!r.errors.some((e) => /回传时间/.test(e)), r.errors.join(' / '));
});

test('制表时间写 20/11/2026、红字用深红：都认得', async () => {
  const [f] = await perfect([row('甲一', { 订单状态备注: '已付款' }), row('乙二')]);
  const bad = await edit(f, (ws) => ws.eachRow((r) => r.eachCell((c) => {
    const t = String(c.value || '');
    if (/^制表时间/.test(t)) r.eachCell((x) => { x.value = x === c ? '制表时间：20/11/2026' : null; });
    if (t === '已付款') c.font = { color: { argb: 'FFC00000' } };
  })));
  const [r] = await E.checkFiles([bad], {});
  assert.deepStrictEqual(r.errors, [], r.errors.join(' / '));
  assert.deepStrictEqual(r.red, []);
});
