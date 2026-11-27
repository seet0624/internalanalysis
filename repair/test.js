// 维修价目的考题（只用假资料，不放真实价钱）。跑法：node repair/test.js
const assert = require('assert');
const RP = require('./view.js');

const DATA = {
  version: '2000-01-01',
  cats: [{ id: 'watch', name: '手表' }, { id: 'pendant', name: '吊坠' }],
  products: [
    { name: '甲手表', cat: 'watch', images: [], groups: [{ part: '表把', items: [{ q: '表把脱落（已丢失）', price: 300, note: '' }, { q: '表把歪了', price: 100, note: '' }] }] },
    { name: '乙手表', cat: 'watch', images: [], groups: [{ part: '表把', items: [{ q: '表把脱落（已丢失）', price: 1200, note: '' }] }] },
    { name: '丙手表', cat: 'watch', images: [], groups: [{ part: '表把', items: [{ q: '表把脱落（已丢失）', price: '时价', note: '' }] }] },
    { name: '丁吊坠', cat: 'pendant', images: [], groups: [{ part: '', items: [
      { q: '小钻掉钻（钻丢失）', price: '100/颗（新价钱：900）', note: '' }, { q: '表面变形', price: '重做', note: '无法维修' },
      { q: '内部变色', price: '免费', note: '' }, { q: '封条断裂', price: '无法维修', note: '' }, { q: '修改尺寸', price: 50, note: '备注：只能扩大半号' }] }] }
  ]
};

let n = 0; const t = (name, fn) => { fn(); n++; console.log('✓ ' + name); };

t('价钱显示：数字加 ¥ 和千分位；免费、无法维修、时价 / 重做、特别写法分开', () => {
  assert.deepStrictEqual(RP.priceInfo(1598), { text: '¥1,598', kind: 'num', value: 1598 });
  assert.strictEqual(RP.priceInfo('623').text, '¥623');
  assert.strictEqual(RP.priceInfo('免费（重新组装）').kind, 'free');
  assert.strictEqual(RP.priceInfo('没得维修').kind, 'none');
  assert.strictEqual(RP.priceInfo('时价').kind, 'ask');
  assert.strictEqual(RP.priceInfo('重做').kind, 'ask');
  const odd = RP.priceInfo('100/颗（新价钱：900）');
  assert.strictEqual(odd.kind, 'text'); assert.strictEqual(odd.text, '100/颗（新价钱：900）'); assert.strictEqual(odd.value, 100);
});
t('搜寻：每个字都要对到（产品、部件、问题、备注），可以限定分类', () => {
  assert.strictEqual(RP.search(DATA, '表把').length, 4);
  assert.deepStrictEqual(RP.search(DATA, '甲 已丢失').map((r) => r.product.name + r.item.q), ['甲手表表把脱落（已丢失）']);
  assert.strictEqual(RP.search(DATA, '半号').length, 1);   // 备注也搜得到
  assert.strictEqual(RP.search(DATA, '掉钻', 'watch').length, 0);
  assert.strictEqual(RP.search(DATA, '  ').length, 0);
});
t('同类对比：同一类、同一个问题，便宜的排前面，时价排最后，标出自己', () => {
  const c = RP.compare(DATA, '乙手表', '表把', '表把脱落（已丢失）');
  assert.deepStrictEqual(c.map((x) => x.name), ['甲手表', '乙手表', '丙手表']);
  assert.strictEqual(c[1].me, true);
  assert.strictEqual(RP.compare(DATA, '没有这个', '表把', '表把歪了').length, 0);
});
t('复制话术：数字写人民币、文字照原文、有备注附上', () => {
  const w = DATA.products[0], p = DATA.products[3];
  assert.strictEqual(RP.copyText(w.name, '表把', w.groups[0].items[0]), '甲手表「表把脱落（已丢失）」，维修费用人民币 300');
  assert.strictEqual(RP.copyText(p.name, '', p.groups[0].items[3]), '丁吊坠「封条断裂」：无法维修');
  assert.strictEqual(RP.copyText(p.name, '', p.groups[0].items[2]), '丁吊坠「内部变色」：免费');
  assert.strictEqual(RP.copyText(p.name, '', p.groups[0].items[4]), '丁吊坠「修改尺寸」，维修费用人民币 50（备注：只能扩大半号）');
  assert.strictEqual(RP.copyText(p.name, '', p.groups[0].items[0]), '丁吊坠「小钻掉钻（钻丢失）」，维修费用：100/颗（新价钱：900）');
});

t('图片只收 data:image 的 base64，其他（会执行程序的）一律丢掉', () => {
  assert.strictEqual(RP.safeImg('data:image/webp;base64,AAAA+/=='), 'data:image/webp;base64,AAAA+/==');
  assert.strictEqual(RP.safeImg('x" onerror="alert(1)'), '');
  assert.strictEqual(RP.safeImg('javascript:alert(1)'), '');
  assert.strictEqual(RP.safeImg('data:image/svg+xml;base64,AAAA'), '');   // svg 可以带程序
  assert.strictEqual(RP.safeImg(null), '');
});
t('免费 / 无法维修也带上备注', () => {
  assert.strictEqual(RP.copyText('戊', '', { q: '组装', price: '免费', note: '保修期内' }), '戊「组装」：免费（保修期内）');
  assert.strictEqual(RP.copyText('戊', '', { q: '变形', price: '无法维修', note: '只能重做' }), '戊「变形」：无法维修（只能重做）');
});
t('国内每一页的左栏都要有同一套入口（加新页面时漏了哪一页会在这里抓到）', () => {
  const fs = require('fs'), path = require('path'), root = path.join(__dirname, '..');
  const PAGES = ['name', 'tech', 'bjp', 'wuxing', 'manual', 'repair'];
  for (const page of PAGES) {
    const html = fs.readFileSync(path.join(root, page, 'index.html'), 'utf8');
    for (const want of PAGES) {
      const href = want === page ? '(\\./|\\.\\./' + want + '/)' : '\\.\\./' + want + '/';
      assert.match(html, new RegExp('class="g-sys" href="' + href + '"'), page + '/ 左栏少了 ' + want + '/ 的入口');
    }
  }
});
t('国内每一页上方的「切换审核系统」按钮列都要有四个审核系统', () => {
  const fs = require('fs'), path = require('path'), root = path.join(__dirname, '..');
  const TOOLS = ['name', 'tech', 'bjp', 'wuxing'];
  for (const page of ['name', 'tech', 'bjp', 'wuxing', 'manual', 'repair']) {
    const html = fs.readFileSync(path.join(root, page, 'index.html'), 'utf8');
    for (const want of TOOLS) {
      const href = want === page ? '(\\./|\\.\\./' + want + '/)' : '\\.\\./' + want + '/';
      assert.match(html, new RegExp('class="g-btn3d" href="' + href + '"'), page + '/ 上方按钮列少了 ' + want + '/');
    }
  }
});
t('国内每一页都不用浏览器的 alert / confirm / prompt（统一用 HQAuth.say / ask / input 的系统提醒框）', () => {
  const fs = require('fs'), path = require('path'), root = path.join(__dirname, '..');
  for (const page of ['name', 'tech', 'bjp', 'wuxing', 'manual', 'repair']) {
    const html = fs.readFileSync(path.join(root, page, 'index.html'), 'utf8');
    const hit = html.match(/(^|[^\w.$'"-])(window\.)?(alert|confirm|prompt)\(/m);
    assert.strictEqual(hit, null, page + '/ 还在用浏览器的 ' + (hit && hit[0].trim()));
  }
});
console.log(`全部通过（${n} 项）`);
