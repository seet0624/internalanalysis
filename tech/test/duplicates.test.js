// 审核部的考题：zip 里不小心放了重复的单、放错工具的文件。只用假资料。
const test = require('node:test');
const assert = require('node:assert');
const ExcelJS = require('exceljs');
const E = require('../review-engine.js');

const HEAD = ['序号', '订单编号', '使用人姓名', '会员姓名', '商品标题', '公历生日', '备注'];
let seq = 0;
const no = () => '2611' + String(3000000000 + ++seq);
async function sheet(name, rows) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('技术单');
  ws.addRow(['技术单']);
  ws.addRow(HEAD);
  rows.forEach((r, i) => ws.addRow(HEAD.map((h) => (h === '序号' ? i + 1 : r[h] ?? ''))));
  return { name, buffer: Buffer.from(await wb.xlsx.writeBuffer()) };
}
const row = (person, product, id) => ({ 订单编号: id || no(), 使用人姓名: person, 会员姓名: person, 商品标题: product, 公历生日: '1980年1月1日' });
const HY = '鸿运手表技术单 20.11.2026（2）.xlsx', TX = '天希手表技术单 20.11.2026（2）.xlsx';
const order = (r, person) => r.orders.find((o) => o.person === person);
const kinds = (o) => o.flags.map((f) => f.kind);

test('同一单（同订单号、同样是鸿运手表）出现在天希手表文件：天希那一份算重复，放有问题；鸿运文件那份不动', async () => {
  const a = row('甲一', '鸿运手表');
  const files = [await sheet(HY, [a, row('乙二', '鸿运手表')]), await sheet(TX, [row('丙三', '天希手表'), Object.assign({}, a)])];
  const res = await E.processFiles(files, {}), [hy, tx] = res;
  assert.strictEqual(res.repeatBuys.length, 0, '同一单不算「买了两次」');
  assert.ok(!kinds(order(hy, '甲一')).includes('dup-order'));
  const dup = order(tx, '甲一');
  assert.ok(kinds(dup).includes('dup-order'), kinds(dup).join(','));
  assert.ok(dup.problem && dup.autoProblem);
  assert.match(dup.flags.find((f) => f.kind === 'dup-order').text, /鸿运手表技术单/);
});

test('按了「不要这一单」：天希文件不再出鸿运手表的文件，只剩天希一单', async () => {
  const a = row('甲一', '鸿运手表');
  const files = [await sheet(HY, [a]), await sheet(TX, [row('丙三', '天希手表'), Object.assign({}, a)])];
  const [, tx] = await E.processFiles(files, { skips: { [TX + '|' + a.订单编号]: true } });
  assert.deepStrictEqual(tx.outputs.map((o) => o.name), ['天希手表技术单 20.11.2026（1）.xlsx']);
  assert.ok(order(tx, '甲一').skip);
});

test('先上传天希（放错的那份在前面）：还是算天希那一份重复', async () => {
  const a = row('甲一', '鸿运手表');
  const files = [await sheet(TX, [row('丙三', '天希手表'), Object.assign({}, a)]), await sheet(HY, [a])];
  const [tx, hy] = await E.processFiles(files, {});
  assert.ok(kinds(order(tx, '甲一')).includes('dup-order'));
  assert.ok(!kinds(order(hy, '甲一')).includes('dup-order'));
});

test('天希文件里有一单鸿运手表，但别的文件没有：提醒放错文件，不算有问题', async () => {
  const [tx] = await E.processFiles([await sheet(TX, [row('丙三', '天希手表'), row('丁四', '鸿运手表')])], {});
  const o = order(tx, '丁四');
  assert.ok(kinds(o).includes('wrong-file'), kinds(o).join(','));
  assert.ok(!o.problem);
  assert.ok(!kinds(order(tx, '丙三')).includes('wrong-file'));
});

test('同一个订单号、不同产品（一张单买了两样）：不算重复', async () => {
  const id = no();
  const files = [await sheet(HY, [row('甲一', '鸿运手表', id)]), await sheet(TX, [row('甲一', '天希手表', id)])];
  const [hy, tx] = await E.processFiles(files, {});
  assert.ok(!kinds(order(hy, '甲一')).includes('dup-order') && !kinds(order(tx, '甲一')).includes('dup-order'));
});

