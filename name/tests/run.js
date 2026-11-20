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

  // 审核人可以改成别人：首页改了，学员页也跟着变
  ok(JSON.stringify(await p.$$eval('#homeWho option', o => o.map(x => x.textContent).slice(-5))) === '["Anna","yulun","ning","martin","其他…"]', '首页审核人要有 Anna / yulun / ning / martin / 其他… 可以选');
  await p.selectOption('#homeWho', 'ning');
  ok(await p.evaluate(() => reviewerName()) === 'ning', '首页选审核人要记住');
  await p.evaluate(() => { window._pr = window.prompt; window.prompt = () => '测试员甲'; }); await p.selectOption('#homeWho', '__other'); await p.evaluate(() => { window.prompt = window._pr; });
  ok(await p.evaluate(() => reviewerName()) === '测试员甲' && await p.$eval('#homeWho', s => s.value) === '测试员甲', '选「其他…」输入的名字要记住并显示');

  // 单独下载：整份是海外（文件名带 H、表里没有名册展示）的，单独下载也要带 H
  const oneH = await p.evaluate(() => { const nm = '名正言顺技术单 2026-10-17（2）H.xlsx', res = [{ problem: false, ov: false, disp: '黄丙丁', order: 'A1', sid: 1, rows: [{ row: 3, msgs: [], warns: [] }] }, { problem: false, ov: false, disp: '黄戊己', order: 'A2', sid: 2, rows: [{ row: 4, msgs: [], warns: [] }] }];
    const x = { name: nm, tableDate: tableDateOf([], nm), tags: nameTags(nm), audit: { results: res }, mixed: false, overseas: true }; return outName(oneOf(x, res[1]), 'clean'); });
  ok(oneH === '黄戊己 名正言顺技术单 2026-10-17（1）H（干净）.xlsx', '海外文件单独下载要带 H，实际 ' + oneH);

  // ---------- 2. 假资料技术单，从读到下载 ----------
  const e2e = await p.evaluate(async () => {
    const H = ['序号','订单时间','订单编号','会员编号','会员姓名','服务中心编号','商品标题','加工序号','产品配置编号','股东名称','新名字姓氏','使用人姓名','性别','公历生日','生肖',' 农历时辰 ','父亲名字','母亲名字','禁忌字','是否双胞胎','父亲生日','母亲生日','是否子时','兄弟姐妹','子女','新名','新名拼音','名册展示','配置人','审核人','订单状态备注','备注','总备注'];
    const stu = [ // [订单, 姓, 姓名, 父亲, 新名1, 拼音1, 新名2, 拼音2, 名册展示]
      ['T0000000000001', '王', '王小明', '王大山', '王山林', 'shān lín', '王晓云', 'xiǎo yún', ''],   // 王山林 和父亲王大山撞「山」→ 有问题
      ['T0000000000002', '李', '李丽', '李大海', '李沐阳', 'mǔ yáng', '李若溪', 'lǐ ruò nǐ', ''],   // 沐 声调不同不算错；溪 写成 nǐ 要提醒
      ['T0000000000003', '赵', '赵一', '赵大川', '赵明轩', 'zhào míng xuān', '赵知远', 'zǎo zhī yuǎn', '简体']]; // 海外；赵 写成 zǎo 要提醒
    const wb = new ExcelJS.Workbook(), ws = wb.addWorksheet('命名');
    ws.addRow(['命名配制信息表']); ws.addRow(['订单基本信息']); ws.addRow(H);
    stu.forEach((s, i) => [[s[4], s[5]], [s[6], s[7]]].forEach(nm => { const r = H.map(() => ''); const set = (h, v) => r[H.indexOf(h)] = v;
      set('序号', String(i + 1)); set('订单编号', s[0]); set('新名字姓氏', s[1]); set('使用人姓名', s[2]); set('性别', '男'); set('公历生日', '1990年01月0' + (i + 1) + '日'); set('生肖', '马');
      set('父亲名字', s[3]); set('母亲名字', '无'); set('禁忌字', '无'); set('是否双胞胎', '否'); set('兄弟姐妹', '无'); set('子女', '无'); set('新名', nm[0]); set('新名拼音', nm[1]); set('名册展示', s[8]); ws.addRow(r); }));
    [4, 5, 6, 7].forEach(rn => [1, 12].forEach(c => { ws.getRow(rn).getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { theme: 5, tint: 0.8 } }; })); // 王小明、李丽涂同色（一家人）
    ws.addRow([]); const f = ws.addRow(['审核人：测试', '', '制表时间：', 46297, '回传时间：', 46327]); // 制表时间 10-02，跟文件名 10-01 不同：照文件原本的，不改
    const buf = await wb.xlsx.writeBuffer();
    parsedFiles.length = 0; await loadWithBuffers([{ name: '技术单 2026-10-01（名正言顺）.xlsx', arrayBuffer: async () => buf }]);
    const x = parsedFiles[0], R = {};
    R.py = {}; x.audit.results.forEach(r => r.rows.forEach(w => { R.py[w.neu] = w.warns.filter(m => /技术单拼音/.test(m)).length; }));
    R.lv = detone('lǚ'); R.sb = recheck(null, '郑我', 'nǐ').join(' / ');
    R.n = x.audit.results.length; R.bad = x.audit.results.filter(r => r.problem).map(r => r.disp); R.mixed = x.mixed;
    const read = async (u) => { const w = new ExcelJS.Workbook(); await w.xlsx.load(u.buffer ? u : new Uint8Array(u)); return w.worksheets[0]; };
    const ps = partsOf(x), dom = ps.find(q => !q.overseas);
    const orig = await read(await origBuffer(dom)); R.origRows = orig.rowCount; R.footer = [];
    orig.eachRow(r => r.eachCell(c => { if (/^\d{4}-\d{2}-\d{2}$/.test(String(c.value)) || /^审核人：/.test(String(c.value))) R.footer.push(c.value); }));
    const badWb = await buildSplitWorkbook(dom, true), badWs = badWb.worksheets[0], badBuf = await badWb.xlsx.writeBuffer();
    const ovW = await read(await origBuffer(ps.find(q => q.overseas))); R.ovSeq = [4, 5].map(r => ovW.getRow(r).getCell(1).value); R.badSeq = [4, 5].map(r => badWs.getRow(r).getCell(1).value); R.badFill = fillKey(badWs.getRow(4).getCell(1)) + '|' + fillKey(badWs.getRow(4).getCell(12)); R.origFill = fillKey(orig.getRow(4).getCell(1)); R.badHeader = badWs.getRow(3).getCell(34).value; R.badW = badWs.getColumn(34).width; R.badRows = []; for (let r = 4; r <= 5; r++) R.badRows.push([badWs.getRow(r).getCell(26).value, badWs.getRow(r).getCell(34).value]);
    const li = x.audit.results.find(r => /李丽/.test(r.disp)), one = oneOf(x, li); R.oneName = outName(one, 'clean'); R.oneRows = (await read(await (await buildCleanWorkbook(one)).xlsx.writeBuffer())).actualRowCount;
    // 有问题的学员也能单独下载（下载他的有问题文件），学员页按钮可以按，「下载结果」菜单也有这一项
    const wm = x.audit.results.find(r => /王小明/.test(r.disp)), oneB = oneOf(x, wm); R.oneBadName = outName(oneB, 'bad');
    selectSid(wm.sid); const ob = document.getElementById('oneDl'); R.oneBtn = (ob && !ob.disabled ? '' : '按不了 ') + (ob ? ob.textContent : '没有按钮');
    syncOneDl(); const mb = document.getElementById('dlOneBtn'); R.oneMenu = mb.style.display === 'none' ? '看不到' : mb.textContent;
    const clean = await (await buildCleanWorkbook(dom)).xlsx.writeBuffer(); R.cleanRows = (await read(clean)).actualRowCount;
    parsedFiles.length = 0; await loadWithBuffers([{ name: '（有问题）王小明 名正言顺技术单2026-10-01（1）.xlsx', arrayBuffer: async () => badBuf }]);
    const y = parsedFiles[0]; R.reName = outName(y, 'orig'); const o2 = await read(await origBuffer(y)); R.reAH = [3, 4, 5].map(r => o2.getRow(r).getCell(34).value);
    return R; });
  // 姓的特别读音（曾 zēng、单 shàn、尉迟 yù chí、朴 piáo）不能误报
  const sur = await p.evaluate(async () => {
    const H = ['序号','订单编号','新名字姓氏','使用人姓名','父亲名字','母亲名字','兄弟姐妹','子女','禁忌字','新名','新名拼音','名册展示'];
    const rows = [['曾','zēng zǐ hán'],['单','shàn zǐ hán'],['尉迟','yù chí zǐ hán'],['朴','piáo zǐ hán'],['赵','zǎo zǐ hán']];
    const wb = new ExcelJS.Workbook(), ws = wb.addWorksheet('命名'); ws.addRow(H);
    rows.forEach((x, i) => ws.addRow([String(i + 1), 'T00000000000' + (10 + i), x[0], x[0] + '一', '无', '无', '无', '无', '无', x[0] + '子涵', x[1], '']));
    const buf = await wb.xlsx.writeBuffer(); parsedFiles.length = 0;
    await loadWithBuffers([{ name: '姓 2026-10-01.xlsx', arrayBuffer: async () => buf }]);
    return parsedFiles[0].audit.results.map(r => r.rows[0].neu + ':' + r.rows[0].warns.filter(m => /技术单拼音/.test(m)).length).join(' ');
  });
  ok(sur === '曾子涵:0 单子涵:0 尉迟子涵:0 朴子涵:0 赵子涵:1', '姓的特别读音不该报错、赵 写 zǎo 要报，实际 ' + sur);
  // 有问题文件的原因：看不见的排版字符（名\u202c字）不能让「名字」变人名、「字」变称呼；不写「人工」
  const inv = await p.evaluate(async () => {
    const H = ['序号','订单编号','新名字姓氏','使用人姓名','父亲名字','母亲名字','兄弟姐妹','子女','禁忌字','新名','新名拼音','名册展示','备注'];
    const wb = new ExcelJS.Workbook(), ws = wb.addWorksheet('命名'); ws.addRow(H);
    ws.addRow(['1', 'T0000000000021', '孙', '孙甲', '无', '无', '兄弟姐妹名\u202c字：孙乙，爱人\u202c名字：段丙', '无', '无', '孙孟洺', 'mèng míng', '', '']);
    ws.addRow(['2', 'T0000000000022', '段', '段丙', '无', '无', '兄弟姐妹名\u202c字：段丁，段戊', '无', '家人不同音不同字', '段冠宏', 'guàn hóng', '', '弟弟：段戊']);
    ws.addRow(['3', 'T0000000000022', '段', '段戊', '无', '无', '兄弟姐妹名\u202c字：段丙', '无', '家人不同音不同字', '段冠羽', 'guàn yǔ', '', '']);
    ws.addRow(['4', 'T0000000000024', '赵', '赵甲', '赵大明', '无', '无', '无', '无', '赵子铭', 'zǐ míng', '', '']);
    ws.addRow(['5', 'T0000000000025', '钱', '钱甲', '钱大明', '无', '弟弟：钱小义', '无', '家人不同音不同字', '钱明怡', 'míng yí', '', '']);
    ws.addRow(['7', 'T0000000000027', '王', '王甲', '王长江', '无', '无', '无', '无', '王彰宇', 'zhāng yǔ', '', '']);
    ws.addRow(['6', 'T0000000000026', '钱', '钱乙', '钱大子', '无', '妹妹：钱小子', '无', '家人不同音不同字', '钱籽云', 'zǐ yún', '', '']);
    [3, 4].forEach(r => [1, 4].forEach(c => { ws.getRow(r).getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC000' } }; })); // 段丙、段戊涂同色 = 一家人
    const buf = await wb.xlsx.writeBuffer(); parsedFiles.length = 0;
    await loadWithBuffers([{ name: '看不见字符 2026-10-01.xlsx', arrayBuffer: async () => buf }]);
    const rs = parsedFiles[0].audit.results, bw = (await buildSplitWorkbook(parsedFiles[0], true)).worksheets[0];
    const once = [2, 3].map(r => bw.getRow(r).getCell(14).value);
    const req = relWord({ sib: '兄弟姐妹名字：段丁', note1: '客户要求：不要跟段丁同字' }, '段丁');
    const kids = splitNames('子女名\u202c字：段龙，段云'.replace(INVIS_RE, ''));
    const tone = rs[4].problem && outReason(rs[4]), poly = rs[5].problem, zi = outReason(rs[6]), homo = outReason(rs[3]), unk = outReason({ rows: [{ neu: '段甲乙', given: '甲乙', hits: [{ kind: '撞字', ni: 1, fc: '甲', full: '段甲丙', member: '同色家人「段丁」' }], msgs: [], warns: [], tones: [], detail: {} }] });
    const zu = outReason({ rows: [{ neu: '段甲乙', given: '甲乙', hits: [{ kind: '撞字', ni: 1, fc: '甲', full: '段甲庚', member: '兄弟姐妹' }], msgs: [], warns: [], tones: [], detail: { sib: '祖父：段甲庚' } }] });
    const both = outReason({ rows: [{ neu: '钱明怡', given: '明怡', hits: [{ kind: '撞字', ni: 1, fc: '明', full: '钱明义', member: '弟弟' }, { kind: '撞音', ni: 2, fc: '义', full: '钱明义', member: '弟弟' }], msgs: [], warns: [], tones: [{}, { syl: 'yi' }], detail: {} }] });
    return { both, poly, zi, tone, zu, unk, homo, kids, req, once, sun: rs[0].problem, duan: outReason(rs[1]), manual: outReason({ rows: [{ given: '甲', hits: [], msgs: [], warns: ['【备注提到 朋友/避免/同名，可能有别姓的人要避开，请人工看】'], detail: {} }] }) };
  });
  ok(JSON.stringify(inv.kids) === '["段龙","段云"]', '「子女名字：段龙，段云」只拆出两个人名，实际 ' + JSON.stringify(inv.kids));
  ok(inv.homo === '新下来的名字（赵子铭）和父亲的名字（赵大明）撞同音字「铭」「明」（míng）', '撞音的原因要短句讲重点，实际 ' + inv.homo);
  ok(inv.unk === '新下来的名字（段甲乙）和兄弟姐妹新下来的名字（段甲丙）撞同一个字「甲」', '判断不出关系要写兄弟姐妹，实际 ' + inv.unk);
  ok(inv.zu === '新下来的名字（段甲乙）和祖父的名字（段甲庚）撞同一个字「甲」', '知道关系（祖父）就照写，实际 ' + inv.zu);
  ok(inv.tone === '新下来的名字（钱明怡）和父亲的名字（钱大明）撞同一个字「明」，和弟弟的名字（钱小义）撞同音字「怡」「义」（yí / yì）', '撞字撞音合成一句、声调不同也算有问题，实际 ' + inv.tone);
  ok(inv.both === '新下来的名字（钱明怡）和弟弟的名字（钱明义）撞同一个字「明」、撞同音字「怡」「义」（yí / yì）', '同一位家人又撞字又撞音只写一次名字，实际 ' + inv.both);
  ok(inv.poly === false, '父亲王长江的「长」是多音字（cháng），新名王彰宇不该判有问题');
  ok(inv.zi === '新下来的名字（钱籽云）和父亲的名字（钱大子）、妹妹的名字（钱小子）撞同音字「籽」「子」（zǐ）', '同一种撞法的家人合在一起、「子」不写成轻声，实际 ' + inv.zi);
  ok(inv.sun === false, '「爱人\u202c名字」里的「名字」不是人名，孙孟洺不该有问题');
  ok(inv.duan === '新下来的名字（段冠宏）和弟弟新下来的名字（段冠羽）撞同一个字「冠」', '称呼要写「弟弟」（备注写的），不能写「字」或「姐妹」，实际 ' + inv.duan);
  ok(inv.once[0] === inv.once[1] && (String(inv.once[0]).match(/撞同/g) || []).length === 1, '同一单兄弟互撞只写一次，实际 ' + JSON.stringify(inv.once));
  ok(inv.req === '兄弟姐妹', '备注「客户要求：」不是称呼，应该写兄弟姐妹，实际 ' + inv.req);
  ok(!/人工|人手/.test(inv.manual), '有问题文件的原因不能写「人工」，实际 ' + inv.manual);
  // 备注写「老婆已提交名正言顺，订单编号：A…」：关系是老婆，不是「订单编号」
  const ordRel = await p.evaluate(() => {
    const one = note => outReason({ rows: [{ neu: '方甲乙', given: '甲乙', hits: [{ kind: '撞字', ni: 1, fc: '甲', full: '林甲丙', member: '关联学员「林甲丙」(A26000000000001)' }], msgs: [], warns: [], tones: [], detail: { note2: note } }] });
    return [one('老婆已提交名正言顺，订单编号：A26000000000001'), one('订单编号：A26000000000001'), one('弟弟：A26000000000001'), one('妻子已提交名正言顺，订单号：A26000000000001')].join(' | ')
      + ' | ' + sibExempt(['兄弟姐妹', '王五'], { note1: '老婆的哥哥，王五' }) + ' ' + sibExempt(['兄弟姐妹', '李四'], { sib: '张三（爱人） 李四（弟弟）' });
  });
  ok(ordRel === '新下来的名字（方甲乙）和老婆新下来的名字（林甲丙）撞同一个字「甲」 | 新下来的名字（方甲乙）和兄弟姐妹新下来的名字（林甲丙）撞同一个字「甲」 | 新下来的名字（方甲乙）和弟弟新下来的名字（林甲丙）撞同一个字「甲」 | 新下来的名字（方甲乙）和妻子新下来的名字（林甲丙）撞同一个字「甲」 | false true', '备注「老婆…订单编号：」关系要写老婆，不能写「订单编号」，实际 ' + ordRel);
  // 学员页每条必须改可以勾「下载不放」：网页照样显示，下载的原因不写这条
  const hid = await p.evaluate(() => { const r = { hide: ['h|方甲乙|撞字|1|林甲丙'], rows: [{ neu: '方甲乙', given: '甲乙', hits: [{ kind: '撞字', ni: 1, fc: '甲', full: '林甲丙', fname: '林甲丙', member: '兄弟姐妹' }], msgs: ['新下来的名字（方甲乙）的「乙」有小字根「小」，属龙（大生肖）不能用'], warns: [], tones: [], detail: {} }] };
    return outReason(r) + ' | ' + issuesOf(r).length; });
  ok(hid === '新下来的名字（方甲乙）的「乙」有小字根「小」，属龙（大生肖）不能用 | 2', '勾了下载不放的撞字不写进下载原因、网页照样显示，实际 ' + hid);
  // 客户乱写：祝福语（繁简）、待补、状态、「提交了」都不能当人名；「和 & + → 改为」要拆开；真名字照样认得
  const junk = await p.evaluate(async () => {
    const J = ['身體健康，事業順暢', '財源滾滾 五福臨門', '越來越好', '平安喜樂', '订单号：待补', '同上', '见备注', '独生子', '一儿一女', '两个孩子', '已过世', '去世了', '单身', '怀孕中', '预产期12月', '名正言順：', '已提交名正言顺', '提交了', '好运常在'];
    const G = [['张三和李四', '张三|李四'], ['张三&李四', '张三|李四'], ['张三+李四', '张三|李四'], ['张三→张四', '张三|张四'], ['张三（已改为张四）', '张三|张四'], ['名正言順：張小明', '張小明'], ['王和平', '王和平'], ['哥哥张三，弟弟张四', '张三|张四'], ['欧阳小明', '欧阳小明'], ['张三改张四', '张三|张四'], ['过世杰', '过世杰'], ['张三个人', '张三个人'], ['扎西多吉', '扎西多吉'], ['阿依古丽', '阿依古丽']];
    const H = ['序号', '订单编号', '新名字姓氏', '使用人姓名', '生肖', '父亲名字', '母亲名字', '兄弟姐妹', '子女', '禁忌字', '新名', '新名拼音', '名册展示', '总备注'];
    const wb = new ExcelJS.Workbook(), ws = wb.addWorksheet('命名'); ws.addRow(H);
    ws.addRow(['1', 'T0000000000091', '方', '方甲', '马', '无', '无', '无', '无', '无', '方明宇', 'míng yǔ', '', '老婆已提交名正言顺，订单编号：']);
    ws.addRow(['2', 'T0000000000092', '方', '方乙', '', '无', '无', '无', '无', '无', '方安宇', 'ān yǔ', '', '本人订单编号：T0000000000092']);
    const buf = await wb.xlsx.writeBuffer(); parsedFiles.length = 0;
    await loadWithBuffers([{ name: '乱写 2026-10-01.xlsx', arrayBuffer: async () => buf }]);
    const rs = parsedFiles[0].audit.results, w = i => rs[i].rows[0].warns.join(' ');
    return [J.filter(t => splitNames(t).length).map(t => t + '→' + splitNames(t).join('|')).join('，'),
      G.filter(([t, x]) => splitNames(t).join('|') !== x).map(([t, x]) => t + '→' + splitNames(t).join('|') + '（应该 ' + x + '）').join('，'),
      extractNoteNames('辛苦了，谢谢', '', {}).join('|'), orderNums('Ａ２６０００００００００００４').join('|'),
      /没有号码/.test(w(0)) && !/没有号码/.test(w(1)), /生肖栏没写/.test(w(1))].join(' / ');
  });
  ok(junk === ' /  /  / A26000000000004 / true / true', '乱写的不能当人名、名字要拆对、全形订单号、订单编号没号码要提醒、生肖空白要提醒，实际 ' + junk);
  // 老板规则：大生肖（鼠龙马虎）不能有小字根，小生肖（牛兔蛇羊猴鸡狗猪）不能有大字根；姓不查
  const zg = await p.evaluate(async () => {
    const H = ['序号','订单编号','新名字姓氏','使用人姓名','生肖','父亲名字','母亲名字','兄弟姐妹','子女','禁忌字','新名','新名拼音','名册展示'];
    const wb = new ExcelJS.Workbook(), ws = wb.addWorksheet('命名'); ws.addRow(H);
    ws.addRow(['1', 'T0000000000071', '佘', '佘甲', '牛', '无', '无', '无', '无', '无', '佘珮帆', 'pèi fān', '']); // 珮 王字旁 → 小生肖不能用
    ws.addRow(['2', 'T0000000000072', '周', '周甲', '马', '无', '无', '无', '无', '无', '周功宇', 'gōng yǔ', '']); // 功 有工、力 → 大生肖不能用
    ws.addRow(['3', 'T0000000000073', '王', '王甲', '牛', '无', '无', '无', '无', '无', '王明宇', 'míng yǔ', '']); // 姓王不查
    ws.addRow(['4', 'T0000000000074', '周', '周乙', '虎', '无', '无', '无', '无', '无', '周玲宇', 'líng yǔ', '']); // 大生肖用大字根没关系
    ws.addRow(['5', 'T0000000000075', '周', '周丙', '龙', '无', '无', '无', '无', '无', '周冠宇', 'guàn yǔ', '']); // 冠 是大字根，里面的寸不算小字根
    ws.addRow(['6', 'T0000000000076', '周', '周丁', '马', '无', '无', '无', '无', '无', '周喜宇', 'xǐ yǔ', '']); // 喜 上面是士
    ws.addRow(['7', 'T0000000000077', '吴', '吴甲', '牛', '无', '无', '无', '无', '无', '吴銘宇', 'míng yǔ', '']); // 金字旁不算王（老板确认）
    ws.addRow(['8', 'T0000000000078', '吴', '吴乙', '牛', '无', '无', '无', '无', '无', '吴鑫宇', 'xīn yǔ', '']); // 鑫 三个金，也不算王
    ws.addRow(['9', 'T0000000000079', '吴', '吴丙', '牛', '无', '无', '无', '无', '无', '吴鈺宇', 'yù yǔ', '']); // 鈺 右边是玉，还是算王
    ws.addRow(['10', 'T0000000000080', '吴', '吴丁', '牛', '无', '无', '无', '无', '无', '吴铭宇', 'míng yǔ', '']); // 简体也一样
    const buf = await wb.xlsx.writeBuffer(); parsedFiles.length = 0;
    await loadWithBuffers([{ name: '生肖字根 2026-10-01.xlsx', arrayBuffer: async () => buf }]);
    const rs = parsedFiles[0].audit.results;
    selectSid(rs[0].sid); const red = Array.from(document.querySelectorAll('#main .han.clash .hz')).map(e => e.textContent).join('');
    return rs.map(r => baseName(r.disp) + ':' + (r.problem ? '有问题' : '通过')).join(' ') + ' | ' + outReason(rs[0]) + ' | 红字:' + red + ' | 勾:' + document.querySelectorAll('#main .hideChk').length + (() => { document.querySelector('#main .hideChk').click(); const t = outReason(rs[0]) + '/' + (JSON.stringify(load('mzys_hide', {})).indexOf('佘珮帆') >= 0); document.querySelector('#main .hideChk').click(); return ' | 勾后:' + t + '/' + outReason(rs[0]).slice(0, 6); })();
  });
  ok(zg === '佘甲:有问题 周甲:有问题 王甲:通过 周乙:通过 周丙:通过 周丁:有问题 吴甲:通过 吴乙:通过 吴丙:有问题 吴丁:通过 | 新下来的名字（佘珮帆）的「珮」有大字根「王」，属牛（小生肖）不能用 | 红字:珮 | 勾:1 | 勾后:名字需要重新调整/true/新下来的名字', '大小生肖字根（名字卡上不能用的字要标红），实际 ' + zg);

  // 老板规则：同辈兄弟姐妹同字同音不算问题（客户写了「家人不同音不同字」才照查）；「訂單編號」不是名字；申请加急不卡；同一个订单号是自己
  const gen = await p.evaluate(async () => {
    const H = ['序号','订单编号','新名字姓氏','使用人姓名','父亲名字','母亲名字','兄弟姐妹','子女','禁忌字','新名','新名拼音','名册展示','备注','订单状态备注','会员编号'];
    PEOPLE['T0000000000055|蒋乙'] = { n: '蒋乙', g: ['蒋朋朔'], s: '蒋', m: 'M0000055' }; PEOPLE['T0000000000056|张大河'] = { n: '张大河', g: ['张山林'], s: '张', m: 'M0000056' }; PEOPLE_IDX = null; // 历史库里一笔挂错的记录：同一个订单号，新名就是蒋甲自己的
    const wb = new ExcelJS.Workbook(), ws = wb.addWorksheet('命名'); ws.addRow(H);
    ws.addRow(['1', 'T0000000000051', '周', '周甲', '无', '无', '弟弟：周小明', '无', '无', '周明宇', 'míng yǔ', '', '', '']);
    ws.addRow(['2', 'T0000000000052', '周', '周乙', '无', '无', '弟弟：周小明', '无', '家人不同音不同字', '周明轩', 'míng xuān', '', '', '']);
    ws.addRow(['3', 'T0000000000053', '李', '李甲', '无', '无', '无', '子女名字：訂單編號', '无', '李浩然', 'hào rán', '', '', '']);
    ws.addRow(['4', 'T0000000000054', '吴', '吴甲', '无', '无', '无', '无', '无', '吴子涵', 'zǐ hán', '', '', '2026-10-16 申请加急。']);
    ws.addRow(['5', 'T0000000000055', '蒋', '蒋甲', '无', '无', '无', '无', '无', '蒋朋朔', 'péng shuò', '', '舅舅：蒋乙（T0000000000055）', '', 'M0000055']);
    ws.addRow(['6', 'T0000000000056', '张', '张乙', '张大河', '无', '无', '无', '无', '张山宇', 'shān yǔ', '', '', '', 'M0000056']); // 同订单的父亲以前审过：照比
    ws.addRow(['7', 'T0000000000057', '赵', '赵甲', '无', '无', '外婆李小红', '无', '无', '赵红宇', 'hóng yǔ', '', '', '']); // 没冒号，外婆不是同辈
    ws.addRow(['8', 'T0000000000058', '孙', '孙甲', '无', '无', '弟弟：孙小明', '无', '不能跟兄弟姐妹重字', '孙明宇', 'míng yǔ', '', '', '']); // 客户写了要求
    ws.addRow(['9', 'T0000000000059', '钱', '钱丙', '无', '无', '兄弟姐妹：钱一，爱人钱小玉', '无', '无', '钱玉宇', 'yù yǔ', '', '', '']); // 爱人不是同辈
    ws.addRow(['11', 'T0000000000061', '周', '周丙', '无', '无', '弟弟周小明', '无', '避开火字', '周明轩', 'míng xuān', '', '', '']); // 没冒号的弟弟、普通禁忌：免查
    ws.addRow(['12', 'T0000000000062', '周', '周丁', '无', '无', '周小明', '无', '无', '周明哲', 'míng zhé', '', '', '']); // 兄弟姐妹栏只写名字：免查
    ws.addRow(['13', 'T0000000000063', '孙', '孙乙', '无', '无', '哥哥：孙伯阳', '无', '无', '孙阳宇', 'yáng yǔ', '', '', '']); // 名字里有伯：照样免查
    ws.addRow(['10', 'T0000000000060', '冯', '冯甲', '无', '无', '无', '无', '无', '冯子涵', 'zǐ hán', '', '', '暂缓，客户退款']); // 只因订单状态卡住
    const buf = await wb.xlsx.writeBuffer(); parsedFiles.length = 0;
    await loadWithBuffers([{ name: '辈分 2026-10-01.xlsx', arrayBuffer: async () => buf }]);
    delete PEOPLE['T0000000000055|蒋乙']; delete PEOPLE['T0000000000056|张大河']; PEOPLE_IDX = null;
    const rs = parsedFiles[0].audit.results;
    return rs.map(r => baseName(r.disp) + ':' + (r.problem ? '有问题' : '通过')).join(' ') + ' | ' + outReason(rs[12]) + ' | ' + sameGen('姐妹孩子');
  });
  ok(gen === '周甲:通过 周乙:有问题 李甲:通过 吴甲:通过 蒋甲:通过 张乙:有问题 赵甲:有问题 孙甲:有问题 钱丙:有问题 周丙:通过 周丁:通过 孙乙:通过 冯甲:有问题 | 订单状态要先确认 | false', '同辈兄弟、訂單編號、申请加急、同一个订单号，实际 ' + gen);
  ok(JSON.stringify(e2e.py) === JSON.stringify({ 王山林: 0, 王晓云: 0, 李沐阳: 0, 李若溪: 1, 赵明轩: 0, 赵知远: 1 }), '拼音提醒：字母不对（溪 nǐ、姓赵 zǎo）才提醒，声调不同不提醒，实际 ' + JSON.stringify(e2e.py));
  ok(e2e.lv === 'lv', 'lǚ 应该当成 lv（字库用 v），实际 ' + e2e.lv);
  ok(/拼音写错：「我」写 ni/.test(e2e.sb), '试改名字：我 写 nǐ 应该提醒，实际 ' + e2e.sb);
  ok(e2e.n === 3, '假技术单应该读到 3 位学员，实际 ' + e2e.n);
  ok(JSON.stringify(e2e.bad) === '["王小明"]', '应该只有王小明有问题（王山林撞父亲王大山的山），实际 ' + JSON.stringify(e2e.bad));
  ok(e2e.mixed === true, '赵一名册展示有写，应该判成国内海外混合');
  ok(JSON.stringify(e2e.footer) === '["审核人：测试","2026-10-02","2026-11-01"]', '表尾的审核人、制表时间、回传时间要照文件原本的（2026-10-02 / 2026-11-01），实际 ' + JSON.stringify(e2e.footer));
  ok(JSON.stringify(e2e.ovSeq) === '["1","1"]', '海外文件只有赵一（原序号 3），序号要从 1 开始，实际 ' + JSON.stringify(e2e.ovSeq));
  ok(JSON.stringify(e2e.badSeq) === '["1","1"]', '有问题文件的序号要从 1 重新排，实际 ' + JSON.stringify(e2e.badSeq));
  ok(e2e.badFill === '|', '有问题文件只剩王小明一位，家人颜色要拿掉，实际 ' + e2e.badFill);
  ok(e2e.origFill === 'theme:5:0.8', '国内原装文件里王小明、李丽两位都在，颜色要留着，实际 ' + e2e.origFill);
  ok(e2e.badHeader == null, '有问题文件不要表头「审核原因」，实际 ' + e2e.badHeader);
  ok(e2e.badW >= 14, '原因栏要拉宽（每栏至少 14），实际 ' + e2e.badW);
  { const a = e2e.badRows.find(r => r[0] === '王山林')?.[1], z = e2e.badRows.find(r => r[0] === '王晓云')?.[1];
    ok(/山/.test(String(a)) && a === z, '同一个订单两行要写一样的原因（没问题的王晓云也一样），实际 ' + JSON.stringify(e2e.badRows)); }
  ok(/^（有问题）王小明 /.test(e2e.oneBadName), '单独下载有问题的王小明：文件名前面写王小明、是有问题文件，实际 ' + e2e.oneBadName);
  ok(e2e.oneBtn === '下载这位（有问题）', '有问题的学员，学员页按钮也要可以按、写清楚下载什么，实际 ' + e2e.oneBtn);
  ok(/只下载这位学员.*王小明.*有问题/.test(e2e.oneMenu), '「下载结果」菜单要有「只下载这位学员」，实际 ' + e2e.oneMenu);
  ok(/^李丽 /.test(e2e.oneName) && e2e.oneRows === 3, '单独下载李丽：文件名前面写李丽、只放她两个新名（表头 + 2 行），实际 ' + e2e.oneName + ' / ' + e2e.oneRows + ' 行');
  ok(e2e.cleanRows === 3, '国内干净文件应该是表头 + 李丽 2 行，实际 ' + e2e.cleanRows + ' 行');
  ok(e2e.reName === '王小明 名正言顺技术单2026-10-01（1）.xlsx', '改好拖回来，原装名应该照原名拿掉（有问题），实际 ' + e2e.reName);
  ok(e2e.reAH.every(v => v == null), '改好拖回来，原装里的旧原因和表头应该清掉，实际 ' + JSON.stringify(e2e.reAH));

  // ---------- 备注里的吉祥话不是人名（例：家和万事兴 → 不能抓出「万事兴」去比对撞音） ----------
  { const nn = await p.evaluate(() => [extractNoteNames('家和万事兴，祝万事如意，心想事成，谢谢', '叶', {}), extractNoteNames('爷爷万大山，家和万事兴', '叶', {})]);
    ok(!nn[0].length, '备注只有吉祥话，不应该抓出人名，实际 ' + JSON.stringify(nn[0]));
    ok(nn[1].indexOf('万大山') >= 0 && nn[1].indexOf('万事兴') < 0, '备注写了爷爷万大山要抓到、万事兴不要，实际 ' + JSON.stringify(nn[1])); }
  ok(!errs.length, '网页有 JS 错误：' + errs.join(' / '));
  console.log(`${fail ? '✗ 有 ' + fail + ' 项失败' : '✓ 全部通过'}（${pass} 项通过）`);
  await b.close(); process.exit(fail ? 1 : 0);
})();
