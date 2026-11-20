// 客服手册：纯逻辑（浏览器和 node 测试共用）。手册内容只在登入后从云端拿（cs_docs.handbook），不放在网站档案里。
(function (root) {
  'use strict';
  var WEEK = ['日', '一', '二', '三', '四', '五', '六'];
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var iso = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };

  // 手册的表：head 空的时候，第一行就是标题
  function rowsOf(b) { return b.head && b.head.length ? { head: b.head, rows: b.rows } : { head: b.rows[0] || [], rows: b.rows.slice(1) }; }

  // 业务分类：只是把原本 18 章排进去，不改内容；手册以后多了章节、没列到的放「其他业务」
  var GROUPS = [
    { id: 'tech', name: '技术单处理', nos: [1, 9, 10, 7, 11] },
    { id: 'name', name: '新名字业务', nos: [3, 2, 6, 13, 15] },
    { id: 'product', name: '产品与维修', nos: [4, 14, 5] },
    { id: 'transfer', name: '中转与积分', nos: [8, 12, 17] },
    { id: 'system', name: '系统与业绩', nos: [16, 18] }
  ];
  function groups(hb) {
    var seen = {}, out = GROUPS.map(function (g) {
      var chs = g.nos.map(function (no) { return hb.chapters.filter(function (c) { return c.no === no; })[0]; }).filter(Boolean);
      chs.forEach(function (c) { seen[c.no] = 1; });
      return { id: g.id, name: g.name, chapters: chs };
    });
    var rest = hb.chapters.filter(function (c) { return !seen[c.no]; });
    if (rest.length) out.push({ id: 'other', name: '其他业务', chapters: rest });
    return out.filter(function (g) { return g.chapters.length; });
  }
  // 照分类排好的章节（导航、上一章 / 下一章都用这个顺序）
  function ordered(hb) { return [].concat.apply([], groups(hb).map(function (g) { return g.chapters; })); }
  function groupOf(hb, no) { return groups(hb).filter(function (g) { return g.chapters.some(function (c) { return c.no === no; }); })[0] || null; }
  function prevNext(hb, no) {
    var o = ordered(hb), i = o.map(function (c) { return c.no; }).indexOf(no);
    return { prev: i > 0 ? o[i - 1] : null, next: i >= 0 && i < o.length - 1 ? o[i + 1] : null };
  }
  // 文章类型：有步骤是操作指南，有话术表是话术，其他有表是规则速查
  function kind(c) {
    var has = function (t) { return c.blocks.some(function (b) { return b.type === t; }); };
    if (has('ol')) return '操作指南';
    if (c.blocks.some(function (b) { return b.type === 'table' && /话术/.test(rowsOf(b).head.join('')); })) return '话术';
    if (has('table')) return '规则速查';
    return '注意事项';
  }

  // 流程图：照手册原本的步骤画，不加手册没写的步骤。
  // 「注意：」开头的是提醒；写成「……有没有……→ 有的话……」的是判断（菱形，是 → 那一步）
  function flow(items) {
    return items.map(function (t) {
      var s = String(t || '').trim(), m;
      if (/^注意[：:]/.test(s)) return { kind: 'note', text: s.replace(/^注意[：:]\s*/, '') };
      if ((m = s.match(/^(.*?(?:有没有|是否).*?)\s*→\s*有的话[，,]?\s*(.+)$/))) return { kind: 'decision', text: m[1].replace(/[？?]$/, '') + '？', yes: m[2] };
      return { kind: 'step', text: s };
    });
  }

  // 「30天」→ 30
  function days(text) { var m = String(text || '').match(/(\d+)\s*天/); return m ? Number(m[1]) : null; }
  function deadline(startIso, n) {
    var d = new Date(startIso + 'T00:00:00'); if (isNaN(d) || n == null) return null;
    d.setDate(d.getDate() + n);
    return { date: iso(d), week: WEEK[d.getDay()] };
  }
  // 话术填空：「订单号 姓名」换成填的订单号和姓名，YYYY-MM-DD 换成日期；没填就留着原样
  function fillScript(text, v) {
    var s = String(text || ''), o = (v && v.order || '').trim(), n = (v && v.name || '').trim(), d = (v && v.date || '').trim();
    if (o || n) s = s.replace(/订单号 姓名/g, [o || '订单号', n || '姓名'].join(' '));
    if (d) s = s.replace(/YYYY-MM-DD/g, d);
    return s;
  }
  // 技术单命名：把例子里的日期（含 &05&06 这种）换成填的日期
  function techName(example, dates) {
    var d = String(dates || '').trim();
    return d ? String(example).replace(/\d{4}-\d{2}-\d{2}(?:&\d{1,2})*/, d) : String(example);
  }
  function urlOf(text) { var m = String(text || '').match(/https?:\/\/[^\s（）()]+/); return m ? m[0] : null; }

  function blockText(b) {
    if (b.type === 'table') return rowsOf(b).head.concat([].concat.apply([], rowsOf(b).rows)).join(' ');
    if (b.type === 'ol' || b.type === 'ul') return b.items.join(' ');
    return b.text || '';
  }
  function terms(q) { return String(q || '').toLowerCase().split(/\s+/).filter(Boolean); }
  // 搜索：空格分开的每个词都要出现在同一章里；回传符合的章号（照分类顺序）
  function search(hb, q) {
    var ws = terms(q); if (!ws.length) return null;
    return ordered(hb).filter(function (c) {
      var t = (c.title + ' ' + c.blocks.map(blockText).join(' ')).toLowerCase();
      return ws.every(function (w) { return t.indexOf(w) >= 0; });
    }).map(function (c) { return c.no; });
  }
  // 搜索结果下面的一小段原文：第一个出现关键字的地方前后各一点
  function snippet(c, q, size) {
    var ws = terms(q), n = size || 24;
    var lines = [].concat.apply([], c.blocks.map(function (b) {
      if (b.type === 'table') return rowsOf(b).rows.map(function (r) { return r.filter(Boolean).join('　'); });
      if (b.type === 'ol' || b.type === 'ul') return b.items;
      return [b.text || ''];
    }));
    for (var i = 0; i < lines.length; i++) {
      var low = lines[i].toLowerCase(), at = -1;
      for (var j = 0; j < ws.length && at < 0; j++) at = low.indexOf(ws[j]);
      if (at >= 0) { var a = Math.max(0, at - n), b = Math.min(lines[i].length, at + n * 2); return (a ? '…' : '') + lines[i].slice(a, b) + (b < lines[i].length ? '…' : ''); }
    }
    return lines[0] ? lines[0].slice(0, n * 3) : '';
  }

  // ---------- 图表用：只把手册原文换算成数字，标签照原文 ----------
  var CN = { '一': 1, '两': 2, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10 };
  var num = function (x) { return /^\d+$/.test(x) ? Number(x) : CN[x] || 0; };
  // 「约30天」「三个月左右（快的一个月）」「1-2周」「2个多月」「半年左右」→ [最少天数, 最多天数]；没有时间就 null
  function durationRange(text) {
    var s = String(text || ''), out = [], m;
    var re = /(\d+|[一两二三四五六七八九十])(?:\s*[-~到至]\s*(\d+|[一两二三四五六七八九十]))?\s*(个多月|多个月|个月|月|周|天|年)/g;
    while ((m = re.exec(s))) {
      var u = /月/.test(m[3]) ? 30 : m[3] === '周' ? 7 : m[3] === '年' ? 365 : 1, a = num(m[1]) * u, b = (m[2] ? num(m[2]) : num(m[1])) * u;
      if (/多/.test(m[3])) b += 15;
      out.push(a, b);
    }
    if (/半年/.test(s)) out.push(180);
    return out.length ? [Math.min.apply(null, out), Math.max.apply(null, out)] : null;
  }
  // 「每天」「三天一次（周六、周一、周二）」「（周三到周五）」→ 星期几（1=一 … 7=日）
  var WD = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 7, '天': 7 };
  function weekdays(text) {
    var s = String(text || ''), m;
    if (/每天/.test(s)) return [1, 2, 3, 4, 5, 6, 7];
    if ((m = s.match(/周([一二三四五六日天])\s*[到至~-]\s*周?([一二三四五六日天])/))) { var r = []; for (var d = WD[m[1]]; d <= WD[m[2]]; d++) r.push(d); return r; }
    var out = []; s.replace(/周([一二三四五六日天])/g, function (_, c) { if (out.indexOf(WD[c]) < 0) out.push(WD[c]); });
    return out.sort();
  }
  // 「RMB 1900」→ 1900，「免费」→ 0，其他（特批、—）→ null
  function money(text) { var s = String(text || ''), m = s.match(/RMB\s*([\d,.]+)/); return m ? Number(m[1].replace(/,/g, '')) : /^免费/.test(s) ? 0 : null; }
  // 章节里「每月10号 — 督导统计」这种小标题 → [{ day: 10, label: '督导统计' }]
  function monthDays(c) {
    return c.blocks.filter(function (b) { return b.type === 'h'; }).map(function (b) { var m = b.text.match(/每月\s*(\d+)\s*号\s*[—\-–]*\s*(.*)$/); return m ? { day: Number(m[1]), label: m[2].trim() } : null; }).filter(Boolean);
  }
  // 首页的数字：章节、分类、步骤、表格、话术
  function stats(hb) {
    var s = { chapters: hb.chapters.length, groups: groups(hb).length, steps: 0, tables: 0, scripts: 0 };
    hb.chapters.forEach(function (c) { c.blocks.forEach(function (b) {
      if (b.type === 'ol') s.steps += b.items.length;
      if (b.type === 'table') { s.tables++; if (/话术/.test(rowsOf(b).head.join(''))) s.scripts += rowsOf(b).rows.length; }
    }); });
    return s;
  }

  var api = { rowsOf: rowsOf, groups: groups, ordered: ordered, groupOf: groupOf, prevNext: prevNext, kind: kind, flow: flow, days: days, deadline: deadline, fillScript: fillScript, techName: techName, urlOf: urlOf, search: search, snippet: snippet, iso: iso, durationRange: durationRange, weekdays: weekdays, money: money, monthDays: monthDays, stats: stats };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.MANUAL = api;
})(this);
