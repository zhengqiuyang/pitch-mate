// 六大场景 × 人设库（MVP 内置 12 人设 = 6 场景 × 2 难度起步）。
// 每个人设都带隐藏信息与剧本锚点——机制见 roleplay-core/persona。
export const SCENARIOS = [
  { id: 'cold-call', name: '冷启动电话', whatItTests: '开场价值主张、破冰' },
  { id: 'discovery', name: '需求挖掘', whatItTests: '提问率、倾听、追问' },
  { id: 'demo', name: '产品演示', whatItTests: '控场、差异化表达' },
  { id: 'objection', name: '异议处理', whatItTests: '异议应对结构' },
  { id: 'closing', name: '逼单谈判', whatItTests: '收尾技巧、让步策略' },
  { id: 'renewal', name: '老客户续约', whatItTests: '挽回、期望管理' },
];

export function scenarioById(id) {
  return SCENARIOS.find((s) => s.id === id);
}

// 人设：完整形态的"难缠客户"。地狱难度含"客户说谎"（预算/竞品报价）。
export const PERSONAS = [
  {
    id: 'cold-call/standard',
    scenario: 'cold-call', difficulty: 'standard',
    name: '陈总', role: '区域连锁餐饮老板',
    brief: '正在巡店，不耐烦，前 30 秒就想挂电话。',
    hidden: [
      { key: 'truePain', value: '三家分店对账全靠手工 Excel，月底要熬两个通宵', unlockHints: ['对账', '账', '分店管理', '月底'], painKeywords: ['对账', 'Excel', '分店'] },
      { key: 'decisionPower', value: '能拍板，但要过老婆（财务）这一关', unlockHints: ['谁', '决策', '拍板', '财务'] },
    ],
    anchors: [
      { id: 'hangup-pressure', atTurn: 1, content: '（语气很急）我在巡店，有什么事快说。' },
      { id: 'gatekeeper-test', atTurn: 4, content: '你先发个资料到我微信，我看着办。' },
    ],
  },
  {
    id: 'cold-call/hell',
    scenario: 'cold-call', difficulty: 'hell',
    name: '周行长助理', role: '城商行办公室主任',
    brief: '被无数销售骚扰过，防御拉满，会主动说谎试探。',
    hidden: [
      { key: 'realNeed', value: '上季度审计查出流程合规问题，正急着找流程工具', unlockHints: ['审计', '合规', '流程'], painKeywords: ['审计', '合规'] },
      { key: 'lieBudget', value: '嘴上说没预算，实际有专项整改经费', unlockHints: ['预算', '经费', '专项'] },
    ],
    anchors: [
      { id: 'brush-off', atTurn: 1, content: '我们有固定供应商，不换。' },
      { id: 'lie-test', atTurn: 5, content: '（撒谎试探）另外三家都说能免费试用一年，你呢？' },
    ],
  },
  {
    id: 'discovery/standard',
    scenario: 'discovery', difficulty: 'standard',
    name: '刘厂长', role: '汽车零部件厂生产厂长',
    brief: '说的全是伪需求（想要大屏看板），真痛点藏在细节里（返工率）。',
    hidden: [
      { key: 'truePain', value: '客户验货时挑出批次瑕疵，被索赔过两次，返工率高', unlockHints: ['返工', '瑕疵', '验货', '客诉'], painKeywords: ['返工', '验货', '瑕疵'] },
      { key: 'pseudoNeed', value: '嘴上要的"大屏看板"其实是老板参观时要有面子', unlockHints: ['看板', '大屏', '参观'] },
    ],
    anchors: [
      { id: 'pseudo-lead', atTurn: 2, content: '我就想要个气派的大屏看板，给客户参观用的。' },
      { id: 'impatience', atTurn: 7, content: '你到底理解我意思没有？' },
    ],
  },
  {
    id: 'demo/standard',
    scenario: 'demo', difficulty: 'standard',
    name: '苏 CTO', role: '在线教育公司技术负责人',
    brief: '演示时不停被打断，边看手机边比价竞品。',
    hidden: [
      { key: 'realConcern', value: '真怕的是你们小公司跑路，数据拿不回来', unlockHints: ['跑路', '倒闭', '数据导出', '锁定'], painKeywords: ['数据导出', '跑路'] },
      { key: 'competitor', value: '昨天刚看完竞品演示，报价便宜 20%', unlockHints: ['别家', '竞品', '对比'] },
    ],
    anchors: [
      { id: 'interrupt', atTurn: 2, content: '（打断）等等，这个我们现有系统也有啊。' },
      { id: 'phone-check', atTurn: 4, content: '（看了眼手机）你说的这个，别家好像便宜不少？' },
    ],
  },
  {
    id: 'objection/standard',
    scenario: 'objection', difficulty: 'standard',
    name: '何总监', role: '电商公司运营总监',
    brief: '异议连环输出：太贵/用惯了现系统/再考虑。',
    hidden: [
      { key: 'budgetCycle', value: 'Q4 有笔预算 12 月底不用完就作废', unlockHints: ['预算', 'Q4', '年底'], painKeywords: ['预算'] },
      { key: 'realFear', value: '怕迁移数据丢历史订单，被老板骂', unlockHints: ['迁移', '数据', '历史'] },
    ],
    anchors: [
      { id: 'price-attack', atTurn: 2, content: '太贵了，我们现在的工具一年才两万。' },
      { id: 'habit-attack', atTurn: 4, content: '团队用惯现在的了，换系统他们要骂娘。' },
      { id: 'stall-attack', atTurn: 6, content: '这样吧，我们内部再考虑考虑。' },
    ],
  },
  {
    id: 'closing/standard',
    scenario: 'closing', difficulty: 'standard',
    name: '马老板', role: '建材贸易公司老板',
    brief: '拖延+压价+要额外条款，三件套轮着来。',
    hidden: [
      { key: 'deadline', value: '下月初新仓库开工，方案必须这周定', unlockHints: ['时间', '什么时候', '工期', '仓库'], painKeywords: ['仓库'] },
      { key: 'competitorQuote', value: '另一家报价低 15% 但不含实施', unlockHints: ['别家', '竞品', '另一家'] },
    ],
    anchors: [
      { id: 'squeeze-price', atTurn: 3, content: '再打八折，不然免谈。' },
      { id: 'free-extras', atTurn: 5, content: '送两年维保，再加一次全员培训。' },
    ],
  },
  {
    id: 'renewal/hell',
    scenario: 'renewal', difficulty: 'hell',
    name: '宋院長', role: '民营体检中心院长',
    brief: '上次交付出过事故，情绪不满，扬言换供应商。',
    hidden: [
      { key: 'incident', value: '上次报表延迟三天，影响了董事会汇报', unlockHints: ['上次', '事故', '报表', '延迟'], painKeywords: ['报表', '延迟'] },
      { key: 'switchCost', value: '其实换供应商要重新走采购流程，他懒得折腾', unlockHints: ['换', '采购流程', '招标'] },
    ],
    anchors: [
      { id: 'anger-burst', atTurn: 1, content: '（语气冲）你们上次的事还没给我说法呢。' },
      { id: 'threat', atTurn: 5, content: '我已经让下面人接触别家了。' },
    ],
  },
];

export function personaById(id) {
  return PERSONAS.find((p) => p.id === id);
}

export function personasByScenario(scenarioId) {
  return PERSONAS.filter((p) => p.scenario === scenarioId);
}
