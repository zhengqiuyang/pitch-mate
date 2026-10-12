// 启发式客户引擎：没有 LLM key 也能玩——用 persona 的结构化数据
// （锚点/已解锁真相/难度立场）拼出可用的客户台词。
// 有 key 时 server 自动切换真 LLM，这个引擎降级为兜底。
import { revealLine, pressureLine, demandLine } from './lines.js';

export function createHeuristicCustomer() {
  const seen = { pressures: 0 };
  return {
    name: 'heuristic-customer',
    async replyAsPersona(context, transcript) {
      const parts = [];
      const userTurns = transcript.filter((m) => m.role === 'user').length;

      // 1) 剧情锚点最优先（这轮必须发生的剧情）
      for (const beat of context.sceneBeatsThisTurn) parts.push(beat);

      // 2) 刚被问到的真相：松口透露（问对了才说）
      for (const truth of context.sayTruthAbout) parts.push(revealLine(truth));

      // 3) 立场施压：没问到点子上时，客户按自己的顾虑推动对话
      if (parts.length === 0 || userTurns >= 3) {
        parts.push(pressureLine(userTurns, seen.pressures++));
      }

      // 4) 永远把球踢回去（陪练要持续，不能客户自己聊完）
      parts.push(demandLine());
      return parts.filter(Boolean).join(' ');
    },
    async rubricScore() {
      return {}; // 无 LLM 不打软维度分——报告层会以硬指标为主
    },
  };
}
