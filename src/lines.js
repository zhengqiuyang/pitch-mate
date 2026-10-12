// 客户台词库：启发式引擎的语料。轮换使用，避免每场陪练台词重复。
const REVEALS = [
  (t) => `（既然你问到这了）实话跟你说，${t.value}。`,
  (t) => `唉，跟你说实话吧——${t.value}。这事我只跟你说。`,
];

const PRESSURES = [
  '价格能不能再谈？我们预算没这么多。',
  '另外几家也在跟我接触，你有什么不一样的？',
  '我时间不多，你能不能一句话说清楚你们能解决什么？',
  '上次吃过亏，我怕你们这种供应商又是一堆承诺落不了地。',
  '这事我做不了主，你还得多说服我下面用的人。',
  '再想想吧，也不是非上不可。',
];

const HELL_EXTRA = [
  '（看手机）你继续，我听着呢。',
  '（不耐烦）说重点，说重点。',
];

const DEMANDS = [
  '你说具体点，怎么做到？',
  '那你们打算怎么做？',
  '行，那你先说说第一步是什么？',
  '凭什么信你？',
];

export function revealLine(truth) {
  return REVEALS[hash(truth.key) % REVEALS.length](truth);
}

export function pressureLine(userTurns, count) {
  const base = PRESSURES[count % PRESSURES.length];
  if (userTurns >= 4 && count % 3 === 2) {
    return `${HELL_EXTRA[(count >> 1) % HELL_EXTRA.length]}${base}`;
  }
  return base;
}

export function demandLine() {
  return DEMANDS[Math.floor(Math.random() * DEMANDS.length)];
}

function hash(s) {
  let h = 0;
  for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}
