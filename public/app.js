/* pitch-mate 前端：零依赖 vanilla JS。状态机：home → practice → report */
import { createLatencyTracker } from './voice-metrics.js';

const $ = (id) => document.getElementById(id);
const views = { home: $('home'), practice: $('practice'), report: $('report') };
let current = null; // {practiceId, persona}
const voiceTracker = createLatencyTracker();
let voiceMode = false;

async function api(path, body) {
  const res = await fetch(path, body ? {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  } : undefined);
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
  return res.json();
}

function show(name) {
  for (const [k, el] of Object.entries(views)) el.classList.toggle('hidden', k !== name);
}

/* ---- 首页 ---- */
async function loadHome() {
  const { personas } = await api('/api/personas');
  const byScenario = new Map();
  for (const p of personas) {
    if (!byScenario.has(p.scenario)) byScenario.set(p.scenario, []);
    byScenario.get(p.scenario).push(p);
  }
  const names = { 'cold-call': '冷启动电话', discovery: '需求挖掘', demo: '产品演示', objection: '异议处理', closing: '逼单谈判', renewal: '老客户续约' };
  const grid = $('scenarioGrid');
  grid.innerHTML = '';
  for (const [scenario, list] of byScenario) {
    const card = document.createElement('div');
    card.className = 'scenario';
    card.innerHTML = `<h3>${names[scenario] ?? scenario}</h3><div class="what"></div>`;
    for (const p of list) {
      const row = document.createElement('div');
      row.className = 'persona-row';
      row.innerHTML = `
        <div class="who">${p.name}<small>${p.role}</small></div>
        <span class="diff-tag ${p.difficulty}">${p.difficulty === 'hell' ? '地狱' : '标准'}</span>`;
      row.onclick = () => startPractice(p);
      card.appendChild(row);
    }
    grid.appendChild(card);
  }
}

/* ---- 陪练 ---- */
async function startPractice(persona) {
  const data = await api('/api/practice', { personaId: persona.id });
  current = { practiceId: data.practiceId, persona };
  $('modelBadge').textContent = data.modelKind === 'llm' ? 'LLM 模式' : '启发式模式（设 LLM_API_KEY 切真 LLM）';
  $('pName').textContent = persona.name;
  $('pRole').textContent = persona.role;
  $('pBrief').textContent = persona.brief;
  $('pDiff').innerHTML = `难度：<span class="diff-tag ${persona.difficulty}">${persona.difficulty === 'hell' ? '地狱' : '标准'}</span>`;
  $('chat').innerHTML = '';
  addMsg('persona', data.greeting);
  show('practice');
  $('input').focus();
}

function addMsg(role, text) {
  const el = document.createElement('div');
  el.className = `msg ${role}`;
  el.textContent = text;
  $('chat').appendChild(el);
  $('chat').scrollTop = $('chat').scrollHeight;
}

async function sendTurn() {
  const input = $('input');
  const text = input.value.trim();
  if (!text || !current) return;
  input.value = '';
  await deliverTurn(text);
}

async function deliverTurn(text) {
  addMsg('user', text);
  const btn = $('sendBtn');
  btn.disabled = true;
  const t0 = performance.now();
  let fillerTimer = null;
  if (voiceMode) {
    // 延迟掩蔽：300ms 内回复没回来，先应一声"嗯"，掩盖网络+生成延迟
    fillerTimer = setTimeout(() => speak('嗯——'), 300);
  }
  try {
    const data = await api(`/api/practice/${current.practiceId}/turn`, { text });
    if (fillerTimer) clearTimeout(fillerTimer);
    if (voiceMode && !data.ended) {
      voiceTracker.record(performance.now() - t0);
    }
    if (data.ended) {
      addMsg('system', '—— 练习结束 ——');
      endPractice();
    } else {
      addMsg('persona', data.reply);
      if (voiceMode) speak(data.reply);
    }
  } catch (e) {
    if (fillerTimer) clearTimeout(fillerTimer);
    addMsg('system', `出错了：${e.message}`);
  } finally {
    btn.disabled = false;
    $('input').focus();
  }
}

/* ---- 语音模式（Chrome Web Speech API，零密钥）---- */
let recognition = null;

