// 维修价目：价钱显示、搜寻、同类对比、复制话术。浏览器和 node 测试共用（测试只用假资料）。
// data = { version, cats: [{id, name}], products: [{name, cat, images, groups: [{part, items: [{q, price, note}]}]}] }
(function (root) {
  'use strict';

  // 价钱：数字 → ¥1,234；文字照原文，分种类给颜色（免费 / 无法维修 / 时价、重做 / 其他）
  function priceInfo(p) {
    if (typeof p === 'number') return { text: '¥' + p.toLocaleString('en-US'), kind: 'num', value: p };
    var s = String(p == null ? '' : p).trim();
    if (/^\d+$/.test(s)) return priceInfo(Number(s));
    if (/^免费/.test(s)) return { text: s, kind: 'free', value: 0 };
    if (/无法维修|没得维修|不能维修/.test(s)) return { text: s, kind: 'none', value: Infinity };
    if (/^(时价|重做|报价)/.test(s)) return { text: s, kind: 'ask', value: Infinity };
    var lead = s.match(/^(\d+)/);
    return { text: s, kind: 'text', value: lead ? Number(lead[1]) : Infinity };   // 「200/颗（新价钱：2000）」：排序用开头的数字
  }

  function rows(data) {
    var out = [];
    (data.products || []).forEach(function (p) {
      (p.groups || []).forEach(function (g) {
        (g.items || []).forEach(function (it) { out.push({ product: p, part: g.part || '', item: it }); });
      });
    });
    return out;
  }

  // 搜寻：用空格分开的每个字都要出现在「产品 部件 问题 备注」里（例如「天富 表把」「掉钻 已丢失」）
  function search(data, query, cat) {
    var words = String(query || '').toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return rows(data).filter(function (r) {
      if (cat && cat !== 'all' && r.product.cat !== cat) return false;
      var hay = (r.product.name + ' ' + r.part + ' ' + r.item.q + ' ' + (r.item.note || '')).toLowerCase();
      return words.every(function (w) { return hay.indexOf(w) >= 0; });
    });
  }

  // 同类对比：同一类产品里，同一个「部件 + 问题」的价钱，便宜的排前面
  function compare(data, productName, part, q) {
    var me = (data.products || []).filter(function (p) { return p.name === productName; })[0];
    if (!me) return [];
    return rows(data).filter(function (r) { return r.product.cat === me.cat && r.part === part && r.item.q === q; })
      .map(function (r) { var pi = priceInfo(r.item.price); return { name: r.product.name, text: pi.text, kind: pi.kind, value: pi.value, me: r.product.name === productName }; })
      .sort(function (a, b) { return a.value - b.value || a.name.localeCompare(b.name, 'zh'); });
  }

  // 复制给督导的话术
  function copyText(productName, part, item) {
    var pi = priceInfo(item.price);
    var what = productName + (part && item.q.indexOf(part) < 0 ? ' ' + part : '') + '「' + item.q + '」';
    if (pi.kind === 'none') return what + '：' + pi.text;
    if (pi.kind === 'free') return what + '：免费' + (pi.text !== '免费' ? pi.text.replace(/^免费/, '') : '');
    return what + '，维修费用' + (pi.kind === 'num' ? '人民币 ' + pi.value : '：' + pi.text) + (item.note ? '（' + item.note.replace(/\s+/g, ' ') + '）' : '');
  }

  var api = { priceInfo: priceInfo, search: search, compare: compare, copyText: copyText, rows: rows };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.RP = api;
})(this);
