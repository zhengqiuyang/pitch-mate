import test from 'node:test';
import assert from 'node:assert/strict';
import { PERSONAS, personaById, personasByScenario, SCENARIOS } from '../src/personas.js';
import { SALES_RUBRIC, weightedTotal, annotateTranscript } from '../src/rubric.js';
import { runPractice, practiceReport } from '../src/coach.js';

test('人设库完整性：每个场景至少 1 个人设，机制字段齐备', () => {
  for (const s of SCENARIOS) {
    assert.ok(personasByScenario(s.id).length >= 1, `场景 ${s.id} 缺人设`);
  }
  for (const p of PERSONAS) {
    assert.ok(p.hidden.length >= 2, `${p.id} 隐藏信息不足`);
    assert.ok(p.anchors.length >= 1, `${p.id} 缺剧本锚点`);
    assert.ok(['standard', 'hell'].includes(p.difficulty));
  }
});

test('加权总分：正常打分', () => {
  const r = weightedTotal({ opening: 80, listening: 90, objection: 70, value: 60, closing: 50 });
  assert.ok(!r.insufficient);
  assert.ok(r.total > 60 && r.total < 80);
});

test('加权总分：缺维超过 2 个报 insufficient', () => {
  assert.ok(weightedTotal({ opening: 80, listening: 90 }).insufficient);
});

test('软维度全 null（LLM 失联）时 insufficient 而非假分', () => {
  assert.ok(weightedTotal({ opening: null, listening: null, objection: null, value: null, closing: null }).insufficient);
});

const mockModel = {
  async replyAsPersona(context) {
    return (context.sceneBeatsThisTurn[0] ?? '') + '嗯，你继续说。';
  },
  async rubricScore() {
    return { opening: 80, listening: 85, objection: 70, value: 75, closing: 65 };
  },
};

test('陪练全链路：上下文只注入已解锁真相', async () => {
  const persona = personaById('discovery/standard');
  const { session, log } = await runPractice({
    personaSpec: persona,
    model: mockModel,
    playerInputs: ['你好', '你们产线返工率怎么样？验货老出瑕疵吗？'],
    maxTurns: 8,
  });
  assert.equal(session.turn, 2);
  // 第一句没问到痛点 → 上下文无真相；第二句命中 → 真相注入
  assert.equal(log[0].context.sayTruthAbout.length, 0);
  assert.ok(log[1].context.sayTruthAbout.length >= 1);
  const report = await practiceReport(mockModel, session, SALES_RUBRIC);
  assert.ok(report.hard.painHitRate > 0);
  assert.equal(report.anchorCoverage, 50); // turn2 锚点已触发，turn7 锚点未到
});

test('复盘标注：问句/痛点/下一步正确打标', async () => {
  const persona = personaById('discovery/standard');
  const { session } = await runPractice({
    personaSpec: persona,
    model: mockModel,
    playerInputs: ['你们验货时瑕疵多吗？', '我们出个方案，下周再约？'],
    maxTurns: 8,
  });
  const marks = annotateTranscript(session).filter((m) => m.role === 'user');
  assert.ok(marks[0].marks.includes('question'));
  assert.ok(marks[0].marks.includes('pain-hit'));   // 命中"验货/瑕疵"
  assert.ok(marks[1].marks.includes('next-step'));
});
