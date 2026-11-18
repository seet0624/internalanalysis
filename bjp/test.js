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
t('同一个群的督导合成一份，没有群的用督导名', () => {
  const g = B.group(B.parse(AOA).rows, DATA);
  assert.deepStrictEqual(g.groups.map(x => x.title), ['999', '督导丙']);
  assert.deepStrictEqual(g.groups[0].sups, ['督导甲', '督导乙']);
  assert.strictEqual(g.groups[0].rows.length, 2);
  assert.strictEqual(g.groups[0].qty, 3);
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

console.log(`全部通过（${n} 项）`);
