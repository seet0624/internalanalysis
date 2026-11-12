// 网页登入。挡得住一般人；但检查写在网页里、仓库也是公开的，懂技术的人可以绕过，所以敏感资料不要放进网站。
// 每一页都要载入：<script src="（到网站根目录）/hq/auth.js"></script>
// 首页自己处理登入画面（<script ... data-page="hq">）；其他页没登入就跳回首页登入。
//
// 加账号：在 ACCOUNTS 加一项。hash = sha256(SALT + 账号 + ':' + 密码)，用下面的 HQAuth.hash('账号', '密码') 在主控台算。
(function () {
  'use strict';
  var SALT = 'shuyi-hq-v1:';
  var KEY = 'hq-session';
  var TTL = 12 * 60 * 60 * 1000;   // 登入 12 小时后要重新登入

  // role：boss 看全公司；cs 只看国内客服部
  var ACCOUNTS = {
    dongfangcs: { hash: '2d7371e458032390529c11a923d1f89054c2fdd4ccf4deac1793d0fc5df951d2', role: 'cs', name: '国内客服部' },
    martin: { hash: '2b605dbf1dc114eb72c6d72127d1dd708abcd0bb547d064b55460562f459b789', role: 'boss', name: '老板 Martin' }
  };
  // 每个身份能进的页面（网站根目录下的路径开头）
  var ACCESS = {
    boss: ['*'],
    cs: ['', 'index.html', 'name/', 'tech/', 'handbook/', 'guide/', 'numera/', 'docs/']   // 客服不进 3D 办公室（command/），登入直接到名字审核
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
      if (tok && tok.access_token) fetch(CLOUD_URL + '/auth/v1/logout', { method: 'POST', keepalive: true, headers: { apikey: CLOUD_KEY, Authorization: 'Bearer ' + tok.access_token } }).catch(function () {});
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
    d.addEventListener('close', function () { var yes = d.returnValue === 'yes'; d.remove(); if (yes) { logout(); location.href = ROOT; } });
    d.showModal();
  }
  window.HQAuth = { session: session, login: login, logout: logout, confirmLogout: confirmLogout, cloudLogin: cloudLogin, cloudGet: cloudGet, can: can, root: ROOT, hash: function (id, pass) { return sha256(SALT + String(id).toLowerCase() + ':' + pass); } };

  if (isHQ) return;
  // 其他页：没登入、或这个身份不能进 → 回首页
  var s = session();
  if (!s || !can(here(), s)) {
    location.replace(ROOT + (s ? '?denied=' : '?next=') + encodeURIComponent(here()));
    return;
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
