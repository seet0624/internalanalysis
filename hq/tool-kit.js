// 审核工具共用的小东西（名字审核、技术单审核都载入）：
// 1. 浏览器的 alert 换成米白金色的提示框（不挡住整个浏览器、文字是白话）
// 2. HQTool.guard(有没有还没下载的工作)：关掉或重新整理页面前先提醒
(function () {
  'use strict';
  var css = '.hqk-ov{position:fixed;inset:0;z-index:2147483600;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(60,64,67,.18)}' +
    '.hqk-box{width:min(420px,100%);background:#FFFFFF;color:#202124;border:1px solid #DADCE0;border-radius:16px;box-shadow:0 20px 48px -12px rgba(60,64,67,.28);padding:20px 22px;font:15px/1.6 "PingFang SC","Microsoft YaHei",system-ui,sans-serif}' +
    '.hqk-box h2{margin:0 0 6px;font-size:16px;display:flex;align-items:center;gap:8px}.hqk-box h2::before{content:"";width:8px;height:8px;border-radius:50%;background:#1A73E8}' +
    '.hqk-box p{margin:0;white-space:pre-line;color:#5F6368}.hqk-box button{margin-top:16px;min-height:40px;padding:0 18px;border:0;border-radius:10px;background:#1A73E8;color:#FFFFFF;font:inherit;font-weight:600;cursor:pointer;float:right}' +
    '.hqk-box button:focus-visible{outline:2px solid #1A73E8;outline-offset:2px}.hqk-box::after{content:"";display:block;clear:both}';
  var queue = [];
  function show(msg) {
    if (!document.body) { document.addEventListener('DOMContentLoaded', function () { show(msg); }); return; }
    if (!document.getElementById('hqk-css')) { var st = document.createElement('style'); st.id = 'hqk-css'; st.textContent = css; document.head.appendChild(st); }
    if (document.querySelector('.hqk-ov')) { queue.push(msg); return; }
    var ov = document.createElement('div');
    ov.className = 'hqk-ov'; ov.setAttribute('role', 'alertdialog'); ov.setAttribute('aria-modal', 'true');
    var box = document.createElement('div'); box.className = 'hqk-box';
    var h = document.createElement('h2'); h.textContent = '提示';
    var p = document.createElement('p'); p.textContent = String(msg == null ? '' : msg);
    var b = document.createElement('button'); b.type = 'button'; b.textContent = '知道了';
    box.appendChild(h); box.appendChild(p); box.appendChild(b); ov.appendChild(box); document.body.appendChild(ov);
    var prev = document.activeElement;
    function close() { ov.remove(); document.removeEventListener('keydown', key); if (prev && prev.focus) prev.focus(); if (queue.length) show(queue.shift()); }
    function key(e) { if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); close(); } }
    b.addEventListener('click', close); document.addEventListener('keydown', key);
    b.focus();
  }
  window.alert = show;
  window.HQTool = {
    say: show,
    // 程序错误转成客服看得懂的话；技术细节放最后一行（截图给我们看用）
    friendly: function (what, err) { return what + '\n可能是文件不是 Excel、已经损坏，或还开着没存好。请用 Excel 打开后「另存为 .xlsx」再拖一次。\n（细节：' + (err && err.message ? err.message : err) + '）'; },
    guard: function (hasWork) {
      window.addEventListener('beforeunload', function (e) { try { if (hasWork()) { e.preventDefault(); e.returnValue = ''; } } catch (x) {} });
    }
  };
})();
