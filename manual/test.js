// 客服手册的考题（只用假资料，不放真实手册内容）。跑法：node manual/test.js
const assert = require('assert');
const M = require('./manual.js');

const HB = {
  title: '假手册', updated: '2026-01',
  chapters: [
    { no: 1, title: '回传时间', blocks: [{ type: 'table', head: [], rows: [['产品', '时限'], ['甲产品', '30天'], ['乙产品', '7天']] }] },
    { no: 2, title: '话术', blocks: [{ type: 'table', head: [], rows: [['场景', '话术示例'], ['已发货', '订单号 姓名 甲产品，在YYYY-MM-DD已发货']] }] },
    { no: 9, title: '命名', blocks: [{ type: 'ol', items: ['第一步 打开系统', '第二步 导出'] }] },
    { no: 4, title: '注意', blocks: [{ type: 'ul', items: ['甲不能换'] }] },
    { no: 99, title: '新加的章', blocks: [{ type: 'p', text: '网址 https://example.com/login （找组长拿）' }] }
  ]
};

let n = 0; const t = (name, fn) => { fn(); n++; console.log('✓ ' + name); };

t('表格第一行当标题', () => {
  const r = M.rowsOf(HB.chapters[0].blocks[0]);
  assert.deepStrictEqual(r.head, ['产品', '时限']); assert.strictEqual(r.rows.length, 2);
});
t('业务分类：没列到的章放「其他业务」，空的分类不显示', () => {
  const g = M.groups(HB);
  assert.deepStrictEqual(g.map(x => x.name), ['技术单处理', '新名字业务', '产品与维修', '其他业务']);
  assert.deepStrictEqual(g[0].chapters.map(c => c.no), [1, 9]);
  assert.deepStrictEqual(g[3].chapters.map(c => c.no), [99]);
  assert.strictEqual(M.groupOf(HB, 2).name, '新名字业务');
});
t('上一章 / 下一章照分类顺序，头尾是 null', () => {
  assert.deepStrictEqual(M.ordered(HB).map(c => c.no), [1, 9, 2, 4, 99]);
  const a = M.prevNext(HB, 9); assert.strictEqual(a.prev.no, 1); assert.strictEqual(a.next.no, 2);
  assert.strictEqual(M.prevNext(HB, 1).prev, null); assert.strictEqual(M.prevNext(HB, 99).next, null);
});
t('文章类型', () => {
  assert.deepStrictEqual(HB.chapters.map(M.kind), ['规则速查', '话术', '操作指南', '注意事项', '注意事项']);
});
t('流程图：照原本步骤；注意是提醒；「有没有 → 有的话」才画判断', () => {
  const f = M.flow(['打开系统 → 订单管理', '看名字有没有奇怪 → 有的话叫技术改', '注意：甲不算在内', '空格删掉']);
  assert.deepStrictEqual(f.map(x => x.kind), ['step', 'decision', 'note', 'step']);
  assert.strictEqual(f[1].text, '看名字有没有奇怪？'); assert.strictEqual(f[1].yes, '叫技术改');
  assert.strictEqual(f[2].text, '甲不算在内');
  assert.strictEqual(f[0].text, '打开系统 → 订单管理');
});
t('回传期限：几天后、星期几（跨月）', () => {
  assert.strictEqual(M.days('30天'), 30); assert.strictEqual(M.days('一个月'), null);
  assert.deepStrictEqual(M.deadline('2026-01-25', 7), { date: '2026-02-01', week: '日' });
  assert.strictEqual(M.deadline('不是日期', 7), null);
});
t('话术填空：填了才换，没填的照原样', () => {
  const s = '订单号 姓名 甲产品，在YYYY-MM-DD已发货';
  assert.strictEqual(M.fillScript(s, { order: 'T1', name: '测试', date: '2026-01-02' }), 'T1 测试 甲产品，在2026-01-02已发货');
  assert.strictEqual(M.fillScript(s, { order: 'T1' }), 'T1 姓名 甲产品，在YYYY-MM-DD已发货');
  assert.strictEqual(M.fillScript(s, {}), s);
});
t('技术单命名：换掉日期（连 &05&06 一起）', () => {
  assert.strictEqual(M.techName('技术单 2026-10-03&05&06 H', '2026-01-02&04&05'), '技术单 2026-01-02&04&05 H');
  assert.strictEqual(M.techName('技术单 2026-10-15（名正言顺）', '2026-01-02'), '技术单 2026-01-02（名正言顺）');
  assert.strictEqual(M.techName('技术单 2026-10-15', ''), '技术单 2026-10-15');
});
t('网址：括号前就停', () => assert.strictEqual(M.urlOf('网址 https://example.com/login （找组长拿）'), 'https://example.com/login'));
t('搜索：每个词都要在同一章；结果照分类顺序；摘要有关键字', () => {
  assert.deepStrictEqual(M.search(HB, '导出'), [9]);
  assert.deepStrictEqual(M.search(HB, '甲'), [1, 2, 4]);
  assert.deepStrictEqual(M.search(HB, '甲产品 导出'), []);
  assert.strictEqual(M.search(HB, '  '), null);
  assert.ok(M.snippet(HB.chapters[2], '导出').includes('导出'));
});

t('首页数字：章节、分类、步骤、表格、话术', () => {
  assert.deepStrictEqual(M.stats(HB), { chapters: 5, groups: 4, steps: 2, tables: 2, scripts: 1 });
});
console.log(`全部通过（${n} 项）`);
