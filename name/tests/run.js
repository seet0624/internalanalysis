// 名字审核网页的自动测试：node name/tests/run.js（改 name/index.html 开 PR 前跑，全过才交审核部）
// 1) 文件名对照表 CASES：原文件名 + 学员 → 原装 / 干净 / 有问题 / 督导 的下载名
// 2) 用假资料做一份技术单（不放真实学员资料），走一遍：读 → 审 → 下载 → 改好拖回来
// 客服拿来新的文件出了问题：先在 CASES 加一条（这时会失败），再改程序，直到全过。
const path = require('path'), fs = require('fs');
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node-tools/node_modules/playwright'); }
const CHROME = process.env.PW_CHROME || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find(p => fs.existsSync(p));
const PAGE = 'file://' + path.resolve(__dirname, '../index.html');
// 网页有登录关卡：用 hq/auth.js 里第一个账号的 id 放一个登录状态（只是 id，不是密码）
const ACC = (fs.readFileSync(path.resolve(__dirname, '../../hq/auth.js'), 'utf8').match(/ACCOUNTS\s*=\s*\{\s*([A-Za-z0-9_]+)\s*:/) || [])[1];
const S = (n, bad, ov, disp, order) => ({ n, bad, ov, disp, order }); // 学员：bad=有问题、ov=名册展示有写（海外）

// want：每一种下载的文件名（国内海外分开时是两个，用 | 隔开）；'' = 不给这份
const CASES = require('./naming-cases.json');

(async () => {
  const b = await pw.chromium.launch(CHROME ? { executablePath: CHROME } : {});
  const p = await b.newPage();
  await p.addInitScript((acc) => { localStorage.setItem('hq-session', JSON.stringify({ id: acc, exp: Date.now() + 36e5 })); localStorage.setItem('mzys_recheck_last', String(Date.now())); localStorage.setItem('mzys_seen2', '1'); }, ACC);
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto(PAGE); await p.waitForFunction(() => typeof outName === 'function');
  let fail = 0, pass = 0; const ok = (c, msg) => { if (c) pass++; else { fail++; console.log('✗ ' + msg); } };

  // ---------- 1. 文件名对照表 ----------
  const got = await p.evaluate((cases) => cases.map(c => {
    const res = c.stu.map((s, i) => ({ problem: !!s.bad, ov: !!s.ov, disp: s.disp || ('学员' + i), order: s.order || ('A' + i), sid: i + 1, rows: [{ row: 3 + i, msgs: [], warns: [] }] }));
    const nOv = res.filter(r => r.ov).length, x = { name: c.name, tableDate: tableDateOf([], c.name), tags: nameTags(c.name), audit: { results: res } };
    x.mixed = nOv > 0 && nOv < res.length; x.overseas = !x.mixed && nOv > 0;
    const ps = partsOf(x), k = (kind, f) => ps.filter(f).map(q => outName(q, kind)).join(' | ');
    return { orig: k('orig', () => true), clean: k('clean', q => passCount(q)), bad: k('bad', q => problemCount(q)), sup: k('sup', q => !q.overseas && passCount(q)) };
  }), CASES);
  CASES.forEach((c, i) => { ['orig', 'clean', 'bad', 'sup'].forEach(kd => ok(got[i][kd] === c.want[kd], `「${c.name}」${kd}：应该是「${c.want[kd]}」，实际「${got[i][kd]}」`)); });
  if (process.argv.includes('--print')) console.log(JSON.stringify(got, null, 1));

  // ---------- 2. 假资料技术单，从读到下载 ----------
  const e2e = await p.evaluate(async () => {
    const H = ['序号','订单时间','订单编号','会员编号','会员姓名','服务中心编号','商品标题','加工序号','产品配置编号','股东名称','新名字姓氏','使用人姓名','性别','公历生日','生肖',' 农历时辰 ','父亲名字','母亲名字','禁忌字','是否双胞胎','父亲生日','母亲生日','是否子时','兄弟姐妹','子女','新名','新名拼音','名册展示','配置人','审核人','订单状态备注','备注','总备注'];
    const stu = [ // [订单, 姓, 姓名, 父亲, 新名1, 拼音1, 新名2, 拼音2, 名册展示]
      ['T0000000000001', '王', '王小明', '王大山', '王山林', 'shān lín', '王晓云', 'xiǎo yún', ''],   // 王山林 和父亲王大山撞「山」→ 有问题
      ['T0000000000002', '李', '李丽', '李大海', '李沐阳', 'mǔ yáng', '李若溪', 'lǐ ruò nǐ', ''],   // 沐 声调不同不算错；溪 写成 nǐ 要提醒
      ['T0000000000003', '赵', '赵一', '赵大川', '赵景行', 'zhào jǐng xíng', '赵知远', 'zǎo zhī yuǎn', '简体']]; // 海外；赵 写成 zǎo 要提醒
    const wb = new ExcelJS.Workbook(), ws = wb.addWorksheet('命名');
    ws.addRow(['命名配制信息表']); ws.addRow(['订单基本信息']); ws.addRow(H);
    stu.forEach((s, i) => [[s[4], s[5]], [s[6], s[7]]].forEach(nm => { const r = H.map(() => ''); const set = (h, v) => r[H.indexOf(h)] = v;
      set('序号', String(i + 1)); set('订单编号', s[0]); set('新名字姓氏', s[1]); set('使用人姓名', s[2]); set('性别', '男'); set('公历生日', '1990年01月0' + (i + 1) + '日'); set('生肖', '马');
      set('父亲名字', s[3]); set('母亲名字', '无'); set('禁忌字', '无'); set('是否双胞胎', '否'); set('兄弟姐妹', '无'); set('子女', '无'); set('新名', nm[0]); set('新名拼音', nm[1]); set('名册展示', s[8]); ws.addRow(r); }));
    ws.addRow([]); const f = ws.addRow(['审核人：测试', '', '制表时间：', 46296, '回传时间：', 46327]);
    const buf = await wb.xlsx.writeBuffer();
    parsedFiles.length = 0; await loadWithBuffers([{ name: '技术单 2026-10-01（名正言顺）.xlsx', arrayBuffer: async () => buf }]);
    const x = parsedFiles[0], R = {};
    R.py = {}; x.audit.results.forEach(r => r.rows.forEach(w => { R.py[w.neu] = w.warns.filter(m => /技术单拼音/.test(m)).length; }));
    R.lv = detone('lǚ'); R.sb = recheck(null, '郑我', 'nǐ').join(' / ');
    R.n = x.audit.results.length; R.bad = x.audit.results.filter(r => r.problem).map(r => r.disp); R.mixed = x.mixed;
    const read = async (u) => { const w = new ExcelJS.Workbook(); await w.xlsx.load(u.buffer ? u : new Uint8Array(u)); return w.worksheets[0]; };
    const ps = partsOf(x), dom = ps.find(q => !q.overseas);
    const orig = await read(await origBuffer(dom)); R.origRows = orig.rowCount; R.footer = [];
    orig.eachRow(r => r.eachCell(c => { if (/^\d{4}-\d{2}-\d{2}$/.test(String(c.value))) R.footer.push(c.value); }));
    const badWb = await buildSplitWorkbook(dom, true), badWs = badWb.worksheets[0], badBuf = await badWb.xlsx.writeBuffer();
    R.badHeader = badWs.getRow(3).getCell(34).value; R.badRows = []; for (let r = 4; r <= 5; r++) R.badRows.push([badWs.getRow(r).getCell(26).value, badWs.getRow(r).getCell(34).value]);
    const clean = await (await buildCleanWorkbook(dom)).xlsx.writeBuffer(); R.cleanRows = (await read(clean)).actualRowCount;
    parsedFiles.length = 0; await loadWithBuffers([{ name: '（有问题）王小明 名正言顺技术单2026-10-01（1）.xlsx', arrayBuffer: async () => badBuf }]);
    const y = parsedFiles[0]; R.reName = outName(y, 'orig'); const o2 = await read(await origBuffer(y)); R.reAH = [3, 4, 5].map(r => o2.getRow(r).getCell(34).value);
    return R; });
  ok(JSON.stringify(e2e.py) === JSON.stringify({ 王山林: 0, 王晓云: 0, 李沐阳: 0, 李若溪: 1, 赵景行: 0, 赵知远: 1 }), '拼音提醒：字母不对（溪 nǐ、姓赵 zǎo）才提醒，声调不同不提醒，实际 ' + JSON.stringify(e2e.py));
  ok(e2e.lv === 'lv', 'lǚ 应该当成 lv（字库用 v），实际 ' + e2e.lv);
  ok(/拼音写错：「我」写 ni/.test(e2e.sb), '试改名字：我 写 nǐ 应该提醒，实际 ' + e2e.sb);
  ok(e2e.n === 3, '假技术单应该读到 3 位学员，实际 ' + e2e.n);
  ok(JSON.stringify(e2e.bad) === '["王小明"]', '应该只有王小明有问题（王山林撞父亲王大山的山），实际 ' + JSON.stringify(e2e.bad));
  ok(e2e.mixed === true, '赵一名册展示有写，应该判成国内海外混合');
  ok(e2e.footer.includes('2026-10-01') && e2e.footer.includes('2026-11-01'), '原装表尾应该改成日期 2026-10-01 / 2026-11-01，实际 ' + JSON.stringify(e2e.footer));
  ok(e2e.badHeader === '审核原因', '有问题文件应该有表头「审核原因」，实际 ' + e2e.badHeader);
  ok(/山/.test(String(e2e.badRows.find(r => r[0] === '王山林')?.[1])) && e2e.badRows.find(r => r[0] === '王晓云')?.[1] === '这个名字没问题', '有问题文件原因应该只写在王山林那行，实际 ' + JSON.stringify(e2e.badRows));
  ok(e2e.cleanRows === 3, '国内干净文件应该是表头 + 李丽 2 行，实际 ' + e2e.cleanRows + ' 行');
  ok(e2e.reName === '王小明 名正言顺技术单2026-10-01（1）.xlsx', '改好拖回来，原装名应该照原名拿掉（有问题），实际 ' + e2e.reName);
  ok(e2e.reAH.every(v => v == null), '改好拖回来，原装里的旧原因和表头应该清掉，实际 ' + JSON.stringify(e2e.reAH));

  ok(!errs.length, '网页有 JS 错误：' + errs.join(' / '));
  console.log(`${fail ? '✗ 有 ' + fail + ' 项失败' : '✓ 全部通过'}（${pass} 项通过）`);
  await b.close(); process.exit(fail ? 1 : 0);
})();
