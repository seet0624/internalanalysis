// 业务流程手册：纯逻辑（浏览器和 node 测试共用）。手册内容只在登入后从云端拿（cs_docs.handbook），不放在网站档案里。
(function (root) {
  'use strict';
  var WEEK = ['日', '一', '二', '三', '四', '五', '六'];
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var iso = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };

  // 手册的表：head 空的时候，第一行就是标题
  function rowsOf(b) { return b.head && b.head.length ? { head: b.head, rows: b.rows } : { head: b.rows[0] || [], rows: b.rows.slice(1) }; }

  // 章节分组（左边导航）；手册以后多了章节，没列到的放「其他」
  var GROUPS = [
    { name: '技术单', nos: [1, 3, 9, 10, 7, 11] },
    { name: '新名字', nos: [2, 6, 13, 15] },
    { name: '产品与维修', nos: [4, 14, 5] },
    { name: '中转与积分', nos: [8, 12, 17] },
    { name: '每月与系统', nos: [16, 18] }
  ];
  function groups(hb) {
    var seen = {}, out = GROUPS.map(function (g) {
      var chs = g.nos.map(function (no) { return hb.chapters.filter(function (c) { return c.no === no; })[0]; }).filter(Boolean);
      chs.forEach(function (c) { seen[c.no] = 1; });
      return { name: g.name, chapters: chs };
    });
    var rest = hb.chapters.filter(function (c) { return !seen[c.no]; });
    if (rest.length) out.push({ name: '其他', chapters: rest });
    return out.filter(function (g) { return g.chapters.length; });
  }

  // 「30天」→ 30
  function days(text) { var m = String(text || '').match(/(\d+)\s*天/); return m ? Number(m[1]) : null; }
  // 回传期限：从哪天开始算 + 几天
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

  // 一段文字里的网址
  function urlOf(text) { var m = String(text || '').match(/https?:\/\/[^\s（）()]+/); return m ? m[0] : null; }

  function blockText(b) {
    if (b.type === 'table') return rowsOf(b).head.concat([].concat.apply([], rowsOf(b).rows)).join(' ');
    if (b.type === 'ol' || b.type === 'ul') return b.items.join(' ');
    return b.text || '';
  }
  // 搜索：空格分开的每个词都要出现在同一章里；回传符合的章号
  function search(hb, q) {
    var terms = String(q || '').toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return null;
    return hb.chapters.filter(function (c) {
      var t = (c.title + ' ' + c.blocks.map(blockText).join(' ')).toLowerCase();
      return terms.every(function (w) { return t.indexOf(w) >= 0; });
    }).map(function (c) { return c.no; });
  }

  var api = { rowsOf: rowsOf, groups: groups, days: days, deadline: deadline, fillScript: fillScript, techName: techName, urlOf: urlOf, search: search, iso: iso };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.MANUAL = api;
})(this);
