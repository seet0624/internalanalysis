// 保健品分督导的考题（只用假资料，不放真实学员 / 订单）。跑法：node bjp/test.js
const assert = require('assert');
const B = require('./split.js');

const DATA = {
  shops: {
    D000001: ['假省假市（甲店主）店铺', '假分公司', '督导甲'],
    D000002: ['假省假市（乙店主）店铺', '假分公司', '督导乙'],
    D000003: ['丙店主', '假分公司', '督导丙'],          // 店名没有括号
    D000004: ['假省假市（丁店主）店铺', '假分公司', '']  // 没有督导
  },
  groups: { 督导甲: '999', 督导乙: '999' }              // 甲、乙同一个群「999」；丙没有群
};
const AOA = [
  ['序号', '订单编号', '使用人姓名', '收货电话号码', '收货地址', '保健品数量', '快递公司', '快递单号', '店铺编号'],
  [1, '26100000000001', '测试甲', '13800000000', '假地址一号', 2, '申通快递', 773400000000001, 'D000001'],
  [2, 26100000000002, '测试乙', 13800000001, '假地址二号', '1', '申通快递', '773400000000002', 'd000002'],
  [3, '26100000000003', '测试丙', '13800000002', '假地址三号', 3, '申通快递', '773400000000003', 'D000003'],
  [4, '26100000000004', '测试丁', '13800000003', '假地址四号', 1, '申通快递', '773400000000004', 'D000004'],
  [5, '26100000000005', '测试戊', '13800000004', '假地址五号', 1, '申通快递', '773400000000005', 'D999999'],
  ['', '', '', '', '', '', '', '', '']                     // 空行要跳过
];

let n = 0; const t = (name, fn) => { fn(); n++; console.log('✓ ' + name); };

t('读得到表头和 5 行（空行跳过）', () => {
  const p = B.parse(AOA);
  assert.strictEqual(p.missing.length, 0);
  assert.strictEqual(p.rows.length, 5);
});
t('长数字照整数写回文字（订单号、快递单号、电话不会变 1.2E+14 或 .0）', () => {
  const r = B.parse(AOA).rows;
  assert.strictEqual(r[0].track, '773400000000001');
  assert.strictEqual(r[1].order, '26100000000002');
  assert.strictEqual(r[1].phone, '13800000001');
  assert.strictEqual(r[1].code, 'D000002');   // 小写也认得
});
t('一个督导一个文件：同群的督导也分开，群名留在 title', () => {
  const g = B.group(B.parse(AOA).rows, DATA);
  assert.deepStrictEqual(g.groups.map(x => x.title), ['999', '999', '督导丙']);
  assert.deepStrictEqual(g.groups.map(x => x.sups), [['督导甲'], ['督导乙'], ['督导丙']]);
  assert.deepStrictEqual(g.groups.map(x => x.rows.length), [1, 1, 1]);
  assert.deepStrictEqual(g.groups.map(x => x.qty), [2, 1, 3]);
});
t('合并栏照格式：订单编号 +（店主）店铺 + 编号 + ,保健品数量N, + 快递公司 + 单号', () => {
  const r = B.group(B.parse(AOA).rows, DATA).groups[0].rows[0];
  assert.strictEqual(r.shop, '（甲店主）店铺');
  assert.strictEqual(r.combined, '26100000000001（甲店主）店铺D000001,保健品数量2,申通快递773400000000001');
});
t('店名没有括号就照原名', () => assert.strictEqual(B.shopShort('丙店主'), '丙店主'));
t('找不到店铺、没有督导的列出来，不放进任何一份', () => {
  const p = B.group(B.parse(AOA).rows, DATA).problems;
  assert.strictEqual(p.length, 2);
  assert.ok(p.some(x => /D999999/.test(x.why)) && p.some(x => /没有督导/.test(x.why)));
});
t('月份：看工作表名，再看文件名', () => {
  assert.strictEqual(B.monthOf('2026年10月订单', ''), '10');
  assert.strictEqual(B.monthOf('Sheet1', '2026_10_保健品.xls'), '10');
  assert.strictEqual(B.monthOf('Sheet1', '明细.xls'), '');
});
t('文件名后面是督导的群', () => assert.strictEqual(B.fileName('8', '415'), '8月份保健品发货明细（415）.xlsx'));
t('表头缺栏位会说缺什么', () => assert.deepStrictEqual(B.parse([['订单编号', '店铺编号'], ['1', 'D000001']]).missing, ['使用人姓名', '收货地址', '保健品数量']));

