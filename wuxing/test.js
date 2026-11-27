// 五行审核的考题（只用假资料，不放真实学员 / 订单）。跑法：node wuxing/test.js
const assert = require('assert');
const WX = require('./check.js');

// 三种版面，照专家回传的技术单：① 数字 + 颜色一对一对（手表、手链、数字吊坠）② 只有数字（九合平衡牌）③ 只有颜色 / 生肖（乾坤、十二生肖吊坠）
const PAIR_HEAD = [
  ['某某配制信息表'],
  ['订单基本信息', '', '', '', '', '使用人信息', '', '配制信息'],
  ['', '', '', '', '', '', '', '一', '', '二', '', '三', '', '四', '', '五'],
  ['序号', '订单编号', '商品标题', '加工序号', '产品配置编号', '使用人姓名', '性别', '数字', '颜色', '数字', '颜色', '数字', '颜色', '数字', '颜色', '数字', '颜色', '配制人', '审核人', '备注']
];
const pair = (no, title, ...cfg) => {
  const row = [String(no), 'T0000000000' + no, title, '9' + no, '8' + no, '测试' + no, '女'];
  for (let i = 0; i < 10; i++) row.push(cfg[i] == null ? '' : cfg[i]);
  return row.concat(['', '', '']);
};
const FOOT = [['', '', '审核人：', '测试', '', '', '制表时间：', '01/01/2026']];

const PLAIN_HEAD = [
  ['九合平衡牌配制信息表'],
  ['订单基本信息', '', '', '使用人信息', '', '配制信息'],
  ['', '', '', '', '', '一', '二', '三', '四', '五', '六', '七', '八', '九'],
  ['序号', '订单编号', '商品标题', '使用人姓名', '大门方向', '数字', '数字', '数字', '数字', '数字', '数字', '数字', '数字', '数字', '配制人', '审核人']
];
const SINGLE = [
  ['乾坤圆满吊坠配制信息表'],
  ['订单基本信息', '', '', '使用人信息', '', '配制信息'],
  // 表头只有一行（第 3 行），而且「使用人信息」那边也有一栏「颜色」，不能当成专家配的
  ['序号', '订单编号', '商品标题', '使用人姓名', '颜色', '颜色', '生肖1', '生肖2', '配制人', '审核人']
];

let n = 0; const t = (name, fn) => { fn(); n++; console.log('✓ ' + name); };
const msgs = (aoa) => WX.check(aoa).rows.map((r) => r.issues.map((i) => i.msg).join('；'));

