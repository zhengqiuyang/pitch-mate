import test from 'node:test';
import assert from 'node:assert/strict';
import { createLatencyTracker, LATENCY_BUDGET } from '../public/voice-metrics.js';

test('样本不足时不给假结论', () => {
  const t = createLatencyTracker();
  assert.equal(t.verdict(), 'insufficient');
  t.record(100);
  t.record(120);
  assert.equal(t.verdict(), 'insufficient'); // 少于 minSamples
});

test('p50/p95 计算与预算判定（nearest-rank）', () => {
  const t = createLatencyTracker();
  for (const ms of [900, 1000, 1100, 1200, 1300, 2400]) t.record(ms); // p95=2400
  const s = t.stats();
  assert.equal(s.n, 6);
  assert.equal(s.p50, 1100); // nearest-rank：第 3 小
  assert.equal(s.p95, 2400); // nearest-rank：第 6 小
  assert.equal(t.verdict(), 'ok'); // p50≤1500 且 p95≤2500
});

test('超预算判定', () => {
  const t = createLatencyTracker();
  for (const ms of [1600, 1700, 2600]) t.record(ms);
  assert.equal(t.verdict(), 'over');
});

test('非法样本被忽略', () => {
  const t = createLatencyTracker();
  t.record(NaN);
  t.record(-5);
  t.record('abc');
  assert.equal(t.stats().n, 0);
  assert.equal(LATENCY_BUDGET.p50, 1500);
});
