// translations.js — UI translation registry for all 6 supported languages.
// Product names, materials, prose and activation copy stay bilingual (EN/ZH)
// in data.js — only UI chrome (nav, buttons, headings, labels, footer, modals)
// is fully localised here.
//
// Lookup: window.TR(lang, key) — falls back to EN if a key is missing.

window.TRANSLATIONS = {
  en: {
    'nav.maison': 'Maison',
    'nav.precepts': 'Contemplation',
    'nav.efficacy': 'What You Seek',
    'nav.search': 'Search',
    'nav.favorites': 'Favorites',
    'nav.collections': 'Collections',
    'nav.back': 'Back',
    'nav.previous': 'Previous',
    'nav.next': 'Next',

    'hero.eyebrow': 'Numerological Atelier · By Appointment',
    'hero.title.1': 'Number',
    'hero.title.2': 'is the Quiet',
    'hero.title.3': 'Language of All',
    'hero.prose': 'Each piece is composed for a single wearer — drawn from the five elements, written in gold, diamond, sandalwood and tin. The wearer\u2019s name, year, and hour become the maison\u2019s working materials.',
    'hero.cta.explore': 'Explore the Collection',
    'hero.cta.watches': 'Timepieces',
    'hero.scroll': 'Scroll',

    'fe.eyebrow': '— On the Five Phases —',
    'fe.title.en': 'All Things, in Turn',
    'fe.title.zh': 'Generation & Restraint',
    'fe.prose': 'Every piece composed in the maison is drawn from the wearer\u2019s five-elemental register — metal, wood, water, fire, earth. None stands alone; each waits upon another.',
    'fe.centre': 'The Centre',
    'fe.metal': 'Metal',
    'fe.wood': 'Wood',
    'fe.water': 'Water',
    'fe.fire': 'Fire',
    'fe.earth': 'Earth',
    'fe.metal.sub': 'Of edge and intention',
    'fe.wood.sub': 'Of growth and renewal',
    'fe.water.sub': 'Of flow and depth',
    'fe.fire.sub': 'Of brilliance, of vow',
    'fe.earth.sub': 'Of root and stillness',

    'bn.pieces': 'Pieces in the maison',
    'bn.collections': 'Collections',
    'bn.registers': 'Numerological registers',
    'bn.phases': 'Elemental phases',
    'bn.days': 'Days to a new name',

    'cats.title.en': 'The Collections',
    'cats.title.zh': 'Seven Houses, One Maison',
    'cats.pieces': 'pieces',

    'cat.watches': 'Timepieces',
    'cat.watches.sub': 'Harmony of time and intention',
    'cat.rings': 'Rings',
    'cat.rings.sub': 'The vow encircled',
    'cat.pendants': 'Pendants',
    'cat.pendants.sub': 'Held close to the heart',
    'cat.bracelets': 'Bracelets',
    'cat.bracelets.sub': 'Counted by the pulse',
    'cat.earrings': 'Earrings',
    'cat.earrings.sub': 'A whisper, a glance',
    'cat.fengshui': 'Energy Boards',
    'cat.fengshui.sub': 'Quiet anchors of place',
    'cat.others': 'Perfectly Justifiable Named',
    'cat.others.sub': 'Singular commissions',

    'card.discover': 'Discover →',
    'card.examine': 'Examine →',

    'product.materials': 'Materials',
    'product.activation': 'Activation Ritual',
    'product.activation.note': 'Observe in stillness, within two hours of sunrise',
    'product.ref': 'Maison reference',
    'product.views': 'Views',
    'product.zoom': 'Examine in detail',
    'product.zoom.close': 'Close',

    'action.back': 'Back',
    'action.save': 'Save',
    'action.saved': 'Saved',
    'action.copy': 'Copy Details',
    'action.copied': 'Copied',
    'action.download': 'Download',
    'action.share': 'Share',

    'search.placeholder': 'Search by piece, material, or name…',
    'search.empty': 'No matching pieces.',
    'search.navigate': 'navigate',
    'search.open': 'open',
    'search.close': 'close',

    'fav.title': 'My Pieces',
    'fav.subtitle': 'A private register of the pieces you have set aside.',
    'fav.none': 'No pieces saved yet',
    'fav.count': 'saved',
    'fav.empty.cta': 'Press the heart icon on any piece to add it here.',
    'fav.browse': 'Browse the Collection',

    'flow.eyebrow': '— Maison Catalogue —',
    'flow.title.en': 'All Pieces, in Flow',
    'flow.title.zh': 'Along a Single River',
    'flow.prose': 'Every piece of the maison, set side by side along a single river of pages. Scroll to drift through; tap any to examine.',
    'flow.pieces': 'Pieces',
    'flow.collections': 'Collections',
    'flow.jumpto': '— Jump to —',
    'flow.opencat': 'Open Collection →',
    'flow.end': 'The end of the catalogue. To return to the Maison, scroll upward.',

    'index.eyebrow': 'The House Index',
    'index.title': 'Every Piece, in Order',

    'rec.eyebrow': 'Activation · Silent Recitation',
    'rec.pause': 'Pause',
    'rec.resume': 'Resume',
    'rec.repeat': 'Recite Again',
    'rec.note': 'Recite in stillness — seven parts voice, three parts intention.',

    'crumb.maison': 'Maison',

    'footer.house.title': 'The Maison',
    'footer.house.body': 'A private atelier devoted to numerological adornment — timepieces, rings, pendants and boards composed for the wearer\u2019s own register.',
    'footer.counsel.title': 'Atelier Counsel',
    'footer.counsel.body': 'Each commission is overseen by a master of the five elements. Activation guidance is included with every piece.',
    'footer.visit.title': 'Visit',
    'footer.visit.body': 'By appointment only.',
    'footer.created': 'Created by: Martin',
    'footer.catalogue': 'Download Full Catalogue (PDF)',
    'footer.catalogue.short': 'Catalogue',

    'tweaks.title': 'Tweaks',
    'tweaks.atmosphere': 'Atmosphere',
    'tweaks.mood': 'Mood',
    'tweaks.voice': 'Voice',
    'tweaks.typography': 'Typography',
    'tweaks.composition': 'Composition',
    'tweaks.rhythm': 'Rhythm',
  },

  'zh-CN': {
    'nav.maison': '典藏',
    'nav.precepts': '观想',
    'nav.efficacy': '所求为何',
    'nav.search': '搜索',
    'nav.favorites': '收藏',
    'nav.collections': '典藏',
    'nav.back': '返回',
    'nav.previous': '上一件',
    'nav.next': '下一件',

    'hero.eyebrow': '数字典堂 · 私人订制',
    'hero.title.1': '数即一切',
    'hero.title.2': '万象归数',
    'hero.title.3': '光阴在握',
    'hero.prose': '每件作品，皆为一人而作。取自五行，书于金、钻、紫檀、锡。佩戴者之名、年、时辰，即为本堂之素材。',
    'hero.cta.explore': '浏览典藏',
    'hero.cta.watches': '腕表系列',
    'hero.scroll': '徐徐而下',

    'fe.eyebrow': '— 五行之论 —',
    'fe.title.en': '万象循环',
    'fe.title.zh': '相生相克',
    'fe.prose': '典堂所造，皆依佩戴者之五行而成 —— 金、木、水、火、土。无一独存，相生相克。',
    'fe.centre': '中宫',
    'fe.metal': '金',
    'fe.wood': '木',
    'fe.water': '水',
    'fe.fire': '火',
    'fe.earth': '土',
    'fe.metal.sub': '锋而后定',
    'fe.wood.sub': '生生不息',
    'fe.water.sub': '随形而至',
    'fe.fire.sub': '光为见证',
    'fe.earth.sub': '安守静定',

    'bn.pieces': '典藏作品',
    'bn.collections': '系列',
    'bn.registers': '数字之轨',
    'bn.phases': '五行之相',
    'bn.days': '改名之日',

    'cats.title.en': '系列总览',
    'cats.title.zh': '系列总览',
    'cats.pieces': '件',

    'cat.watches': '腕表',
    'cat.watches.sub': '光阴流转，意念同行',
    'cat.rings': '戒指',
    'cat.rings.sub': '执环为约',
    'cat.pendants': '吊坠',
    'cat.pendants.sub': '系于心间',
    'cat.bracelets': '手链',
    'cat.bracelets.sub': '寸腕之间',
    'cat.earrings': '耳环',
    'cat.earrings.sub': '耳畔轻语',
    'cat.fengshui': '能量牌',
    'cat.fengshui.sub': '安宅定位',
    'cat.others': '名正言顺',
    'cat.others.sub': '匠心独造',

    'card.discover': '了解详情 →',
    'card.examine': '近观 →',

    'product.materials': '材质',
    'product.activation': '启动仪轨',
    'product.activation.note': '日出后两小时内，静中行之',
    'product.ref': '典藏编号',
    'product.views': '视图',
    'product.zoom': '近观细品',
    'product.zoom.close': '关闭',

    'action.back': '返回',
    'action.save': '收藏',
    'action.saved': '已收藏',
    'action.copy': '复制详情',
    'action.copied': '已复制',
    'action.download': '下载详情',
    'action.share': '分享',

    'search.placeholder': '搜索作品 · 材质 · 名称…',
    'search.empty': '未找到相关作品',
    'search.navigate': '导航',
    'search.open': '打开',
    'search.close': '关闭',

    'fav.title': '我的典藏',
    'fav.subtitle': '亲手挑选，独属于您的典藏册。',
    'fav.none': '尚未收藏作品',
    'fav.count': '件已收藏',
    'fav.empty.cta': '在作品页轻点心形即可收藏。',
    'fav.browse': '浏览典藏',

    'flow.eyebrow': '— 典藏目录 —',
    'flow.title.en': '百器流光',
    'flow.title.zh': '一川尽览',
    'flow.prose': '本堂百件，俱列于一川页面之中。缓缓下滑，得而细品。',
    'flow.pieces': '件',
    'flow.collections': '系列',
    'flow.jumpto': '— 跳至 —',
    'flow.opencat': '进入此系列 →',
    'flow.end': '目录尽于此。欲返典堂，徐徐上行。',

    'index.eyebrow': '典藏总册',
    'index.title': '诸品有序',

    'rec.eyebrow': '启动语 · 默念',
    'rec.pause': '暂停',
    'rec.resume': '继续',
    'rec.repeat': '重新默诵',
    'rec.note': '于静中默诵，七分声形，三分心意。',

    'crumb.maison': '典堂',

    'footer.house.title': '本堂',
    'footer.house.body': '专研数字之道。腕表、戒指、吊坠与能量牌，皆依佩戴者之命数而成。',
    'footer.counsel.title': '咨询匠师',
    'footer.counsel.body': '每件作品皆由五行匠师监制，附启动仪轨与佩戴指导。',
    'footer.visit.title': '到访',
    'footer.visit.body': '敬请预约。',
    'footer.created': '创建者：薛博方',
    'footer.catalogue': '下载完整图录（PDF）',
    'footer.catalogue.short': '图录',

    'tweaks.title': '调律',
    'tweaks.atmosphere': '气息',
    'tweaks.mood': '基调',
    'tweaks.voice': '声调',
    'tweaks.typography': '字律',
    'tweaks.composition': '布局',
    'tweaks.rhythm': '节奏',
  },

  'zh-TW': {
    'nav.maison': '典藏',
    'nav.precepts': '觀想',
    'nav.efficacy': '所求為何',
    'nav.search': '搜尋',
    'nav.favorites': '收藏',
    'nav.collections': '典藏',
    'nav.back': '返回',
    'nav.previous': '上一件',
    'nav.next': '下一件',

    'hero.eyebrow': '數字典堂 · 私人訂製',
    'hero.title.1': '數即一切',
    'hero.title.2': '萬象歸數',
    'hero.title.3': '光陰在握',
    'hero.prose': '每件作品，皆為一人而作。取自五行，書於金、鑽、紫檀、錫。佩戴者之名、年、時辰，即為本堂之素材。',
    'hero.cta.explore': '瀏覽典藏',
    'hero.cta.watches': '腕錶系列',
    'hero.scroll': '徐徐而下',

    'fe.eyebrow': '— 五行之論 —',
    'fe.title.en': '萬象循環',
    'fe.title.zh': '相生相剋',
    'fe.prose': '典堂所造，皆依佩戴者之五行而成 —— 金、木、水、火、土。無一獨存，相生相剋。',
    'fe.centre': '中宮',
    'fe.metal': '金',
    'fe.wood': '木',
    'fe.water': '水',
    'fe.fire': '火',
    'fe.earth': '土',
    'fe.metal.sub': '鋒而後定',
    'fe.wood.sub': '生生不息',
    'fe.water.sub': '隨形而至',
    'fe.fire.sub': '光為見證',
    'fe.earth.sub': '安守靜定',

    'bn.pieces': '典藏作品',
    'bn.collections': '系列',
    'bn.registers': '數字之軌',
    'bn.phases': '五行之相',
    'bn.days': '改名之日',

    'cats.title.en': '系列總覽',
    'cats.title.zh': '系列總覽',
    'cats.pieces': '件',

    'cat.watches': '腕錶',
    'cat.watches.sub': '光陰流轉，意念同行',
    'cat.rings': '戒指',
    'cat.rings.sub': '執環為約',
    'cat.pendants': '吊墜',
    'cat.pendants.sub': '繫於心間',
    'cat.bracelets': '手鏈',
    'cat.bracelets.sub': '寸腕之間',
    'cat.earrings': '耳環',
    'cat.earrings.sub': '耳畔輕語',
    'cat.fengshui': '能量牌',
    'cat.fengshui.sub': '安宅定位',
    'cat.others': '名正言順',
    'cat.others.sub': '匠心獨造',

    'card.discover': '了解詳情 →',
    'card.examine': '近觀 →',

    'product.materials': '材質',
    'product.activation': '啟動儀軌',
    'product.activation.note': '日出後兩小時內，靜中行之',
    'product.ref': '典藏編號',
    'product.views': '視圖',
    'product.zoom': '近觀細品',
    'product.zoom.close': '關閉',

    'action.back': '返回',
    'action.save': '收藏',
    'action.saved': '已收藏',
    'action.copy': '複製詳情',
    'action.copied': '已複製',
    'action.download': '下載詳情',
    'action.share': '分享',

    'search.placeholder': '搜尋作品 · 材質 · 名稱…',
    'search.empty': '未找到相關作品',
    'search.navigate': '導航',
    'search.open': '打開',
    'search.close': '關閉',

    'fav.title': '我的典藏',
    'fav.subtitle': '親手挑選，獨屬於您的典藏冊。',
    'fav.none': '尚未收藏作品',
    'fav.count': '件已收藏',
    'fav.empty.cta': '在作品頁輕點心形即可收藏。',
    'fav.browse': '瀏覽典藏',

    'flow.eyebrow': '— 典藏目錄 —',
    'flow.title.en': '百器流光',
    'flow.title.zh': '一川盡覽',
    'flow.prose': '本堂百件，俱列於一川頁面之中。緩緩下滑，得而細品。',
    'flow.pieces': '件',
    'flow.collections': '系列',
    'flow.jumpto': '— 跳至 —',
    'flow.opencat': '進入此系列 →',
    'flow.end': '目錄盡於此。欲返典堂，徐徐上行。',

    'index.eyebrow': '典藏總冊',
    'index.title': '諸品有序',

    'rec.eyebrow': '啟動語 · 默念',
    'rec.pause': '暫停',
    'rec.resume': '繼續',
    'rec.repeat': '重新默誦',
    'rec.note': '於靜中默誦，七分聲形，三分心意。',

    'crumb.maison': '典堂',

    'footer.house.title': '本堂',
    'footer.house.body': '專研數字之道。腕錶、戒指、吊墜與風水牌，皆依佩戴者之命數而成。',
    'footer.counsel.title': '諮詢匠師',
    'footer.counsel.body': '每件作品皆由五行匠師監製，附啟動儀軌與佩戴指導。',
    'footer.visit.title': '到訪',
    'footer.visit.body': '敬請預約。',
    'footer.created': '創建者：薛博方',
    'footer.catalogue': '下載完整圖錄（PDF）',
    'footer.catalogue.short': '圖錄',

    'tweaks.title': '調律',
    'tweaks.atmosphere': '氣息',
    'tweaks.mood': '基調',
    'tweaks.voice': '聲調',
    'tweaks.typography': '字律',
    'tweaks.composition': '佈局',
    'tweaks.rhythm': '節奏',
  },

  ja: {
    'nav.maison': '館',
    'nav.precepts': '観想',
    'nav.efficacy': '求むるもの',
    'nav.search': '検索',
    'nav.favorites': 'お気に入り',
    'nav.collections': 'コレクション',
    'nav.back': '戻る',
    'nav.previous': '前へ',
    'nav.next': '次へ',

    'hero.eyebrow': '数の工房 · 完全予約制',
    'hero.title.1': '数は',
    'hero.title.2': '万物の',
    'hero.title.3': '静かな言葉',
    'hero.prose': '一作品ごとに、一人の方のために創られます。五行から導き、金、ダイヤモンド、紫檀、錫に刻む。お名前、年、時刻が、本館の素材となります。',
    'hero.cta.explore': 'コレクションを見る',
    'hero.cta.watches': '時計',
    'hero.scroll': 'スクロール',

    'fe.eyebrow': '— 五行について —',
    'fe.title.en': '万物は、巡る',
    'fe.title.zh': '相生相剋',
    'fe.prose': '本館の作品はすべて、佩戴者の五行 —— 金、木、水、火、土に基づいて作られます。単独で存在するものはなく、互いに相生・相剋する。',
    'fe.centre': '中央',
    'fe.metal': '金',
    'fe.wood': '木',
    'fe.water': '水',
    'fe.fire': '火',
    'fe.earth': '土',
    'fe.metal.sub': '鋭く、定まる',
    'fe.wood.sub': '生命の更新',
    'fe.water.sub': '形に従う',
    'fe.fire.sub': '光は誓いの証',
    'fe.earth.sub': '根を張り静まる',

    'bn.pieces': '本館の作品',
    'bn.collections': 'コレクション',
    'bn.registers': '数の系譜',
    'bn.phases': '五行の相',
    'bn.days': '改名の日数',

    'cats.title.en': 'コレクション一覧',
    'cats.title.zh': 'コレクション一覧',
    'cats.pieces': '点',

    'cat.watches': '時計',
    'cat.watches.sub': '時と意思の調和',
    'cat.rings': '指輪',
    'cat.rings.sub': '誓いの環',
    'cat.pendants': 'ペンダント',
    'cat.pendants.sub': '心に近く',
    'cat.bracelets': 'ブレスレット',
    'cat.bracelets.sub': '脈で数える',
    'cat.earrings': 'イヤリング',
    'cat.earrings.sub': '囁き、一瞥',
    'cat.fengshui': 'エネルギー牌',
    'cat.fengshui.sub': '場の静かな碇',
    'cat.others': '名正言順',
    'cat.others.sub': '一点物の依頼作品',

    'card.discover': '詳しく見る →',
    'card.examine': '間近で見る →',

    'product.materials': '素材',
    'product.activation': '起動儀軌',
    'product.activation.note': '日の出後二時間以内、静寂のなかで',
    'product.ref': '館番号',
    'product.views': 'ビュー',
    'product.zoom': '細部を見る',
    'product.zoom.close': '閉じる',

    'action.back': '戻る',
    'action.save': '保存',
    'action.saved': '保存済み',
    'action.copy': '詳細をコピー',
    'action.copied': 'コピーしました',
    'action.download': 'ダウンロード',
    'action.share': '共有',

    'search.placeholder': '作品、素材、名前で検索…',
    'search.empty': '一致する作品はありません',
    'search.navigate': '移動',
    'search.open': '開く',
    'search.close': '閉じる',

    'fav.title': 'マイ・ピース',
    'fav.subtitle': 'あなただけのために選び出した、私的な作品帳。',
    'fav.none': 'まだ保存された作品はありません',
    'fav.count': '点保存済み',
    'fav.empty.cta': '作品ページのハートアイコンを押して追加。',
    'fav.browse': 'コレクションを見る',

    'flow.eyebrow': '— 館 · カタログ —',
    'flow.title.en': '流れる百器',
    'flow.title.zh': '流れる百器',
    'flow.prose': '館のすべての作品が、一筋の頁の流れに並びます。スクロールして漂い、ひとつを選んで仔細に。',
    'flow.pieces': '点',
    'flow.collections': 'コレクション',
    'flow.jumpto': '— 移動 —',
    'flow.opencat': 'このコレクションへ →',
    'flow.end': 'カタログの終わり。館へ戻るには、上へお進みください。',

    'index.eyebrow': '館 · 総覧',
    'index.title': '順序ある作品たち',

    'rec.eyebrow': '起動句 · 黙誦',
    'rec.pause': '一時停止',
    'rec.resume': '続ける',
    'rec.repeat': 'もう一度誦す',
    'rec.note': '静寂のなかで誦む — 七分は声に、三分は意に。',

    'crumb.maison': '館',

    'footer.house.title': '本館',
    'footer.house.body': '数の装身に専念する私的工房 — 時計、指輪、ペンダント、風水牌が、佩戴者の数に応じて作られます。',
    'footer.counsel.title': '工房の助言',
    'footer.counsel.body': 'すべての作品は五行の師の監修のもとに作られ、起動の手引きが添えられます。',
    'footer.visit.title': '訪問',
    'footer.visit.body': '完全予約制。',
    'footer.created': '制作者：Martin',
    'footer.catalogue': '完全カタログをダウンロード（PDF）',
    'footer.catalogue.short': 'カタログ',

    'tweaks.title': '調整',
    'tweaks.atmosphere': '雰囲気',
    'tweaks.mood': '色調',
    'tweaks.voice': '声調',
    'tweaks.typography': '書体',
    'tweaks.composition': '構成',
    'tweaks.rhythm': 'リズム',
  },

  ms: {
    'nav.maison': 'Maison',
    'nav.precepts': 'Renungan',
    'nav.efficacy': 'Apa Dicari',
    'nav.search': 'Cari',
    'nav.favorites': 'Kegemaran',
    'nav.collections': 'Koleksi',
    'nav.back': 'Kembali',
    'nav.previous': 'Sebelum',
    'nav.next': 'Seterusnya',

    'hero.eyebrow': 'Studio Numerologi · Dengan Temujanji',
    'hero.title.1': 'Nombor',
    'hero.title.2': 'ialah Bahasa',
    'hero.title.3': 'Sunyi Segalanya',
    'hero.prose': 'Setiap karya digubah untuk seorang pemakai sahaja — diambil dari lima unsur, dituliskan dalam emas, berlian, kayu cendana dan timah. Nama, tahun, dan waktu pemakai menjadi bahan kerja maison.',
    'hero.cta.explore': 'Terokai Koleksi',
    'hero.cta.watches': 'Jam Tangan',
    'hero.scroll': 'Tatal',

    'fe.eyebrow': '— Tentang Lima Unsur —',
    'fe.title.en': 'Segala-galanya, Bergilir',
    'fe.title.zh': 'Saling Menjana & Menahan',
    'fe.prose': 'Setiap karya yang digubah di maison ini berasal dari lima unsur pemakai — logam, kayu, air, api, tanah. Tiada satu pun berdiri sendiri; setiap satu menunggu yang lain.',
    'fe.centre': 'Pusat',
    'fe.metal': 'Logam',
    'fe.wood': 'Kayu',
    'fe.water': 'Air',
    'fe.fire': 'Api',
    'fe.earth': 'Tanah',
    'fe.metal.sub': 'Ketajaman dan niat',
    'fe.wood.sub': 'Pertumbuhan dan pembaharuan',
    'fe.water.sub': 'Aliran dan kedalaman',
    'fe.fire.sub': 'Sinar, sumpah',
    'fe.earth.sub': 'Akar dan ketenangan',

    'bn.pieces': 'Karya dalam maison',
    'bn.collections': 'Koleksi',
    'bn.registers': 'Daftar nombor',
    'bn.phases': 'Fasa unsur',
    'bn.days': 'Hari ke nama baru',

    'cats.title.en': 'Koleksi',
    'cats.title.zh': 'Tujuh Siri, Satu Maison',
    'cats.pieces': 'karya',

    'cat.watches': 'Jam Tangan',
    'cat.watches.sub': 'Keharmonian masa dan niat',
    'cat.rings': 'Cincin',
    'cat.rings.sub': 'Sumpah yang melingkar',
    'cat.pendants': 'Loket',
    'cat.pendants.sub': 'Dekat di hati',
    'cat.bracelets': 'Gelang',
    'cat.bracelets.sub': 'Dikira dengan denyut',
    'cat.earrings': 'Subang',
    'cat.earrings.sub': 'Bisikan, pandangan',
    'cat.fengshui': 'Papan Tenaga',
    'cat.fengshui.sub': 'Pasak senyap tempat',
    'cat.others': 'Perfectly Justifiable Named',
    'cat.others.sub': 'Tempahan istimewa',

    'card.discover': 'Lihat →',
    'card.examine': 'Teliti →',

    'product.materials': 'Bahan',
    'product.activation': 'Ritual Pengaktifan',
    'product.activation.note': 'Dalam ketenangan, dua jam selepas matahari terbit',
    'product.ref': 'Rujukan maison',
    'product.views': 'Pandangan',
    'product.zoom': 'Teliti dengan dekat',
    'product.zoom.close': 'Tutup',

    'action.back': 'Kembali',
    'action.save': 'Simpan',
    'action.saved': 'Disimpan',
    'action.copy': 'Salin Butiran',
    'action.copied': 'Disalin',
    'action.download': 'Muat Turun',
    'action.share': 'Kongsi',

    'search.placeholder': 'Cari karya, bahan, atau nama…',
    'search.empty': 'Tiada karya sepadan.',
    'search.navigate': 'navigasi',
    'search.open': 'buka',
    'search.close': 'tutup',

    'fav.title': 'Karya Saya',
    'fav.subtitle': 'Daftar peribadi karya yang telah anda pilih.',
    'fav.none': 'Belum ada karya disimpan',
    'fav.count': 'disimpan',
    'fav.empty.cta': 'Tekan ikon hati pada mana-mana karya untuk menambah di sini.',
    'fav.browse': 'Layari Koleksi',

    'flow.eyebrow': '— Katalog Maison —',
    'flow.title.en': 'Semua Karya, dalam Aliran',
    'flow.title.zh': 'Sepanjang Satu Sungai',
    'flow.prose': 'Setiap karya maison, berbaris di sepanjang sungai halaman. Tatal untuk menyusuri; ketik untuk meneliti.',
    'flow.pieces': 'Karya',
    'flow.collections': 'Koleksi',
    'flow.jumpto': '— Lompat ke —',
    'flow.opencat': 'Buka Koleksi →',
    'flow.end': 'Penghujung katalog. Untuk kembali ke Maison, tatal ke atas.',

    'index.eyebrow': 'Indeks Maison',
    'index.title': 'Setiap Karya, Tersusun',

    'rec.eyebrow': 'Pengaktifan · Bacaan Sunyi',
    'rec.pause': 'Jeda',
    'rec.resume': 'Sambung',
    'rec.repeat': 'Baca Semula',
    'rec.note': 'Bacalah dalam ketenangan — tujuh suara, tiga niat.',

    'crumb.maison': 'Maison',

    'footer.house.title': 'Maison',
    'footer.house.body': 'Studio peribadi khusus untuk perhiasan numerologi — jam, cincin, loket dan papan yang digubah mengikut daftar pemakai.',
    'footer.counsel.title': 'Khidmat Atelier',
    'footer.counsel.body': 'Setiap tempahan diselia oleh pakar lima unsur. Panduan pengaktifan disertakan dengan setiap karya.',
    'footer.visit.title': 'Kunjungan',
    'footer.visit.body': 'Hanya dengan temujanji.',
    'footer.created': 'Dicipta oleh: Martin',
    'footer.catalogue': 'Muat Turun Katalog Penuh (PDF)',
    'footer.catalogue.short': 'Katalog',

    'tweaks.title': 'Pelarasan',
    'tweaks.atmosphere': 'Suasana',
    'tweaks.mood': 'Mood',
    'tweaks.voice': 'Suara',
    'tweaks.typography': 'Tipografi',
    'tweaks.composition': 'Komposisi',
    'tweaks.rhythm': 'Irama',
  },

  id: {
    'nav.maison': 'Maison',
    'nav.precepts': 'Renungan',
    'nav.efficacy': 'Apa Dicari',
    'nav.search': 'Cari',
    'nav.favorites': 'Favorit',
    'nav.collections': 'Koleksi',
    'nav.back': 'Kembali',
    'nav.previous': 'Sebelumnya',
    'nav.next': 'Berikutnya',

    'hero.eyebrow': 'Studio Numerologi · Dengan Janji Temu',
    'hero.title.1': 'Angka',
    'hero.title.2': 'adalah Bahasa',
    'hero.title.3': 'Sunyi Semesta',
    'hero.prose': 'Setiap karya digubah untuk satu pemakai — diambil dari lima unsur, ditulis dalam emas, berlian, kayu cendana, dan timah. Nama, tahun, dan jam pemakai menjadi bahan kerja maison.',
    'hero.cta.explore': 'Jelajahi Koleksi',
    'hero.cta.watches': 'Jam Tangan',
    'hero.scroll': 'Gulir',

    'fe.eyebrow': '— Tentang Lima Unsur —',
    'fe.title.en': 'Segalanya, Bergiliran',
    'fe.title.zh': 'Saling Menjana & Menahan',
    'fe.prose': 'Setiap karya yang dibuat di maison ini diambil dari lima unsur pemakai — logam, kayu, air, api, tanah. Tidak ada yang berdiri sendiri; masing-masing menanti yang lain.',
    'fe.centre': 'Pusat',
    'fe.metal': 'Logam',
    'fe.wood': 'Kayu',
    'fe.water': 'Air',
    'fe.fire': 'Api',
    'fe.earth': 'Tanah',
    'fe.metal.sub': 'Ketajaman dan niat',
    'fe.wood.sub': 'Pertumbuhan dan pembaharuan',
    'fe.water.sub': 'Aliran dan kedalaman',
    'fe.fire.sub': 'Sinar, sumpah',
    'fe.earth.sub': 'Akar dan ketenangan',

    'bn.pieces': 'Karya di maison',
    'bn.collections': 'Koleksi',
    'bn.registers': 'Daftar angka',
    'bn.phases': 'Fase unsur',
    'bn.days': 'Hari menuju nama baru',

    'cats.title.en': 'Koleksi',
    'cats.title.zh': 'Tujuh Siri, Satu Maison',
    'cats.pieces': 'karya',

    'cat.watches': 'Jam Tangan',
    'cat.watches.sub': 'Keharmonisan waktu dan niat',
    'cat.rings': 'Cincin',
    'cat.rings.sub': 'Sumpah yang melingkar',
    'cat.pendants': 'Liontin',
    'cat.pendants.sub': 'Dekat dengan hati',
    'cat.bracelets': 'Gelang',
    'cat.bracelets.sub': 'Dihitung dengan denyut',
    'cat.earrings': 'Anting',
    'cat.earrings.sub': 'Bisikan, sekilas pandang',
    'cat.fengshui': 'Papan Energi',
    'cat.fengshui.sub': 'Penambat tempat yang sunyi',
    'cat.others': 'Perfectly Justifiable Named',
    'cat.others.sub': 'Pesanan istimewa',

    'card.discover': 'Lihat →',
    'card.examine': 'Teliti →',

    'product.materials': 'Bahan',
    'product.activation': 'Ritual Pengaktifan',
    'product.activation.note': 'Dalam ketenangan, dua jam setelah matahari terbit',
    'product.ref': 'Referensi maison',
    'product.views': 'Tampilan',
    'product.zoom': 'Teliti lebih dekat',
    'product.zoom.close': 'Tutup',

    'action.back': 'Kembali',
    'action.save': 'Simpan',
    'action.saved': 'Tersimpan',
    'action.copy': 'Salin Detail',
    'action.copied': 'Tersalin',
    'action.download': 'Unduh',
    'action.share': 'Bagikan',

    'search.placeholder': 'Cari karya, bahan, atau nama…',
    'search.empty': 'Tidak ada karya yang cocok.',
    'search.navigate': 'navigasi',
    'search.open': 'buka',
    'search.close': 'tutup',

    'fav.title': 'Karya Saya',
    'fav.subtitle': 'Daftar pribadi karya yang telah Anda pilih.',
    'fav.none': 'Belum ada karya disimpan',
    'fav.count': 'tersimpan',
    'fav.empty.cta': 'Tekan ikon hati pada karya untuk menambahkan di sini.',
    'fav.browse': 'Jelajahi Koleksi',

    'flow.eyebrow': '— Katalog Maison —',
    'flow.title.en': 'Semua Karya, dalam Aliran',
    'flow.title.zh': 'Sepanjang Satu Sungai',
    'flow.prose': 'Setiap karya maison, berderet di sepanjang sungai halaman. Gulir untuk menyusuri; ketuk untuk meneliti.',
    'flow.pieces': 'Karya',
    'flow.collections': 'Koleksi',
    'flow.jumpto': '— Lompat ke —',
    'flow.opencat': 'Buka Koleksi →',
    'flow.end': 'Akhir dari katalog. Untuk kembali ke Maison, gulir ke atas.',

    'index.eyebrow': 'Indeks Maison',
    'index.title': 'Setiap Karya, Tersusun',

    'rec.eyebrow': 'Pengaktifan · Pembacaan Sunyi',
    'rec.pause': 'Jeda',
    'rec.resume': 'Lanjutkan',
    'rec.repeat': 'Baca Ulang',
    'rec.note': 'Bacalah dalam ketenangan — tujuh bagian suara, tiga bagian niat.',

    'crumb.maison': 'Maison',

    'footer.house.title': 'Maison',
    'footer.house.body': 'Studio pribadi yang berdedikasi untuk perhiasan numerologi — jam, cincin, liontin dan papan yang digubah sesuai daftar pemakai.',
    'footer.counsel.title': 'Konsultasi Atelier',
    'footer.counsel.body': 'Setiap pesanan diawasi oleh ahli lima unsur. Panduan pengaktifan disertakan dengan setiap karya.',
    'footer.visit.title': 'Kunjungan',
    'footer.visit.body': 'Hanya dengan janji temu.',
    'footer.created': 'Dibuat oleh: Martin',
    'footer.catalogue': 'Unduh Katalog Lengkap (PDF)',
    'footer.catalogue.short': 'Katalog',

    'tweaks.title': 'Penyesuaian',
    'tweaks.atmosphere': 'Suasana',
    'tweaks.mood': 'Mood',
    'tweaks.voice': 'Suara',
    'tweaks.typography': 'Tipografi',
    'tweaks.composition': 'Komposisi',
    'tweaks.rhythm': 'Irama',
  },
};

