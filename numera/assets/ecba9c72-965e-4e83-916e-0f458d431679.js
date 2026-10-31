// efficacy.js — 器之用：每件器物的功用与寓意（源自《工具功能》文档）
// Keyed by product id; category-level entries serve as a fallback for
// families the document describes as a whole (watches / rings / bracelets).
(function () {
  const TIAN_XIANG = { seal: '祥', lead: { zh: '不追逐时间，而与时间同行。', en: 'Not chasing time, but walking with it.' }, uses: [
    { zh: '平衡自身五行，有助于身体健康', en: 'Balances your five elements; supports the body' },
    { zh: '婚姻和谐，家庭和谐', en: 'Harmony in marriage and in the household' }
  ], term: { zh: '流年手表：自开始使用起一年内有效。终身手表：不限年月。', en: 'Annual watch: one year from first use. Lifetime watch: no term.' }, meaning: [
    { zh: '历经重新设计与全新演绎，天祥表男女款，正式重新上架。灵感源于《易经》，以阴阳之衡、五行之序为底层语言，凝练于比例、轮廓与细节之中。', en: 'Redesigned and newly interpreted, the Tian Xiang watch returns in men’s and women’s editions. Drawn from the Book of Changes, it takes the balance of yin and yang and the order of the five elements as its underlying language, distilled into proportion, outline and detail.' },
    { poem: true, toc: { zh: '与时间同行', en: 'Walking with time' }, zh: '不追逐时间，\n而与时间同行。\n「天」——顺势而行；\n「祥」——应时而盛。', en: 'Not chasing time,\nbut walking with it.\n“Tian”, heaven — moving with the tide;\n“Xiang”, auspice — flourishing in its hour.' },
    { poem: true, toc: { zh: '向内而生', en: 'Growing inward' }, zh: '腕间所见，不止于分秒。\n更是一种秩序、一种规律、\n一种向内而生的力量。', en: 'What the wrist shows is more than minutes and seconds —\nan order, a rhythm,\na strength that grows from within.' },
    { poem: true, toc: { zh: '男款 · 女款', en: 'His · Hers' }, zh: '男款，内敛而坚定。\n女款，从容而丰盈。', en: 'For him — reserved, and resolute.\nFor her — composed, and abundant.' },
    { zh: '每一次佩戴，皆是一场与时间、能量与自我之间的对话。', en: 'Each time it is worn, a conversation between time, energy and the self.' }
  ] };
const KAI_HE_MEANING = { lead: { zh: '莲花之纯净，铜钱之财富 —— 两相妙合，身心与事业同兴。', en: 'The purity of the lotus, the wealth of the coin — joined, so body, mind and enterprise flourish together.' }, note: { zh: '特殊数字 281 可通过佩戴开合吊坠，平衡五行，增强能量。', en: 'Those carrying the special number 281 may wear the Kai He pendant to balance the five elements and raise their energy.' }, meaning: [
    { zh: '【莲花 · 出淤泥而不染】莲花，自古以来在各类神话传说中，为神话人物的宝座，被视为高尚与纯洁的象征。独特地具备「出淤泥而不染，濯清涟而不妖」的高贵品质。这一特质使得莲花成为一种充满正能量的花卉，不仅能够净化周围磁场，还具有洗净心灵的功效，为我们带来平和与宁静。屏蔽负能量，快速提升能量磁场。', en: 'The lotus — unstained by the mud. Since ancient times the lotus has been the throne of figures in myth and legend, a symbol of nobility and purity. It rises from the mud unstained, washed by clear ripples yet never showy. This makes it a flower full of positive energy: it purifies the field around it and cleanses the heart, bringing peace and calm — shielding negative energy and swiftly raising your own.' },
    { zh: '【五行宝石 · 多彩丰富】莲花的花瓣上方镶嵌着根据个人五行，不同颜色的天然宝石，分别代表着五行的平衡和和谐，也寓意着人生的多彩和丰富。', en: 'Gemstones of the five elements — a life rich in colour. Above the lotus petals are set natural gemstones in colours chosen by your own five elements, each standing for their balance and harmony, and for a life full of colour and abundance.' },
    { zh: '【六枚铜钱 · 六六大顺】铜钱古往今来一直被视为财富与事业的象征。六个铜钱，代表六六大顺，财运亨通。这不仅寓意事业上的快速成功与财富的倍增，同时也代表对幸福婚姻生活的物质保障。铜钱的圆形也象征着完美、团圆和完整，预示着生活的美满与和谐。', en: 'Six coins — everything going smoothly. The coin has always stood for wealth and enterprise. Six coins mean “six-six, all goes well”, fortune flowing freely: swift success in work and wealth multiplied, and a material foundation for a happy marriage. The round coin also signifies perfection, reunion and wholeness — a life fulfilled and in harmony.' },
    { zh: '【莲钱合一 · 身心与事业同兴】吊坠将莲花的纯净与铜钱的财富巧妙地结合在一起，既追求身心的健康与和谐，又能加速事业的成功与财富的倍增。通过五行平衡，体现个人与环境的和谐共生，提升事业时间管理、资源配置、工作效率与成就感；保障身体健康，增强免疫力，预防疾病；平衡工作与家庭生活，构建更加和谐的家庭关系。', en: 'Lotus and coin as one — body, mind and work flourishing together. The pendant joins the purity of the lotus with the wealth of the coin, seeking health and harmony of body and mind while hastening success and the growth of wealth. Through the balance of the five elements it expresses harmony between person and surroundings: sharper time management, resourcing, efficiency and sense of achievement at work; good health, stronger immunity and protection from illness; and a balance of work and home, for a more harmonious family.' }
  ] };
  const P = {
    'perfectly-justifiable-named': { seal: '福', uses: [
      { zh: '补后代五福临门', en: 'Five blessings at the door for those who follow' },
      { zh: '身体健康，带来好运', en: 'Health of body, and good fortune drawn in' }
    ] },
    'qian-kun-pendant': { seal: '贵', uses: [
      { zh: '吸贵人，挡小人', en: 'Draws benefactors; turns aside the petty' },
      { zh: '提升能量', en: 'Raises your energy' },
      { zh: '补缺失数字', en: 'Completes the missing numbers' },
      { zh: '补先天的五福临门', en: 'Restores the five innate blessings at the door' }
    ], note: { zh: '未配置名字前，请勿先配置吊坠，否则身体会出现状况。', en: 'Do not take up the pendant before your name has been configured — the body may be unsettled.' }, meaning: [
      { zh: '代表源源不绝的财富力，还有「智圆行方」之妙意。内有乾坤，寓意万事圆通。', en: 'Wealth without interruption — wisdom round, conduct square. Heaven and earth within, and all things run smooth.' },
      { zh: '内外双圆相通，处处圆，事事圆，好运源源不绝。', en: 'Two circles, inner and outer, joined — every matter round, every fortune unending.' }
    ] },
    'lucky-noble-pendant': { seal: '禄', uses: [
      { zh: '开运，转运，补缺失数字', en: 'Opens and turns fortune; completes the missing numbers' },
      { zh: '吸引高层贵人，有助于官运亨通', en: 'Draws senior benefactors; smooths the path of office' },
      { zh: '福䘵安康，时来运转', en: 'Blessing, emolument and health — the hour turns in your favour' }
    ], meaning: [
      { zh: '开启自己的 679 福禄寿运程。', en: 'Opens your own 679 — blessing, emolument, longevity.' },
      { zh: '葫芦谐音「福禄」「护路」，寓意福气、俸禄，保平安。葫芦藤蔓谐音「万」，寓意子孙万代，多子多福。内含吉祥正气的玛瑙珠，助你运筹帷幄，扭转乾坤。', en: 'The gourd sounds as “blessing and emolument”, and as “guarding the road”. Its vine sounds as “ten thousand” — generations without end. The agate bead within carries an upright air: strategy in hand, the world turned around.' }
    ] },
    'kai-yuan-pendant': { seal: '元', uses: [
      { zh: '事业圆满，婚姻和谐', en: 'A complete career; harmony in marriage' },
      { zh: '吸引高端贵人，人际关系和谐', en: 'Draws high benefactors; concord among people' },
      { zh: '平安喜乐', en: 'Peace and gladness' }
    ], meaning: [
      { zh: '开元盛世，励精图治，任用贤能，提倡文教。', en: 'The Kaiyuan flourishing — diligent rule, worthy counsel, letters and learning upheld.' }
    ] },
    'zodiac-pendant': { seal: '生', uses: [
      { zh: '利用三合局来提升运势，加强能量', en: 'Raises fortune through the triple-harmony formation; strengthens the field' }
    ] },
    'tian-xi-watch': { seal: '希', lead: { zh: '大音希声 —— 真正的力量，从不喧嚣。', en: 'The great sound is barely heard — true strength never clamours.' }, uses: [
      { zh: '平衡自身五行，有助于身体健康', en: 'Balances your five elements; supports the body' },
      { zh: '婚姻和谐，家庭和谐', en: 'Harmony in marriage and in the household' }
    ], term: { zh: '流年手表：自开始使用起一年内有效。终身手表：不限年月。', en: 'Annual watch: one year from first use. Lifetime watch: no term.' }, meaning: [
      { zh: '【大音希声 · 至简至美】《道德经》有言：「大音希声」，至高的乐音悠远而稀疏，乃至无声。真正的力量，从不喧嚣。天希手表以此为哲思，化繁为简，在静默中诠释时间的本质：它不追逐浮华，却以无声的陪伴，成为你生命中永恒的印记。无论是在晨光初露的静谧独处，还是深夜沉思的深邃片刻，天希以温润的质感与低调的设计，与您共度每一刻静好时光。', en: 'The great sound is barely heard — simplicity as the highest beauty. The Tao Te Ching says the greatest music is distant and sparse, until it is almost silence. True strength never clamours. The Tian Xi watch takes this as its philosophy, reducing the complex to the simple and speaking of time’s nature in stillness: it does not chase display, yet through quiet companionship becomes a lasting mark upon your life. In the hush of early light or the depth of a late-night reflection, its gentle touch and understated design keep you company through every tranquil hour.' },
      { zh: '【设计哲思 · 内蕴丰盈，外显从容】真正的设计，往往根植于哲学思考与美学沉淀。本系列时计以「少即是多」为理念，追求内在的丰富性与外在的从容感相统一。它不试图以繁复夺人眼球，而是以含蓄内敛的表达，传递出时间本身的深邃与宁静。每一处细节皆经深思熟虑，旨在让佩戴者在纷繁世界中，触摸到一片属于自己的、恬淡而丰沛的「希声」之境。', en: 'Design philosophy — rich within, composed without. True design is rooted in philosophical thought and a long settling of taste. This series follows “less is more”, uniting inner richness with outward ease. It does not seek the eye through complexity, but conveys the depth and calm of time itself through reserve. Every detail is considered, so that amid a crowded world the wearer may touch a quiet, abundant realm of their own — the realm of the barely-heard.' },
      { zh: '【极简表盘】摒弃一切冗余刻度，以大量留白呼应「大音希声」的哲学意境，营造出开阔无垠的空间想象。钻石刻度如遥远星辰般精准点缀，于至简之处悄然闪耀，隐喻内在的光芒不必张扬，却始终存在。指针设计凝练利落，划过盘面如光阴无声流淌，进一步强化了纯粹宁静的阅读体验。', en: 'The minimal dial. Every superfluous marking is set aside; generous space answers the philosophy of the barely-heard sound and opens an unbounded field for the imagination. Diamond indices are placed like distant stars, glinting quietly within the simplicity — an inner light that need not announce itself, yet is always there. The hands are spare and precise, crossing the dial as time flows without a sound, deepening the pure calm of each reading.' },
      { zh: '【匠心材质】表壳采用 316L 精钢覆以 18K 白金镀层，兼具日常佩戴的坚韧性与奢华的优雅光泽，历久弥新。镜面则选用高通透蓝宝石玻璃，莫氏硬度高达 9 级，抗刮耐磨，确保读时视野始终清澈如初。内部搭载全自动机械机芯，每一个齿轮与轴承皆经精细打磨，以毫不懈怠的精密律动，默默承载着对永恒时间的敬意。', en: 'Crafted materials. The case is 316L steel plated in 18K white gold — resilient for daily wear, with a refined lustre that only deepens with time. The crystal is highly transparent sapphire, rated 9 on the Mohs scale, resisting scratches so every reading stays clear as the first. Within beats a fully automatic mechanical movement, each gear and bearing finely finished, its tireless precision a quiet tribute to enduring time.' }
    ] },
    'tian-yao-watch': { seal: '耀', lead: { zh: '形神合一，五行相生 —— 光而不耀的君子之道。', en: 'Form and spirit as one, the five elements in cycle — radiant, yet never dazzling.' }, uses: [
      { zh: '平衡自身五行，有助于身体健康', en: 'Balances your five elements; supports the body' },
      { zh: '婚姻和谐，家庭和谐', en: 'Harmony in marriage and in the household' }
    ], term: { zh: '流年手表：自开始使用起一年内有效。终身手表：不限年月。', en: 'Annual watch: one year from first use. Lifetime watch: no term.' }, meaning: [
      { zh: '【形神合一 · 五行相生】表盘布局暗合八卦方位，时标以天然钻石缀于卦象之位，喻示水火相济、动静相生。18K 金表壳聚「金」之坚贞，瑞士机芯如「水」流不息，鳄鱼皮表带取「木」之生机，蓝宝石镜面凝「土」之厚重，宝石轴承蕴「火」之光明，五行能量在方寸间循环往复，成就「万物负阴而抱阳，冲气以为和」的时空道场。', en: 'Form and spirit as one — the five elements in cycle. The dial is laid out on the eight trigrams, with natural diamonds set at each trigram’s place: water and fire in balance, stillness and motion giving rise to one another. The 18K gold case gathers the constancy of metal; the Swiss movement flows unceasing as water; the alligator strap carries the vitality of wood; the sapphire crystal holds the weight of earth; the jewelled bearings keep the light of fire. The five energies circle within a small space, making a field of time where all things carry yin and embrace yang, and are harmonised by the breath between.' },
      { zh: '【匠心至朴 · 大制不割】依「大巧若拙」之哲思，表壳以传统金匠工艺手工打磨，弃尽浮华雕饰；鳄鱼皮表带肌理承自然之道，暗合「知其雄，守其雌」的处世智慧。时标点位镶嵌天然宝石随干支流转更替，应「反者道之动」的循环法则。', en: 'Craft at its plainest — the great form is never cut apart. Following the thought that great skill seems artless, the case is hand-finished by traditional goldsmiths, every ornament set aside. The grain of the alligator strap follows nature’s way, echoing the wisdom of knowing strength while keeping to gentleness. Natural gemstones at the hour markers change with the turning of the stems and branches, answering the law that return is the movement of the Tao.' },
      { zh: '【机芯蕴道 · 无为而治】搭载瑞士超凡机芯，以「致虚极，守静笃」为魂，振频如呼吸般绵长从容。背透设计可见星辰轮系交叠运转，恰似「惚兮恍兮，其中有象」，让时间在无为的精密中自然流淌。', en: 'The Tao within the movement — governing by not forcing. An exceptional Swiss movement, its soul the attainment of utmost emptiness and steadfast stillness, beats long and unhurried as breath. Through the open caseback, the wheels turn and overlap like stars — elusive and indistinct, yet within them there is form — letting time flow of itself through effortless precision.' },
      { zh: '【佩之载德 · 光而不耀】表冠镶嵌钻石，调时如调节自身阴阳平衡。佩戴者抬手间，钻石光芒「和其光，同其尘」，18K 金辉芒含而不露，践行「光而不耀」的君子之道。', en: 'Worn with virtue — radiant, yet never dazzling. A diamond is set in the crown; to set the time is to set your own balance of yin and yang. As the wearer lifts a hand, the diamond’s light softens and mingles with the world’s dust, and the glow of 18K gold is held within — the way of the noble person, bright without glare.' }
    ] },
    'tian-jie-watch': { seal: '解', lead: { zh: '「天解」之名源自《周易》八卦卦象，象征对天地自然规律的探索与解读。', en: 'Named from the trigrams of the Book of Changes — a reading of heaven and earth’s own order.' }, uses: [
      { zh: '平衡自身五行，有助于身体健康', en: 'Balances your five elements; supports the body' },
      { zh: '婚姻和谐，家庭和谐', en: 'Harmony in marriage and in the household' }
    ], term: { zh: '流年手表：自开始使用起一年内有效。终身手表：不限年月。', en: 'Annual watch: one year from first use. Lifetime watch: no term.' }, meaning: [
      { zh: '【命名灵感 · 八卦哲思，解构时间】「天解」之名源自《周易》八卦卦象，象征对天地自然规律的探索与解读。每一次指针的律动，既是时间的流转，亦是东方哲学中「天人合一」理念的无声诠释，赋予腕表超越计时本身的文化深意。', en: 'The name — the trigrams, and time unravelled. “Tian Jie” comes from the eight trigrams of the Book of Changes, and stands for the search to read and understand the order of heaven and earth. Each movement of the hands is time passing, and also a silent expression of the Eastern ideal of heaven and humanity as one — giving the watch a meaning beyond timekeeping.' },
      { zh: '【核心配置 · 精工材质，铸就经典】\n机芯：搭载全自动机械机芯，以精密齿轮咬合驱动走时，误差控制在每日 ±5 秒内，兼具机械运转的视觉美感与持久稳定的性能。\n表壳：采用 316L 精钢基材，经电镀 18K 白金工艺处理，兼具抗腐蚀与耐磨性；40.5mm 直径设计，适配多数手腕尺寸，平衡力量感与优雅气质。\n表镜：配备高硬度蓝宝石玻璃，透光率达 99%，防刮耐磨，确保表盘清晰可见，抵御日常使用中的细微损伤。\n表带：同材质 316L 钢电镀 18K 白金表带，镶嵌天然钻石点缀链节，25×20mm 宽度设计贴合手腕，佩戴舒适且彰显奢华质感。', en: 'The essentials — fine materials, a lasting classic.\nMovement: a fully automatic mechanical movement, its precise gear train keeping time to within ±5 seconds a day — the beauty of mechanism with lasting, stable performance.\nCase: 316L steel plated in 18K white gold, resistant to corrosion and wear; a 40.5 mm diameter suits most wrists, balancing strength with elegance.\nCrystal: hard sapphire glass with 99% light transmission, scratch-resistant, keeping the dial clear against the small wear of daily life.\nBracelet: matching 316L steel plated in 18K white gold, its links set with natural diamonds; 25 × 20 mm, close to the wrist, comfortable and quietly luxurious.' }
    ] },
    'kai-tai-ring': { seal: '泰', lead: { zh: '天地交泰，万物通亨 —— 转动之间，推演天地之道。', en: 'Heaven and earth in communion, all things flowing freely — a turning that works out the way of the world.' }, uses: [
      { zh: '提升掌控力，开智', en: 'Command strengthened; the mind opened' },
      { zh: '扩财库，化煞', en: 'The treasury widened; affliction dissolved' }
    ], meaning: [
      { zh: '【设计哲学 · 以卦象为魂，铸永恒之美】「开泰」之名源自《易经》六十四卦中的泰卦，象征「天地交泰，万物通亨」的吉祥愿景。戒指整体造型以泰卦阴阳相生的曲线为基础，戒托线条如行云流水，暗合「刚柔相济」的东方哲学；可旋转式主石底座设计，则呼应《易经》「穷则变，变则通」的辩证思维，转动间仿佛推演天地之道，为佩戴者赋予生生不息的力量。', en: 'Design philosophy — the hexagram as soul, beauty made lasting. “Kai Tai” takes its name from Tai, Peace, among the sixty-four hexagrams of the Book of Changes: heaven and earth in communion, all things flowing freely. The ring is drawn from the hexagram’s curves of yin and yang giving rise to each other; the setting flows like moving cloud and water, echoing the Eastern balance of firm and yielding. The rotating centre-stone base answers the Changes’ teaching that when a way is exhausted it changes, and in changing it flows — each turn seems to work out the way of heaven and earth, lending the wearer a strength that renews without end.' },
      { zh: '【材质与宝石 · 至臻选材，璀璨共生】\n〔18K 白金 · 匠心锻造〕采用 18K 高纯度白金原料，由资深珠宝大师手工精密锻造而成，每一道工序都经过千锤百炼的匠心打磨，质地坚韧非凡，能抵御日常磨损，光泽温润柔和如丝绸般细腻，在光线下流转出低调奢华的银白色辉光，佩戴舒适且永恒经典，彰显无与伦比的工艺美学。\n〔主石 · 2.0 克拉天然钻石〕精选 2.0 克拉天然顶级钻石，源自优质矿藏，经 GIA 认证的卓越切工，每个刻面都精确对称，释放出夺目的火彩与光芒，在自然光或灯光下闪烁如星辰银河，象征着永恒的爱与璀璨梦想，为佩戴者增添无限魅力与自信。\n〔副石 · 天然钻石 × 数字宝石〕巧妙融合天然钻石与象征数字时代的创新宝石元素，采用前沿的「数字造型和宝石镶嵌」设计技术，精密建模与手工镶嵌结合，每颗副石都选自天然钻石，搭配几何化数字图案，整体结构流畅且富有层次感，完美诠释传统手工艺术与现代科技创新的深度对话，寓意着过去与未来的和谐统一，创造出独一无二的视觉艺术杰作。', en: 'Materials and stones — the finest chosen, brilliance in company.\n〔18K white gold · hand-forged〕High-purity 18K white gold, precisely hand-forged by master jewellers, each step refined through long labour. Exceptionally resilient against daily wear, its lustre soft and warm as silk, it turns a quiet, silver-white glow in the light — comfortable, enduring, and a statement of incomparable craft.\n〔Centre stone · 2.0 ct natural diamond〕A top-grade natural diamond of two carats from a fine source, its excellent cut GIA-certified, every facet precisely symmetrical. It releases vivid fire and brilliance, sparkling like the Milky Way in daylight or lamplight — a symbol of lasting love and radiant dreams, lending the wearer charm and confidence.\n〔Accent stones · natural diamonds × numbered gemstones〕Natural diamonds meet gemstone elements that speak of the digital age, through digital modelling joined with hand-setting. Every accent stone is a natural diamond, arranged with geometric numeral patterns in a flowing, layered structure — a dialogue between traditional handcraft and modern innovation, past and future in harmony, making a work of visual art like no other.' }
    ] },
    'sky-peace-watch-m': TIAN_XIANG,
    'sky-peace-watch-f': TIAN_XIANG,
    'wish-ring': { seal: '愿', uses: [
      { zh: '提升掌控力，开智', en: 'Command strengthened; the mind opened' },
      { zh: '扩财库，化煞', en: 'The treasury widened; affliction dissolved' }
    ], meaning: [
      { zh: '一克拉主钻象征心愿（即爱情、未来与自我），其坚硬纯净的质地代表心愿的坚定与美好，昭示佩戴者永葆热忱。细密钻石环绕主石，象征心愿被爱与守护所环绕；小钻代表力量，寓意追寻心愿之途不感孤寂，始终有支持相伴。戒圈蓝色珐琅为心愿提供承载空间；其上数字与钻石构成专属印记，赋予戒指独特性，使其承载情感的密码。18K 白金材质象征恒久的守护与承诺，犹如一份时光的契约，愿其所承载的心愿被珍视，历久弥新。', en: 'The one-carat centre diamond stands for a wish — for love, for the future, for the self — its hard, pure nature the firmness and beauty of that wish, and a sign that the wearer keeps their warmth. Fine diamonds circle it: the wish surrounded by love and protection; the small stones are strength, so the path toward the wish is never lonely. The blue enamel of the band gives the wish a place to rest; its numbers and diamonds form a personal mark, making the ring unique and letting it carry a code of feeling. 18K white gold stands for lasting care and promise — a covenant with time, that the wish it holds be cherished and grow only richer.' }
    ] },
    'kai-yi-ring': { seal: '颐', lead: { zh: '养正蓄力，明心启新。', en: 'Nourishing what is upright, gathering strength — a clear heart, a new start.' }, uses: [
      { zh: '提升掌控力，开智', en: 'Command strengthened; the mind opened' },
      { zh: '扩财库，化煞', en: 'The treasury widened; affliction dissolved' }
    ], meaning: [
      { zh: '这枚戒指以几何形主石座为视觉焦点，中央 0.5 克拉钻石明亮醒目，外围层层镶嵌钻石，构成如星芒环绕的六角轮廓。戒臂色彩沉静，白金边线利落分明，侧面的数字装饰为整体添上个性与辨识度。明亮与沉静、圆润与棱角相互映衬，呈现出坚定而内敛的气质。', en: 'The ring centres on a geometric setting: a bright 0.5-carat diamond at its heart, ringed by layer upon layer of diamonds in a six-pointed outline like radiating starlight. The band is calm in colour, its white-gold edges crisp and clean, and the numerals on its side give it character and identity. Brightness and calm, roundness and edge set each other off — a presence both resolute and reserved.' },
      { zh: '【山雷颐卦 · 外守其静，内蓄生机】戒指名为「开颐」。「颐」有颐养、涵养之意。《易经》六十四卦中的山雷颐卦，上艮为山、下震为雷，寓意外守其静、内蓄生机。颐卦提醒人们重视身心的养护，也关注言语、品行与心念：懂得取舍，谨慎表达，持续涵养自身，才能由内而外地成长。中央主钻如心中明灯，外围光芒层层环护，寓意守住本心、积蓄力量；戒臂则如稳固的根基，承托光芒，也象征在从容中蓄势待发。', en: 'Yi, Nourishment — still without, alive within. “Yi” means to nourish and to cultivate. In the Book of Changes, the hexagram Yi sets mountain above thunder: stillness kept outside, vitality gathered within. It asks us to tend body and mind, and to watch our words, conduct and thoughts — to choose well, speak with care and keep cultivating ourselves, so growth comes from the inside out. The centre diamond is a lamp in the heart, its surrounding light a layered guard: holding to one’s true self and gathering strength. The band is a firm foundation that carries the light — readiness held in ease.' },
      { zh: '【五行取意 · 刚柔相济】18K 白金衬托钻石的璀璨，寓意坚韧、纯粹与历久弥新。五行取意重在整体的平衡与流转。每枚戒指可因佩戴者所选的主石与配色，呈现不同的五行气韵；无论色彩如何变化，都寄寓刚柔相济、内在调和、顺势而行。这也与颐卦涵养身心、养正蓄力的意旨相映，寓意在修养与积累中找到适合自己的节奏，让心境安定、力量充盈。', en: 'The five elements — firm and yielding in balance. 18K white gold sets off the diamonds’ brilliance: resilience, purity, and a lustre that only deepens. Here the five elements are about balance and flow as a whole. Each ring takes on its own elemental character from the centre stone and colours the wearer chooses; whatever the colours, it carries firmness and gentleness in balance, inner harmony, and moving with the tide — echoing Yi’s call to nourish body and mind, finding your own rhythm in cultivation, so the heart is settled and strength is full.' },
      { zh: '愿佩戴者懂得涵养身心、谨言慎行，在日常积累中养出眼界与底气；面对选择时明辨方向，面对挑战时沉着坚定，让内在力量逐渐丰盈，最终绽放属于自己的光芒。', en: 'May the wearer tend body and mind and be careful in word and deed, growing vision and quiet confidence through daily gathering; clear in direction when choosing, calm and steady when challenged — until inner strength grows full and shines with a light of its own.' }
    ] },
    'kai-feng-ring': { seal: '丰', lead: { zh: '丰盈有成，光耀前行。', en: 'Abundance fulfilled — moving forward in light.' }, uses: [
      { zh: '提升掌控力，开智', en: 'Command strengthened; the mind opened' },
      { zh: '扩财库，化煞', en: 'The treasury widened; affliction dissolved' }
    ], meaning: [
      { zh: '这枚戒指以 1.5 克拉天然钻石为视觉焦点，主石切面璀璨，光芒汇聚。两侧镶嵌的钻石与数字宝石点缀其间，让戒身呈现丰富而有层次的细节。18K 白金的线条简洁挺拔，衬托主石的明亮，也赋予整体沉稳大气的气质。中央主石象征内心的目标与信念，环绕的光彩则寓意才华、机遇与努力彼此成就。', en: 'The ring centres on a 1.5-carat natural diamond, its facets brilliant, its light drawn together. Diamonds and numbered gemstones are set along both sides, giving the band rich, layered detail. Clean, upright lines of 18K white gold set off the centre stone and lend the whole a calm assurance. The centre stone stands for the goal and conviction within; the light around it, for talent, opportunity and effort lifting one another.' },
      { zh: '【雷火丰卦 · 光明与行动相激】「丰」寓意丰收、丰盛与充盈，寄托事业顺遂、生活富足、福气绵延的祝愿。《易经》六十四卦中的雷火丰卦，上震为雷、下离为火，象征光明与行动相互激发，也代表声名彰显、发展兴盛。丰卦带来丰盛的意象，同时提醒人在收获之时保持清醒，珍惜眼前、把握时机，让一时的成就成为长久发展的根基。', en: 'Feng, Abundance — light and action kindling each other. “Feng” means harvest, plenty and fullness: the wish for smooth work, a rich life and lasting fortune. In the Book of Changes, the hexagram Feng sets thunder above fire — light and action spurring one another, a name made known, growth in full flourish. It brings the image of abundance, and also the reminder to stay clear-headed in the hour of harvest: to cherish what is here, seize the moment, and let a passing success become the ground for lasting growth.' },
      { zh: '【主钻耀目 · 积累与助力】主钻光芒耀眼，呼应丰卦明朗奋进的气象，寓意心中有目标，前行有力量；戒臂上的宝石细节，则像一路积累的成果与助力，象征凭借努力开拓机会，以智慧经营收获。', en: 'The radiant centre — what is gathered along the way. The dazzling centre diamond answers Feng’s bright, striving spirit: a goal in the heart, strength in each step. The gemstones along the band are like the results and help gathered on the road — opportunity opened by effort, harvest tended with wisdom.' },
      { zh: '【五行取意 · 丰盛有所承载】五行的寓意不限定于某一种颜色或宝石，而着眼于整体的平衡与相融。每枚戒指都可因主石、配石与色彩的不同，呈现独特的五行气韵；无论如何搭配，都寓意调和身心、顺势而行，在蓬勃发展中保持从容，让眼前的丰盛有所承载，也能持续延展。', en: 'The five elements — abundance with something to hold it. The five elements here are not tied to one colour or stone, but to balance and blending as a whole. Each ring takes its own elemental character from its centre stone, accents and colours; however it is composed, it means harmony of body and mind and moving with the tide — staying composed amid vigorous growth, so present abundance is carried well, and keeps on extending.' },
      { zh: '愿佩戴者心怀目标、善把良机，以坚定的步伐开拓前路；让事业渐有收获，所愿逐步实现，使每一份丰盛都沉淀为长久的福气与底气。', en: 'May the wearer hold to their goals and seize good chances, opening the road with steady steps — work bearing fruit, wishes coming true one by one, and every abundance settling into lasting fortune and quiet confidence.' }
    ] },
    'fortune-ring': { seal: '福', lead: { zh: '福至心安，顺运而行。', en: 'Fortune arrives, the heart at peace — moving with good luck.' }, uses: [
      { zh: '提升掌控力，开智', en: 'Command strengthened; the mind opened' },
      { zh: '扩财库，化煞', en: 'The treasury widened; affliction dissolved' }
    ], meaning: [
      { zh: '这款戒指以明亮的黄色主石为中心，周围环绕钻石与彩色宝石，层层铺展，像光芒渐渐汇聚。14K 白金的流畅线条衬托主石的温暖色泽，戒臂上的宝石细节则为设计添上灵动与个性。无论选择蓝色、红色或其他配色，都以中央主石为焦点，呈现专属于佩戴者的幸运光彩。', en: 'The ring centres on a bright yellow stone, circled by diamonds and coloured gemstones that spread layer by layer, like light slowly gathering. Flowing lines of 14K white gold set off the stone’s warm colour, and the gems along the band add liveliness and character. Whether in blue, red or another palette, the centre stone stays the focus — a lucky glow that belongs to the wearer alone.' },
      { zh: '【福气汇聚 · 圆满相伴】主石寓意心中的希望与愿望，环绕的宝石象征一路相伴的机缘与助力；层层相围的设计，则寄托福气汇聚、好运相随之意。戒指环绕指间，也寓意圆满相伴、顺遂常在。', en: 'Fortune gathered — wholeness close at hand. The centre stone stands for the hopes and wishes of the heart; the gems around it, for the chances and help that keep you company. The layered circles carry the wish that fortune gathers and good luck follows. Encircling the finger, the ring also means wholeness at your side and things going smoothly, always.' },
      { zh: '【低谷重生 · 转机将至】象征低谷之后重新萌发的生机，也意味着新的机会与希望正在到来。以此寄托「福运」，不是期待好运凭空降临，而是相信人生有起有落，只要守住初心、积蓄力量，便能迎来转机，让福气重新汇聚，让前路再次明朗。', en: 'Renewal after the low point — the turn is coming. It stands for life sprouting again after a low point, and for new chances and hope on their way. To place “fortune” here is not to wait for luck to fall from the sky, but to trust that life rises and falls — and that by keeping to your first intentions and gathering strength, the turn will come: fortune gathers again, and the road ahead grows clear.' },
      { zh: '【五行取意 · 福气绵延】黄色主石如初升的暖光，寄托希望与信心；层叠的宝石则像福运渐次汇聚，寓意机缘相逢、喜事相伴。五行取意不固定对应某一种颜色或宝石，而重在整体协调与流转。戒指可依佩戴者所选的宝石与配色，呈现不同的五行气韵；无论如何搭配，都寓意顺应自身节奏、保持内在平衡，让好运有所承接，让福气绵延相伴。', en: 'The five elements — fortune that lasts. The yellow stone is like warm early light, carrying hope and confidence; the layered gems are fortune gathering step by step — chances met, glad events close by. The five elements here are not fixed to one colour or stone, but to harmony and flow as a whole. Each ring takes its own elemental character from the stones and colours chosen; however composed, it means following your own rhythm and keeping inner balance, so good luck has a place to land and fortune stays long beside you.' },
      { zh: '愿佩戴者心怀希望，珍惜每一次相遇与机会；即使经历起伏，也能积蓄力量、迎来新机。愿福运常伴左右，生活渐入佳境，所行皆顺，所盼有期。', en: 'May the wearer keep hope, and cherish every meeting and every chance; through rises and falls, may they gather strength and meet new opportunity. May fortune stay close, life grow ever better, every step go smoothly, and every hope find its day.' }
    ] },
    'kai-qian-ring': { seal: '谦', lead: { zh: '虚怀有节，步步进益。', en: 'An open heart with firm joints — gaining, step by step.' }, uses: [
      { zh: '提升掌控力，开智', en: 'Command strengthened; the mind opened' },
      { zh: '扩财库，化煞', en: 'The treasury widened; affliction dissolved' }
    ], meaning: [
      { zh: '这枚戒指取意于竹节，环绕指间的节段设计错落有致，线条圆润中带着挺拔，呈现出竹子的清雅与韧性。18K 黄金散发温润光泽，宝石与钻石点缀其间，为整体添上明亮而灵动的色彩。金色与彩石相映，既显雅致，也寓意珍贵的品格与丰硕的收获。', en: 'The ring takes its meaning from bamboo joints: segments circle the finger in a lively rhythm, their lines rounded yet upright, carrying bamboo’s grace and resilience. 18K gold gives a warm glow, and gemstones and diamonds set among the segments add bright, lively colour. Gold and coloured stone together are elegant, and speak of precious character and a rich harvest.' },
      { zh: '【竹之品格 · 节节向上】竹在中华文化中象征虚心、坚韧与有节。竹节相连，寓意积累与成长，步步向上；竹身中空而有节，则寄托谦逊自持、心有所守。戒指环绕成圆，象征圆融相伴、福气常在，也祝愿每一步努力都能沉淀为成长与收获。', en: 'The character of bamboo — rising joint by joint. In Chinese culture bamboo stands for an open mind, resilience and integrity. Its joined segments mean accumulation and growth, rising step by step; hollow yet jointed, it carries humility, self-possession and a heart that holds to something. Closed in a circle, the ring means harmony and lasting fortune, and the wish that every effort settles into growth and harvest.' },
      { zh: '【地山谦卦 · 藏锋于谦和】「开谦」呼应《易经》六十四卦中的地山谦卦。上坤为地、下艮为山，高山蕴于大地之下，寓意才华与实力不显于骄矜，而藏于谦和与笃实之中。谦卦所倡导的，是有能力而不自满，有收获仍知进取。懂得自省与学习，便能不断精进；以宽厚待人，也更容易凝聚善缘与助力。', en: 'Qian, Modesty — strength kept within humility. “Kai Qian” answers the hexagram Qian in the Book of Changes: earth above, mountain below — a high mountain held beneath the ground. Talent and strength are not shown in pride, but kept within modesty and steadiness. Qian teaches ability without complacency, and striving still after success. Reflect and keep learning, and you keep improving; treat others generously, and good ties and help gather more easily.' },
      { zh: '【五行取意 · 内外平衡】五行寓意不局限于某一种颜色或宝石，而着眼于整体的协调与流转。戒指可依佩戴者所选的宝石和配色，呈现不同的五行气韵；无论色彩如何变化，都寄寓刚柔相济、内外平衡。以黄金为底，彩石添意，如竹向上生长而根基稳固，象征谦和待人、坚定前行。', en: 'The five elements — balance within and without. The five elements here are not limited to one colour or stone, but to harmony and flow as a whole. Each ring takes its own elemental character from the stones and colours chosen; however the colours change, it carries firmness and gentleness in balance, inner and outer in harmony. Gold beneath, coloured stones adding meaning — like bamboo growing upward on firm roots: kindness toward others, steadiness going forward.' },
      { zh: '愿佩戴者常怀谦逊之心，也不失向上的力量；在积累中增长才华，在善意中广结良缘，让事业与生活如竹节般步步延伸、节节有成。', en: 'May the wearer keep a humble heart without losing the strength to rise; growing in talent through gathering, forming good ties through kindness — so work and life extend like bamboo, step by step, each joint a success.' }
    ] },
    'kai-yu-ring': { seal: '豫', lead: { zh: '心生喜悦，蓄势向前。', en: 'Joy in the heart, strength gathered for the road ahead.' }, uses: [
      { zh: '提升掌控力，开智', en: 'Command strengthened; the mind opened' },
      { zh: '扩财库，化煞', en: 'The treasury widened; affliction dissolved' }
    ], meaning: [
      { zh: '这枚戒指以宽阔挺括的戒臂呈现沉稳大气的轮廓，顶部铺镶的钻石如星光汇聚，明亮夺目；侧边的色彩与数字装饰则为简洁的白金线条添上鲜明个性。18K 白金映衬钻石与锆石的光泽，整体既有坚定利落之感，也不失喜悦灵动的气息。', en: 'A broad, structured band gives the ring a calm, assured outline. Diamonds pavé-set across the top gather like starlight, bright and striking; colour and numerals along the sides give the clean white-gold lines a distinct character. 18K white gold sets off the shine of diamonds and zircon — resolute and crisp, yet full of lively joy.' },
      { zh: '【雷地豫卦 · 春雷萌发】「豫」有愉悦、安和之意，也含有预备、顺势而动的智慧。《易经》六十四卦中的雷地豫卦，上震为雷、下坤为地，象征春雷响动、大地萌发，万物由静而动、生机渐起。豫卦寓意心境舒展、众心相和，也提醒人在行动之前有所准备，在顺境之中保持清醒。戒指顶部汇聚的钻石，仿佛光芒与力量凝于一处；侧边鲜明的色彩，则如春日新生的活力，寓意心中有喜悦，脚下有方向，准备好迎接新的机遇。', en: 'Yu, Enthusiasm — spring thunder, the earth awakening. “Yu” means joy and ease, and also the wisdom of preparing and moving with the tide. In the Book of Changes, the hexagram Yu sets thunder above earth: spring thunder sounding, the earth stirring, all things moving from stillness as life rises. Yu means a heart at ease and many hearts in accord, and reminds us to prepare before acting and stay clear-headed when things go well. The diamonds gathered on top are light and strength drawn into one; the bright colours at the sides are the fresh vigour of spring — joy in the heart, direction underfoot, ready for new opportunity.' },
      { zh: '【喜悦和合 · 渐入佳境】在中华文化中，喜悦不仅是当下的欢欣，也意味着心气舒展、人际和合、万事渐入佳境。戒指环绕指间，寓意将这份愉悦与祝福长久相伴；钻石层层相映，则象征美好愿望逐渐汇聚，努力与机缘彼此成全。画面中的黄色点缀带来明朗温暖之感，寄托光明、希望与丰足的祝愿。', en: 'Joy and accord — things growing ever better. In Chinese culture joy is not only present happiness; it also means an open spirit, harmony among people, and all things improving. Encircling the finger, the ring keeps that joy and blessing close for long; its layered diamonds stand for good wishes gathering, effort and chance completing each other. Touches of yellow bring brightness and warmth — the wish for light, hope and plenty.' },
      { zh: '【五行取意 · 喜悦中蓄力】五行取意不固定对应某一种颜色或宝石，而重在整体的协调与流转。戒指可因佩戴者所选的色彩与宝石搭配，呈现不同的五行气韵；无论如何选择，都寓意内在平衡、顺势而行，让心境与行动相互呼应，在喜悦中蓄力，在准备中把握时机。', en: 'The five elements — gathering strength in joy. The five elements here are not fixed to one colour or stone, but to harmony and flow as a whole. Each ring takes its own elemental character from the colours and stones chosen; however chosen, it means inner balance and moving with the tide — heart and action answering each other, strength gathered in joy, the moment seized through preparation.' },
      { zh: '愿佩戴者心怀喜悦，遇事从容；既能享受当下的美好，也能为未来积蓄力量，在合适的时机勇敢启程，让好运与好心情一路相随。', en: 'May the wearer keep joy in the heart and meet each matter with ease — enjoying the good of the present while gathering strength for the future, setting out bravely at the right moment, with good luck and good spirits all the way.' }
    ] },
    'kai-heng-ring': { seal: '恒', lead: { zh: '恒心相守，长久相伴。', en: 'Constancy kept — companions for the long road.' }, uses: [
      { zh: '提升掌控力，开智', en: 'Command strengthened; the mind opened' },
      { zh: '扩财库，化煞', en: 'The treasury widened; affliction dissolved' }
    ], meaning: [
      { zh: '这款戒指由一对相互呼应的戒圈组成，环身以 18K 玫瑰金打造，色泽温润柔和。戒面分段镶嵌钻石与彩色宝石，红、绿、蓝等色彩点缀其间，像不同的心意彼此交织，也让戒指在典雅金色中展现鲜明个性。两枚戒圈相互映照、彼此成全，寓意缘分相连、心意相通，适合寄托伴侣之间的承诺，也象征珍贵关系中的陪伴与信任。', en: 'The ring is a pair of bands that answer one another, made in 18K rose gold of a soft, warm tone. Diamonds and coloured gemstones are set in sections across the face — red, green, blue — like different feelings woven together, giving the elegant gold a distinct character. The two bands reflect and complete each other: a bond joined, hearts in tune. A fitting vessel for a promise between partners, and a sign of companionship and trust in a precious relationship.' },
      { zh: '【雷风恒卦 · 变中守恒】「恒」意为长久、持守。《易经》六十四卦中的雷风恒卦，上震为雷、下巽为风，雷动风行，象征天地间持续不息的运行。恒卦所讲的并非一成不变，而是在变化中守住方向，在日常相伴中保持初心。戒圈连绵成环，正呼应恒久之意；戒面不同色彩彼此映衬，则寓意相处虽有各自的性情与节奏，仍能以理解、信任与包容相互陪伴。', en: 'Heng, Duration — constancy within change. “Heng” means lasting and holding fast. In the Book of Changes, the hexagram Heng sets thunder above wind: thunder moves, wind follows — the unceasing motion of heaven and earth. Heng does not mean never changing, but holding direction within change and keeping first intentions through daily companionship. The unbroken circle of the bands answers that constancy; the different colours on their face mean that though each has their own temperament and rhythm, they can still keep each other company with understanding, trust and tolerance.' },
      { zh: '【长长久久 · 历久弥珍】在中华文化中，「恒心」是成事与立身的重要品格，「长长久久」也寄托着人们对情谊、家庭与事业的美好祝愿。玫瑰金的温暖光泽象征真挚而珍贵的情感，钻石寓意坚定与恒久，彩色宝石则寄托生活中的丰富、喜悦与生机。不同材质与色彩相聚于戒圈之上，寓意珍惜彼此，也珍惜共同走过的每一段时光。', en: 'Long and lasting — more precious with time. In Chinese culture perseverance is a core virtue for achievement and character, and “long and lasting” carries the good wishes people hold for friendship, family and work. The warm glow of rose gold stands for sincere, precious feeling; the diamonds for steadfastness and permanence; the coloured stones for richness, joy and vitality in life. Different materials and colours meeting on the bands mean cherishing each other, and every stretch of time walked together.' },
      { zh: '【五行取意 · 相伴中共同成长】五行取意不固定对应某一种颜色或宝石，而着眼于整体的协调与流转。戒指可依佩戴者选择的宝石与配色，呈现不同的五行气韵；无论如何搭配，都寄寓刚柔相济、相互扶持，在变化中保持和谐，在相伴中共同成长。', en: 'The five elements — growing together side by side. The five elements here are not fixed to one colour or stone, but to harmony and flow as a whole. Each ring takes its own elemental character from the stones and colours chosen; however composed, it carries firmness and gentleness in balance and mutual support — harmony kept through change, growth shared through companionship.' },
      { zh: '愿佩戴者心有所守、情有所依；以真诚经营关系，以恒心面对人生，让珍贵的情谊历久弥新，让共同的道路越走越稳、越走越远。', en: 'May the wearer have something to hold to and someone to lean on; tending relationships with sincerity and meeting life with constancy — so precious bonds grow only richer, and the road walked together grows steadier and longer.' }
    ] },
    'wisdom-ring': { seal: '乾', lead: { zh: '乾健笃行，智启新程。', en: 'Vigorous and steadfast — wisdom opening a new road.' }, uses: [
      { zh: '提升掌控力，开智', en: 'Command strengthened; the mind opened' },
      { zh: '扩财库，化煞', en: 'The treasury widened; affliction dissolved' }
    ], meaning: [
      { zh: '这枚戒指以饱满圆润的戒面呈现沉稳大气的轮廓，深蓝色底面衬托白金纹饰与宝石点缀，线条交错回旋，仿佛流转不息的气韵。14K 白金的明亮质感与宝石的光彩相映，让整体既有内敛的深度，也显出鲜明的个性。宽阔的戒面寓意胸怀与格局，环绕指间的造型则寄托圆融相续、力量绵延之意。', en: 'A full, rounded face gives the ring a calm, assured outline. Deep blue beneath sets off white-gold tracery and gemstone accents, their lines crossing and turning like energy that never stops flowing. The bright finish of 14K white gold answers the gems’ light — reserved in depth, distinct in character. The broad face stands for breadth of heart and vision; its circle around the finger, for continuity and strength that carries on.' },
      { zh: '【乾为天卦 · 刚健开创】戒指名为「开乾」，与《易经》六十四卦之首的乾为天卦相呼应。乾卦六爻皆阳，象征刚健、自强与开创，蕴含天行不息、奋发向前的精神。戒面纹饰层层展开，犹如思路不断延伸、智慧彼此启发；宝石点缀其间，则像灵感与机遇闪现，寓意以清醒的判断看准方向，以坚定的行动开启新局。', en: 'Qian, Heaven — strength that creates. “Kai Qian” answers Qian, the first of the sixty-four hexagrams in the Book of Changes. All six of its lines are yang: vigour, self-reliance and creation — the spirit of heaven moving without rest, pressing ever forward. The tracery unfolds layer by layer, like thought extending and ideas sparking one another; the gemstones among it are flashes of insight and opportunity — seeing the way with clear judgement, opening a new chapter with resolute action.' },
      { zh: '【持正守中 · 审时度势】在中华文化中，「乾」代表天道运行，也象征自立、自强与担当。乾卦的力量并非一味强进，更重视顺时而动、持正守中：有志向，也有分寸；敢于开创，也懂得审时度势。宽阔的戒面与流动的纹饰相结合，正寄托着外有行动力、内有思考力，既能把握机遇，也能稳住方向的祝愿。', en: 'Upright and centred — reading the moment. In Chinese culture “Qian” is the course of heaven, and also independence, self-strengthening and responsibility. Its strength is not blind advance: it values moving with the times and keeping upright and centred — ambition with measure, the courage to begin with the sense to judge the hour. The broad face and flowing tracery together carry the wish for action without and thought within: seizing opportunity while holding the course.' },
      { zh: '【五行取意 · 刚柔相济】五行取意不固定对应某一种颜色或宝石，而重在整体的协调与流转；可依佩戴者选择的材质、宝石与配色，呈现不同的五行气韵。无论如何搭配，都寓意刚柔相济、内外平衡，让坚定的力量与灵活的智慧相辅相成。', en: 'The five elements — firm and yielding in balance. The five elements here are not fixed to one colour or stone, but to harmony and flow as a whole; each ring takes its own elemental character from the materials, stones and colours chosen. However composed, it means firmness and gentleness in balance, inner and outer in harmony — steadfast strength and nimble wisdom completing each other.' },
      { zh: '愿佩戴者心有远见、行有定力，在变化中洞察方向，在挑战中不断精进；以智慧开启机遇，以行动成就所愿。', en: 'May the wearer see far and act with steadiness, finding direction amid change and growing through every challenge — opening opportunity with wisdom, and fulfilling every wish through action.' }
    ] },
    'kai-jian-pendant': { seal: '渐', lead: { zh: '以竹为形，以渐为意 —— 愿这份渐进的力量，成为您命理中的转圜之钥。', en: 'Bamboo for its form, gradual progress for its meaning.' }, uses: [
      { zh: '运势节节高升，贵人相助', en: 'Fortune rising by degrees, with help at each step' },
      { zh: '福禄安康，平安吉祥', en: 'Blessing, emolument, health and auspice' }
    ], meaning: [
      { zh: '天地之气聚而成形，时光在竹节间静静流转。「开渐」竹节吊坠，以竹为形，以渐为意，融汇五行之妙，助您在从容中开启循序渐进的气运流转。愿这份「渐进的力量」成为您命理中的转圜之钥，让美好从当下开始，向未来生长。', en: 'The energy of heaven and earth converges into form, as time flows quietly through bamboo segments. The Kaijian bamboo pendant takes bamboo for its form and gradual progress for its meaning, drawing on the wisdom of the five elements to set auspicious energy flowing, step by steady step. May this power of gradual progress become a key of transformation in your destiny — beauty beginning now, and growing toward the future.' },
      { zh: '【竹通天地 · 渐入佳境】开渐吊坠深得竹之灵韵，形通天地，意合阴阳。竹节中空，象征虚怀若谷，可纳八方吉气；节节相连，寓意气运贯通，暗合「渐入佳境」的人生智慧。其造型修长挺拔，线条流转间既有竹之清雅风骨，又以现代极简设计重塑，将「循序渐进」的祝福凝于方寸。', en: 'Bamboo connects heaven and earth — progressing to better states. The pendant captures bamboo’s spirit: a form joining heaven and earth, a meaning harmonising yin and yang. Hollow segments stand for an open mind, receiving auspicious energy from every direction; joined segments stand for fortune flowing unbroken. Slender and upright, it keeps bamboo’s quiet integrity, reinterpreted in modern minimal line — the blessing of steady progress held within a small space.' },
      { zh: '抬眼时，引动向上生机，开创人生新局；垂首间，稳固当下根基，守候佳境将至。', en: 'Looking up, it stirs rising vitality and opens a new chapter; looking down, it steadies the ground beneath you while better days approach.' },
      { zh: '【五行俱全 · 气场自生】以 18K 金为基（土），生金质镶边之金；金生翡翠 / 紫晶之水，水生竹形之木，木生钻石之火，火生金质之土，循环相生，气场自转。注入「渐入佳境」之灵念，底部暗藏太极图案，可自行引导气场运转。佩戴于胸前膻中穴，可助打通气脉，调节个人小宇宙与天地大宇宙的和谐共振。', en: 'The five elements complete — a self-generating field. 18K gold is the foundation (earth), giving rise to the metal of the gold edging; metal gives rise to the water of jade or amethyst, water to the wood of the bamboo form, wood to the fire of the diamonds, fire to the earth of the gold — each generating the next, the field turning of itself. A hidden taiji at its base guides the flow. Worn at the Danzhong point on the chest, it helps open the channels, bringing the personal microcosm into resonance with the greater cosmos.' },
      { zh: '感谢结缘，愿此坠助您：运如翠竹节节高升，气若祥云渐入佳境，在沉淀中积累，在从容中绽放。', en: 'With thanks for this meeting — may it help your fortune rise like green bamboo, segment by segment, your energy drift like auspicious clouds toward better days: gathering in stillness, blossoming at ease.' }
    ] },
    'kai-meng-pendant': { seal: '蒙', uses: [
      { zh: '开智启蒙，好事自「生」', en: 'Clarity awakened — good things come to be' }
    ], lead: { zh: '花生，即「好事发生」的吉兆 —— 让美好从颈间开始，向生活生长。', en: 'The peanut, an omen that good things will happen — beauty beginning at the throat, and growing into life.' }, meaning: [
      { zh: '夏风携着希望拂过，总有好事在悄然酝酿——今日，以一枚「开蒙」花生吊坠，为您珍藏这份「好事发生」的期待，让美好从颈间开始，向生活生长。', en: 'A summer breeze passes, carrying hope; something good is always quietly taking shape. Today the Kai Meng peanut pendant keeps that expectation of good things happening for you — beauty beginning at the throat, and growing into life.' },
      { zh: '【花生有灵 · 好事自「生」】开蒙吊坠以「花生」为核心意象，取其「化生」谐音，更暗含「好事生」的巧思——花生，即「好事发生」的吉兆。圆润饱满的造型如一颗待启的幸运种子，线条流转间既有传统纹样的质朴灵动，又以现代极简设计重塑，将「好事将至」的期待凝于方寸之间。无论是日常穿搭的温柔点缀，还是重要时刻的仪式感加持，它都是一份会「说话」的幸运符号：抬眼望时，是「好事快来了」的温柔提醒；垂首间，是「好事已发生」的安心笃定。', en: 'The peanut has a spirit — good things come to be. The pendant takes the peanut as its image: its name sounds as “coming into being”, and hides the wish that good things arise — the peanut as an omen of good things happening. Round and full like a lucky seed about to open, its flowing lines keep the simple liveliness of traditional pattern, remade in modern minimal form, holding the promise of good things to come within a small space. A gentle accent for every day, or a touch of ceremony for the moments that matter, it is a lucky sign that speaks: looking up, a soft reminder that good things are on their way; looking down, the calm certainty that they have already come.' },
      { zh: '【至臻材质 · 为幸运加码】开蒙吊坠以 14K 黄金为基底，色泽温润如光，轻盈贴肤却不失贵气，正如「好事」的降临——温暖而不沉重，珍贵却不刻意。主石选用天然玛瑙，或暖橙似朝阳初升，或冰白如月光落肩，每一枚的天然纹理都是独属的「幸运密码」；更以碎钻与彩宝（蓝宝 / 粉晶可选）环绕镶嵌，钻石的星芒与宝石的柔色交织，像极了好事发生时「高光与温柔并存」的模样，连细节都在为「幸运」加码。', en: 'The finest materials — luck, compounded. The pendant is set in 14K gold, warm as light, light on the skin yet quietly precious — as good things arrive: warm but never heavy, precious but never forced. The centre stone is natural agate, warm orange like the rising sun or ice-white like moonlight on the shoulder, each natural grain its own code of luck. Around it, small diamonds and coloured stones (sapphire or rose quartz, as you choose) — diamond sparkle woven with soft colour, like the moment good things happen, brilliance and tenderness together. Even the details add to the luck.' }
    ] },
    'kai-cui-pendant': { seal: '萃', uses: [
      { zh: '增长智慧', en: 'Wisdom increased' },
      { zh: '聚财、聚福、聚人气', en: 'Gathers wealth, blessing and people' },
      { zh: '守财兴业', en: 'Guards wealth; raises the enterprise' }
    ], lead: { zh: '萃集财富与福缘 —— 聚而能守，珍惜所得。', en: 'Gathering wealth and good fortune — held once gathered, cherished once gained.' }, meaning: [
      { zh: '【钱袋盈满 · 萃集财富与福缘】这枚吊坠以一只饱满的钱袋为造型，袋口束起、珍宝盈满，寓意财富有所聚、福气有所归。18K 金的温润光泽，映衬钻石的璀璨与宝石、玛瑙的缤纷色彩，仿佛把珍贵之物与美好机缘一一汇聚，珍藏于袋中。', en: 'A full purse — gathering wealth and good fortune. The pendant takes the form of a full money purse, its mouth drawn closed and brimming with treasure: wealth that gathers, blessing that comes home. The warm lustre of 18K gold sets off the brilliance of diamonds and the many colours of gemstones and agate, as if every precious thing and every good chance were gathered one by one and kept within.' },
      { zh: '【泽地萃卦 · 聚而能守】「萃」有汇集、聚合之意。《易经》中的泽地萃卦，象征人心相聚、贤才会合、资源汇集。萃集的不只是财富，也包括贵人、机遇、智慧与善缘。袋口有束，寓意聚而能守、珍惜所得；袋身丰盈，寄托积累有成、生活富足的美好愿望。', en: 'Cui, Gathering — held once gathered. “Cui” means to gather and draw together. In the Book of Changes, the hexagram Cui — lake over earth — stands for hearts drawn together, the worthy meeting, resources assembled. What it gathers is not wealth alone, but benefactors, opportunity, wisdom and good ties. The drawn mouth of the purse means holding what is gathered and cherishing what is gained; its full body carries the wish for accumulation fulfilled and a life of plenty.' },
      { zh: '【五行取意 · 丰盛相聚】五行取意中，18K 金象征珍贵、价值与财气；钱袋饱满厚实，寓意承载丰足、根基稳固；宝石与玛瑙的多彩光泽，则为设计添上生机与丰盛，也寓意不同的福缘与收获汇聚一处。', en: 'The five elements — abundance gathered. In the five elements, 18K gold stands for preciousness, value and the energy of wealth; the full, solid purse for plenty carried and foundations made firm; the many-coloured glow of gemstones and agate brings vitality and abundance, and many kinds of fortune and harvest gathered in one place.' },
      { zh: '【以诚聚福 · 绵长相伴】萃卦也提醒我们，长久的丰盛离不开诚信与善意。以诚待人，才能凝聚人心；踏实经营，方能把握机遇；懂得珍惜与分享，所聚之福才能绵长相伴。', en: 'Fortune gathered through sincerity — and kept for long. Cui also reminds us that lasting abundance depends on honesty and goodwill. Treat others sincerely, and hearts gather; work steadily, and opportunity is grasped; know how to cherish and to share, and the fortune gathered stays long beside you.' },
      { zh: '愿佩戴者开拓财路、广结善缘，汇聚良机与贵人助力；让每一份努力都有收获，让每一份所得都能安稳留存。', en: 'May the wearer open new paths to wealth and form many good ties, gathering fine chances and the help of benefactors — so that every effort bears fruit, and everything gained is kept safe.' }
    ] },
    'kai-he-wg-pendant': { seal: '合', uses: [
      { zh: '合运，合财，补缺失数字', en: 'Joins fortune and wealth; completes the missing numbers' },
      { zh: '吸引高端贵人，家和万事兴', en: 'Draws high benefactors — a harmonious house prospers' }
    ], ...KAI_HE_MEANING },
    'kai-he-yg-pendant': { seal: '合', uses: [
      { zh: '合运，合财，补缺失数字', en: 'Joins fortune and wealth; completes the missing numbers' },
      { zh: '吸引高端贵人，家和万事兴', en: 'Draws high benefactors — a harmonious house prospers' }
    ], ...KAI_HE_MEANING },
    'tong-ren-earring': { seal: '同', uses: [
      { zh: '与人和谐，吸引志同道合的人', en: 'Concord with others; draws the like-minded' },
      { zh: '有贵人运', en: 'Benefactors near at hand' }
    ] },
    'tong-you-earring': { seal: '有', uses: [
      { zh: '招财纳福', en: 'Wealth drawn in, blessing received' },
      { zh: '锁爱成双', en: 'Love locked in pairs' }
    ], lead: { zh: '承自然造化之精粹，立永恒美学之典范。', en: 'The essence of nature’s making, a lasting standard of beauty.' }, meaning: [
      { zh: '承自然造化之精粹，立永恒美学之典范。本品采用 14K 黄金铸造工艺，历经岁月磨砺仍保持光泽稳定性，与人体肌肤接触具备良好的生物相容性。主石遴选符合国际认证标准的天然钻石，配镶天然宝石形成视觉层次。采用三维立体镂空结构，结合精密机械爪镶系统，通过德国精密微雕技术成型，耳饰悬垂部经流体力学优化设计，实现艺术审美与实用功能的统一。', en: 'The essence of nature’s making, a lasting standard of beauty. Cast in 14K gold, the piece keeps its lustre through the years and sits kindly against the skin. The centre stones are natural diamonds of internationally certified standard, joined by natural gemstones for depth of colour. A three-dimensional openwork structure and a precise claw-setting system are formed with German micro-engraving; the drop is shaped by fluid-dynamic design — artistry and function as one.' },
      { zh: '每一枚耳环均采用定制化设计流程，其数字与宝石的颜色经由精密镶嵌工艺实现，构成具有不可复制的专属标识。', en: 'Every pair follows a bespoke design process: its numbers and the colours of its stones are realised through precise setting, forming a personal mark that cannot be copied.' }
    ] },
    'board-165': { seal: '衡', uses: [
      { zh: '个人环境与居家环境，平衡五行', en: 'Balances the five elements of person and dwelling' },
      { zh: '解决水火冲', en: 'Resolves the clash of water and fire' }
    ] },
    'board-57': { seal: '迎', uses: [
      { zh: '吸引五大洋、七大洲的贵人', en: 'Benefactors from every ocean and continent' },
      { zh: '做生意、有店面公司企业者，吸引客流量，增加人气', en: 'For shop, office and enterprise — footfall and vitality' }
    ] },
    'board-96': { seal: '守', uses: [
      { zh: '留财，守财', en: 'Retains wealth; guards what has been gathered' }
    ], note: { zh: '必须自身没有债务，方可配置。特殊情况不建议使用。', en: 'Only for those carrying no debt. Not advised in special circumstances.' } },
    'board-63': { seal: '速', uses: [
      { zh: '财富加速器', en: 'The wealth accelerator' }
    ] },
    'jiu-he': { seal: '静', uses: [
      { zh: '调整和平衡内心的积极力量', en: 'Steadies and balances the positive force within' },
      { zh: '更乐观地面对工作与生活，享受宁静与愉悦', en: 'Work and life met with calm — quiet and gladness kept' }
    ] },
    'dragon-board': { seal: '龙', uses: [
      { zh: '吸财，引财，催财，聚财并存', en: 'Draws, calls, quickens and gathers wealth' },
      { zh: '镇宅，化煞', en: 'Settles the dwelling; dissolves affliction' },
      { zh: '有助于居家穿堂煞的问题', en: 'Answers the through-draught affliction of the home' }
    ] }
  };

  const CAT = {
    watches: { seal: '衡', uses: [
      { zh: '平衡自身五行，有助于身体健康', en: 'Balances your five elements; supports the body' },
      { zh: '婚姻和谐，家庭和谐', en: 'Harmony in marriage and in the household' }
    ], term: { zh: '流年手表：自开始使用起一年内有效。终身手表：不限年月。', en: 'Annual watch: one year from first use. Lifetime watch: no term.' } },
    rings: { seal: '掌', uses: [
      { zh: '提升掌控力，开智', en: 'Command strengthened; the mind opened' },
      { zh: '扩财库，化煞', en: 'The treasury widened; affliction dissolved' }
    ] },
    bracelets: { seal: '和', uses: [
      { zh: '平衡五行，有助于身体健康', en: 'Balances the five elements; supports the body' },
      { zh: '适合老人、小孩', en: 'Suited to elders and to children' }
    ] }
  };

  // Grouped by what the wearer is seeking — the 器之用 overview.
  const GROUPS = [
    { seal: '财', zh: '招财聚财', en: 'Wealth · drawn, gathered, kept', lead: 'kai-cui-pendant', items: [
      { id: 'dragon-board', zh: '吸财，引财，催财，聚财并存', en: 'Draws, calls, quickens and gathers wealth' },
      { id: 'kai-cui-pendant', zh: '聚财、聚福、聚人气，守财兴业', en: 'Gathers wealth, blessing and people; sustains the enterprise' },
      { id: 'board-63', zh: '财富加速器', en: 'The wealth accelerator' },
      { id: 'board-96', zh: '留财，守财', en: 'Retains and guards wealth', flag: { zh: '须无债务', en: 'No debt' } },
      { id: 'tong-you-earring', zh: '招财纳福 · 锁爱成双', en: 'Wealth and blessing drawn in; love locked in pairs' }
    ] },
    { seal: '贵', zh: '贵人助力', en: 'Benefactors · patronage and passage', items: [
      { id: 'qian-kun-pendant', zh: '吸引贵人，挡小人，补缺失数', en: 'Draws benefactors, turns aside the petty, completes what is missing' },
      { id: 'lucky-noble-pendant', zh: '开运转运，吸引高层贵人，官运亨通', en: 'Turns fortune; draws senior benefactors' },
      { id: 'board-57', zh: '吸引五大洋七大洲的贵人；店面公司增加客流与人气', en: 'Benefactors from every ocean and continent; footfall for the premises' },
      { id: 'kai-he-wg-pendant', zh: '合运，合财，家和万事兴', en: 'Joins fortune and wealth; a harmonious house prospers' },
      { id: 'kai-jian-pendant', zh: '运势节节高升，贵人相助', en: 'Fortune rising by degrees, with help at each step' },
      { id: 'tong-ren-earring', zh: '与人和谐，吸引志同道合的人', en: 'Concord with others; draws the like-minded' }
    ] },
    { seal: '衡', zh: '健康平衡', en: 'Balance · the five elements and the body', lead: 'tian-heng-watch', items: [
      { id: 'tian-heng-watch', zh: '平衡自身五行，身体健康，婚姻和谐', en: 'Balances the elements; health and marital harmony' },
      { id: 'cat:bracelets', zh: '平衡五行，有助于身体健康；适合老人、小孩', en: 'Balance for the body — suited to elders and children' },
      { id: 'board-165', zh: '个人与居家环境平衡五行，解决水火冲', en: 'Balances the room; resolves the clash of water and fire' },
      { id: 'jiu-he', zh: '调整和平衡内心的积极力量', en: 'Steadies the inner ground' }
    ] },
    { seal: '镇', zh: '家宅镇煞', en: 'The dwelling · warded and settled', items: [
      { id: 'dragon-board', zh: '镇宅，化煞，有助于穿堂煞的问题', en: 'Settles the house; dissolves the through-draught affliction' },
      { id: 'board-165', zh: '平衡居家五行，解决水火冲', en: 'Balances the home; resolves water against fire' },
      { id: 'board-57', zh: '店面、公司、企业的人气与客流', en: 'Footfall and vitality for shop, office and enterprise' }
    ] },
    { seal: '智', zh: '智慧事业', en: 'Wisdom · mastery and enterprise', items: [
      { id: 'cat:rings', zh: '提升掌控力，开智，扩财库，化煞', en: 'Command, clarity, a wider treasury, affliction dissolved' },
      { id: 'kai-yuan-pendant', zh: '事业圆满，吸引高端贵人，人际和谐', en: 'A complete career; high benefactors; concord among people' },
      { id: 'kai-meng-pendant', zh: '开智启蒙，好事自「生」', en: 'Clarity awakened — good things come to be' },
      { id: 'kai-cui-pendant', zh: '增长智慧，守财兴业', en: 'Wisdom increased; the enterprise sustained' }
    ] },
    { seal: '合', zh: '姻缘和合', en: 'Union · concord and the household', items: [
      { id: 'kai-he-yg-pendant', zh: '合运，合财，家和万事兴', en: 'Fortune joined, wealth joined — the house at peace' },
      { id: 'tong-you-earring', zh: '招财纳福 · 锁爱成双', en: 'Blessing drawn in; love locked in pairs' },
      { id: 'perfectly-justifiable-named', zh: '补后代五福临门，身体健康，带来好运', en: 'Five blessings at the door for those who follow' },
      { id: 'zodiac-pendant', zh: '利用三合局提升运势，加强能量', en: 'Raises fortune through the triple-harmony formation' }
    ] }
  ];

  window.EFFICACY = P;
  window.EFFICACY_CAT = CAT;
  window.EFFICACY_GROUPS = GROUPS;
  window.efficacyFor = function (product) {
    if (!product) return null;
    return P[product.id] || CAT[product.cat] || null;
  };
})();
