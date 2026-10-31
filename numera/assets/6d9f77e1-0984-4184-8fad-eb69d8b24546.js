// seeking-quiz.js — 测算 / The Reckoning: four questions, weighted to the six seekings.
(function () {
  window.SEEKING_QUIZ = [
    {
      q: { zh: '此刻最挂心的，是哪一桩', en: 'What weighs on you most, just now?' },
      opts: [
        { zh: '进项与积蓄', en: 'Income, and what is kept of it', w: { 财: 3, 智: 1 } },
        { zh: '人事与际遇', en: 'People, and the doors they open', w: { 贵: 3, 合: 1 } },
        { zh: '身体与家宅', en: 'The body, and the house it rests in', w: { 衡: 3, 镇: 1 } },
        { zh: '心境与去向', en: 'The mind, and where it is headed', w: { 智: 3, 衡: 1 } }
      ]
    },
    {
      q: { zh: '若得一助，愿其助于何处', en: 'If one thing were to help you, where would you have it act?' },
      opts: [
        { zh: '让财来得更快', en: 'That wealth should come faster', w: { 财: 3 } },
        { zh: '让财守得更稳', en: 'That wealth should stay', w: { 财: 2, 镇: 2 } },
        { zh: '让贵人现身', en: 'That the right person should appear', w: { 贵: 3 } },
        { zh: '让心先静下来', en: 'That the mind should first grow still', w: { 智: 2, 衡: 2 } }
      ]
    },
    {
      q: { zh: '所置之处', en: 'Where would it be placed?' },
      opts: [
        { zh: '随身佩戴', en: 'Worn on the body', w: { 衡: 2, 贵: 1, 合: 1 } },
        { zh: '案头或店面', en: 'On the desk, or in the shop', w: { 财: 2, 贵: 2 } },
        { zh: '居家之内', en: 'Within the home', w: { 镇: 3, 衡: 1 } },
        { zh: '赠予他人', en: 'Given to another', w: { 合: 3, 贵: 1 } }
      ]
    },
    {
      q: { zh: '所求，为己还是为家', en: 'Is this sought for yourself, or for the household?' },
      opts: [
        { zh: '为己身', en: 'For myself', w: { 智: 2, 财: 1, 衡: 1 } },
        { zh: '为家人', en: 'For my family', w: { 合: 2, 衡: 2 } },
        { zh: '为事业', en: 'For the enterprise', w: { 财: 2, 贵: 2 } },
        { zh: '为后代', en: 'For those who follow', w: { 合: 3, 镇: 1 } }
      ]
    }
  ];
})();