function toggleVoiceMode() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { alert('当前浏览器不支持语音识别，请用 Chrome。'); return; }
  voiceMode = !voiceMode;
  $('micBtn').classList.toggle('listening', voiceMode);
  if (voiceMode) {
    recognition = new SR();
    recognition.lang = 'zh-CN';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (e) => {
      const text = e.results[0][0].transcript.trim();
      if (text && current) deliverTurn(text);
    };
    recognition.onend = () => { if (voiceMode && current) recognition.start(); }; // 持续听
    recognition.onerror = (e) => {
      if (e.error === 'not-allowed') { voiceMode = false; $('micBtn').classList.remove('listening'); }
    };
    recognition.start();
    addMsg('system', '🎤 语音模式已开启（Chrome 语音识别 + 合成）');
  } else if (recognition) {
    recognition.onend = null;
    recognition.stop();
    recognition = null;
    speechSynthesis.cancel();
    addMsg('system', '语音模式已关闭');
  }
}

function speak(text) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/（[^）]*）/g, '')); // 括号动作不读
  u.lang = 'zh-CN';
  u.rate = 1.1;
  speechSynthesis.speak(u);
}

/* ---- 报告 ---- */
async function endPractice() {
  const data = await api(`/api/practice/${current.practiceId}/end`, {});
  const { report, softTotal, grade, srs, annotated, persona } = data;
  const dims = [
    ['提问率', report.hard.questionRate],
    ['开放题占比', report.hard.openQuestionRate],
    ['痛点命中', report.hard.painHitRate],
    ['剧情完成度', report.anchorCoverage],
  ];
  const soft = Object.entries(report.soft).map(([k, v]) => [({ opening: '开场破冰', listening: '提问倾听', objection: '异议应对', value: '价值传递', closing: '推进收尾' })[k] ?? k, v]);
  const marks = { question: '问句', 'open-question': '开放题', 'pain-hit': '痛点命中', 'next-step': '推进' };

  $('reportBody').innerHTML = `
    <div class="metric-grid">
      ${dims.concat(soft).map(([label, v]) => `
        <div class="metric">
          <div class="label">${label}</div>
          <div class="value">${v == null ? '—' : Math.round(v)}</div>
          <div class="bar"><i style="width:${v == null ? 0 : Math.min(100, v)}%"></i></div>
        </div>`).join('')}
      <div class="metric">
        <div class="label">综合评估</div>
        <div class="value">${softTotal.total ?? '硬指标 ' + Math.round((report.hard.questionRate + report.hard.painHitRate + report.anchorCoverage) / 3)}</div>
        <div class="label" style="margin-top:6px">复习等级 ${grade}/5 · ${srs.intervalDays} 天后建议再练</div>
      </div>
      ${voiceStatsHtml()}
    </div>
    <div class="transcript-card">
      <h3>逐句复盘（${persona} 场）</h3>
      ${annotated.filter((m) => m.role === 'user').map((m) => `
        <div class="t-line">你：${escapeHtml(m.text)}
          <span class="marks">${m.marks.map((x) => `<span class="mark ${x}">${marks[x] ?? x}</span>`).join('')}</span>
        </div>`).join('')}
    </div>`;
  show('report');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function voiceStatsHtml() {
  const s = voiceTracker.stats();
  if (s.n === 0) return '';
  const verdict = { ok: '✓ 达标', over: '⚠️ 超预算', insufficient: '样本不足' }[voiceTracker.verdict()];
  return `
    <div class="metric">
      <div class="label">语音应答延迟（${s.n} 次采样）</div>
      <div class="value">${Math.round(s.p50)}ms</div>
      <div class="label" style="margin-top:6px">p95 ${Math.round(s.p95)}ms · 预算 p50≤1500/p95≤2500 · ${verdict}</div>
    </div>`;
}

$('sendBtn').onclick = sendTurn;
$('micBtn').onclick = toggleVoiceMode;
$('input').addEventListener('keydown', (e) => { if (e.key === 'Enter') sendTurn(); });
$('endBtn').onclick = () => { addMsg('system', '—— 你结束了这场练习 ——'); endPractice(); };
$('backBtn').onclick = () => { show('home'); loadHome(); };

loadHome().catch((e) => { $('scenarioGrid').innerHTML = `<p>加载失败：${e.message}</p>`; });