t('督导名有「/」：文件名换掉，不会在 zip 里变成资料夹', () => assert.strictEqual(B.fileName('10', '甲/乙'), '10月份保健品发货明细（甲、乙）.xlsx'));
t('有数量或单号、但没有订单号和编号的行：不会默默不见，要列出来', () => {
  const p = B.parse([AOA[0], AOA[1], ['', '', '', '', '续行地址', 3, '', '7734', '']]);
  assert.strictEqual(p.rows.length, 2);
  assert.ok(B.group(p.rows, DATA).problems.some(x => x.row.line === 3));
});
t('数量不是正整数要提醒，但订单照样放进文件', () => {
  const g = B.group(B.parse([AOA[0], [1, '26100000000009', '测试己', '1', '地址', '两盒', '申通快递', '1', 'D000001']]).rows, DATA);
  assert.strictEqual(g.groups[0].rows.length, 1);
  assert.ok(g.warnings.some(w => /数量/.test(w.why)));
});
t('店名后面有（关闭）、半形括号也认得', () => {
  assert.strictEqual(B.shopShort('江苏省南通市崇川区（高何）服务中心（关闭）'), '（高何）服务中心');
  assert.strictEqual(B.shopShort('假省假市(明艳雯)服务中心'), '（明艳雯）服务中心');
});
t('电话、单号用别的栏名也认得；真的找不到要提醒', () => {
  const p = B.parse([['订单编号', '使用人姓名', '手机号', '收货地址', '保健品数量', '快递公司', '运单号', '店铺编号'], ['1', '甲', '138', '址', 1, '申通快递', '77', 'D000001']]);
  assert.strictEqual(p.rows[0].phone, '138'); assert.strictEqual(p.rows[0].track, '77');
  assert.deepStrictEqual(B.parse([['订单编号', '使用人姓名', '收货地址', '保健品数量', '店铺编号']]).optional, ['收货电话号码', '快递公司', '快递单号']);
});
t('超过 15 位的数字（Excel 已经改掉尾数）要提醒', () => {
  const p = B.parse([AOA[0], [1, 1234567890123456789, '测试', '1', '址', 1, '申通快递', '1', 'D000001']]);
  assert.ok(B.group(p.rows, DATA).warnings.some(w => /15 位/.test(w.why)));
});

t('最后的合计行（只有数量、等于加总）跳过；对不上的要列出来', () => {
  assert.strictEqual(B.parse([AOA[0], AOA[1], AOA[2], ['', '', '', '', '', 3, '', '', '']]).rows.length, 2);
  assert.strictEqual(B.parse([AOA[0], AOA[1], AOA[2], ['', '', '', '', '', 5, '', '', '']]).rows.length, 3);
});
t('文件名：有群的写「群 督导」，没有群的只写督导', () => {
  const g = B.group(B.parse(AOA).rows, DATA).groups;
  assert.deepStrictEqual(g.map(x => x.label), ['999 督导甲', '999 督导乙', '督导丙']);
  assert.strictEqual(B.fileName('10', g[0].label), '10月份保健品发货明细（999 督导甲）.xlsx');
});
t('群名跟另一位督导同名，也不会合成一份', () => {
  const d = { shops: DATA.shops, groups: { 督导甲: '督导丙' } };
  const g = B.group(B.parse(AOA).rows, d).groups;
  assert.deepStrictEqual(g.map(x => x.sups[0]), ['督导甲', '督导乙', '督导丙']);
});
t('打包时文件名重复（换掉特殊字元后一样）：第二个加（2），不会盖掉', () => {
  assert.deepStrictEqual(B.uniqueNames(['a（甲、乙）.xlsx', 'a（甲、乙）.xlsx', 'b.xlsx']), ['a（甲、乙）.xlsx', 'a（甲、乙）（2）.xlsx', 'b.xlsx']);
});
console.log(`全部通过（${n} 项）`);
