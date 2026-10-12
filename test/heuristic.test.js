import test from 'node:test';
import assert from 'node:assert/strict';
import { createPersona, createSession, userTurn } from '../vendor/roleplay-core/src/index.js';
import { createHeuristicCustomer } from '../src/heuristic-customer.js';

async function play(personaSpec, inputs) {
  const engine = createHeuristicCustomer();
  const persona = createPersona(personaSpec);
  const session = createSession(persona, { maxTurns: 20 });
  const replies = [];
  for (const input of inputs) {
    const events = userTurn(session, input);
    if (session.state !== 'running') break;
    const reply = await engine.replyAsPersona(
      { personaBrief: '', sayTruthAbout: events.unlocked.map((u) => ({ key: u.key, value: u.value })), sceneBeatsThisTurn: events.anchors.map((a) => a.content) },
      session.transcript,
    );
    replies.push(reply);
  }
  return { session, replies };
}

const SPEC = {
  id: 't', name: '钱总', role: '连锁健身房老板',
  hidden: [{ key: 'truePain', value: '私教流失率太高', unlockHints: ['私教', '教练'] }],
  anchors: [{ id: 'busy', atTurn: 1, content: '（正在巡店，语速很快）我在巡店，有事快说。' }],
};

test('启发式引擎：锚点出现在第一轮、真相被问到才透露', async () => {
  const { replies } = await play(SPEC, ['你好，我做个自我介绍，我们公司成立于2015年，有300人团队……', '你们私教这块儿流失是不是挺厉害的？']);
  assert.match(replies[0], /巡店/);                      // turn1 锚点触发
  assert.ok(!replies[0].includes('私教流失率'));          // 没问到 → 不透露
  assert.match(replies[1], /私教流失率太高/);             // 问到了 → 松口
  assert.match(replies[1], /怎么做到|怎么做|第一步|凭什么/); // 球踢回来
});

test('启发式引擎：连续几轮后出现立场施压', async () => {
  const { replies } = await play(SPEC, ['你好', '我们方案很好', '价格方面很灵活', '我们服务很多客户']);
  const later = replies.slice(1).join(' ');
  assert.match(later, /预算|另外几家|一句话|吃过亏|做不了主|再想想/);
});

test('启发式引擎：rubricScore 返回空对象（不伪造软分）', async () => {
  const engine = createHeuristicCustomer();
  assert.deepEqual(await engine.rubricScore(), {});
});
