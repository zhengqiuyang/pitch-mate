// 陪练编排：串起 persona + session + model + 评分。
// 模型上下文注入策略：只注入"已解锁的真相 + 本轮锚点"，不注入全部隐藏信息——
// 玩家没问到，客户就不说。
import {
  createPersona, createSession, userTurn, personaTurn, endSession,
  revealedFacts, scoreReport,
} from '../vendor/roleplay-core/src/index.js';

export function buildContext(persona, events) {
  return {
    personaBrief: `${persona.name}，${persona.role}。${persona.brief ?? ''}`,
    sayTruthAbout: revealedFacts(persona).map((h) => `${h.key}: ${h.value}`),
    sceneBeatsThisTurn: events.anchors.map((a) => a.content),
  };
}

// model 需实现 async replyAsPersona(context, history) -> string
export async function runPractice({ personaSpec, model, playerInputs, maxTurns }) {
  const persona = createPersona(personaSpec);
  const session = createSession(persona, { maxTurns });
  const log = [];

  for (const input of playerInputs) {
    if (session.state !== 'running') break;
    const events = userTurn(session, input);
    const context = buildContext(persona, events);
    log.push({ turn: session.turn, events, context });
    if (session.state !== 'running') break;
    const reply = await model.replyAsPersona(context, session.transcript);
    personaTurn(session, reply);
    log[log.length - 1].personaReply = reply;
  }
  endSession(session);
  return { session, log };
}

export async function practiceReport(model, session, rubric) {
  return scoreReport(model, session, rubric);
}

// 把 OpenAI 兼容 chat 模型包装成 replyAsPersona 接口（coach.runPractice 消费的形态）。
// system prompt 只注入人设公开信息 + 已解锁真相 + 本轮锚点——隐藏信息的保密靠上下文最小化。
export function chatModelAsPersona(chatModel, personaSpec) {
  return {
    name: chatModel.name,
    async replyAsPersona(context, transcript) {
      const truths = context.sayTruthAbout.length
        ? context.sayTruthAbout.map((t) => `- ${t.value}`).join('\n')
        : '（玩家还没问到任何真相，继续保密）';
      const beats = context.sceneBeatsThisTurn.length
        ? context.sceneBeatsThisTurn.map((b) => `- ${b}`).join('\n')
        : '（本轮无剧情节点）';
      const sys = [
        `你扮演销售陪练中的客户角色：${personaSpec.name}，${personaSpec.role}。${personaSpec.brief ?? ''}`,
        `难度：${personaSpec.difficulty === 'hell' ? '地狱难度——态度更差，可能撒谎试探' : '标准难度'}`,
        '规则：',
        '1. 只说这位客户会说的话，口语化，单次回复不超过 3 句。',
        '2. 除"本轮可透露的真相"外，其余信息一律保密，玩家问到也绕开或反问。',
        '3. "本轮剧情节点"必须自然融入回复（括号动作可直接用）。',
        '4. 每次回复结尾把话题抛回给销售（质疑/追问/要求说具体）。',
        '',
        `本轮可透露的真相：\n${truths}`,
        `本轮剧情节点：\n${beats}`,
      ].join('\n');
      const history = transcript.slice(-10).map((m) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));
      const { content } = await chatModel.chat([{ role: 'system', content: sys }, ...history]);
      return content;
    },
    async rubricScore(rubric, ctx) {
      return chatModel.rubricScore(rubric, ctx);
    },
  };
}