t('配得好的单没有问题；表尾（审核人、制表时间）不算一单', () => {
  const r = WX.check(PAIR_HEAD.concat([pair(1, '鸿运手表（女款）', '3', '黄', '8', '黑', '5', '白')], FOOT));
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.rows.length, 1);
  assert.deepStrictEqual(r.rows[0].issues, []);
  assert.strictEqual(r.rows[0].user, '测试1');
});
t('数字没有颜色、颜色不对、有颜色没数字、数字不是 1–9', () => {
  const m = msgs(PAIR_HEAD.concat([pair(1, '天富手表', '3', '', '8', '紫', '', '黄', '0', '绿')]))[0];
  assert.match(m, /数字 3 没有颜色/);
  assert.match(m, /颜色「紫」不对/);
  assert.match(m, /第 3 格有颜色「黄」没有数字/);
  assert.match(m, /数字「0」不对/);
});
t('数字重复、跳格；标红的是哪几格', () => {
  const r = WX.check(PAIR_HEAD.concat([pair(1, '天富手表', '3', '黄', '', '', '3', '黑')]));
  const is = r.rows[0].issues;
  assert.ok(is.some((i) => /第 2 格空着/.test(i.msg)));
  const dup = is.find((i) => /重复/.test(i.msg));
  assert.deepStrictEqual(dup.cells, [[4, 7], [4, 11]]);   // 第 5 行（0 起是 4）的两个「3」
});
t('格子里的空格不算（「 5 」「黄 」照样对）', () => {
  assert.deepStrictEqual(msgs(PAIR_HEAD.concat([pair(1, '天富手表', ' 5 ', '黄 ', '6', ' 黑')])), ['']);
});
t('手册最少几个：戒指 4、数字幸福手链 3、鸿运手表 3（刚好差一个也算有问题）', () => {
  const m = msgs(PAIR_HEAD.concat([
    pair(1, '幸运戒指', '1', '黄', '2', '黄', '3', '黄'),
    pair(2, '幸运戒指', '1', '黄', '2', '黄', '3', '黄', '4', '黄'),
    pair(3, '数字幸福手链', '1', '黄', '2', '黄'),
    pair(4, '数字幸福手链', '1', '黄', '2', '黄', '3', '黄'),
    pair(5, '鸿运手表（男款）', '1', '黄', '2', '黄'),
    pair(6, '流年手表', '1', '黄', '2', '黄'),
    pair(7, '天富手表', '1', '黄')   // 其他手表没有最少几个
  ]));
  assert.match(m[0], /戒指五行最少要 4 个，现在只有 3 个/);
  assert.strictEqual(m[1], '');
  assert.match(m[2], /数字幸福手链五行最少要 3 个/);
  assert.strictEqual(m[3], '');
  assert.match(m[4], /鸿运手表五行最少要 3 个/);
  assert.match(m[5], /鸿运手表五行最少要 3 个/);
  assert.strictEqual(m[6], '');
});
t('五行狮子：没有蓝色、最少 4 个', () => {
  const m = msgs(PAIR_HEAD.concat([pair(1, '开运五行狮子', '1', '蓝', '2', '黄', '3', '黄', '4', '黄'), pair(2, '开运五行狮子', '1', '黄', '2', '黄', '3', '黄')]))
  assert.match(m[0], /五行狮子没有蓝色（数字 1）/);
  assert.match(m[1], /五行狮子五行最少要 4 个/);
});
t('专家整单没配', () => {
  assert.match(msgs(PAIR_HEAD.concat([pair(1, '天富手表')]))[0], /专家没有配五行/);
});
t('九合平衡牌：1 到 9 各一次（没有颜色栏，不会说没颜色）', () => {
  const row = (no, nums) => [String(no), 'T00' + no, '九合平衡牌', '测试', '向东'].concat(nums, ['', '']);
  const m = msgs(PLAIN_HEAD.concat([row(1, ['5', '1', '3', '4', '6', '8', '9', '2', '7']), row(2, ['5', '1', '3', '4', '6', '8', '9', '2', '2']), row(3, ['5', '1', '3', '4', '6', '8', '9', '2', ''])]));
  assert.strictEqual(m[0], '');
  assert.match(m[1], /数字 2 重复/);
  assert.match(m[1], /九合平衡牌要 1 到 9 各一次/);
  assert.match(m[2], /九合平衡牌要 1 到 9 各一次/);
});
t('只有颜色 / 生肖的（乾坤、十二生肖）：使用人那边的「颜色」不算，配制信息要填', () => {
  const r = WX.check(SINGLE.concat([
    ['1', 'T001', '乾坤圆满吊坠', '测试', '蓝', '黄', '', '', '', ''],
    ['2', 'T002', '乾坤圆满吊坠', '测试', '蓝', '', '', '', '', ''],
    ['3', 'T003', '乾坤圆满吊坠', '测试', '', '金', '', '', '', ''],
    ['4', 'T004', '十二生肖吊坠', '测试', '', '', '马', '', '', '']
  ]));
  const m = r.rows.map((x) => x.issues.map((i) => i.msg).join('；'));
  assert.strictEqual(m[0], '');
  assert.match(m[1], /专家没有配置/);
  assert.match(m[2], /颜色「金」不对/);
  assert.strictEqual(m[3], '');
});
t('表头两行上下合并（读出来第 3、4 行都有「商品标题」）：用下面那行，照样抓到问题', () => {
  const merged = PAIR_HEAD.map((r) => r.slice());
  merged[2] = merged[3].map((v, i) => (i >= 7 && i < 17 ? merged[2][i] : v));   // 合并格：第 3 行也回传「序号、订单编号、商品标题…配制人」
  const m = msgs(merged.concat([pair(1, '天富手表', '3', '紫', '3', '黄')]));
  assert.strictEqual(m.length, 1);   // 第 4 行表头不能当成一单
  assert.match(m[0], /颜色「紫」不对/);
  assert.match(m[0], /数字 3 重复/);
});
t('找不到「订单编号」栏、或配制信息没有认得的栏：不能说全部没问题，要回传 ok: false', () => {
  const noOrder = PAIR_HEAD.map((r) => r.map((v) => (v === '订单编号' ? '订单号' : v)));
  assert.strictEqual(WX.check(noOrder.concat([pair(1, '天富手表', '3', '黄')])).ok, false);
  const odd = [SINGLE[0], SINGLE[1], SINGLE[2].map((v) => (v === '生肖1' ? '甲' : v === '生肖2' ? '乙' : v))];
  odd[2][5] = '丙';
  assert.strictEqual(WX.check(odd.concat([['1', 'T001', '乾坤圆满吊坠', '测试', '', '黄', '', '', '', '']])).ok, false);
});
t('有颜色没数字：只说这一句，不会再说「专家没有配五行」；Excel 错误值照样显示', () => {
  const m = msgs(PAIR_HEAD.concat([pair(1, '天富手表', '', '黄'), pair(2, '天富手表', { error: '#N/A' }, '黄')]));
  assert.match(m[0], /有颜色「黄」没有数字/);
  assert.doesNotMatch(m[0], /没有配五行/);
  assert.match(m[1], /数字「#N\/A」不对/);
});
t('config：每单专家填的内容（给网页画圆点），有问题的那几个标 bad', () => {
  const r = WX.check(PAIR_HEAD.concat([pair(1, '天富手表', '3', '黄', '8', '紫', '3', '黑')])).rows[0];
  assert.deepStrictEqual(r.config, [{ n: '3', c: '黄', bad: true }, { n: '8', c: '紫', bad: true }, { n: '3', c: '黑', bad: true }]);
  const ok = WX.check(PAIR_HEAD.concat([pair(2, '天富手表', '3', '黄', '8', '黑')])).rows[0];
  assert.deepStrictEqual(ok.config, [{ n: '3', c: '黄', bad: false }, { n: '8', c: '黑', bad: false }]);
  const single = WX.check(SINGLE.concat([['1', 'T001', '十二生肖吊坠', '测试', '蓝', '', '马', '', '', '']])).rows[0];
  assert.deepStrictEqual(single.config, [{ label: '生肖1', v: '马', bad: false }]);
  const plain = WX.check(PLAIN_HEAD.concat([['1', 'T001', '九合平衡牌', '测试', '向东', '5', '1', '', '', '', '', '', '', '', '', '']])).rows[0];
  assert.deepStrictEqual(plain.config.map((x) => [x.n, x.c]), [['5', null], ['1', null]]);   // 没有颜色栏：c 是 null
});
t('名正言顺的技术单认得出来（文件名、表头标题、商品标题）；只是备注提到的不算', () => {
  const body = PAIR_HEAD.concat([pair(1, '天富手表', '3', '黄')]);
  assert.strictEqual(WX.isNameSheet('名正言顺技术单 2026-11-11（3）H.xlsx', body), true);   // 文件名
  assert.strictEqual(WX.isNameSheet('技术单.xlsx', [['名正言顺配制信息表']].concat(body.slice(1))), true);   // 第一行标题
  assert.strictEqual(WX.isNameSheet('技术单.xlsx', PAIR_HEAD.concat([pair(1, '名正言顺', '3', '黄')])), true);   // 商品标题
  const remark = pair(1, '开运吊坠', '3', '黄'); remark[remark.length - 1] = '名正言顺 - 测试新名';
  assert.strictEqual(WX.isNameSheet('开运吊坠技术单.xlsx', PAIR_HEAD.concat([remark])), false);   // 备注写到名正言顺：还是工具
  assert.strictEqual(WX.isNameSheet('鸿运手表技术单.xlsx', body), false);
});
t('工具和名正言顺混在同一份：不当整份名正言顺，工具照审；名正言顺那几单标出来；繁体「名正言順」也认得', () => {
  const mixed = PAIR_HEAD.concat([pair(1, '天富手表', '3', '黄', '3', '黑'), pair(2, '鲟鱼肽套餐赠品（名正言顺命名）')]);
  assert.strictEqual(WX.isNameSheet('套餐技术单.xlsx', mixed), false);
  const m = msgs(mixed);
  assert.match(m[0], /数字 3 重复/);   // 工具照样审到
  assert.match(m[1], /名正言顺.*名字审核/);
  assert.doesNotMatch(m[1], /没有配五行/);
  assert.strictEqual(WX.isNameSheet('名正言順技术单.xlsx', PAIR_HEAD), true);
  assert.strictEqual(WX.isNameSheet('技术单.xlsx', PAIR_HEAD.concat([pair(1, '名正言順', '3', '黄')])), true);
});
t('页面载入 check.js 的版本号跟 hq/ 共用档案不一样就要换（check.js 改了，旧快取会配新页面）', () => {
  const fs = require('fs'), path = require('path');
  const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  assert.doesNotMatch(html, /check\.js\?v=20261127a"/, 'check.js 这次有改，版本号要换新');
});
t('读不懂的表（没有「商品标题」或「配制信息」）回传 ok: false', () => {
  assert.strictEqual(WX.check([['随便一个表'], ['甲', '乙']]).ok, false);
});
t('文件信息少了 cp: 前缀会补上，已经有的不动', () => {
  assert.strictEqual(WX.fixCore('<coreProperties><lastModifiedBy>甲</lastModifiedBy></coreProperties>'), '<cp:coreProperties><cp:lastModifiedBy>甲</cp:lastModifiedBy></cp:coreProperties>');
  assert.strictEqual(WX.fixCore('<cp:lastModifiedBy>甲</cp:lastModifiedBy>'), '<cp:lastModifiedBy>甲</cp:lastModifiedBy>');
});

t('页面载入自己的 .js 都带版本号（不然浏览器拿旧的 check.js，配新的页面会出错）', () => {
  const fs = require('fs'), path = require('path'), root = path.join(__dirname, '..');
  for (const [page, js] of [['wuxing/index.html', 'check.js'], ['bjp/index.html', 'split.js'], ['manual/index.html', 'manual.js'], ['name/index.html', 'shops.js']]) {
    const html = fs.readFileSync(path.join(root, page), 'utf8');
    assert.match(html, new RegExp('<script src="' + js.replace('.', '\\.') + '\\?v=\\w+"'), page + ' 载入 ' + js + ' 没有 ?v=');
  }
  // 3D 办公室：首页动态载入 office.js、office.js 再载入 campus.js
  assert.match(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), /import\('\.\/hq\/office\.js\?v=\w+'\)/, 'index.html 载入 office.js 没有 ?v=');
  assert.match(fs.readFileSync(path.join(root, 'hq/office.js'), 'utf8'), /from '\.\/campus\.js\?v=\w+'/, 'office.js 载入 campus.js 没有 ?v=');
});
console.log(`全部通过（${n} 项）`);
