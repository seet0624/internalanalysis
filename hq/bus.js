// 资料汇流排：审核工具处理完文件就记一笔事件，3D 公司（同一个浏览器的其他分页也会即时收到）让员工照着交接。
// 事件存在这台电脑的浏览器里（localStorage），不会上传；换一台电脑看不到。
//
// HQBus.emit({ tool: 'tech', kind: 'processed', files: 3, orders: 40, problem: 5, ... })
// HQBus.on(function (evt) { ... })        新事件（这一页或别的分页发的）
// HQBus.list()                             全部事件，旧的在前
(function () {
  'use strict';
  var KEY = 'hq-events', MAX = 200;
  function read() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } }
  function write(list) { try { localStorage.setItem(KEY, JSON.stringify(list.slice(-MAX))); } catch (e) {} }
  function who() { var s = window.HQAuth && window.HQAuth.session(); return s ? s.id : ''; }

  window.HQBus = {
    emit: function (evt) {
      var e = Object.assign({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), t: Date.now(), who: who() }, evt);
      var list = read(); list.push(e); write(list);
      window.dispatchEvent(new CustomEvent('hq-event', { detail: e }));
      return e;
    },
    list: read,
    on: function (cb) {
      window.addEventListener('hq-event', function (e) { cb(e.detail); });
      // 别的分页写进来的
      window.addEventListener('storage', function (e) {
        if (e.key !== KEY || !e.newValue) return;
        var before = {}; try { JSON.parse(e.oldValue || '[]').forEach(function (x) { before[x.id] = 1; }); } catch (err) {}
        try { JSON.parse(e.newValue).forEach(function (x) { if (!before[x.id]) cb(x); }); } catch (err) {}
      });
    }
  };
})();
