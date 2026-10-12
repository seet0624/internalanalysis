/* 技术单审核引擎 — applies the review rules to tech-sheet workbooks.
 * Only font colours and the 总备注 text are changed; layout, sizes and merges stay as delivered.
 * Works in the browser (window.ExcelJS) and in Node (require('exceljs')). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('exceljs'), require('jszip'));
  else root.ReviewEngine = factory(root.ExcelJS, root.JSZip);
})(typeof self !== 'undefined' ? self : this, function (ExcelJS, JSZip) {
  'use strict';

  var RED = 'FFFF0000';

  var DEFAULTS = {
    splitWatchBrands: ['天富', '天威'],
    reviewer: 'martin',
    askFirstProducts: ['天解手表', '天泽手表', '福运戒指', '天恒手表'],
    urgentWords: ['加急', '急件', '特急', '紧急', '緊急', '急需', '急用', '急要', '赶急', '趕急', '赶件', '趕件', '赶时间', '趕時間',
      '尽快', '盡快', '尽早', '盡早', '越快越好', '快点', '快點', '快些', '速办', '速辦', '优先处理', '優先處理', '优先', '優先',
      'urgent', 'asap', 'rush', 'express']
  };

  // Simplified ↔ traditional forms of common surnames, so 劉 matches 刘.
  var SURNAME_VARIANTS = {
    '刘': '劉', '陈': '陳', '张': '張', '黄': '黃', '钟': '鍾', '冯': '馮', '叶': '葉', '吕': '呂', '谢': '謝', '杨': '楊',
    '赵': '趙', '吴': '吳', '郑': '鄭', '罗': '羅', '许': '許', '邓': '鄧', '萧': '蕭', '韩': '韓', '苏': '蘇',
    '卢': '盧', '庄': '莊', '龚': '龔', '颜': '顏', '温': '溫', '钱': '錢', '孙': '孫', '欧阳': '歐陽', '马': '馬',
    '庞': '龐', '汤': '湯', '陆': '陸', '骆': '駱', '纪': '紀', '贺': '賀', '龙': '龍', '邝': '鄺', '关': '關', '区': '區',
    '饶': '饒', '何': '何', '梁': '梁', '林': '林', '李': '李', '王': '王'
  };
  var VARIANT_LOOKUP = {};
  Object.keys(SURNAME_VARIANTS).forEach(function (s) {
    var t = SURNAME_VARIANTS[s];
    VARIANT_LOOKUP[s] = t; VARIANT_LOOKUP[t] = s;
  });

  function cellText(cell) {
    var v = cell && cell.value;
    if (v == null) return '';
    if (typeof v === 'object') {
      if (v.richText) return v.richText.map(function (r) { return r.text; }).join('');
      if (v.text != null) return String(v.text);
      if (v.result != null) return String(v.result);
      if (v instanceof Date) return v.toISOString().slice(0, 10);
    }
    return String(v);
  }
  function squash(s) { return String(s || '').replace(/[\s　]+/g, '').trim(); }
  function isBlank(s) { var t = squash(s); return t === '' || t === '-' || t === '—'; }

  function hasFill(cell) {
    var f = cell.fill;
    return !!(f && f.type === 'pattern' && f.pattern && f.pattern !== 'none');
  }
  // Red text, never a coloured box: any fill on the cell is removed.
  function paintRed(cell) {
    var v = cell.value;
    if (v && typeof v === 'object' && v.richText) {
      cell.value = { richText: v.richText.map(function (r) {
        return { text: r.text, font: Object.assign({}, r.font || {}, { color: { argb: RED } }) };
      }) };
    }
    // ExcelJS shares one style object between cells; give this cell its own copy before changing it.
    var st = Object.assign({}, cell.style, { font: Object.assign({}, cell.font || {}, { color: { argb: RED } }) });
    if (hasFill(cell)) st.fill = { type: 'pattern', pattern: 'none' };
    cell.style = st;
  }

  function findHeader(ws) {
    for (var r = 1; r <= Math.min(ws.rowCount, 8); r++) {
      var row = ws.getRow(r), cols = {};
      var found = false;
      row.eachCell({ includeEmpty: false }, function (c, col) {
        var h = squash(cellText(c));
        if (h === '序号') found = true;
        if (h && cols[h] == null) cols[h] = col; // first occurrence wins (乾坤 has a second 备注)
      });
      if (found) return { row: r, cols: cols };
    }
    return null;
  }

  function dataRowRange(ws, header) {
    var keyCol = header.cols['订单编号'] || header.cols['序号'];
    var first = header.row + 1, last = header.row;
    for (var r = first; r <= ws.rowCount; r++) {
      if (isBlank(cellText(ws.getRow(r).getCell(keyCol)))) break;
      last = r;
    }
    return { first: first, last: last };
  }

  function parseTime(s) {
    var m = String(s || '').match(/(\d{1,2})\s*[:：.]\s*(\d{2})/);
    return m ? { h: +m[1], m: +m[2] } : null;
  }

  function ziShi(get) {
    var flag = get('是否子时'), when = get('农历时辰');
    var t = parseTime(when);
    if (/前子时|前子時/.test(flag) || /前子时|前子時/.test(when) || (t && t.h === 23)) return '前子时';
    if (/后子时|後子時/.test(flag) || /后子时|後子時/.test(when) || (t && t.h === 0)) return '后子时';
    if (!isBlank(flag) && !/^否$/.test(squash(flag))) return '子时';
    if (/子时|子時/.test(when)) return '子时';
    return null;
  }

  function urgentHits(texts, words) {
    var hay = texts.join('\n').toLowerCase();
    var found = words.filter(function (w) {
      var k = w.toLowerCase();
      if (/^[a-z]+$/.test(k)) return new RegExp('\\b' + k + '\\b').test(hay);
      return hay.indexOf(k) >= 0;
    });
    // single 急 / 快, but not in everyday words like 快乐 / 愉快 / 急性
    var rest = hay.replace(/快[乐樂活速餐递遞]|[愉欢歡畅暢爽痛凉涼轻輕飞飛勤凉]快|急[性救躁诊診]|着急|著急|焦急/g, '');
    if (!found.some(function (w) { return /急/.test(w); }) && /急/.test(rest)) found.push('急');
    // 快 only in an urgency phrase (快点 / 要快 / 快处理 …), not "效果快" / "进步快"
    // (赶快好起来 / 加快进步 are wishes, so they don't count)
    var FAST = /快(?:点|點|些|一点|一點|处理|處理|做|寄|发|發|给|給|出货|出貨|安排|完成)|(?:要|请|請)快/;
    if (!found.some(function (w) { return /快/.test(w); }) && FAST.test(rest)) found.push('快');
    return found;
  }

  function cleanFather(s) {
    return String(s || '').replace(/[（(][^）)]*[）)]?/g, '').replace(/[\s　]+/g, ' ').trim();
  }
  function surnameCheck(surname, father) {
    var sn = String(surname || '').trim();
    var fa = cleanFather(father);
    if (isBlank(sn)) return { ok: false, text: '新名字姓氏为空' };
    if (isBlank(fa)) return { ok: false, text: '父亲名字为空，无法核对姓氏' };
    if (/[A-Za-z]/.test(sn)) {
      var tokens = fa.toLowerCase().split(/[^a-zÀ-ɏ'-]+/);
      var want = sn.toLowerCase().split(/\s+/);
      var ok = want.every(function (w) { return tokens.indexOf(w) >= 0; });
      return ok ? { ok: true } : { ok: false, text: '英文姓氏「' + sn + '」与父亲「' + fa + '」不一致' };
    }
    var fs = fa.replace(/\s+/g, '');
    if (fs.indexOf(sn) === 0) return { ok: true };
    var alt = sn.split('').map(function (ch) { return VARIANT_LOOKUP[ch] || ch; }).join('');
    if (VARIANT_LOOKUP[sn]) alt = VARIANT_LOOKUP[sn];
    if (fs.indexOf(alt) === 0) return { ok: true, note: '姓氏简繁体不同（' + sn + ' / ' + fs.slice(0, alt.length) + '）' };
    return { ok: false, text: '姓氏「' + sn + '」与父亲「' + fa + '」不一致' };
  }

  // --- footer: 审核人 / 制表时间 / 回传时间 ---
  function parseDate(s) {
    var m = String(s || '').trim().match(/^(\d{1,2})[-./](\d{1,2})[-./](\d{4})$/);
    return m ? { d: +m[1], m: +m[2], y: +m[3] } : null;
  }
  function fmtDate(o) { return o.d + '.' + o.m + '.' + o.y; } // 8.10.2026, as the team writes it
  function addDays(o, n) {
    var t = new Date(Date.UTC(o.y, o.m - 1, o.d + n));
    return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
  }
  function addMonth(o) {
    var y = o.y + (o.m === 12 ? 1 : 0), m = o.m === 12 ? 1 : o.m + 1;
    var last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return { y: y, m: m, d: Math.min(o.d, last) };
  }
  // 名正言顺 = one month; 手表 / 手链 / 戒指 / 耳环 / 吊坠 / 牌子 = 10 days.
  function returnRule(tool) {
    if (/名正言顺|名正言順/.test(tool)) return { label: '1 个月', calc: addMonth };
    if (/九合|吊坠|吊墜/.test(tool)) return { label: '7 天', calc: function (o) { return addDays(o, 7); } };
    return { label: '10 天', calc: function (o) { return addDays(o, 10); } };
  }
  var FOOTER_LABEL = /^(审核人|制表时间|回传时间)[:：]/;
  function isSlave(cell) { return cell.isMerged && cell.master && cell.master.address !== cell.address; }
  // Where the value after a footer label goes: an existing value cell if there is one; otherwise the
  // template's merged value block (dates only) when it starts within 2 columns (watch: 回传时间 U → W:Y), else the next cell.
  // Returns { cell, existing }.
  function valueCellRightOf(row, label, preferBlock) {
    var first = null, block = null, step = 0;
    for (var c = label.col + 1; c <= label.col + 8; c++) {
      var cell = row.getCell(c);
      if (isSlave(cell) && cell.master.address === label.address) continue; // inside the label's own merge
      if (isSlave(cell)) cell = cell.master;
      if (FOOTER_LABEL.test(cellText(cell).trim())) break; // never write over the next label
      step++;
      if (!first) first = cell;
      if (preferBlock && !block && step <= 2 && cell.isMerged && !isSlave(cell)) block = cell;
      if (!isBlank(cellText(cell))) return { cell: cell, existing: true };
    }
    return { cell: block || first, existing: false };
  }
  function putDate(cell, o) {
    cell.value = fmtDate(o);
  }
  function stampFooter(ws, fromRow, made, back, reviewer) {
    var done = { reviewer: false, made: false, back: false };
    for (var r = fromRow; r <= ws.rowCount; r++) {
      var row = ws.getRow(r), labels = [];
      row.eachCell({ includeEmpty: false }, function (c) {
        if (isSlave(c)) return;
        var t = cellText(c).trim();
        if (/^(审核人|制表时间|回传时间)[:：]/.test(t)) labels.push({ c: c, t: t });
      });
      labels.forEach(function (L) {
        var c = L.c, t = L.t, m;
        if ((m = t.match(/^审核人[:：]\s*(.*)$/))) {
          var v = m[1] ? null : valueCellRightOf(row, c);
          var wide = (ws.getColumn(c.col).width || 8.43) >= 18;
          // "审核人：daphne" in one cell, or label + name in the next cell, as the template already has it;
          // an empty template: one cell when the label column is wide enough, else the next cell.
          if (m[1] || (!v.existing && wide)) c.value = '审核人：' + reviewer;
          else v.cell.value = reviewer;
          done.reviewer = true;
        } else if (/^制表时间[:：]/.test(t)) { putDate(valueCellRightOf(row, c, true).cell, made); done.made = true; }
        else if (/^回传时间[:：]/.test(t)) { putDate(valueCellRightOf(row, c, true).cell, back); done.back = true; }
      });
    }
    return done;
  }

  // --- family names mentioned in 备注 / 总备注 ---
  var SURNAMES = '王李张張刘劉陈陳杨楊黄黃赵趙吴吳周徐孙孫马馬朱胡郭何高林罗羅郑鄭梁谢謝宋唐许許韩韓冯馮邓鄧曹彭曾肖蕭萧田董袁潘于蒋蔣蔡余杜叶葉程苏蘇魏吕呂丁任沈姚卢盧姜崔钟鍾鐘谭譚陆陸汪范金石廖贾賈夏韦韋付方白邹鄒孟熊秦邱江尹薛闫閆段雷侯龙龍史陶黎贺賀顾顧毛郝龚龔邵万萬钱錢严嚴覃武戴莫孔向汤湯常温溫康施文牛樊葛邢安齐齊易乔喬伍庞龐颜顏倪庄莊聂聶章鲁魯岳翟殷詹申欧歐耿关關兰蘭焦俞左柳甘祝包宁寧尚符舒阮柯纪紀梅童凌毕畢单單季裴霍涂成苗谷盛曲翁冉骆駱蓝藍路游辛靳管柴蒙鲍鮑华華喻祁蒲房滕屈饶饒解牟艾尤阳陽时時穆农農司卓古吉缪繆简簡车車项項连連芦蘆麦麥褚娄婁窦竇戚岑景党宫宮费費卜冷晏席卫衛米柏宗瞿桂全佟应應臧闵閔苟邬鄔边邊卞姬师師和仇栾欒隋商刁沙荣榮巫寇桑郎甄丛叢仲虞敖巩鞏明佘池查麻苑迟遲邝鄺官封谈談匡鞠惠荆荊乐樂冀郁胥南班储儲原栗燕楚鄢劳勞谌諶奚皮粟冼蓝邰楼樓闻聞';
  var KIN = '父亲|父親|母亲|母親|爸爸|妈妈|媽媽|爷爷|爺爺|奶奶|外公|外婆|公公|婆婆|老公|老婆|丈夫|妻子|太太|先生|伴侣|伴侶|儿子|兒子|女儿|女兒|孙子|孫子|孙女|孫女|哥哥|姐姐|弟弟|妹妹|兄长|兄長|孩子|小孩|女婿|媳妇|媳婦|岳父|岳母';
  var KIN_AFTER = new RegExp('([\\u4e00-\\u9fff]{2,4})\\s*[（(]\\s*(?:' + KIN + ')');
  var KIN_BEFORE = new RegExp('(?:' + KIN.replace('|先生|太太', '') + ')\\s*[:：是叫名为為]?\\s*([\\u4e00-\\u9fff]{2,3})', 'g');
  function familyNames(get) {
    var raw = [get('父亲名字'), get('母亲名字'), get('兄弟姐妹'), get('子女')].join(';');
    raw = raw.replace(/【([^】\-－]+)[^】]*】/g, ' $1 ')
      .replace(/[（(][^）)]*[）)]/g, ' ')
      .replace(/兄弟姐妹\s*[:：]|伴[侣侶]\s*[:：]|同父异母\s*[:：]?|同母异父\s*[:：]?/g, ';')
      .replace(new RegExp(KIN, 'g'), ' ');
    var names = {};
    (raw.match(/[\u4e00-\u9fff]{2,4}/g) || []).forEach(function (n) { names[n] = true; });
    raw.split(/[;；,，、\n]|\s-\s?|^-|:\s*half/i).forEach(function (part) {
      var t = part.split(':')[0].replace(/[^A-Za-z\s.'-]/g, ' ').replace(/\s+/g, ' ').trim();
      if (/^[A-Za-z.'-]+(\s+[A-Za-z.'-]+)+$/.test(t)) names[t] = true;
    });
    ['无', '無', '没有', '不详'].forEach(function (x) { delete names[x]; });
    return Object.keys(names);
  }
  function mentionedFamily(text, known, own) {
    var found = {}, hay = String(text || ''), low = hay.toLowerCase();
    var ownSet = {};
    String(own || '').replace(/[（(][^）)]*[）)]/g, ' ').split(/[\s\/／]+/).forEach(function (x) { if (x) ownSet[x] = true; });
    known.forEach(function (n) {
      if (ownSet[n]) return;
      if (/[A-Za-z]/.test(n) ? low.indexOf(n.toLowerCase()) >= 0 : hay.indexOf(n) >= 0) found[n] = true;
    });
    var m, re = new RegExp(KIN_AFTER.source, 'g');
    while ((m = re.exec(hay))) {
      var n = m[1];
      for (var i = 0; i < n.length - 1; i++) if (SURNAMES.indexOf(n[i]) >= 0) { n = n.slice(i); break; }
      if (SURNAMES.indexOf(n[0]) >= 0 && n.length >= 2 && !ownSet[n]) found[n] = true;
    }
    var en = /\bmy\s+(?:husband|wife|son|daughter|father|mother|dad|mum|mom|brother|sister|partner|children|kids?)\s*(?:is|,|:)?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g;
    var hayEn = hay.replace(/\bmy\s+([A-Za-z])/gi, function (x, c) { return 'my ' + c.toLowerCase(); });
    while ((m = en.exec(hayEn))) if (!ownSet[m[1]]) found[m[1]] = true;
    KIN_BEFORE.lastIndex = 0;
    var hay2 = hay.replace(/老公司/g, '　　　');
    while ((m = KIN_BEFORE.exec(hay2))) {
      if (SURNAMES.indexOf(m[1][0]) >= 0 && !ownSet[m[1]]) found[m[1]] = true;
    }
    return Object.keys(found);
  }

  // A free-standing 3-character word that starts with a common surname: probably a person's name.
  var NOT_NAMES = {};
  '曾用名 曾经是 曾经的 华语名 华文名 中文名 英文名 高血压 高血糖 高血脂 金木水 文曲星 文昌星 万事兴 和万事 周岁的 何时能 时辰不 时间不 陈述的 林林总'.split(' ').forEach(function (w) { NOT_NAMES[w] = true; });
  function possibleNames(text, skip) {
    var out = [];
    String(text || '').split(/[\s,，。、；;：:！!？?（）()【】"“”'‘’\-—…·.\/＇]+/).forEach(function (seg) {
      if (/^[\u4e00-\u9fff]{3}$/.test(seg) && SURNAMES.indexOf(seg[0]) >= 0 && !skip[seg] && !NOT_NAMES[seg] && out.indexOf(seg) < 0) out.push(seg);
    });
    return out;
  }

  // --- 生肖 by 立春 ---
  // 立春 moment (Beijing time, MMDDHHMM) for 1900–2100, 8 chars per year.
  var LICHUN = '020413510204193902050138020507310205132402041915020501030205065802051247020418320205002702050610020511530204174202042329020505250205111302041657020422530205043902051026020416200204220602050400020509490204153602042138020503290205091602041508020420510205024002050829020414090204200302050148020507290204132502041914020501100205070702041249020418480205004002050622020412190204180302042350020505410204112202041720020423130205045202041045020416300204221702050411020409540204154902042142020503230204092202041517020421070205030402040846020414370204203002050207020407580204134502041925020501200204070402041259020418590205003902040633020412260204181202050009020405550204114502041739020423180204051102041107020416510204224202040427020410130204160802042148020403370204093002041512020421070204030102040856020414560204204002040228020408230204140502041956020401420204072702041318020419000204004902040647020412320204182202040013020406030204115802041745020323330204052802041114020417030203225802040450020410420204162602032210020404010204094602041530020321200204030802040858020414480203204102040240020408310204141902032011020402030204075202041339020319240204011202040658020412430203183502040030020406170204120302031752020323430204053502041122020317120203230702040455020410460203164102032233020404230204100702031553020321460204033002040914020315020203204802040236020408280203142002032021020402100204075602031351020319400204012902040719020313020203185602040042020406270203122502031811020323570204054502031128020317250203231402040457020310530203164102032229020404270203101702031616020322060204034502030941020315280203210802040259';
  var ANIMALS = '鼠牛虎兔龙蛇马羊猴鸡狗猪';
  var ANIMAL_ALIAS = {};
  // every animal in both 简体 and 繁体 (马/馬, 龙/龍, 鸡/雞, 猪/豬), plus 犬 for 狗
  '鼠牛虎兔龙蛇马羊猴鸡狗猪'.split('').forEach(function (a) { ANIMAL_ALIAS[a] = a; });
  ANIMAL_ALIAS['龍'] = '龙'; ANIMAL_ALIAS['馬'] = '马'; ANIMAL_ALIAS['雞'] = '鸡'; ANIMAL_ALIAS['豬'] = '猪'; ANIMAL_ALIAS['犬'] = '狗';
  function parseBirthday(s) {
    var m = String(s || '').match(/(\d{4})\s*[年\-\/.]\s*(\d{1,2})\s*[月\-\/.]\s*(\d{1,2})/);
    return m ? { y: +m[1], m: +m[2], d: +m[3] } : null;
  }
  // Rule: before 2月4日 → previous year's animal; after → this year's; on 2月4日 compare the exact
  // clock time with that year's 立春. Unknown time or only a 时辰 → this year's animal.
  function zodiacFor(b, timeText) {
    var y = b.y, why;
    if (b.m < 2 || (b.m === 2 && b.d < 4)) { y = b.y - 1; why = '2月4日前，算' + y + '年'; }
    else if (b.m === 2 && b.d === 4) {
      var t = /时辰|時辰|[子丑寅卯辰巳午未申酉戌亥]时|[子丑寅卯辰巳午未申酉戌亥]時/.test(timeText) ? null : parseTime(timeText);
      var i = (b.y - 1900) * 8, lc = b.y >= 1900 && b.y <= 2100 ? LICHUN.slice(i, i + 8) : null;
      if (!t || !lc) why = '2月4日，时间不详或只有时辰，算当年';
      else {
        var lcDay = +lc.slice(2, 4), lcMin = +lc.slice(4, 6) * 60 + +lc.slice(6, 8), born = t.h * 60 + t.m;
        var lcText = '立春 ' + lc.slice(0, 2) + '-' + lc.slice(2, 4) + ' ' + lc.slice(4, 6) + ':' + lc.slice(6, 8);
        var before = lcDay > 4 || (lcDay === 4 && born < lcMin);
        if (before) y = b.y - 1;
        why = '2月4日 ' + String(t.h).padStart(2, '0') + ':' + String(t.m).padStart(2, '0') + (before ? ' 在' : ' 在') + lcText + (before ? ' 之前，算' + y + '年' : ' 之后，算当年');
      }
    } else why = '2月4日后，算当年';
    return { animal: ANIMALS[((y - 4) % 12 + 12) % 12], why: why };
  }

  // How 新名字姓氏 relates to the surname in 使用人姓名: same / variant (简繁) / different.
  function surnameOwnKind(sn, own) {
    var names = String(own || '').replace(/[（(][^）)]*[）)]/g, ' ').split(/[\/／]/).map(function (x) { return x.trim(); }).filter(Boolean);
    if (!names.length) return { kind: null, own: '' };
    var shown = names[names.length - 1];
    if (/[A-Za-z]/.test(sn)) {
      var w = sn.toLowerCase().split(/\s+/);
      var hit = names.some(function (n) { var t = n.toLowerCase().split(/[^a-z\u00c0-\u024f'-]+/); return w.every(function (x) { return t.indexOf(x) >= 0; }); });
      return { kind: hit ? 'same' : 'different', own: shown };
    }
    var alt = VARIANT_LOOKUP[sn] || sn.split('').map(function (ch) { return VARIANT_LOOKUP[ch] || ch; }).join('');
    if (names.some(function (n) { return n.replace(/\s+/g, '').indexOf(sn) === 0; })) return { kind: 'same', own: shown };
    if (alt !== sn && names.some(function (n) { return n.replace(/\s+/g, '').indexOf(alt) === 0; })) return { kind: 'variant', own: shown };
    return { kind: 'different', own: shown };
  }
  function unRed(cell) {
    var f = Object.assign({}, cell.font || {});
    if (!f.color || f.color.argb !== RED) return;
    delete f.color;
    cell.style = Object.assign({}, cell.style, { font: f });
  }

  // 新名字姓氏 vs the student's own name (使用人姓名).
  function surnameVsOwn(surname, own) {
    var sn = String(surname || '').trim();
    if (isBlank(sn) || isBlank(own)) return null;
    var names = String(own).replace(/[（(][^）)]*[）)]/g, ' ').split(/[\/／]/).map(function (x) { return x.trim(); }).filter(Boolean);
    if (/[A-Za-z]/.test(sn)) {
      var w = sn.toLowerCase().split(/\s+/);
      var ok = names.some(function (n) { var toks = n.toLowerCase().split(/[^a-z\u00c0-\u024f'-]+/); return w.every(function (x) { return toks.indexOf(x) >= 0; }); });
      return ok ? null : '英文姓氏「' + sn + '」和使用人姓名「' + own.trim() + '」对不上';
    }
    var alt = VARIANT_LOOKUP[sn] || sn.split('').map(function (ch) { return VARIANT_LOOKUP[ch] || ch; }).join('');
    var ok2 = names.some(function (n) { var t = n.replace(/\s+/g, ''); return t.indexOf(sn) === 0 || t.indexOf(alt) === 0; });
    return ok2 ? null : '姓氏「' + sn + '」和使用人姓名「' + own.trim() + '」对不上';
  }

  // Family as a tidy list for the reviewer: relation → name, mentioned ones marked.
  function familyTable(get, mentioned) {
    var rows = [];
    var push = function (rel, raw) {
      String(raw || '').replace(/【([^】\-－]+)[^】]*】/g, ' $1 ').split(/[，,、;；]|\s{2,}/).forEach(function (n) {
        n = n.replace(/^\s*[-–]\s*/, '').trim();
        if (!n || /^(无|無|-|没有)$/.test(n)) return;
        // "劉建宏 劉玲君 劉建志": several Chinese names separated by single spaces
        var parts = /^[\u4e00-\u9fff]{2,4}(\s+[\u4e00-\u9fff]{2,4})+$/.test(n) ? n.split(/\s+/) : [n];
        parts.forEach(function (x) { rows.push({ rel: rel, name: x, mentioned: mentioned.some(function (m) { return x.indexOf(m) >= 0; }) }); });
      });
    };
    push('父亲', get('父亲名字')); push('母亲', get('母亲名字'));
    var sib = get('兄弟姐妹'), mate = '';
    var mm = sib.match(/伴[侣侶]\s*[:：](.*)$/);
    if (mm) { mate = mm[1]; sib = sib.slice(0, mm.index); }
    push('兄弟姐妹', sib.replace(/兄弟姐妹\s*[:：]/, ''));
    push('伴侣', mate); push('子女', get('子女'));
    var listed = rows.map(function (r) { return r.name; }).join(' ');
    mentioned.forEach(function (m) { if (listed.indexOf(m) < 0) rows.push({ rel: '备注里', name: m, mentioned: true }); });
    return rows;
  }

  // Dates written in a remark, with days from the processing date.
  function datesIn(text, made) {
    var out = [], s = String(text || ''), m;
    var base = Date.UTC(made.y, made.m - 1, made.d);
    var nm = made.m === 12 ? Date.UTC(made.y + 1, 0, made.d) : Date.UTC(made.y, made.m, made.d);
    var monthDays = Math.round((nm - base) / 864e5);
    var push = function (y, mo, d, txt) {
      if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 1900 || y > 2100) return;
      out.push({ text: txt.trim(), days: Math.round((Date.UTC(y, mo - 1, d) - base) / 864e5), monthDays: monthDays });
    };
    var used = [];
    var re1 = /(\d{4})\s*[年\-\/.]\s*(\d{1,2})\s*[月\-\/.]\s*(\d{1,2})\s*[日号號]?/g;
    while ((m = re1.exec(s))) { push(+m[1], +m[2], +m[3], m[0]); used.push([m.index, m.index + m[0].length]); }
    var re2 = /(\d{1,2})[\-\/.](\d{1,2})[\-\/.](\d{4})/g;
    while ((m = re2.exec(s))) { push(+m[3], +m[2], +m[1], m[0]); used.push([m.index, m.index + m[0].length]); }
    var re3 = /(\d{1,2})\s*月\s*(\d{1,2})\s*[日号號]/g;
    while ((m = re3.exec(s))) {
      var at = m.index, inside = used.some(function (u) { return at >= u[0] && at < u[1]; });
      if (!inside) push(made.y, +m[1], +m[2], m[0]);
    }
    return out;
  }

  // Tool name from the product titles in the sheet: 天祥手表（男款）(鸿运换购) → 天祥手表, 名正言顺命名 → 名正言顺.
  function productName(t) {
    t = String(t || '');
    // bundles / gifts name the real tool in brackets: "N1 健康套餐-赠品（名正言顺命名）" → 名正言顺
    if (/套餐|赠品|贈品|赠送|贈送|礼包|禮包|礼盒|禮盒|组合|組合|活动|活動/.test(t)) {
      var inner = (t.match(/[（(]([^）)]+)[）)]/g) || []).map(function (b) { return b.slice(1, -1).trim(); })
        .filter(function (b) { return b.length >= 2 && !/^(男款|女款|男女款|单品|單品)$|换购|換購/.test(b); })[0];
      if (inner) t = inner;
    }
    return t.replace(/[（(][^）)]*[）)]/g, '').replace(/单品|單品/g, '').replace(/命名$/, '').trim();
  }
  function toolFromSheet(ws, range, C) {
    var count = {};
    if (C['商品标题']) for (var r = range.first; r <= range.last; r++) {
      var n = productName(cellText(ws.getRow(r).getCell(C['商品标题'])));
      if (n) count[n] = (count[n] || 0) + 1;
    }
    var best = Object.keys(count).sort(function (a, b) { return count[b] - count[a]; })[0];
    if (best) return best;
    var t = cellText(ws.getRow(1).getCell(1)).replace(/配制信息表|配置信息表/, '').trim();
    return t || null;
  }

  function toolName(fileName) {
    var base = String(fileName).replace(/\.xlsx$/i, '');
    var m = base.match(/^(.*?)技术单/);
    return (m ? m[1] : base.split(/\s/)[0]).replace(/[（(](男款|女款|男女款)[）)]/g, '');
  }

  // --- subset files: keep only some data rows, pack them up, pull the footer up, keep merges intact ---
  function parseRef(ref) {
    var m = ref.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
    return { c1: m[1], r1: +m[2], c2: m[3], r2: +m[4] };
  }
  function snapRow(ws, r) {
    var row = ws.getRow(r), cells = [];
    row.eachCell({ includeEmpty: true }, function (c, col) {
      cells.push({ col: col, value: c.value, style: JSON.parse(JSON.stringify(c.style || {})) });
    });
    return { height: row.height, cells: cells };
  }
  function putRow(ws, r, snap) {
    var row = ws.getRow(r);
    row.eachCell({ includeEmpty: true }, function (c) { c.value = null; c.style = {}; });
    row.height = snap ? snap.height : undefined;
    if (snap) snap.cells.forEach(function (sc) { var c = row.getCell(sc.col); c.value = sc.value; c.style = sc.style; });
  }
  // Delete `drop` rows starting at `from`, moving everything below up (ExcelJS spliceRows leaves stale rows).
  function shiftUp(ws, from, drop) {
    var last = ws.rowCount;
    for (var r = from; r <= last; r++) putRow(ws, r, r + drop <= last ? snapRow(ws, r + drop) : null);
  }
  // Rebuild the data area from `keep` (row numbers, repeats allowed), renumbering 序号 with `seqs`;
  // the footer moves up or down and its merges follow.
  function keepRows(ws, range, keep, seqCol, seqs) {
    var total = range.last - range.first + 1;
    var snaps = keep.map(function (r) { return snapRow(ws, r); });
    var delta = keep.length - total;
    var refs = (ws.model.merges || []).map(parseRef).filter(function (m) { return m.r1 > range.last; });
    refs.forEach(function (m) { ws.unMergeCells(m.c1 + m.r1 + ':' + m.c2 + m.r2); });
    if (delta < 0) shiftUp(ws, range.first + keep.length, -delta);
    if (delta > 0) shiftDown(ws, range.last + 1, delta);
    snaps.forEach(function (sn, i) {
      putRow(ws, range.first + i, sn);
      if (seqCol && seqs) ws.getRow(range.first + i).getCell(seqCol).value = String(seqs[i]);
    });
    if (delta) refs.forEach(function (m) { ws.mergeCells(m.c1 + (m.r1 + delta) + ':' + m.c2 + (m.r2 + delta)); });
  }
  function shiftDown(ws, from, n) {
    for (var r = ws.rowCount; r >= from; r--) putRow(ws, r + n, snapRow(ws, r));
  }

  function todayStr() {
    var d = new Date();
    return d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear();
  }
  // Name as a filename part: drop notes in brackets, keep the last of "a / b", no path characters.
  function personForFile(s) {
    var parts = String(s || '').replace(/[（(][^）)]*[）)]/g, '').split(/[\/／]/);
    return parts[parts.length - 1].replace(/[\\:*?"<>|]/g, '').replace(/\s+/g, ' ').trim();
  }
  // [学员（加急且只有一位时）] + 工具名称 + （女款/男款, only when the file holds one gender） + 技术单 + 日期 + （单数）[（特殊加急）]H
  // H = 海外: the uploaded file (or the zip it came in) ends in H → outputs keep H, otherwise no H.
  function isOverseasName(name) { return /(^|[^A-Za-z])H[\s_）)\]】]*\.(xlsx|zip)$/i.test(String(name || '')); }
  function outName(tool, gender, urgent, date, count, person, problem, newborn, overseas) {
    // 许舒涵九合平衡牌技术单（特殊加急）9.10.2026（1）H — normal files keep a space: 九合平衡牌技术单 9.10.2026（2）H
    var tags = (urgent ? '（特殊加急）' : '') + (newborn ? '（新生儿）' : '') + (problem ? '（有问题）' : '');
    return ((urgent || problem) && person ? person : '') + tool + (gender ? '（' + gender + '）' : '') + '技术单' + (tags || ' ') + date +
      '（' + count + '）' + (overseas ? 'H' : '') + '.xlsx';
  }

  // Some exports write document properties without their namespace prefix (<lastModifiedBy>),
  // which ExcelJS refuses. Add the prefix before reading; the sheet itself is untouched.
  async function sanitize(buffer) {
    if (!JSZip) return buffer;
    var zip = await JSZip.loadAsync(buffer);
    var core = zip.file('docProps/core.xml');
    if (!core) return buffer;
    var xml = await core.async('string');
    var fixed = xml.replace(/<(\/?)(lastModifiedBy|lastPrinted|revision|category|contentStatus|keywords|version|identifier|language)(\s|>|\/)/g, '<$1cp:$2$3');
    if (fixed === xml) return buffer;
    zip.file('docProps/core.xml', fixed);
    return zip.generateAsync({ type: 'arraybuffer' });
  }
  async function load(buffer) {
    var wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await sanitize(buffer));
    return wb;
  }

  async function processFile(file, opts) {
    var wb = await load(file.buffer);
    var ws = wb.worksheets[0];
    var header = findHeader(ws);
    // the product title inside the sheet names the tool; the file name is only a fallback
    // (a re-uploaded output is already called "许舒涵九合平衡牌技术单（特殊加急）…" or "天富手表（男款）技术单…")
    var tool = null;
    var overseas = file.overseas != null ? !!file.overseas : isOverseasName(file.name);
    var result = { name: file.name, tool: tool, orders: [], outputs: [], error: null, overseas: overseas };
    if (!header) { result.error = '找不到表头（序号）'; return result; }
    var range = dataRowRange(ws, header);
    var C = header.cols;
    tool = toolFromSheet(ws, range, C) || toolName(file.name);
    result.tool = tool;
    var isWatch = /手表/.test(tool) || !!C['刻名字'];
    var isNaming = !!(C['新名字姓氏'] && C['父亲名字']);
    var splitBrand = isWatch && opts.splitWatchBrands.some(function (b) { return b && tool.indexOf(b) >= 0; });

    var made = parseDate(opts.date) || parseDate(todayStr());

    // Reviewer edits (opts.edits["file|订单编号"] = {表头: 新值}) go in first, in red, so every check sees them.
    var edits = opts.edits || {}, keyCol = C['订单编号'], originals = {};
    for (var er = range.first; er <= range.last; er++) {
      var erow = ws.getRow(er);
      var ekey = keyCol ? cellText(erow.getCell(keyCol)) : 'row' + er;
      var ed = edits[file.name + '|' + ekey];
      if (!ed) continue;
      Object.keys(ed).forEach(function (h) {
        if (!C[h] || C[h] === keyCol) return;
        var c = erow.getCell(C[h]);
        originals[ekey] = originals[ekey] || {};
        if (!(h in originals[ekey])) originals[ekey][h] = cellText(c);
        if (cellText(c) === ed[h]) return;
        c.value = ed[h] === '' ? null : ed[h];
        paintRed(c);
      });
    }
    // Cells that arrive with a coloured box in the order rows become red text instead.
    var filledCells = {};
    for (var fr = range.first; fr <= range.last; fr++) {
      ws.getRow(fr).eachCell({ includeEmpty: false }, function (c) { if (hasFill(c) && !isSlave(c)) { filledCells[c.address] = true; paintRed(c); } });
    }
    var headerOrder = Object.keys(C).sort(function (a, b) { return C[a] - C[b]; });

    var byOrder = {}, orderList = [];
    for (var r = range.first; r <= range.last; r++) {
      var row = ws.getRow(r);
      var get = function (h) { return C[h] ? cellText(row.getCell(C[h])) : ''; };
      var cell = function (h) { return C[h] ? row.getCell(C[h]) : null; };
      var key = get('订单编号') || ('row' + r);
      var o = byOrder[key];
      if (!o) {
        o = byOrder[key] = { key: key, seq: get('序号'), person: get('使用人姓名'), title: get('商品标题'),
          rows: [], flags: [], urgent: false, newborn: false, gender: '', changes: 0 };
        orderList.push(o);
      }
      o.rows.push(r);
      var first = o.rows.length === 1;
      var add = function (f) { if (first) o.flags.push(f); };
      if (first) {
        var orig = originals[key] || {};
        o.fields = headerOrder.map(function (h) {
          var v = get(h);
          return { h: h, value: v, orig: h in orig ? orig[h] : v, edited: h in orig && orig[h] !== v, locked: h === '订单编号' || h === '序号' };
        });
        Object.keys(orig).forEach(function (h) {
          if (orig[h] !== get(h)) add({ kind: 'edited', level: 'info', text: '已改「' + h + '」：' + (orig[h] || '（空）') + ' → ' + (get(h) || '（空）') + '（已标红）' });
        });
      }

      // 海外技术单: these products must be checked before they can be made → 有问题
      var prodText = squash(get('商品标题') + ' ' + tool).replace(/[澤]/g, '泽').replace(/[運]/g, '运').replace(/[戒]/g, '戒');
      var askProd = !overseas ? [] : (opts.askFirstProducts || []).filter(function (p) { return p && prodText.indexOf(squash(p)) >= 0; });
      if (askProd.length) add({ kind: 'product', level: 'high', problem: true, who: '能不能做', text: '海外单有「' + askProd.join('、') + '」— 先问能不能做',
        // ready-to-send line, e.g. "A26092650602475 葉宛蓉 福运戒指（男款），这个需确认能不能做？"
        copy: get('订单编号').trim() + ' ' + (get('使用人姓名').trim() || get('会员姓名').trim()) + ' ' + get('商品标题').trim() + '，这个需确认能不能做？' });

      // 换购 must come with the original order number → 有问题, ask the service centre
      var origNo = null;
      if (/换购|換購/.test(get('商品标题'))) {
        // an order number (letter + 14 digits) other than this order's own, or "原订单号 …数字"
        var own = get('订单编号').trim();
        var txt = [get('备注'), get('总备注'), get('订单状态备注')].join('\n');
        var ids = (txt.match(/[A-Za-z]\d{14}/g) || []).filter(function (x) { return x.toUpperCase() !== own.toUpperCase(); });
        var labelled = txt.match(/原(?:订单|訂單|单|單)(?:号|號|编号|編號)?\s*[:：是为為]?\s*([A-Za-z]?\d{6,})/);
        origNo = ids[0] || (labelled && labelled[1]) || null;
        // the sheet's own 原订单编号 column decides when the template has one
        var origCol = Object.keys(C).filter(function (k) { return /原订单|原訂單/.test(k); })[0];
        if (origCol) origNo = isBlank(get(origCol)) ? null : get(origCol).trim();
      }
      if (origNo) {
        add({ kind: 'exchange-ok', level: 'info', text: '换购单，已提供原订单号 ' + origNo + ' — 没问题' });
      } else if (/换购|換購/.test(get('商品标题'))) {
        add({ kind: 'exchange', level: 'high', problem: true, who: '服务中心', text: '换购单，原订单编号是空的 — 和服务中心确认',
          copy: get('订单编号').trim() + ' ' + (get('使用人姓名').trim() || get('会员姓名').trim()) + ' ' + get('商品标题').trim() + '，换购的都需要提供原订单号，这个需和服务中心确认' });
      }

      var remarkHeads = ['备注', '总备注'];
      var remarks = get('备注') + '\n' + get('总备注');
      var redCell = function (h) { var c = cell(h); if (c && !isBlank(cellText(c))) { paintRed(c); o.changes++; } };
      var redRemarksMatching = function (test) { remarkHeads.forEach(function (h) { if (test(get(h))) redCell(h); }); };
      var ask = function (text, who) { add({ kind: 'ask', level: 'high', problem: true, who: who, text: text + ' — 问' + who }); };

      // 子时: 前子时 23:00–23:59 (birthday +1 day), 后子时 00:00–00:59 (no extra day).
      var zFlag = squash(get('是否子时'));
      var zYes = !isBlank(zFlag) && zFlag !== '否';
      var tText = get('农历时辰').trim(), t = parseTime(tText);
      var tUnknown = !C['农历时辰'] ? false : (isBlank(tText) || /不详|不詳|不清楚|未知/.test(tText));
      var tZi = t ? (t.h === 23 || t.h === 0) : /子时|子時/.test(tText);
      var ziKind = t ? (t.h === 23 ? '前子时' : t.h === 0 ? '后子时' : '') : (/前子/.test(zFlag + tText) ? '前子时' : /后子|後子/.test(zFlag + tText) ? '后子时' : '');
      if (C['农历时辰'] && tZi && !zYes) ask('出生时间 ' + tText + ' 是子时，但「是否子时」写否', '下单者');
      if (C['农历时辰'] && zYes && !tZi) ask('「是否子时」写是，但出生时间' + (tUnknown ? '不详' : ' ' + tText + ' 不是子时'), '下单者');
      if (zYes) {
        ['是否子时', '农历时辰', '备注'].forEach(redCell);
        if (ziKind === '前子时' || /前子/.test(zFlag)) {
          var added = /加一天|加多一天|添加多一天|多加一天|已加一天|多一天|\+\s*1\s*天/.test(remarks + get('订单状态备注'));
          add({ kind: 'zishi', level: 'high', text: '前子时（' + (tText || zFlag) + '）— 公历生日要加一天' + (added ? '，备注写已加' : '，请确认已加') + '；时间与备注已标红' });
        } else if (ziKind === '后子时' || /后子|後子/.test(zFlag)) {
          add({ kind: 'zishi', level: 'mid', text: '后子时（' + (tText || zFlag) + '）— 00:00–00:59 不用加一天；时间与备注已标红' });
        } else add({ kind: 'zishi', level: 'mid', text: '子时 — 时间与备注已标红' });
      } else if (/子时|子時/.test(remarks)) {
        add({ kind: 'zishi-note', level: 'info', text: '备注里提到子时，但「是否子时」是否，请核对' });
      }

      // 订单状态备注 asks for 加急: remind only (the file stays where the other rules put it)
      if (/加急|急件|紧急|緊急/.test(get('订单状态备注')) && !urgentHits([get('备注'), get('总备注')], opts.urgentWords).length) {
        add({ kind: 'status-urgent', level: 'high', text: '订单状态备注写了加急 — 请确认要不要放进加急文件（现在还在普通文件）' });
      }

      // 名册展示 繁体 → red
      if (C['名册展示'] && /繁/.test(get('名册展示'))) {
        redCell('名册展示'); redCell('备注');
        add({ kind: 'trad', level: 'info', text: '名册展示：繁体 — 名册展示和备注已标红' });
      }

      // 双胞胎 / 三胞胎 → red
      var twin = squash(get('是否双胞胎'));
      if (C['是否双胞胎'] && !isBlank(twin) && !/^(否|不是|无|無|no)$/i.test(twin)) {
        redCell('是否双胞胎');
        // 老大 → 父亲生日 also red; 老二 → 母亲生日; 老三 → both
        var also = '';
        if (/老大|大的|老一|长子|長子|长女|長女/.test(twin)) { redCell('父亲生日'); also = '，父亲生日也标红'; }
        if (/老二|二的|次子|次女/.test(twin)) { redCell('母亲生日'); also = '，母亲生日也标红'; }
        if (/老三|三的/.test(twin)) { redCell('父亲生日'); redCell('母亲生日'); also = '，父亲生日和母亲生日都标红'; }
        add({ kind: 'twin', level: 'mid', text: '双胞胎 / 三胞胎（' + get('是否双胞胎').trim() + '）— 已标红' + also });
      }
      if (/双胞胎|雙胞胎|三胞胎|多胞胎/.test(remarks)) {
        redRemarksMatching(function (x) { return /双胞胎|雙胞胎|三胞胎|多胞胎/.test(x); });
        if (!(C['是否双胞胎'] && !isBlank(twin) && !/^(否|不是|无|無|no)$/i.test(twin))) add({ kind: 'twin', level: 'mid', text: '备注提到双胞胎 / 三胞胎 — 已标红' });
      }

      // 订单状态备注 has content → red
      if (!isBlank(get('订单状态备注'))) {
        redCell('订单状态备注');
        add({ kind: 'status', level: 'mid', text: '订单状态备注有内容 — 已标红' });
      }

      // 总备注 copied from 备注 → clear
      if (!isBlank(get('总备注')) && squash(get('总备注')) === squash(get('备注'))) {
        cell('总备注').value = null; o.changes++;
        add({ kind: 'dup', level: 'info', text: '总备注与备注完全相同 — 已清空总备注' });
        remarkHeads = ['备注'];
      }

      // Any person's name in 备注 / 总备注 → red; family listed neatly for the reviewer.
      var fam = familyNames(get), famHits = [], otherHits = [];
      var own = {};
      [get('使用人姓名'), get('会员姓名')].join(' ').replace(/[（(][^）)]*[）)]/g, ' ').split(/[\s\/／]+/).forEach(function (x) { if (x) own[x] = true; });
      remarkHeads.forEach(function (h) {
        var txt = get(h);
        if (isBlank(txt)) return;
        var f = mentionedFamily(txt, fam, ''), skip = {};
        f.forEach(function (n) { skip[n] = true; if (famHits.indexOf(n) < 0 && !own[n]) famHits.push(n); });
        var p = possibleNames(txt, skip);
        p.forEach(function (n) { if (otherHits.indexOf(n) < 0 && famHits.indexOf(n) < 0) otherHits.push(n); });
        if (f.length || p.length) redCell(h);
      });
      if (famHits.length) add({ kind: 'family', level: 'high', text: '备注提到家人姓名（' + famHits.join('、') + '）— 已标红' });
      var selfHits = otherHits.filter(function (n) { return own[n]; });
      otherHits = otherHits.filter(function (n) { return !own[n]; });
      if (selfHits.length) add({ kind: 'selfname', level: 'info', text: '备注写了学员本人名字（' + selfHits.join('、') + '）— 已标红' });
      if (otherHits.length) add({ kind: 'name', level: 'high', text: '备注有人名（' + otherHits.join('、') + '）— 已标红，请核对是谁' });
      if (famHits.length || otherHits.length) o.family = familyTable(get, famHits.concat(otherHits));

      // 要求保留某个字 / 名（例如：尽量保留"诗"这个名）→ red so the expert sees it
      var KEEP = /(保留|保持|沿用|不要改|不改|不换)[^，。；;\n]{0,10}(字|名)|(字|名)[^，。；;\n]{0,6}(保留|不要改|不改|不换)/;
      if (KEEP.test(remarks)) {
        redRemarksMatching(function (x) { return KEEP.test(x); });
        var km = remarks.match(/[“"「『”']([\u4e00-\u9fff]{1,3})[”"」』“']/);
        add({ kind: 'keepname', level: 'high', text: '备注要求保留' + (km ? '「' + km[1] + '」' : '某个字 / 名') + ' — 已标红，提醒专家如果适合、匹配尽量保留' });
      }

      // 备注写了出生时间（出生时间：0300am / 05:35AM / 晚上11点出生）→ red
      var BIRTH = /出生(?:时间|時間|时辰|時辰)|几点出生|幾點出生|\d{1,2}\s*[:：.]?\s*\d{2}\s*(?:am|pm|a\.m\.|p\.m\.)|[早晚上下午凌晨]{1,2}\s*\d{1,2}\s*[点點时時](?:\d{1,2}分?)?\s*(?:出生|生)/i;
      if (BIRTH.test(remarks)) {
        redRemarksMatching(function (x) { return BIRTH.test(x); });
        var bm = remarks.match(/出生(?:时间|時間|时辰|時辰)\s*[:：]?\s*([^，。；;\n]{1,16})/) || remarks.match(/(\d{1,2}\s*[:：.]?\s*\d{2}\s*(?:am|pm))/i);
        add({ kind: 'birthnote', level: 'mid', text: '备注写了出生时间' + (bm ? '（' + bm[1].trim() + '）' : '') + ' — 已标红，请和出生时间栏核对' });
      }

      // 起名要求（名字尽量少笔画 / 好写 / 不要用某字 …）→ red so the expert sees it
      var NAMEWISH = /同音|谐音|諧音|笔画|筆畫|筆劃|笔划|好写|好寫|好读|好讀|好念|好唸|易写|易寫|简单的字|簡單的字|名字(?:要|尽量|盡量|最好|希望|不要|别|別)|不要用.{0,6}字|避免.{0,6}字|不用.{0,4}(?:字|偏旁)|偏旁/;
      if (NAMEWISH.test(remarks)) {
        redRemarksMatching(function (x) { return NAMEWISH.test(x); });
        var nw = remarks.split(/[，。；;\n,]/).filter(function (x) { return NAMEWISH.test(x); })[0] || '';
        add({ kind: 'namewish', level: 'high', text: '备注有起名要求（' + nw.trim().slice(0, 20) + '）— 已标红，提醒专家' });
      }

      // 曾用名 → red
      if (/曾用名|原名|旧名|舊名|以前的名字|以前名字|改名前/.test(remarks)) {
        redRemarksMatching(function (x) { return /曾用名|原名|旧名|舊名|以前的名字|以前名字|改名前/.test(x); });
        add({ kind: 'oldname', level: 'mid', text: '备注有曾用名 — 已标红' });
      }

      // 刻名字 empty on a watch
      if (isWatch && C['刻名字'] && isBlank(get('刻名字'))) {
        add({ kind: 'engrave', level: 'high', text: '刻名字为空 — 请查新名字是否已下来' });
      }

      // 加急 words (加急 / 急 / 快 …) → red + own file; dates in 备注: within a month → 加急, later/earlier → red only.
      var hits = urgentHits([get('备注'), get('总备注')], opts.urgentWords);
      remarkHeads.forEach(function (h) {
        var u = urgentHits([get(h)], opts.urgentWords);
        if (u.length) redCell(h);
      });
      var near = [], far = [];
      remarkHeads.forEach(function (h) {
        var ds = datesIn(get(h), made);
        if (!ds.length) return;
        redCell(h);
        ds.forEach(function (d) { (d.days >= 0 && d.days <= d.monthDays ? near : far).push(d.text); });
      });
      if (hits.length || near.length) {
        o.urgent = true;
        add({ kind: 'urgent', level: 'high', text: '加急（' + hits.concat(near.map(function (x) { return x + ' 在一个月内'; })).join('、') + '）— 已标红，单独开文件' });
      }
      if (far.length) add({ kind: 'date', level: 'mid', text: '备注有日期（' + far.join('、') + '）不在一个月内 — 只标红，不加急' });

      // 新生儿: born within one year before the processing date
      var bd = parseBirthday(get('公历生日'));
      if (bd) {
        var bdT = Date.UTC(bd.y, bd.m - 1, bd.d), madeT = Date.UTC(made.y, made.m - 1, made.d), yearAgo = Date.UTC(made.y - 1, made.m - 1, made.d);
        if (bdT > yearAgo && bdT <= madeT) { o.newborn = true; add({ kind: 'newborn', level: 'high', text: '新生儿（' + get('公历生日').trim() + '，未满一岁）— 单独开文件' }); }
      }

      // gender for split watches
      var g = /男女款/.test(get('商品标题')) ? '' : /男款/.test(get('商品标题')) ? '男款' : /女款/.test(get('商品标题')) ? '女款' : (get('性别').trim() === '男' ? '男款' : get('性别').trim() === '女' ? '女款' : '');
      o.gender = g;
      o.titleGender = /男女款/.test(get('商品标题')) ? '' : /男款/.test(get('商品标题')) ? '男款' : /女款/.test(get('商品标题')) ? '女款' : '';

      // 父亲名字 = 母亲名字 → red, ask
      if (C['父亲名字'] && C['母亲名字'] && !isBlank(get('父亲名字')) && squash(get('父亲名字')) === squash(get('母亲名字'))) {
        redCell('父亲名字'); redCell('母亲名字');
        ask('父亲名字和母亲名字一样（' + get('父亲名字').trim() + '）', '下单者');
      }

      // 生肖 vs 公历生日 (立春)
      if (C['生肖'] && !isBlank(get('生肖')) && bd) {
        var given = squash(get('生肖')).split('').map(function (ch) { return ANIMAL_ALIAS[ch]; }).filter(Boolean)[0];
        if (given) {
          var z = zodiacFor(bd, get('农历时辰'));
          // 生肖 is right (立春前 → 上一年 included): an upstream highlight on it is cleared, not turned red
          if (z.animal === given && cell('生肖') && filledCells[cell('生肖').address]) {
            unRed(cell('生肖'));
            if (/前/.test(z.why)) add({ kind: 'zodiac-ok', level: 'info', text: '立春前出生，生肖「' + given + '」已核对正确（' + z.why + '）— 不标红' });
          }
          if (z.animal !== given) {
            redCell('生肖');
            add({ kind: 'zodiac', level: 'high', problem: true, who: '下单者 → 督导', text: '生肖填「' + get('生肖').trim() + '」，按立春应为「' + z.animal + '」（' + z.why + '）— 先问下单者，没问题再问督导' });
          }
        }
      }

      // 新名字姓氏: 和父亲不同 → 认祖归宗 红字给专家 / 否则问下单者。
      // 和使用人姓名的姓氏比：一样 → 不红；简繁不同 → 红；学员更换姓氏 → 红。
      if (isNaming) {
        var sn = get('新名字姓氏').trim();
        var snCell = cell('新名字姓氏');
        var rz = /认祖归宗|認祖歸宗|认祖歸宗|認祖归宗/.test(remarks + get('订单状态备注'));
        var keepRed = !!(originals[key] && '新名字姓氏' in originals[key]) || !!(snCell && filledCells[snCell.address]);
        if (/\d/.test(sn)) {
          redCell('新名字姓氏'); keepRed = true;
          ask('新名字姓氏写的是「' + sn + '」，不像姓氏（像编号）', '下单者');
        } else if (!isBlank(sn)) {
          var chk = surnameCheck(sn, get('父亲名字'));
          if (!chk.ok) {
            redCell('新名字姓氏'); keepRed = true;
            if (rz) {
              redRemarksMatching(function (x) { return /认祖归宗|認祖歸宗|认祖歸宗|認祖归宗/.test(x); });
              add({ kind: 'surname-rz', level: 'mid', text: chk.text + ' — 备注有认祖归宗，姓氏已标红给专家' });
            } else ask(chk.text + '，备注没有认祖归宗', '下单者');
          }
          var ok2 = surnameOwnKind(sn, get('使用人姓名'));
          if (ok2.kind === 'variant') {
            redCell('新名字姓氏'); keepRed = true;
            add({ kind: 'surname-variant', level: 'mid', text: '姓氏简繁体不同（新名字姓氏「' + sn + '」/ 使用人姓名「' + ok2.own + '」）— 已标红' });
          } else if (ok2.kind === 'different') {
            redCell('新名字姓氏'); keepRed = true;
            add({ kind: 'surname-change', level: 'mid', text: '学员更换姓氏（使用人姓名「' + ok2.own + '」→ 新名字姓氏「' + sn + '」）— 已标红' });
          }
          if (ok2.kind === 'same' && !keepRed && snCell) unRed(snCell);
        }
      }
    }
    // 有问题: automatic from flags, the reviewer's own choice (opts.problems) wins.
    var marks = opts.problems || {};
    orderList.forEach(function (o) {
      o.autoProblem = o.flags.some(function (f) { return f.problem; });
      var mk = file.name + '|' + o.key;
      o.problem = Object.prototype.hasOwnProperty.call(marks, mk) ? !!marks[mk] : o.autoProblem;
    });
    result.orders = orderList.map(function (o) {
      return { key: o.key, seq: o.seq, person: o.person, title: o.title, flags: o.flags, urgent: o.urgent, gender: o.gender,
        autoProblem: o.autoProblem, problem: o.problem, newborn: !!o.newborn, family: o.family || null, fields: o.fields || [] };
    });
    result.isWatch = isWatch; result.splitBrand = splitBrand;

    var rule = returnRule(tool), back = rule.calc(made);
    var stamped = stampFooter(ws, range.last + 1, made, back, opts.reviewer || 'martin');
    result.footer = { reviewer: opts.reviewer || 'martin', made: fmtDate(made), back: fmtDate(back), rule: rule.label, stamped: stamped };

    var processed = await wb.xlsx.writeBuffer();

    // Partition into output files.
    var groups = {};
    orderList.forEach(function (o) {
      var tags = [];
      if (o.problem) tags.push('有问题');
      if (o.urgent) tags.push('加急');
      if (o.newborn) tags.push('新生儿');
      if (splitBrand && !o.problem) tags.push(o.gender || '款式未知');
      var k = tags.join('|');
      var gp0 = groups[k] = groups[k] || { tags: tags, urgent: o.urgent, newborn: o.newborn, problem: o.problem, rows: [], count: 0, genders: {}, persons: {} };
      // 名正言顺: every student has two identical rows; add the copy when only one came in.
      var rows = isNaming && o.rows.length === 1 ? [o.rows[0], o.rows[0]] : o.rows;
      if (rows.length !== o.rows.length) gp0.changed = true;
      gp0.rows.push.apply(gp0.rows, rows);
      gp0.seqs = gp0.seqs || [];
      gp0.count++;
      rows.forEach(function () { gp0.seqs.push(gp0.count); });
      gp0.genders[o.titleGender || '-'] = true;
      gp0.persons[personForFile(o.person)] = true;
    });
    var rank = function (k) { return k.indexOf('有问题') >= 0 ? 0 : k.indexOf('加急') >= 0 ? 1 : k.indexOf('新生儿') >= 0 ? 2 : 3; };
    var keys = Object.keys(groups).sort(function (a, b) { return rank(a) - rank(b) || a.localeCompare(b); });
    for (var i = 0; i < keys.length; i++) {
      var gp = groups[keys[i]], buf;
      if (keys.length === 1 && !gp.changed) buf = processed;
      else {
        var sub = await load(processed);
        var sws = sub.worksheets[0];
        keepRows(sws, range, gp.rows, C['序号'], gp.seqs);
        buf = await sub.xlsx.writeBuffer();
      }
      var gs = Object.keys(gp.genders);
      var gender = splitBrand && gs.length === 1 && gs[0] !== '-' ? gs[0] : ''; // only 天威 / 天富 carry 男款 / 女款
      var ps = Object.keys(gp.persons);
      var person = ps.length === 1 ? ps[0] : '';
      result.outputs.push({ name: outName(tool, gender, gp.urgent, opts.date || todayStr(), gp.count, person, gp.problem, gp.newborn, overseas), overseas: overseas, tags: gp.tags, urgent: gp.urgent, problem: gp.problem, newborn: !!gp.newborn, gender: gender, orders: gp.count, buffer: buf });
    }
    return result;
  }

  async function processFiles(files, options) {
    var opts = Object.assign({}, DEFAULTS, options || {});
    var out = [];
    for (var i = 0; i < files.length; i++) {
      try { out.push(await processFile(files[i], opts)); }
      catch (e) { out.push({ name: files[i].name, tool: toolName(files[i].name), orders: [], outputs: [], error: String(e && e.message || e) }); }
    }
    return out;
  }

  return { processFiles: processFiles, DEFAULTS: DEFAULTS, todayStr: todayStr, isOverseasName: isOverseasName, _mentionedFamily: mentionedFamily, _zodiacFor: zodiacFor, _surnameVsOwn: surnameVsOwn, _surnameCheck: surnameCheck, _ziShi: ziShi };
});
