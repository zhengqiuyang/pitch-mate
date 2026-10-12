// 文字陪练 CLI 演示：mock 模型跑通全链路（人设→会话→评分→复盘标注→SRS 建议）。
// 接真实 LLM 时替换 replyAsPersona 实现即可（OpenAI 兼容端点）。
import { personaById } from './personas.js';
import { runPractice, practiceReport } from './coach.js';
import { SALES_RUBRIC, weightedTotal, annotateTranscript } from './rubric.js';
import { gradeFromReport, createItem, review } from '../vendor/roleplay-core/src/index.js';

const mockModel = {
  name: 'scripted-mock',
  async replyAsPersona(context, transcript) {
    const last = transcript.filter((m) => m.role === 'user').at(-1)?.text ?? '';
    const truth = context.sayTruthAbout.length
      ? `（既然你问到了）${context.sayTruthAbout[0].value}` : '';
    const beat = context.sceneBeatsThisTurn[0] ?? '';
    return `${beat}${truth} 你接着说，"${last.slice(0, 18)}…"这话什么意思？`;
  },
  async rubricScore() {
    return { opening: 78, listening: 82, objection: 65, value: 74, closing: 60 };
  },
};

const persona = personaById('cold-call/standard');
const playerInputs = [
  '陈总您好，占用您两分钟。您三家分店月底对账是不是还得手工拼 Excel？',
  '谁负责这块流程的决策？您还是财务那边的意见也重要？',
  '我们能让对账自动出数。这样吧，下周二我带方案到店里给您看？',
];

const { session, log } = await runPractice({ personaSpec: persona, model: mockModel, playerInputs, maxTurns: 10 });
console.log('=== 陪练过程 ===');
for (const step of log) {
  console.log(`[T${step.turn}] 客户: ${step.personaReply}`);
}

const report = await practiceReport(mockModel, session, SALES_RUBRIC);
const total = weightedTotal(report.soft);
console.log('\n=== 评分报告 ===');
console.log('硬指标:', report.hard);
console.log('软维度:', report.soft, '=> 总分:', total);
console.log('锚点覆盖率:', report.anchorCoverage + '%');

console.log('\n=== 逐句复盘 ===');
for (const m of annotateTranscript(session)) {
  if (m.role === 'user') console.log(`[T${m.turn}] 你: ${m.text}  ${m.marks.join(',') || '-'}`);
}

const grade = gradeFromReport(report);
const srs = review(createItem(persona.id), grade);
console.log(`\n=== 复训计划 ===`);
console.log(`本次等级 ${grade}/5，「${persona.id}」${srs.intervalDays} 天后回到复习队列。`);
