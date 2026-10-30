// 公司名单：部门、小组、员工、设施。首页的 3D 公司和「组织架构」都按这里画。
//
// main: true 的部门是主要办公区（客服部），里面分小组（teams）；其他部门各有一间小办公室。
// 小组 / 部门 kind：
//   site     网站里的工具，点员工进入 href
//   claude   Claude 里的 skill，点员工复制指令（skill 写插件名:skill 名）
//   planned  筹备中，空工位（以后加功能就把它改成 site）
// 设施 kind 决定 3D 里摆什么：mail 收发室、files 档案室、studio 设计工作室、media 影音室、server 机房、meeting 会议室
//
// 加新功能：把客服部里「新功能工位」改成 kind: 'site'，填 href 和员工。

window.COMPANY = {
  name: '审核总部',

  boss: { name: '你', title: '老板', duty: '看全公司，把工作交给各部门。' },

  departments: [
    {
      id: 'cs', name: '客服部', main: true, color: '#0E6B66',
      summary: '公司的主力：审核名字、审核技术单、回客人。',
      teams: [
        {
          id: 'name', name: '名字审核组', kind: 'site', href: 'name/', color: '#0E6B66',
          summary: '名正言顺名册：逐位学员核对新名，判定没问题 / 有问题。',
          agents: [
            { name: '阿名', role: '核名专员', duty: '新名和家人撞字、撞音，连姓念的不雅谐音，逐位标出来。' },
            { name: '小繁', role: '繁体专员', duty: '名册展示要繁体的学员，新名自动转繁体；有几种写法的字提醒你确认。' },
            { name: '库管', role: '订单库管理员', duty: '记住「订单号 → 新名」，跨文件比对家人的名字。', stat: 'nameDb' }
          ]
        },
        {
          id: 'tech', name: '技术单审核组', kind: 'site', href: 'tech/', color: '#3A6EA5',
          summary: '按审核规则自动标红、分文件、改页脚，下载转发给专家。',
          agents: [
            { name: '阿技', role: '审单专员', duty: '按规则把要注意的格子标红：子时、备注、暂缓、换购单……' },
            { name: '小急', role: '分拣员', duty: '把单分进普通、特殊加急、有问题、新生儿文件，家人订单排在一起。' },
            { name: '阿问', role: '沟通专员', duty: '要问下单者、先问能不能做的单整理成待办，话术一键复制。' }
          ]
        },
        {
          id: 'support', name: 'Claude 客服组', kind: 'claude', color: '#C26A00',
          summary: '在 Claude 里帮客服回客人、分工单、写常见问题。',
          agents: [
            { name: '小回', role: '回复撰写', skill: 'customer-support:draft-response', duty: '按客人的问题起草回复。' },
            { name: '分拣', role: '工单分拣', skill: 'customer-support:ticket-triage', duty: '看工单内容，分轻重缓急、该给谁处理。' },
            { name: '小知', role: '知识库编辑', skill: 'customer-support:kb-article', duty: '把常见问题整理成说明文章。' },
            { name: '阿升', role: '升级处理', skill: 'customer-support:customer-escalation', duty: '处理棘手的客诉，整理要往上报的内容。' }
          ]
        },
        { id: 'next', name: '新功能工位', kind: 'planned', color: '#8E949A', summary: '空着的工位，以后加的功能坐这里。', agents: [] }
      ]
    },
    {
      id: 'marketing', name: '营销部', kind: 'claude', color: '#B83A6E',
      summary: '写文案、排活动、做社群内容。',
      agents: [
        { name: '小文', role: '内容写手', skill: 'marketing:content-creation', duty: '写推文、文章、宣传文案。' },
        { name: '阿策', role: '活动策划', skill: 'marketing:campaign-plan', duty: '规划一档推广活动：目标、时间表、渠道。' },
        { name: '小邮', role: '邮件营销', skill: 'marketing:email-sequence', duty: '写一组会依序发出的营销邮件。' },
        { name: '把关', role: '品牌把关', skill: 'marketing:brand-review', duty: '检查文案、设计是否符合品牌风格。' }
      ]
    },
    {
      id: 'finance', name: '财务部', kind: 'claude', color: '#2C6A37',
      summary: '催款、看现金流、准备报税。',
      agents: [
        { name: '阿催', role: '催款专员', skill: 'small-business:invoice-chase', duty: '找出逾期没付的发票，起草催款信。' },
        { name: '小流', role: '现金流', skill: 'small-business:cash-flow-snapshot', duty: '整理一份现在的现金流快照。' },
        { name: '阿税', role: '报税准备', skill: 'small-business:tax-prep', duty: '报税前把要准备的资料列清楚。' }
      ]
    },
    {
      id: 'hr', name: '人事部', kind: 'claude', color: '#6B4FA0',
      summary: '招人、带新人、做考核。',
      agents: [
        { name: '小招', role: '招聘', skill: 'human-resources:recruiting-pipeline', duty: '整理招聘进度，每个候选人走到哪一步。' },
        { name: '阿新', role: '入职引导', skill: 'human-resources:onboarding', duty: '帮新同事排好入职第一周要做的事。' },
        { name: '小考', role: '绩效考核', skill: 'human-resources:performance-review', duty: '起草绩效考核的评语和重点。' }
      ]
    },
    {
      id: 'legal', name: '法务部', kind: 'claude', color: '#55544E',
      summary: '看合同、查合规。',
      agents: [
        { name: '阿约', role: '合同审查', skill: 'legal:review-contract', duty: '逐条看合同，标出有风险的条款。' },
        { name: '小规', role: '合规检查', skill: 'legal:compliance-check', duty: '检查一件事有没有合规上的问题。' }
      ]
    },
    {
      id: 'data', name: '数据部', kind: 'claude', color: '#1F7A8C',
      summary: '分析数据、做看板。',
      agents: [
        { name: '阿析', role: '数据分析', skill: 'data:analyze', duty: '回答数据问题，找出趋势和原因。' },
        { name: '小板', role: '看板制作', skill: 'data:build-dashboard', duty: '把数字做成一页看板。' }
      ]
    },
    { id: 'next-dept', name: '新部门', kind: 'planned', color: '#8E949A', summary: '空办公室，以后开新部门用。', agents: [] }
  ],

  // 连接器按用途放进设施。会议室同时是 Google Calendar 和简报工具的设施
  facilities: [
    { id: 'mail', room: '收发室', kind: 'mail', duty: '收信、整理收件箱、起草邮件。',
      connectors: ['Gmail'] },
    { id: 'files', room: '档案室', kind: 'files', duty: '找文件、读文件、写文件。',
      connectors: ['Google Drive', 'Claude Docs', 'Superhuman Docs'] },
    { id: 'meeting', room: '会议室', kind: 'meeting', duty: '排会议、做简报、访谈客户。',
      connectors: ['Google Calendar', 'Gamma', 'SlidesGPT', 'Slides AI', 'Perspective AI'] },
    { id: 'studio', room: '设计工作室', kind: 'studio', duty: '做海报、社群图、网页和 3D 设计。',
      connectors: ['Canva', 'Figma', 'Magic Patterns', 'Moda', 'Mobbin', 'Unsplash', 'CoCanvas', 'Trimble SketchUp', 'Three.js 3D Viewer'] },
    { id: 'media', room: '影音室', kind: 'media', duty: '剪片、配音、生成图片和影片。',
      connectors: ['Descript', 'OpusClip', 'HyperFrames', 'Motion', 'Higgsfield', 'Krea'] },
    { id: 'server', room: '机房', kind: 'server', duty: '放程序、上线网站。',
      connectors: ['GitHub', 'Vercel', 'Netlify', 'v0'] }
  ],

  // 墙上的画（Unsplash，载不到就换成程序画的抽象画）
  art: [
    { url: 'https://images.unsplash.com/photo-1483354483454-4cd359948304?ixlib=rb-4.1.0&fm=jpg&crop=entropy&cs=srgb&w=512&h=384&fit=crop&q=70', by: 'Paul Earle' },
    { url: 'https://images.unsplash.com/photo-1532019333101-b0f43c16a912?ixlib=rb-4.1.0&fm=jpg&crop=entropy&cs=srgb&w=512&h=384&fit=crop&q=70', by: 'Louis Reed' },
    { url: 'https://images.unsplash.com/photo-1600716887304-382af77ee86f?ixlib=rb-4.1.0&fm=jpg&crop=entropy&cs=srgb&w=512&h=384&fit=crop&q=70', by: 'Steve A Johnson' },
    { url: 'https://images.unsplash.com/photo-1550188225-af2e1c2529b2?ixlib=rb-4.1.0&fm=jpg&crop=entropy&cs=srgb&w=512&h=384&fit=crop&q=70', by: 'Fernando Jorge' }
  ]
};
