// precepts.js — content for 观想法则 / The Nine Precepts of Visualization.
// Each string is a 4-language object (en / zh-CN / zh-TW / ms). The page picks
// per active language; zh (generic) maps to zh-CN.
window.PRECEPTS_META = {
  eyebrow: { en: 'On Contemplation · By Practice', 'zh-CN': '观 想 · 心 法', 'zh-TW': '觀 想 · 心 法', ms: 'Tentang Renungan · Dengan Amalan' },
  titleEn: { en: 'The Nine Precepts', 'zh-CN': 'The Nine Precepts', 'zh-TW': 'The Nine Precepts', ms: 'The Nine Precepts' },
  titleSub: { en: 'of Visualization', 'zh-CN': 'of Visualization', 'zh-TW': 'of Visualization', ms: 'of Visualization' },
  titleZh: { en: '九 大 观 想 法 则', 'zh-CN': '九 大 观 想 法 则', 'zh-TW': '九 大 觀 想 法 則', ms: '九 大 观 想 法 则' },
  intro: {
    en: 'To find stillness and harmony within a crowded life is what many quietly seek. The nine precepts of visualization offer a practical order of guidance — a way to meet pressure and challenge with composure, and to raise the felt sense of contentment in one\u2019s days. What follows is each of the nine, set down in turn.',
    'zh-CN': '在繁忙的生活中，找到内心的平静与和谐是许多人追求的目标。九大观想法则为我们提供了一系列实用的指导，帮助我们更好地应对压力和挑战，提升生活的幸福感和满足感。以下是这九大法则的具体内容。',
    'zh-TW': '在繁忙的生活中，找到內心的平靜與和諧是許多人追求的目標。九大觀想法則為我們提供了一系列實用的指導，幫助我們更好地應對壓力和挑戰，提升生活的幸福感和滿足感。以下是這九大法則的具體內容。',
    ms: 'Menemukan ketenangan dan keharmonian dalam kehidupan yang sibuk ialah matlamat yang dicari ramai orang. Sembilan prinsip renungan menawarkan satu susunan panduan yang praktikal \u2014 cara menghadapi tekanan dan cabaran dengan tenang, serta meningkatkan rasa bahagia dan kepuasan dalam hidup. Berikut ialah kesembilan-sembilan prinsip itu, satu demi satu.'
  },
  coda: {
    en: 'In learning and practising these nine precepts, we come to find more stillness and harmony in living — a fuller awareness of the self, and a steadier capacity to meet what life brings. May these precepts help each person arrive at quiet of mind and contentment of heart.',
    'zh-CN': '通过学习和实践这九大观想法则，我们能够在生活中找到更多的平静与和谐，提升自我意识，增强应对生活挑战的能力。希望这些法则能够帮助每一个人实现内心的宁静与满足。',
    'zh-TW': '通過學習和實踐這九大觀想法則，我們能夠在生活中找到更多的平靜與和諧，提升自我意識，增強應對生活挑戰的能力。希望這些法則能夠幫助每一個人實現內心的寧靜與滿足。',
    ms: 'Dengan mempelajari dan mengamalkan kesembilan prinsip ini, kita menemukan lebih banyak ketenangan dan keharmonian dalam hidup \u2014 kesedaran diri yang lebih penuh, dan keupayaan yang lebih mantap untuk menghadapi apa jua yang mendatang. Semoga prinsip-prinsip ini membantu setiap insan mencapai ketenangan fikiran dan kepuasan hati.'
  }
};

