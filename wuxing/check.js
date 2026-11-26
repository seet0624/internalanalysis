// 五行审核：专家回传的技术单（配制信息：数字 + 颜色 / 单一颜色 / 生肖），照国内手册「工具注意事项」和老板定的基本检查找问题。
// 浏览器和 node 测试共用（node 测试只用假资料）。
(function (root) {
  'use strict';
  var COLORS = ['黄', '黑', '白', '绿', '红', '蓝'];
  var NAME_RE = /名正言[顺順]/;   // 名正言顺（繁体也算）
  // 国内手册：戒指最少 4 个、数字幸福手链最少 3 个、鸿运（流年）手表最少 3 个；五行狮子最少 4 个、没有蓝色。刚好差一个也算有问题（老板 2026-11 定）
  var MIN = [
    { has: /戒指/, n: 4, label: '戒指' },
    { has: /数字幸福手链/, n: 3, label: '数字幸福手链' },
    { has: /鸿运手表|流年手表/, n: 3, label: '鸿运手表' },
    { has: /狮子/, n: 4, label: '五行狮子' }
  ];

  function text(v) {
    if (v == null) return '';
    if (typeof v === 'object') {
      if (v.richText) return v.richText.map(function (r) { return r.text; }).join('').trim();
      if (v.text != null) return String(v.text).trim();
      if (v.result != null) return String(v.result).trim();
      if (v.error != null) return String(v.error);   // Excel 错误值（#N/A 之类）
      if (v instanceof Date) return v.toISOString().slice(0, 10);
    }
    return String(v).replace(/\u00a0/g, ' ').trim();
  }
  function squash(v) { return text(v).replace(/[\s　]+/g, ''); }   // 专家填的格子：空格不算（手册：空格全部删掉，除了五行）

  // aoa：一个工作表的二维阵列（第 0 列 = 第 1 行）。表头那一行有「商品标题」；「配制信息」那一格起到「配制人」之前是专家填的
  function layout(aoa) {
    var hi = -1;
    // 取最后一行：表头两行上下合并时，读出来上下两行都有「商品标题」，下面那行才有「数字」「颜色」
    for (var i = 0; i < Math.min(aoa.length, 8); i++) if ((aoa[i] || []).map(text).indexOf('商品标题') >= 0) hi = i;
    if (hi < 0) return null;
    var head = aoa[hi].map(text), col = function (n) { return head.indexOf(n); };
    var start = -1;
    for (var r = 0; r < hi; r++) { var at = (aoa[r] || []).map(text).indexOf('配制信息'); if (at >= 0) { start = at; break; } }
    var end = col('配制人');
    if (start < 0 || end < 0 || col('订单编号') < 0) return null;   // 没有订单编号栏就一单都认不出来，不能当成「全部没问题」
    var nums = [], single = [];
    for (var c = start; c < end; c++) {
      if (head[c] === '数字') nums.push({ n: c, c: head[c + 1] === '颜色' ? c + 1 : -1 });
      else if (head[c] && (head[c] !== '颜色' || head[c - 1] !== '数字')) single.push({ c: c, name: head[c] });   // 乾坤「颜色」、生肖「生肖1/生肖2」
    }
    // 认不得的配制栏（版面变了）：宁可列成「没审到」，也不要乱审
    if (!nums.length && (!single.length || single.some(function (x) { return ['颜色', '生肖1', '生肖2'].indexOf(x.name) < 0; }))) return null;
    return { hi: hi, title: col('商品标题'), order: col('订单编号'), user: col('使用人姓名'), nums: nums, single: single };
  }

  // 回传：{ ok, rows: [{ line, order, user, product, issues: [{ msg, cells: [[行, 栏]] }] }] }（行、栏从 0 起）
  function check(aoa) {
    var L = layout(aoa);
    if (!L) return { ok: false, rows: [] };
    var rows = [];
    for (var r = L.hi + 1; r < aoa.length; r++) {
      var a = aoa[r] || [], get = function (c) { return c < 0 ? '' : text(a[c]); }, cfg = function (c) { return c < 0 ? '' : squash(a[c]); };
      if (!get(L.order)) continue;   // 表尾（审核人、制表时间）没有订单编号
      var product = get(L.title), issues = [], add = function (msg, cells) { issues.push({ msg: msg, cells: cells }); };
      var titleCell = [[r, L.title]], shown = [];   // shown：专家填的内容，给网页画出来（数字 + 颜色、或单一栏）
      if (NAME_RE.test(product)) {   // 工具单里夹着名正言顺：这一单不审五行，标出来提醒
        add('这一单是名正言顺，五行审核不审，请到「名字审核」审核', titleCell);
        rows.push({ line: r + 1, order: get(L.order), user: get(L.user), product: product, issues: issues, config: [] });
        continue;
      }

      if (L.nums.length) {
        var filled = [], seen = {}, gapAt = -1;
        L.nums.forEach(function (p, k) {
          var n = cfg(p.n), c = cfg(p.c), cells = p.c < 0 ? [[r, p.n]] : [[r, p.n], [r, p.c]];
          if (!n && !c) { if (gapAt < 0) gapAt = k; return; }
          shown.push({ n: n, c: p.c < 0 ? null : c, cols: [p.n, p.c] });
          if (gapAt >= 0) { add('第 ' + (gapAt + 1) + ' 格空着，后面又有数字（跳格）', [[r, L.nums[gapAt].n]]); gapAt = -2; }
          if (!n) { add('第 ' + (k + 1) + ' 格有颜色「' + c + '」没有数字', cells); return; }
          if (!/^[1-9]$/.test(n)) add('第 ' + (k + 1) + ' 格数字「' + n + '」不对（只能 1–9）', [[r, p.n]]);
          if (p.c >= 0 && !c) add('数字 ' + n + ' 没有颜色', cells);
          else if (p.c >= 0 && COLORS.indexOf(c) < 0) add('数字 ' + n + ' 的颜色「' + c + '」不对（只能 ' + COLORS.join('、') + '）', [[r, p.c]]);
          if (seen[n]) add('数字 ' + n + ' 重复', [[r, seen[n]], [r, p.n]]);
          else seen[n] = p.n;
          filled.push({ n: n, c: c, cells: cells });
        });
        if (!filled.length) { if (!issues.length) add('专家没有配五行', titleCell); }   // 有颜色没数字的，上面已经说了
        else {
          MIN.forEach(function (m) {
            if (m.has.test(product) && filled.length < m.n) add(m.label + '五行最少要 ' + m.n + ' 个，现在只有 ' + filled.length + ' 个，要问', titleCell);
          });
          if (/狮子/.test(product)) filled.forEach(function (f) { if (f.c === '蓝') add('五行狮子没有蓝色（数字 ' + f.n + '）', f.cells); });
          if (/九合/.test(product)) {
            var all = filled.map(function (f) { return f.n; }).sort().join('');
            if (all !== '123456789') add('九合平衡牌要 1 到 9 各一次（现在是 ' + filled.map(function (f) { return f.n; }).join(' ') + '）', titleCell);
          }
        }
      } else {
        // 没有「数字」栏的：乾坤圆满吊坠只有「颜色」、十二生肖吊坠有「生肖1」「生肖2」。至少要填一个，颜色要是对的
        var any = false;
        L.single.forEach(function (s) {
          var v = cfg(s.c);
          if (!v) return;
          any = true;
          shown.push({ label: s.name, v: v, cols: [s.c] });
          if (s.name === '颜色' && COLORS.indexOf(v) < 0) add('颜色「' + v + '」不对（只能 ' + COLORS.join('、') + '）', [[r, s.c]]);
        });
        if (!any) add('专家没有配置（' + L.single.map(function (s) { return s.name; }).filter(Boolean).join('、') + ' 都空着）', titleCell);
      }
      // 哪几格被问题点到，网页就在那几个圆点画红圈
      shown.forEach(function (x) { x.bad = issues.some(function (is) { return is.cells.some(function (rc) { return x.cols.indexOf(rc[1]) >= 0; }); }); delete x.cols; });
      rows.push({ line: r + 1, order: get(L.order), user: get(L.user), product: product, issues: issues, config: shown });
    }
    return { ok: true, rows: rows };
  }

  // 名正言顺的技术单不归五行审核（要到名字审核）：看文件名、第一行标题、「商品标题」那一栏。备注写到名正言顺的工具单不算
  // 商品标题那一栏：要每一单都是名正言顺才算整份（套餐技术单会夹赠品「（名正言顺命名）」，工具照样要审）
  function isNameSheet(fileName, aoa) {
    var re = NAME_RE;
    if (re.test(fileName || '') || (aoa[0] || []).some(function (v) { return re.test(text(v)); })) return true;
    for (var i = 0; i < Math.min(aoa.length, 8); i++) {
      var head = (aoa[i] || []).map(text), at = head.indexOf('商品标题'), on = head.indexOf('订单编号');
      if (at < 0) continue;
      var orders = aoa.slice(i + 1).filter(function (row) { return on < 0 || text((row || [])[on]); });   // 表尾没有订单编号
      if (aoa[i + 1] && (aoa[i + 1] || []).map(text).indexOf('商品标题') >= 0) continue;   // 表头上下合并：用下面那行
      return orders.length > 0 && orders.every(function (row) { return re.test(text((row || [])[at])); });
    }
    return false;
  }

  // 有些软件存的技术单，文件信息少了 cp: 前缀（<lastModifiedBy>），读 Excel 的组件会读不进去；读之前补上（跟名字审核同一招，表格内容不动）
  function fixCore(xml) {
    return xml.replace(/<(\/?)(coreProperties|lastModifiedBy|lastPrinted|revision|category|contentStatus|keywords|version|identifier|language)(\s|>|\/)/g, '<$1cp:$2$3');
  }

  var api = { check: check, isNameSheet: isNameSheet, text: text, fixCore: fixCore, COLORS: COLORS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.WX = api;
})(this);
