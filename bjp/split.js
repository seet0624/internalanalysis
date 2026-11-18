// 保健品发货明细分督导：读第一个工作表 → 用店铺编号查督导（name/shops.js 的 SHOP_DATA）→ 按督导的「群」分开。
// 浏览器和 node 测试共用（node 测试只用假资料）。
(function (root) {
  'use strict';
  var COLS = {
    order: ['订单编号'], name: ['使用人姓名', '收货人'], phone: ['收货电话号码', '收货电话', '手机号', '手机号码', '联系电话', '电话'], addr: ['收货地址', '详细地址', '地址'],
    qty: ['保健品数量', '数量'], express: ['快递公司', '物流公司', '快递'], track: ['快递单号', '物流单号', '运单号'], code: ['店铺编号', '服务中心编号']
  };
  var NEED = ['order', 'name', 'addr', 'qty', 'code'], OPTIONAL = ['phone', 'express', 'track'];
  // Excel 里的长数字（订单号、快递单号、电话）可能被存成数字：照整数写回文字，不要 1.2E+14 或 .0
  function text(v) {
    if (v == null) return '';
    if (typeof v === 'number') return String(v);
    return String(v).replace(/ /g, ' ').trim();
  }
  function num(v) { var n = Number(text(v)); return text(v) !== '' && isFinite(n) ? n : text(v); }

  // aoa：第一个工作表的二维阵列（含表头）。表头那一行要有「订单编号」和「店铺编号」
  function parse(aoa) {
    var hi = -1, map = {};
    for (var i = 0; i < Math.min(aoa.length, 10); i++) {
      var row = (aoa[i] || []).map(text);
      if (row.indexOf('订单编号') >= 0 && (row.indexOf('店铺编号') >= 0 || row.indexOf('服务中心编号') >= 0)) { hi = i; break; }
    }
    if (hi < 0) return { rows: [], missing: ['订单编号', '店铺编号'], optional: [], headerRow: -1 };
    var head = aoa[hi].map(text);
    Object.keys(COLS).forEach(function (k) { for (var j = 0; j < COLS[k].length; j++) { var at = head.indexOf(COLS[k][j]); if (at >= 0) { map[k] = at; break; } } });
    var missing = NEED.filter(function (k) { return map[k] == null; }).map(function (k) { return COLS[k][0]; });
    var optional = OPTIONAL.filter(function (k) { return map[k] == null; }).map(function (k) { return COLS[k][0]; });
    var rows = [], sum = 0;
    for (var r = hi + 1; r < aoa.length; r++) {
      var a = aoa[r] || [], get = function (k) { return map[k] == null ? '' : a[map[k]]; };
      var o = { order: text(get('order')), name: text(get('name')), phone: text(get('phone')), addr: text(get('addr')),
        qty: num(get('qty')), express: text(get('express')), track: text(get('track')), code: text(get('code')).toUpperCase(), line: r + 1 };
      if (!a.some(function (v) { return text(v) !== ''; })) continue;   // 整行空白才跳过；其他的交给 group 列成问题
      var onlyQty = a.every(function (v, j) { return j === map.qty || text(v) === ''; });
      if (onlyQty && Number(o.qty) === sum) continue;   // 合计行：只有数量、而且等于上面加总
      sum += Number(o.qty) || 0;
      // Excel 只存 15 位：超过就已经被改掉尾数，要提醒人工核对
      o.unsafe = ['order', 'track'].some(function (k) { var v = get(k); return typeof v === 'number' && !Number.isSafeInteger(v); });
      rows.push(o);
    }
    return { rows: rows, missing: missing, optional: optional, headerRow: hi };
  }

  // 「贵州省六盘水市盘州市（谢沛洺）店铺」→「（谢沛洺）店铺」；后面的（关闭）先去掉，半形括号换全形；没有括号就照原名
  function shopShort(full) {
    var s = text(full).replace(/[（(]已?关闭[）)]$/, ''), i = Math.max(s.lastIndexOf('（'), s.lastIndexOf('('));
    return i >= 0 ? s.slice(i).replace('(', '（').replace(')', '）') : s;
  }

  // 一个督导一份；查不到店铺 / 没有督导的另外列出来
  function group(rows, data) {
    var shops = (data && data.shops) || {}, groups = (data && data.groups) || {}, out = {}, order = [], problems = [], warnings = [];
    rows.forEach(function (o) {
      var s = shops[o.code];
      if (!o.code) { problems.push({ row: o, why: '没有店铺编号' }); return; }
      if (!s) { problems.push({ row: o, why: '店铺编号 ' + o.code + ' 在店铺表里找不到' }); return; }
      var sup = text(s[2]);
      if (!sup) { problems.push({ row: o, why: '店铺 ' + o.code + ' 没有督导' }); return; }
      // 一个督导一个文件（用督导当钥匙，同群、同名都不会合并）；有群的文件名写「群 督导」
      var grp = text(groups[sup]), title = grp || sup;
      if (!out[sup]) { out[sup] = { title: title, label: grp ? grp + ' ' + sup : sup, sups: [sup], shops: [], rows: [], qty: 0 }; order.push(sup); }
      var g = out[sup];
      if (g.shops.indexOf(o.code) < 0) g.shops.push(o.code);
      var row = Object.assign({}, o, { shop: shopShort(s[0]), sup: sup });
      row.combined = row.order + row.shop + row.code + ',保健品数量' + text(row.qty) + ',' + row.express + row.track;
      var q = Number(row.qty);
      if (!(Number.isInteger(q) && q > 0)) warnings.push({ row: o, why: '保健品数量「' + text(row.qty) + '」不是正整数，请核对（订单照样放进「' + g.label + '」）' });
      if (o.unsafe) warnings.push({ row: o, why: '订单编号或快递单号超过 15 位，Excel 可能已经改掉尾数，请核对' });
      g.rows.push(row); g.qty += Number.isInteger(q) && q > 0 ? q : 0;
    });
    return { groups: order.map(function (t) { return out[t]; }), problems: problems, warnings: warnings };
  }

  // 月份：先看工作表名（2026年10月订单），再看文件名（2026_10 / 2026-10 / 10月）
  function monthOf(sheetName, fileName) {
    var m = text(sheetName).match(/(\d{1,2})\s*月/) || text(fileName).match(/(\d{1,2})\s*月/) || text(fileName).match(/20\d\d[\s_\-.年]+(\d{1,2})(?!\d)/);
    var n = m ? Number(m[1]) : 0;
    return n >= 1 && n <= 12 ? String(n) : '';
  }
  function fileName(month, title) { return (month ? month + '月份' : '') + '保健品发货明细（' + String(title).replace(/[\\/:*?"<>|]/g, '、') + '）.xlsx'; }   // 「/」会让 zip 变资料夹

  // 打包时文件名重复（换掉特殊字元后可能一样）：后面的加（2）（3），zip 才不会盖掉
  function uniqueNames(names) {
    var seen = {};
    names.forEach(function (n) { seen[n] = true; });   // 原本的名字先占位，加出来的（2）才不会撞到
    var used = {};
    return names.map(function (n) {
      if (!used[n]) { used[n] = true; return n; }
      var i = n.lastIndexOf('.'), base = i > 0 ? n.slice(0, i) : n, ext = i > 0 ? n.slice(i) : '', k = 2, c;
      while (seen[c = base + '（' + k + '）' + ext]) k++;
      seen[c] = used[c] = true;
      return c;
    });
  }

  var HEAD = ['订单编号', '使用人姓名', '收货电话号码', '收货地址', '保健品数量', '快递公司', '快递单号', '订单编号店铺名称服务中心编号,保健品数量保健品数量,快递公司快递单号', '服务中心编号', '店铺名称'];
  var WIDTH = [14.2, 11, 13.1, 70, 11, 8.9, 15.2, 67.9, 13.1, 15.2];
  // 照老板给的「8月份保健品发货明细」格式：一个工作表、置中、细框线、Calibri 11
  function build(ExcelJS, g, month) {
    var wb = new ExcelJS.Workbook(), ws = wb.addWorksheet((month ? month + '月份' : '') + '保健品明细');
    var font = { name: 'Calibri', size: 11 }, line = { style: 'thin', color: { argb: 'FF000000' } }, border = { top: line, left: line, bottom: line, right: line };
    ws.columns = WIDTH.map(function (w) { return { width: w }; });
    var put = function (vals, isHead) {
      var r = ws.addRow(vals); if (isHead) r.height = 22;
      r.eachCell({ includeEmpty: true }, function (c, i) { if (i > HEAD.length) return; c.font = font; c.border = border; c.alignment = { horizontal: 'center', vertical: 'middle' }; });
    };
    put(HEAD, true);
    g.rows.forEach(function (o) { put([o.order, o.name, o.phone, o.addr, o.qty, o.express, o.track, o.combined, o.code, o.shop]); });
    return wb;
  }

  var api = { parse: parse, group: group, shopShort: shopShort, monthOf: monthOf, fileName: fileName, uniqueNames: uniqueNames, build: build, HEAD: HEAD };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.BJP = api;
})(this);
