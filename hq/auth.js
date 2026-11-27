// 网页登入。挡得住一般人；但检查写在网页里、仓库也是公开的，懂技术的人可以绕过，所以敏感资料不要放进网站。
// 每一页都要载入：<script src="（到网站根目录）/hq/auth.js?v=日期"></script>
// 改了 hq/ 里共用的档案（auth.js、gold.css、bus.js、tool-kit.js、company.js），就把各页的 ?v= 换新（日期；同一天第二次加 b、c），
// 不然浏览器拿旧的档案配新的网页，页面会坏掉。
// 首页自己处理登入画面（<script ... data-page="hq">）；其他页没登入就跳回首页登入。
//
// 加账号：在 ACCOUNTS 加一项。hash = sha256(SALT + 账号 + ':' + 密码)，用下面的 HQAuth.hash('账号', '密码') 在主控台算。
(function () {
  'use strict';
  var SALT = 'shuyi-hq-v1:';
  var KEY = 'hq-session';
  var TTL = 12 * 60 * 60 * 1000;   // 登入 12 小时后要重新登入

  // role：boss 看全公司；cs 只看国内客服部；os 只看海外客服（两边互相看不到）
  var ACCOUNTS = {
    dongfangcs: { hash: '2d7371e458032390529c11a923d1f89054c2fdd4ccf4deac1793d0fc5df951d2', role: 'cs', name: '国内客服部' },
    shuyics: { hash: '16194c0d1d5ca5c257b1f76c8e5b6f498a726f63d5f70aaba929162ec60f23a6', role: 'os', name: '海外客服部' },
    martin: { hash: '2b605dbf1dc114eb72c6d72127d1dd708abcd0bb547d064b55460562f459b789', role: 'boss', name: '老板 Martin' }
  };
  // 每个身份能进的页面（网站根目录下的路径开头）
  var ACCESS = {
    boss: ['*'],
    cs: ['', 'index.html', 'name/', 'tech/', 'bjp/', 'wuxing/', 'manual/', 'repair/', 'guide/', 'numera/', 'docs/'],   // 国内客服不进 3D 办公室（command/），登入直接到名字审核
    os: ['', 'index.html', 'handbook/']   // 海外客服：只有海外客服门户
  };

  // ---------- SHA-256（不靠 crypto.subtle，http 网址也能用） ----------
  function sha256(str) {
    var K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
      0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
      0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
    var bytes = Array.from(new TextEncoder().encode(str));
    var bitLen = bytes.length * 8;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0);
    for (var s = 56; s >= 0; s -= 8) bytes.push(s >= 32 ? Math.floor(bitLen / Math.pow(2, s)) & 0xff : (bitLen >>> s) & 0xff);
    var H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    var W = new Array(64);
    var rotr = function (x, n) { return (x >>> n) | (x << (32 - n)); };
    for (var i = 0; i < bytes.length; i += 64) {
      for (var t = 0; t < 16; t++) W[t] = (bytes[i + t * 4] << 24) | (bytes[i + t * 4 + 1] << 16) | (bytes[i + t * 4 + 2] << 8) | bytes[i + t * 4 + 3];
      for (t = 16; t < 64; t++) {
        var s0 = rotr(W[t - 15], 7) ^ rotr(W[t - 15], 18) ^ (W[t - 15] >>> 3);
        var s1 = rotr(W[t - 2], 17) ^ rotr(W[t - 2], 19) ^ (W[t - 2] >>> 10);
        W[t] = (W[t - 16] + s0 + W[t - 7] + s1) | 0;
      }
      var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (t = 0; t < 64; t++) {
        var S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        var ch = (e & f) ^ (~e & g);
        var t1 = (h + S1 + ch + K[t] + W[t]) | 0;
        var S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        var mj = (a & b) ^ (a & c) ^ (b & c);
        var t2 = (S0 + mj) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
      H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }
    return H.map(function (x) { return ('00000000' + (x >>> 0).toString(16)).slice(-8); }).join('');
  }

  var me = document.currentScript;
  var ROOT = new URL('..', me.src).href;          // 网站根目录（hq/ 的上一层）
  var isHQ = me.getAttribute('data-page') === 'hq';
  var noBadge = me.hasAttribute('data-nobadge');   // 页面自己有返回按钮、账号栏（例如指挥中心）

  function read() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
  function session() {
    var s = read();
    if (!s || !ACCOUNTS[s.id] || s.exp < Date.now()) {
      if (s) { try { localStorage.removeItem(KEY); localStorage.removeItem(CLOUD_TOKEN); } catch (e) {} }   // 过期：网站和云端一起登出
      return null;
    }
    return { id: s.id, role: ACCOUNTS[s.id].role, name: ACCOUNTS[s.id].name };
  }
  function login(id, pass) {
    id = String(id || '').trim().toLowerCase();
    var acc = ACCOUNTS[id];
    if (!acc || sha256(SALT + id + ':' + String(pass || '')) !== acc.hash) return null;
    try { localStorage.setItem(KEY, JSON.stringify({ id: id, exp: Date.now() + TTL })); } catch (e) {}
    return session();
  }
  function logout() {
    // 云端也登出（让登入凭证失效），再清掉这台电脑上的
    try {
      var tok = JSON.parse(localStorage.getItem(CLOUD_TOKEN) || 'null');
      // scope=local：账号是大家共用的，只登出这个浏览器；不加的话会把同账号所有人一起踢掉
      if (tok && tok.access_token) fetch(CLOUD_URL + '/auth/v1/logout?scope=local', { method: 'POST', keepalive: true, headers: { apikey: CLOUD_KEY, Authorization: 'Bearer ' + tok.access_token } }).catch(function () {});
    } catch (e) {}
    try { localStorage.removeItem(KEY); localStorage.removeItem(CLOUD_TOKEN); } catch (e) {}
  }

  // ---------- 云端（Supabase）：网站密码对了，顺便登入云端资料库 ----------
  // 第一次登入时，后端用同一套 hash 再验一次密码，才建立云端账号；之后就是普通登入。
  // 云端资料谁能看什么由后端权限把关（客服账号只看得到 2F），跟网页里的检查无关。
  var CLOUD_URL = 'https://xmtljgxdzhrptsazklls.supabase.co';
  var CLOUD_KEY = 'sb_publishable_Z9It450THGdFoj_FItrJOQ_HcWYA0lJ';
  var CLOUD_TOKEN = 'sb-xmtljgxdzhrptsazklls-auth-token';   // 跟 supabase-js 预设的存法一样，指挥中心直接接着用
  function post(path, body) {
    return fetch(CLOUD_URL + path, { method: 'POST', headers: { apikey: CLOUD_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, body: j }; }); });
  }
  // 读云端的内部资料（cs_docs 表：业务手册、店铺名单…）。登入凭证过期就先换新的。拿不到回传 null
  function cloudToken() { try { return JSON.parse(localStorage.getItem(CLOUD_TOKEN) || 'null'); } catch (e) { return null; } }
  function refreshToken(tok) {
    return post('/auth/v1/token?grant_type=refresh_token', { refresh_token: tok.refresh_token }).then(function (r) {
      if (!r.ok || !r.body || !r.body.access_token) return null;
      var sess = r.body; if (!sess.expires_at) sess.expires_at = Math.floor(Date.now() / 1000) + (sess.expires_in || 3600);
      try { localStorage.setItem(CLOUD_TOKEN, JSON.stringify(sess)); } catch (e) {}
      return sess;
    }).catch(function () { return null; });
  }
  function cloudGet(key) {
    var tok = cloudToken();
    if (!tok || !tok.access_token) return Promise.resolve(null);
    var fresh = tok.expires_at && tok.expires_at * 1000 < Date.now() + 60000 ? refreshToken(tok) : Promise.resolve(tok);
    return fresh.then(function (t) {
      if (!t) return null;
      return fetch(CLOUD_URL + '/rest/v1/cs_docs?select=data&key=eq.' + encodeURIComponent(key), { headers: { apikey: CLOUD_KEY, Authorization: 'Bearer ' + t.access_token } })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (rows) { return rows && rows[0] ? rows[0].data : null; });
    }).catch(function () { return null; });
  }
  // 拿一个有效的云端登入凭证（快过期就先换新），给要证明身份的后端用（例如数易助手）。拿不到回传 null
  function cloudAccess() {
    var tok = cloudToken();
    if (!tok || !tok.access_token) return Promise.resolve(null);
    var fresh = tok.expires_at && tok.expires_at * 1000 < Date.now() + 60000 ? refreshToken(tok) : Promise.resolve(tok);
    return fresh.then(function (t) { return t ? t.access_token : null; }).catch(function () { return null; });
  }
  function cloudLogin(id, pass, timeoutMs) {
    id = String(id || '').trim().toLowerCase();
    var email = id + '@shuyi-hq.app';
    var token = function () { return post('/auth/v1/token?grant_type=password', { email: email, password: String(pass || '') }); };
    var work = token().then(function (r) {
      if (r.ok) return r;
      return post('/rest/v1/rpc/hq_provision', { p_account: id, p_password: String(pass || '') }).then(function (p) { return p.ok && p.body ? token() : r; });
    }).then(function (r) {
      if (!r.ok || !r.body || !r.body.access_token) { try { localStorage.removeItem(CLOUD_TOKEN); } catch (e) {} return false; }
      var sess = r.body;
      if (!sess.expires_at) sess.expires_at = Math.floor(Date.now() / 1000) + (sess.expires_in || 3600);
      try { localStorage.setItem(CLOUD_TOKEN, JSON.stringify(sess)); } catch (e) { return false; }
      return true;
    }).catch(function () { return false; });
    // 国内网络偶尔连不上：最多等几秒，连不上就用本机模式，不挡登入
    var timer;
    var limit = new Promise(function (res) { timer = setTimeout(function () { res(false); }, timeoutMs || 7000); });
    return Promise.race([work, limit]).then(function (v) { clearTimeout(timer); return v; });
  }
  // path：网站根目录下的路径，例如 'name/' 或 'docs/dongfang/'
  function can(path, s) {
    s = s || session();
    if (!s) return false;
    var list = ACCESS[s.role] || [];
    if (list.indexOf('*') >= 0) return true;
    path = String(path || '');
    return list.some(function (p) { return p === '' ? path === '' : path.indexOf(p) === 0; });
  }
  function here() { return location.href.split('#')[0].split('?')[0].replace(ROOT, ''); }

  // 退出前先跳一个确认窗口；按「退出」才登出回首页（Esc、取消都不会登出）
  function confirmLogout() {
    var d = document.createElement('dialog');
    d.className = 'g-confirm';
    d.innerHTML = '<form method="dialog"><h2>确定要退出吗？</h2><p>退出后要重新输入账号和密码才能使用。</p>' +
      '<div class="g-confirm-acts"><button type="submit" value="no" class="btn" autofocus>取消</button><button type="submit" value="yes" class="btn primary pri">退出</button></div></form>';
    document.body.appendChild(d);
    d.addEventListener('close', function () { var yes = d.returnValue === 'yes'; d.remove(); if (yes) { logout(); location.href = ROOT + '?bye=1'; } });   // ?bye：回到登入页时播退出过场
    d.showModal();
  }
  // 系统提醒框（取代浏览器的 alert / confirm）：回传 Promise，'ok' 继续、'back' 返回、'close' 关掉。所有文字都会 esc
  // o = { badge, title, sub, count, countText, desc, peopleTitle, people: [{ name, miss }], peopleNote, impactTitle, impact, ok, back, backSub }
  function notice(o) {
    var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    var svg = function (d, w) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (w || 1.8) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>'; };
    var people = o.people || [];
    var d = document.createElement('dialog');
    d.className = 'g-notice';
    d.setAttribute('aria-labelledby', 'gnTitle');
    d.innerHTML = '<form method="dialog" class="gn-in">' +
      '<svg class="gn-lines" viewBox="0 0 900 120" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="gnGold" x1="0" x2="1"><stop offset="0" stop-color="#E8C77F" stop-opacity="0"/><stop offset=".45" stop-color="#C9923A"/><stop offset="1" stop-color="#E8C77F" stop-opacity="0"/></linearGradient></defs>' +
      '<path d="M0 92 C180 62 330 118 520 86 S800 58 900 84" fill="none" stroke="url(#gnGold)" stroke-width="1.6"/><path d="M0 108 C200 82 360 126 560 100 S820 80 900 98" fill="none" stroke="url(#gnGold)" stroke-width="1" opacity=".7"/></svg>' +
      '<button type="submit" value="close" class="gn-x" aria-label="关闭">×</button>' +
      (o.badge ? '<span class="gn-badge">' + esc(o.badge) + '</span>' : '') +
      '<div class="gn-head"><span class="gn-ic">' + svg('<path d="M10.3 3.9 2.6 17.2A2 2 0 0 0 4.3 20h15.4a2 2 0 0 0 1.7-2.8L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4.5M12 17h.01"/>', 1.9) + '</span>' +
        '<div><h2 id="gnTitle">' + esc(o.title) + '</h2>' + (o.sub ? '<p>' + esc(o.sub) + '</p>' : '') + '</div></div>' +
      '<hr class="gn-rule">' +
      (o.count != null ? '<p class="gn-count"><b>' + esc(o.count) + '</b>' + esc(o.countText || '') + '</p>' : '') +
      (o.desc ? '<p class="gn-desc">' + esc(o.desc) + '</p>' : '') +
      (people.length ? '<section class="gn-card gn-people"><span class="gn-cardic">' + svg('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><circle cx="17" cy="9" r="2.8"/><path d="M16.5 14.6c2.6.1 4.4 1.8 5 5.4"/>') + '</span>' +
        '<div class="gn-body"><h3>' + esc(o.peopleTitle || '涉及名单') + '</h3><p class="gn-names">' + esc(people.slice(0, 5).map(function (x) { return x.name; }).join('、') + (people.length > 5 ? '……' : '')) + '</p>' +
        (o.peopleNote ? '<p class="gn-small">' + esc(o.peopleNote) + '</p>' : '') + '</div>' +
        '<button type="button" class="gn-more" aria-expanded="false" aria-controls="gnList">查看完整名单 <span class="gn-chev" aria-hidden="true">〉</span></button>' +
        '<ul class="gn-list" id="gnList" hidden>' + people.map(function (x) { return '<li><b>' + esc(x.name) + '</b>' + (x.miss ? '<span>缺：' + esc(x.miss) + '</span>' : '') + '</li>'; }).join('') + '</ul></section>' : '') +
      (o.impact ? '<section class="gn-card gn-impact"><span class="gn-cardic">' + svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>') + '</span><div><h3>' + esc(o.impactTitle || '') + '</h3><p>' + esc(o.impact) + '</p></div></section>' : '') +
      '<div class="gn-acts"><button type="submit" value="ok" class="gn-ok" autofocus><span>' + svg('<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>', 2) + esc(o.ok || '继续') + '</span></button>' +
        (o.back ? '<button type="submit" value="back" class="gn-back"><span>' + svg('<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>', 2) + esc(o.back) + '</span>' + (o.backSub ? '<small>' + esc(o.backSub) + '</small>' : '') + '</button>' : '') +
      '</div></form>';
    document.body.appendChild(d);
    var more = d.querySelector('.gn-more');
    if (more) more.addEventListener('click', function () { var l = d.querySelector('.gn-list'); l.hidden = !l.hidden; more.setAttribute('aria-expanded', String(!l.hidden)); });
    return new Promise(function (done) {
      d.addEventListener('close', function () { var v = d.returnValue || 'close'; d.remove(); done(v === 'ok' || v === 'back' ? v : 'close'); });   // Esc 也算关掉
      d.showModal();
    });
  }
  // 换深浅色：浏览器支援就慢慢淡过去（像天黑 / 天亮），不支援或设了减少动态就直接换
  window.gSwap = function (fn) {
    var de = document.documentElement;
    if (!document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) { fn(); return; }
    de.classList.add('g-theme-swap');
    try { document.startViewTransition(fn).finished.finally(function () { de.classList.remove('g-theme-swap'); }); }
    catch (e) { de.classList.remove('g-theme-swap'); fn(); }   // 浏览器不让做过场就直接换
  };
  // 深浅色：四个工具（名字、技术单、保健品、手册）共用一个设定，在一页换了别页也跟着
  function theme(mode) {
    try {
      if (mode) localStorage.setItem('hq-theme', mode);
      var v = localStorage.getItem('hq-theme');
      if (!v && (localStorage.getItem('tsr-theme3') === 'dark' || localStorage.getItem('mzys_theme3') === '"dark"')) v = 'dark';   // 以前各页自己记的
      return v === 'dark' ? 'dark' : 'light';
    } catch (e) { return mode === 'dark' ? 'dark' : 'light'; }
  }
  var THEME_ICON = {
    dark: '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    light: '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'
  };
  // 顶栏的「深色 / 浅色」按钮（html 上 data-theme）
  function themeButton(btn) {
    var apply = function (m) {
      document.documentElement.setAttribute('data-theme', m);
      btn.innerHTML = m === 'dark' ? THEME_ICON.light + '浅色' : THEME_ICON.dark + '深色';
      btn.setAttribute('aria-pressed', m === 'dark' ? 'true' : 'false');
      btn.setAttribute('aria-label', m === 'dark' ? '切换到浅色' : '切换到深色');
    };
    apply(theme());
    // 照画面上的来翻，存不进去也能来回切
    btn.addEventListener('click', function () { var n = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'; theme(n); window.gSwap(function () { apply(n); }); });
  }
  window.HQAuth = { theme: theme, themeButton: themeButton, session: session, login: login, logout: logout, confirmLogout: confirmLogout, notice: notice, cloudLogin: cloudLogin, cloudGet: cloudGet, cloudAccess: cloudAccess, can: can, root: ROOT, hash: function (id, pass) { return sha256(SALT + String(id).toLowerCase() + ':' + pass); } };

  if (isHQ) return;
  // 其他页：没登入、或这个身份不能进 → 回首页
  var s = session();
  if (!s || !can(here(), s)) {
    location.replace(ROOT + (s ? '?denied=' : '?next=') + encodeURIComponent(here()));
    return;
  }
  // 只有老板能看办公室（首页）：其他人点「国内客服系统 / 审核总部」直接回自己的首页（国内：名字审核；海外：海外门户），不经过首页
  if (s.role !== 'boss') {
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href]');
      if (!a) return;
      var to = new URL(a.getAttribute('href'), location.href), home = new URL(ROOT).pathname;
      if (to.origin === location.origin && (to.pathname === home || to.pathname === home + 'index.html')) {
        e.preventDefault(); location.href = ROOT + (s.role === 'os' ? 'handbook/' : 'name/');
      }
    }, true);
  }
  // 进入动画：刚打开页面时才播（gold.css 的 .g-enter），1.6 秒后拿掉，之后画面重画不会再播
  document.documentElement.classList.add('g-enter');
  setTimeout(function () { document.documentElement.classList.remove('g-enter'); }, 1600);
  // 左下角小标签：回审核总部、目前身份
  if (noBadge) return;
  document.addEventListener('DOMContentLoaded', function () {
    var a = document.createElement('a');
    a.href = ROOT;
    a.textContent = '← 审核总部 · ' + s.name;
    a.setAttribute('style', 'position:fixed;left:12px;bottom:12px;z-index:2147483000;background:#1D2125;color:#fff;font:500 13px/1 "PingFang SC","Microsoft YaHei",sans-serif;padding:10px 14px;border-radius:999px;text-decoration:none;box-shadow:0 1px 4px rgba(0,0,0,.15);opacity:.92');
    document.body.appendChild(a);
  });
})();
