// 语音延迟指标（浏览器与 Node 同构）：阶段计时、p50/p95、预算判定。
// 预算来自 docs/03：端到端应答 p50 ≤1500ms、p95 ≤2500ms（文字模式无此约束）。
export const LATENCY_BUDGET = { p50: 1500, p95: 2500, minSamples: 3 };

export function createLatencyTracker() {
  const samples = [];
  return {
    record(ms) {
      if (Number.isFinite(ms) && ms >= 0) samples.push(ms);
      return samples.length;
    },
    stats() {
      if (samples.length === 0) return { n: 0, p50: null, p95: null };
      const sorted = [...samples].sort((a, b) => a - b);
      return {
        n: samples.length,
        p50: percentile(sorted, 0.5),
        p95: percentile(sorted, 0.95),
        max: sorted[sorted.length - 1],
      };
    },
    // 样本不足 → 'insufficient'（不给假结论）；达标 'ok'；超预算 'over'
    verdict() {
      const s = this.stats();
      if (s.n < LATENCY_BUDGET.minSamples) return 'insufficient';
      if (s.p50 <= LATENCY_BUDGET.p50 && s.p95 <= LATENCY_BUDGET.p95) return 'ok';
      return 'over';
    },
  };
}

function percentile(sorted, q) {
  const idx = Math.min(sorted.length - 1, Math.ceil(q * sorted.length) - 1);
  return sorted[idx];
}