window.MANTRAS_META = {
  eyebrow: { en: 'The Practice · Recited', 'zh-CN': '口 诀 · 行 之', 'zh-TW': '口 訣 · 行 之', ms: 'Amalan · Dilafazkan' },
  titleEn: { en: 'Six Mantras', 'zh-CN': 'Six Mantras', 'zh-TW': 'Six Mantras', ms: 'Six Mantras' },
  titleSub: { en: 'for the Practice', 'zh-CN': 'for the Practice', 'zh-TW': 'for the Practice', ms: 'for the Practice' },
  titleZh: { en: '观 想 六 大 口 诀', 'zh-CN': '观 想 六 大 口 诀', 'zh-TW': '觀 想 六 大 口 訣', ms: '观 想 六 大 口 诀' },
  intro: {
    en: 'Visualization is a powerful practice, one that helps you find stillness and focus within the ordinary day. Six mantras follow \u2014 terse lines to be held and recited \u2014 meant to make the practice truer and more effective.',
    'zh-CN': '观想是一种强大的练习方法，能够帮助你在日常生活中找到内心的平静和专注。以下是六大口诀，旨在帮助你更有效地进行观想练习。',
    'zh-TW': '觀想是一種強大的練習方法，能夠幫助你在日常生活中找到內心的平靜和專注。以下是六大口訣，旨在幫助你更有效地進行觀想練習。',
    ms: 'Renungan ialah kaedah latihan yang berkuasa, yang membantu anda menemukan ketenangan dan tumpuan dalam kehidupan seharian. Berikut ialah enam mantera \u2014 baris-baris ringkas untuk dipegang dan dilafazkan \u2014 bertujuan menjadikan amalan ini lebih benar dan berkesan.'
  }
};

