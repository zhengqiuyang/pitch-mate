// pitch-mate 服务器：零依赖 Node http。静态前端 + JSON API。
// 模型选择：有 LLM_API_KEY 自动用 OpenAI 兼容端点，没有则启发式引擎（照常可玩）。
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createPersona, createSession, userTurn, endSession,
  createItem, review, gradeFromReport,
} from './vendor/roleplay-core/src/index.js';
import { createOpenAICompatModel } from './vendor/roleplay-core/src/openai-compat.js';
import { PERSONAS, personaById } from './src/personas.js';
import { SALES_RUBRIC, weightedTotal, annotateTranscript } from './src/rubric.js';
import { runPractice, practiceReport, chatModelAsPersona } from './src/coach.js';
import { createHeuristicCustomer } from './src/heuristic-customer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, 'public');
const PORT = Number(process.env.PORT || 3456);

const practices = new Map(); // practiceId -> {session, model, personaId}

function resolveModel(personaSpec) {
  if (process.env.LLM_API_KEY) {
    try {
      const chatModel = createOpenAICompatModel({
        baseUrl: process.env.LLM_BASE_URL,
        apiKey: process.env.LLM_API_KEY,
        model: process.env.LLM_MODEL,
      });
      return { model: chatModelAsPersona(chatModel, personaSpec), kind: 'llm' };
    } catch {
      // key 存在但配置不完整等——降级启发式，不崩服务
    }
  }
  return { model: createHeuristicCustomer(), kind: 'heuristic' };
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    return await staticFile(url, res);
  } catch (err) {
    json(res, 500, { error: err.message });
  }
});

async function api(req, res, url) {
  const send = (code, data) => json(res, code, data);

  if (req.method === 'GET' && url.pathname === '/api/personas') {
    return send(200, {
      personas: PERSONAS.map((p) => ({
        id: p.id, scenario: p.scenario, difficulty: p.difficulty,
        name: p.name, role: p.role, brief: p.brief,
      })),
    });
  }

  if (req.method === 'POST' && url.pathname === '/api/practice') {
    const body = await readJson(req);
    const persona = personaById(String(body.personaId || ''));
    if (!persona) return send(404, { error: '人设不存在' });
    const { model, kind } = resolveModel(persona);
    const id = `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const session = createSession(createPersona(persona), { maxTurns: 24 });
    practices.set(id, { session, model, personaId: persona.id });
    return send(200, {
      practiceId: id, modelKind: kind,
      greeting: `（电话接通）我是${persona.name}，${persona.role}。说吧，什么事？`,
      turn: 0,
    });
  }

  const turnMatch = url.pathname.match(/^\/api\/practice\/([\w-]+)\/turn$/);
  if (req.method === 'POST' && turnMatch) {
    const p = practices.get(turnMatch[1]);
    if (!p) return send(404, { error: '陪练不存在' });
    const body = await readJson(req);
    const text = String(body.text || '').slice(0, 2000).trim();
    if (!text) return send(400, { error: '空发言' });
    const events = userTurn(p.session, text);
    if (p.session.state !== 'running') {
      return send(200, { reply: '（时间到，本次练习结束）', turn: p.session.turn, ended: true });
    }
    const context = {
      personaBrief: `${p.session.persona.name}，${p.session.persona.role}`,
      sayTruthAbout: events.unlocked.map((u) => ({ key: u.key, value: u.value })),
      sceneBeatsThisTurn: events.anchors.map((a) => a.content),
    };
    const reply = await p.model.replyAsPersona(context, p.session.transcript);
    // personaTurn 由 coach 语义承担：直接记录（session.personaTurn 是导出的，但这里保持内聚）
    p.session.transcript.push({ role: 'persona', text: reply, turn: p.session.turn });
    return send(200, { reply, turn: p.session.turn, ended: false });
  }

  const endMatch = url.pathname.match(/^\/api\/practice\/([\w-]+)\/end$/);
  if (req.method === 'POST' && endMatch) {
    const p = practices.get(endMatch[1]);
    if (!p) return send(404, { error: '陪练不存在' });
    endSession(p.session);
    const report = await practiceReport(p.model.rubricScore ? p.model : null, p.session, SALES_RUBRIC);
    const total = weightedTotal(report.soft);
    const grade = gradeFromReport(report);
    const srs = review(createItem(p.personaId), grade);
    return send(200, {
      report,
      softTotal: total,
      grade,
      srs: { intervalDays: srs.intervalDays, lapses: srs.lapses },
      annotated: annotateTranscript(p.session),
      persona: p.session.persona.name,
    });
  }

  send(404, { error: '未知接口' });
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };

async function staticFile(url, res) {
  let p = url.pathname === '/' ? '/index.html' : url.pathname;
  const file = path.normalize(path.join(PUBLIC_DIR, p));
  if (!file.startsWith(PUBLIC_DIR)) return json(res, 403, { error: 'forbidden' });
  try {
    const data = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] ?? 'application/octet-stream' });
    res.end(data);
  } catch {
    json(res, 404, { error: 'not found' });
  }
}

function readJson(req, limit = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(new Error('请求体过大')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {}); }
      catch (e) { reject(new Error('JSON 解析失败')); }
    });
    req.on('error', reject);
  });
}

function json(res, code, data) {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

if (process.argv[1] && process.argv[1].endsWith('server.js')) {
  server.listen(PORT, () => {
    console.log(`pitch-mate 陪练舱 → http://localhost:${PORT}`);
    console.log(process.env.LLM_API_KEY ? '模型：LLM（LLM_API_KEY 已配置）' : '模型：启发式（设 LLM_API_KEY 可切换真 LLM）');
  });
}

export { server };
