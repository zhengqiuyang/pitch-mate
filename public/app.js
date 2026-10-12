/* pitch-mate 前端：零依赖 vanilla JS。状态机：home → practice → report */
const $ = (id) => document.getElementById(id);
const views = { home: $('home'), practice: $('practice'), report: $('report') };
let current = null; // {practiceId, persona}

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
  addMsg('user', text);
  const btn = $('sendBtn');
  btn.disabled = true;
  try {
    const data = await api(`/api/practice/${current.practiceId}/turn`, { text });
    if (data.ended) {
      addMsg('system', '—— 练习结束 ——');
      endPractice();
    } else {
      addMsg('persona', data.reply);
    }
  } catch (e) {
    addMsg('system', `出错了：${e.message}`);
  } finally {
    btn.disabled = false;
    input.focus();
  }
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

$('sendBtn').onclick = sendTurn;
$('input').addEventListener('keydown', (e) => { if (e.key === 'Enter') sendTurn(); });
$('endBtn').onclick = () => { addMsg('system', '—— 你结束了这场练习 ——'); endPractice(); };
$('backBtn').onclick = () => { show('home'); loadHome(); };

loadHome().catch((e) => { $('scenarioGrid').innerHTML = `<p>加载失败：${e.message}</p>`; });