window.MANTRAS = [
  {
    num: '壹',
    line: { en: 'Stillness in the Din', 'zh-CN': '闹中取静', 'zh-TW': '鬧中取靜', ms: 'Tenang dalam Bising' },
    body: {
      en: 'In the beginning, contemplate in a quiet place, undisturbed, so the attention may gather. Once the skill is yours, try it within the busy hours. Such training raises focus and inner energy, and lets you keep a clear awareness amid the noise \u2014 deepening the spirit\u2019s cultivation.',
      'zh-CN': '在初学阶段，观想应在安静、无人打扰的环境中进行，以便集中注意力。当你熟练掌握技巧后，可以尝试在繁忙的时间段进行观想。这种训练可以提升你的专注力和内在能量，帮助你在嘈杂环境中保持清晰的意识，从而提升灵性修养。',
      'zh-TW': '在初學階段，觀想應在安靜、無人打擾的環境中進行，以便集中注意力。當你熟練掌握技巧後，可以嘗試在繁忙的時間段進行觀想。這種訓練可以提升你的專注力和內在能量，幫助你在嘈雜環境中保持清晰的意識，從而提升靈性修養。',
      ms: 'Pada peringkat awal, berenunglah di tempat yang tenang dan tidak terganggu, agar tumpuan dapat dihimpun. Setelah mahir, cubalah pada waktu-waktu sibuk. Latihan sebegini meningkatkan tumpuan dan tenaga dalaman, serta membolehkan anda mengekalkan kesedaran yang jernih di tengah kebisingan \u2014 memperdalam pembinaan rohani.'
    }
  },
  {
    num: '贰',
    line: { en: 'Eyes Softly Parted', 'zh-CN': '双目微张', 'zh-TW': '雙目微張', ms: 'Mata Terkuak Halus' },
    body: {
      en: 'While contemplating, let the eyes open a little, but never with force. To rest in a light-to-middling half-conscious state is to enter the work of contemplation the better.',
      'zh-CN': '在进行观想时，眼睛应稍微张开，但不要过于用力。保持在浅度至中度的无意识状态，有助于更好地进入观想的状态。',
      'zh-TW': '在進行觀想時，眼睛應稍微張開，但不要過於用力。保持在淺度至中度的無意識狀態，有助於更好地進入觀想的狀態。',
      ms: 'Ketika berenung, biarkan mata terkuak sedikit, namun jangan dengan paksa. Berehat dalam keadaan separa sedar yang ringan hingga sederhana membantu anda memasuki renungan dengan lebih baik.'
    }
  },
  {
    num: '叁',
    line: { en: 'Between Dream and Waking', 'zh-CN': '似梦似醒', 'zh-TW': '似夢似醒', ms: 'Antara Mimpi dan Jaga' },
    body: {
      en: 'In contemplation there is no need to be fully awake; keep a hazy state. Let awareness be neither too clear nor wholly dim \u2014 such a state frees the subconscious to contemplate.',
      'zh-CN': '观想时不需要过于清醒，保持一种朦胧的状态。意识不应过于清晰，也不应完全模糊。这样的状态可以让你更自由地进行潜意识的观想。',
      'zh-TW': '觀想時不需要過於清醒，保持一種朦朧的狀態。意識不應過於清晰，也不應完全模糊。這樣的狀態可以讓你更自由地進行潛意識的觀想。',
      ms: 'Dalam renungan, tidak perlu sedar sepenuhnya; kekalkan keadaan yang samar. Biarkan kesedaran tidak terlalu jelas mahupun kabur sama sekali \u2014 keadaan sebegini membebaskan alam bawah sedar untuk berenung.'
    }
  },
  {
    num: '肆',
    line: { en: 'Do Not Rush the Result', 'zh-CN': '莫求速成', 'zh-TW': '莫求速成', ms: 'Jangan Kejar Hasil' },
    body: {
      en: 'Meet the practice with an even mind; do not expect to see effect at once. Observe and note what comes to pass, and be grateful for each small result. Even if one alone is granted, hold gratitude, and set it down.',
      'zh-CN': '在观想过程中，应以平常心对待，不要期待立刻看到效果。观察并记录所发生的事情，感恩每一个小的结果。即使只得到了一项成果，也要心存感激，并记录下来。',
      'zh-TW': '在觀想過程中，應以平常心對待，不要期待立刻看到效果。觀察並記錄所發生的事情，感恩每一個小的結果。即使只得到了一項成果，也要心存感激，並記錄下來。',
      ms: 'Hadapilah amalan ini dengan hati yang tenang; jangan mengharap melihat kesan serta-merta. Perhatikan dan catatlah apa yang berlaku, dan bersyukurlah atas setiap hasil kecil. Meskipun hanya satu dikurniakan, peliharalah kesyukuran, dan catatkannya.'
    }
  },
  {
    num: '伍',
    line: { en: 'Give Thanks at Once', 'zh-CN': '见效即谢', 'zh-TW': '見效即謝', ms: 'Bersyukur Serta-merta' },
    body: {
      en: 'When you see or receive an effect, give thanks at once \u2014 knowing it a change wrought by contemplation. Energy and intention ripen step by step; do not rush the result.',
      'zh-CN': '当你看到或得到效果时，应立即表达感激。这意味着要意识到这是观想带来的改变。能量和观念都是循序渐进的，不要急于求成。',
      'zh-TW': '當你看到或得到效果時，應立即表達感激。這意味著要意識到這是觀想帶來的改變。能量和觀念都是循序漸進的，不要急於求成。',
      ms: 'Apabila anda melihat atau menerima suatu kesan, bersyukurlah serta-merta \u2014 sedar bahawa ia perubahan yang terhasil daripada renungan. Tenaga dan niat matang selangkah demi selangkah; jangan kejar hasil.'
    }
  },
  {
    num: '陆',
    line: { en: 'One Matter, Wholly', 'zh-CN': '一事专一', 'zh-TW': '一事專一', ms: 'Satu Perkara, Sepenuhnya' },
    body: {
      en: 'Choose first the one matter most pressing, and make it the focus. Only when that end is met and its effect attained should you move, step by step, to the next. Keep focus and constancy throughout, completing goals one by one in their set order \u2014 never changing the object too often.',
      'zh-CN': '在进行观想时，优先选择一项最迫切的事物作为重点。在完成该目标并取得预期成效后，再逐步推进下一项。在观想过程中，保持专注和一致，按照既定目标顺序逐一完成，避免频繁更换目标。',
      'zh-TW': '在進行觀想時，優先選擇一項最迫切的事物作為重點。在完成該目標並取得預期成效後，再逐步推進下一項。在觀想過程中，保持專注和一致，按照既定目標順序逐一完成，避免頻繁更換目標。',
      ms: 'Ketika berenung, pilihlah dahulu satu perkara yang paling mendesak sebagai tumpuan. Hanya setelah matlamat itu dicapai dan kesannya diperoleh, barulah beralih selangkah demi selangkah kepada yang seterusnya. Kekalkan tumpuan dan ketekalan sepanjangnya, menyelesaikan matlamat satu demi satu mengikut urutan \u2014 jangan kerap menukar sasaran.'
    }
  }
];