test('同一个文件换了名字又上传一次：后面那份每单都算重复', async () => {
  const rows = [row('甲一', '鸿运手表'), row('乙二', '鸿运手表')];
  const f1 = await sheet(HY, rows), f2 = { name: '鸿运手表技术单 20.11.2026（2）(1).xlsx', buffer: f1.buffer };
  const [a, b] = await E.processFiles([f1, f2], {});
  assert.ok(a.orders.every((o) => !kinds(o).includes('dup-order')));
  assert.ok(b.orders.every((o) => kinds(o).includes('dup-order')));
});

test('文件名没写工具（技术单 日期.xlsx）：不提醒放错文件', async () => {
  const [r] = await E.processFiles([await sheet('技术单 20.11.2026（2）.xlsx', [row('丙三', '天希手表'), row('丁四', '鸿运手表')])], {});
  assert.ok(r.orders.every((o) => !kinds(o).includes('wrong-file')));
});

test('重复的单又写了暂缓：按「不是重复，保留」只拿掉重复，暂缓照样有问题', async () => {
  const a = row('甲一', '鸿运手表');
  const files = [await sheet(HY, [a]), await sheet(TX, [row('丙三', '天希手表'), Object.assign({}, a, { 备注: '暂缓制作' })])];
  const [, tx] = await E.processFiles(files, { notDups: { [TX + '|' + a.订单编号]: true } });
  const o = order(tx, '甲一');
  assert.ok(!o.flags.some((f) => f.kind === 'dup-order' && f.problem), '重复不再算有问题');
  assert.ok(o.problem, '暂缓还是有问题');
});

test('按过「不要这一单」，但换了文件以后已经不重复：照样输出，不会悄悄不见', async () => {
  const a = row('甲一', '鸿运手表');
  const files = [await sheet(TX, [row('丙三', '天希手表'), a])];
  const [tx] = await E.processFiles(files, { skips: { [TX + '|' + a.订单编号]: true } });
  assert.ok(!order(tx, '甲一').skip);
  assert.strictEqual(tx.outputs.reduce((n, o) => n + o.orders, 0), 2);
});

test('「海外技术单 日期」：文件名没写工具，不提醒放错文件', async () => {
  const [r] = await E.processFiles([await sheet('海外技术单 20.11.2026（2）H.xlsx', [row('丙三', '天希手表'), row('丁四', '鸿运手表')])], {});
  assert.ok(r.orders.every((o) => !kinds(o).includes('wrong-file')));
});

test('同一单一份写繁体（鴻運手錶）一份写简体（鸿运手表）：还是算重复', async () => {
  const a = row('甲一', '鸿运手表');
  const files = [await sheet(HY, [a]), await sheet(TX, [row('丙三', '天希手表'), Object.assign({}, a, { 商品标题: '鴻運手錶' })])];
  const [hy, tx] = await E.processFiles(files, {});
  assert.ok(kinds(order(tx, '甲一')).includes('dup-order'));
  assert.ok(!kinds(order(hy, '甲一')).includes('dup-order'));
});

test('同一个学员、同一个工具、不同订单号：不算重复，但列出来提醒', async () => {
  const files = [await sheet(HY, [row('甲一', '鸿运手表'), row('乙二', '鸿运手表')]), await sheet(TX, [row('丙三', '天希手表'), row('甲一', '鸿運手錶')])];
  const res = await E.processFiles(files, {});
  assert.ok(res.every((r) => r.orders.every((o) => !kinds(o).includes('dup-order'))));
  assert.strictEqual(res.repeatBuys.length, 1);
  assert.strictEqual(res.repeatBuys[0].person, '甲一');
  assert.strictEqual(res.repeatBuys[0].orders.length, 2);
});

test('两个都叫「新生儿」（还没取名）：不当成同一个人', async () => {
  const res = await E.processFiles([await sheet('名正言顺技术单 20.11.2026（2）.xlsx', [row('新生儿', '名正言顺命名'), row('新生儿', '名正言顺命名')])], {});
  assert.strictEqual(res.repeatBuys.length, 0);
});

test('文件名是套餐（鲟鱼肽健康套餐技术单），单是套餐送的名正言顺：不提醒放错文件', async () => {
  const [r] = await E.processFiles([await sheet('鲟鱼肽健康套餐技术单 20.11.2026（1）.xlsx', [row('甲一', 'N1 鲟鱼肽健康套餐 - 赠品（名正言顺命名）')])], {});
  assert.ok(r.orders.every((o) => !kinds(o).includes('wrong-file')), kinds(r.orders[0]).join(','));
});
