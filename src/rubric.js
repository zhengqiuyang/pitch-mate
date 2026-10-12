// 五维销售评分 rubric（02 产品设计）：软维度定义 + 权重。
// 硬指标（提问率/痛点命中/下一步）在 roleplay-core/scoring 中确定性计算。
import { isQuestion, isOpenQuestion } from '../vendor/roleplay-core/src/index.js';

export const SALES_RUBRIC = {
  id: 'pitch-mate/v1',
  dimensions: [
    { id: 'opening', name: '开场与破冰', weight: 0.15, guide: '前 3 轮是否给出与客户情境相关的钩子，而非自我介绍流水账' },
    { id: 'listening', name: '提问与倾听', weight: 0.25, guide: '提问率、开放题占比、是否复述引用客户信息' },
    { id: 'objection', name: '异议应对', weight: 0.25, guide: '异议出现后的应对结构（认同-拆解-重构），情绪稳定性' },
    { id: 'value', name: '价值传递', weight: 0.20, guide: '是否命中人设真痛点（hidden.truePain），卖点相关度' },
    { id: 'closing', name: '推进与收尾', weight: 0.15, guide: '下一步动作是否明确（约下次/成交/合理止损）' },
  ],
};

// 加权总分：软维度缺失（null）时权重重分配到其余维度——
// 缺一维不至于废掉整个报告，但缺失过多报 insufficient。
export function weightedTotal(soft) {
  const dims = SALES_RUBRIC.dimensions.filter((d) => typeof soft[d.id] === 'number');
  if (dims.length < 3) return { total: null, insufficient: true, usedDims: dims.length };
  const weightSum = dims.reduce((acc, d) => acc + d.weight, 0);
  const total = dims.reduce((acc, d) => acc + soft[d.id] * d.weight, 0) / weightSum;
  return { total: Math.round(total * 10) / 10, insufficient: false, usedDims: dims.length };
}

const NEXT_STEP_HINTS = ['下次', '下一步', '再约', '约个', '跟进', '报价', '方案'];

// 逐句复盘标注：只做可精确判断的确定性标注（问句/痛点词/下一步词），
// LLM 归因在 UI 层按需触发。
export function annotateTranscript(session) {
  return session.transcript.map((m) => {
    if (m.role !== 'user') return { ...m, marks: [] };
    const marks = [];
    if (isQuestion(m.text)) marks.push('question');
    if (isOpenQuestion(m.text)) marks.push('open-question');
    if (hitPain(session.persona, m.text)) marks.push('pain-hit');
    if (NEXT_STEP_HINTS.some((h) => m.text.toLowerCase().includes(h))) marks.push('next-step');
    return { ...m, marks };
  });
}

function hitPain(persona, text) {
  const t = text.toLowerCase();
  return (persona.hidden || []).some((h) =>
    (h.painKeywords || []).some((k) => t.includes(k.toLowerCase()))
  );
}