// Translator function. Falls back: requested lang → English → key.
window.TR = function TR(lang, key) {
  const table = window.TRANSLATIONS;
  const code = (lang === 'zh') ? 'zh-CN' : lang;
  return (table[code] && table[code][key])
      || (table['en'] && table['en'][key])
      || key;
};

// Global helpers — exposed so every <script type="text/babel"> can use them
// (each Babel script gets its own scope; sharing via window is the contract).
window.tr = window.TR;

window.catName = function (lang, cat) {
  const code = lang === 'zh' ? 'zh-CN' : lang;
  const T = window.TRANSLATIONS || {};
  const k = 'cat.' + cat.id;
  return (T[code] && T[code][k]) || (T.en && T.en[k]) || cat.nameEn;
};
window.catSub = function (lang, cat) {
  const code = lang === 'zh' ? 'zh-CN' : lang;
  const T = window.TRANSLATIONS || {};
  const k = 'cat.' + cat.id + '.sub';
  return (T[code] && T[code][k]) || (T.en && T.en[k]) || cat.subtitleEn;
};

// `t(lang, en, zh)` — historic two-arg signature for product-data strings.
// For Malay, consults the MS_DICT word-for-word lookup. For Traditional
// Chinese, converts the Simplified source via OpenCC (window.__s2t) when loaded.
window.t = function (lang, en, zh) {
  if (lang === 'zh-TW') {
    return (window.__s2t ? window.__s2t(zh) : zh);
  }
  if (lang === 'zh' || lang === 'zh-CN') return zh;
  if (lang === 'ms' && window.MS_DICT) {
    const key = String(en || '').trim();
    return window.MS_DICT[key] || en;
  }
  return en;
};

// Convert a Simplified-Chinese string to Traditional when needed (zh-TW).
// Used for product names that always render their Chinese label.
window.zh = function (lang, zhStr) {
  if (lang === 'zh-TW' && window.__s2t) return window.__s2t(zhStr);
  return zhStr;
};

// Lazily build a Simplified→Traditional converter once OpenCC is available.
(function initS2T() {
  function build() {
    if (window.OpenCC && window.OpenCC.Converter) {
      try {
        const conv = window.OpenCC.Converter({ from: 'cn', to: 'tw' });
        window.__s2t = (s) => { try { return conv(s); } catch { return s; } };
        window.dispatchEvent(new CustomEvent('shuyi-s2t-ready'));
        return true;
      } catch (e) { /* fall through */ }
    }
    return false;
  }
  if (!build()) {
    let tries = 0;
    const iv = setInterval(() => {
      if (build() || ++tries > 200) clearInterval(iv);
    }, 150);
  }
})();