window.PRECEPTS = [
  {
    num: '壹',
    title: { en: 'The Rhythm of Time', 'zh-CN': '时间规律', 'zh-TW': '時間規律', ms: 'Irama Masa' },
    body: {
      en: 'Contemplation should follow a rhythm of time; it is not to be broken at will, nor left without continuity. Regularity is of the first importance in the practice. A steady schedule and an unbroken cadence build a settled inner state, and markedly deepen the effect of the work.',
      'zh-CN': '观想活动应遵循时间规律，不可随意中断或缺乏连贯性。规律性在观想练习中至关重要。保持稳定的时间安排和练习频率可以帮助我们建立稳定的内在状态，并显著提升观想效果。',
      'zh-TW': '觀想活動應遵循時間規律，不可隨意中斷或缺乏連貫性。規律性在觀想練習中至關重要。保持穩定的時間安排和練習頻率可以幫助我們建立穩定的內在狀態，並顯著提升觀想效果。',
      ms: 'Renungan hendaklah mengikut suatu irama masa; ia tidak boleh diputuskan sesuka hati, mahupun ditinggalkan tanpa kesinambungan. Keteraturan amat penting dalam amalan ini. Jadual yang mantap dan rentak yang tidak terputus membina keadaan dalaman yang tenteram, serta mendalamkan kesan amalan dengan ketara.'
    }
  },
  {
    num: '贰',
    title: { en: 'Frequency & Duration', 'zh-CN': '频率与时长', 'zh-TW': '頻率與時長', ms: 'Kekerapan & Tempoh' },
    body: {
      en: 'Contemplate at least once each week, and let each sitting last about five minutes. Regular, brief practice raises the effect markedly. In this way we enter the state of contemplation more readily, and receive the good it brings.',
      'zh-CN': '建议每周至少进行一次观想，每次持续约五分钟。定期且简短的练习能显著提升观想效果。通过这种方式，我们能够更好地融入观想的状态，享受其带来的益处。',
      'zh-TW': '建議每週至少進行一次觀想，每次持續約五分鐘。定期且簡短的練習能顯著提升觀想效果。通過這種方式，我們能夠更好地融入觀想的狀態，享受其帶來的益處。',
      ms: 'Adalah disarankan untuk berenung sekurang-kurangnya sekali seminggu, dengan setiap sesi berlangsung kira-kira lima minit. Amalan yang tetap lagi ringkas meningkatkan kesannya dengan ketara. Dengan cara ini kita lebih mudah menyelami keadaan renungan, dan menikmati kebaikan yang dibawanya.'
    }
  },
  {
    num: '叁',
    title: { en: 'A Dreamlike Quality', 'zh-CN': '梦幻般的质量', 'zh-TW': '夢幻般的質量', ms: 'Kualiti Seumpama Mimpi' },
    body: {
      en: 'The images held in contemplation should keep a dreamlike blur; sharpness is not the point. The emphasis rests on inner ease and calm, not on the clarity of the picture. To understand and apply this raises both the experience and its effect.',
      'zh-CN': '观想中的影像应保持梦幻般的模糊状态，清晰度并非关键。重点应放在内心的放松与平和，而不是影像的清晰度。理解并应用这一原则可以帮助提升观想体验和效果。',
      'zh-TW': '觀想中的影像應保持夢幻般的模糊狀態，清晰度並非關鍵。重點應放在內心的放鬆與平和，而不是影像的清晰度。理解並應用這一原則可以幫助提升觀想體驗和效果。',
      ms: 'Bayangan yang ditahan dalam renungan seharusnya kekal kabur seumpama mimpi; ketajaman bukanlah inti perkaranya. Penekanan terletak pada ketenangan dan kedamaian dalaman, bukan pada kejelasan imej. Memahami dan menerapkan prinsip ini meningkatkan pengalaman serta kesannya.'
    }
  },
  {
    num: '肆',
    title: { en: 'The Moment to Contemplate', 'zh-CN': '观想的时机', 'zh-TW': '觀想的時機', ms: 'Waktu untuk Berenung' },
    body: {
      en: 'Let contemplation be done within the busy hours of the day. So doing, the experience rises from deep within, arriving of itself, without much thought or discernment. To choose the right moment is to lift its effect.',
      'zh-CN': '观想活动应在日常繁忙时段进行。这样可以确保观想体验源自内心深处，自然流露，而无需过多思考与分辨。选择适当的时机进行观想，有助于提升其效果。',
      'zh-TW': '觀想活動應在日常繁忙時段進行。這樣可以確保觀想體驗源自內心深處，自然流露，而無需過多思考與分辨。選擇適當的時機進行觀想，有助於提升其效果。',
      ms: 'Biarlah renungan dilakukan dalam waktu-waktu sibuk sehari-hari. Dengan berbuat demikian, pengalaman itu terbit dari lubuk hati, muncul dengan sendirinya, tanpa perlu banyak berfikir atau menimbang. Memilih saat yang tepat mengangkat kesannya.'
    }
  },
  {
    num: '伍',
    title: { en: 'Releasing Afterward', 'zh-CN': '观想后的抽离', 'zh-TW': '觀想後的抽離', ms: 'Melepaskan Selepasnya' },
    body: {
      en: 'When contemplation ends, withdraw at once from the thought — neither dwelling on it nor straining to remember — so that inner balance is kept. To practise this release lets contemplation remain a helpful, undisturbing part of daily life.',
      'zh-CN': '观想结束后，应立即从心念中抽离，避免过度留恋或刻意记忆，以保持内心的平衡。练习抽离有助于确保观想成为日常生活中有益且不干扰的一部分。',
      'zh-TW': '觀想結束後，應立即從心念中抽離，避免過度留戀或刻意記憶，以保持內心的平衡。練習抽離有助於確保觀想成為日常生活中有益且不干擾的一部分。',
      ms: 'Apabila renungan berakhir, tariklah diri serta-merta daripada fikiran itu \u2014 tanpa terlalu terikat mahupun bersungguh mengingatnya \u2014 agar keseimbangan dalaman terpelihara. Mengamalkan pelepasan ini menjadikan renungan sebahagian yang bermanfaat lagi tidak mengganggu kehidupan seharian.'
    }
  },
  {
    num: '陆',
    title: { en: 'An Even Mind', 'zh-CN': '保持平常心', 'zh-TW': '保持平常心', ms: 'Hati yang Tenang' },
    body: {
      en: 'Hold an even mind toward what contemplation yields; do not over-expect or beg of it, but meet its results with an open and accepting heart. This lets us enjoy the process the more, and gain from it.',
      'zh-CN': '对观想成果应保持平常心，避免过分期待或祈求，以开放和接纳的心态对待观想的结果。这样能够帮助我们更好地享受观想过程，并从中获益。',
      'zh-TW': '對觀想成果應保持平常心，避免過分期待或祈求，以開放和接納的心態對待觀想的結果。這樣能夠幫助我們更好地享受觀想過程，並從中獲益。',
      ms: 'Peliharalah hati yang tenang terhadap apa yang dihasilkan renungan; jangan terlalu berharap atau memohon daripadanya, sebaliknya sambutlah hasilnya dengan hati yang terbuka dan menerima. Ini membolehkan kita lebih menikmati prosesnya dan beroleh manfaat.'
    }
  },
  {
    num: '柒',
    title: { en: 'Practicality & Gratitude', 'zh-CN': '实用性与感恩', 'zh-TW': '實用性與感恩', ms: 'Kepraktisan & Kesyukuran' },
    body: {
      en: 'Let contemplation be governed by ease and usefulness, in accord with nature. When good comes, be grateful for what the power of contemplation has granted. This precept stresses the worth of weaving contemplation into daily life, and of giving thanks for the good it brings.',
      'zh-CN': '观想应以方便实用为原则，顺应自然。如遇好事，应感激观想之力所赐。这一原则强调了将观想融入日常生活的重要性，并感恩其带来的积极成果。',
      'zh-TW': '觀想應以方便實用為原則，順應自然。如遇好事，應感激觀想之力所賜。這一原則強調了將觀想融入日常生活的重要性，並感恩其帶來的積極成果。',
      ms: 'Biarlah renungan berpandukan kemudahan dan kegunaan, selaras dengan tabii alam. Apabila kebaikan datang, hendaklah bersyukur atas apa yang dikurniakan oleh daya renungan. Prinsip ini menekankan pentingnya menganyam renungan ke dalam kehidupan seharian, serta mensyukuri hasil baik yang dibawanya.'
    }
  },
  {
    num: '捌',
    title: { en: 'A Positive Belief', 'zh-CN': '积极正面的思想信念', 'zh-TW': '積極正面的思想信念', ms: 'Keyakinan yang Positif' },
    body: {
      en: 'Hold to positive and upright belief, cultivate a benevolent heart, and regard all things with an optimistic mind. By keeping such a positive outlook we better guide the power of contemplation, furthering harmony and health of body and mind.',
      'zh-CN': '秉持积极正面的思想信念，培养仁爱之心，以乐观的态度看待事物。通过保持积极和正面的心态，我们可以更好地引导观想的力量，促进身心的和谐与健康。',
      'zh-TW': '秉持積極正面的思想信念，培養仁愛之心，以樂觀的態度看待事物。通過保持積極和正面的心態，我們可以更好地引導觀想的力量，促進身心的和諧與健康。',
      ms: 'Peganglah keyakinan yang positif lagi lurus, suburkan hati yang penyayang, dan pandanglah segala sesuatu dengan fikiran yang optimis. Dengan mengekalkan pandangan positif sebegini, kita lebih dapat membimbing daya renungan, memajukan keharmonian dan kesihatan tubuh serta minda.'
    }
  },
  {
    num: '玖',
    title: { en: 'Transmuting the Negative', 'zh-CN': '转化负面因素', 'zh-TW': '轉化負面因素', ms: 'Mengubah yang Negatif' },
    body: {
      en: 'Turn adverse factors into a force that spurs one onward, and put that force to use in daily life. This precept stresses the worth of taking challenge and setback as chances to grow — converting negative feeling into a drive for personal development, and practising it day by day.',
      'zh-CN': '将不良因素转化为激励自己前进的动力，并有效运用于日常生活中。这一原则强调了利用挑战和挫折作为成长机会的重要性，将负面情绪转化为个人发展的驱动力，并在日常生活中加以实践。',
      'zh-TW': '將不良因素轉化為激勵自己前進的動力，並有效運用於日常生活中。這一原則強調了利用挑戰和挫折作為成長機會的重要性，將負面情緒轉化為個人發展的驅動力，並在日常生活中加以實踐。',
      ms: 'Ubahlah faktor yang buruk menjadi daya yang mendorong diri ke hadapan, dan gunakan daya itu dengan berkesan dalam kehidupan seharian. Prinsip ini menekankan pentingnya menjadikan cabaran dan kegagalan sebagai peluang untuk berkembang \u2014 menukar perasaan negatif menjadi pendorong pembangunan diri, serta mengamalkannya hari demi hari.'
    }
  }
];
