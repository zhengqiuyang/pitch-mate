# pitch-mate · 销售谈判 AI 陪练 🎯
[![CI](https://github.com/zhengqiuyang/pitch-mate/actions/workflows/ci.yml/badge.svg)](https://github.com/zhengqiuyang/pitch-mate/actions/workflows/ci.yml) [![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

> AI 扮演难缠客户，陪销售练话术——冷启动电话、需求挖掘、异议处理、逼单谈判，
> 逐轮追问、多维评分、复盘到每一句话。interview-mate 的姊妹篇：面试官换成了客户。

**Wave 1 · 组合定位见 [portfolio-roadmap](../portfolio-roadmap.md) · 状态：M0 文档就绪，待定稿**

## 文档索引

| 文档 | 内容 | 状态 |
|---|---|---|
| [01-定位与市场](docs/01-定位与市场.md) | 目标用户、竞品格局（Hyperbound 等）、定价与渠道 | 【提案】 |
| [02-产品设计](docs/02-产品设计.md) | 陪练场景矩阵、人设系统、评分维度、复盘产品 | 【提案】 |
| [03-技术方案](docs/03-技术方案.md) | roleplay-core 复用、语音链路、评测集 | 【提案】 |
| [04-生产计划与风险](docs/04-生产计划与风险.md) | 里程碑、kill 准则、风险登记表 | 【提案】 |

## 一句话卖点（对销售团队）

新销售上手周期从 3 个月压到 1 个月——不是靠听课，是靠每天和 AI 客户打 20 分钟实战。

## 现在就能玩

```bash
npm start          # → http://localhost:3456 陪练舱（启发式客户引擎，无需 API key）
# 有 LLM 时：
LLM_API_KEY=sk-xxx LLM_BASE_URL=https://api.xxx/v1 LLM_MODEL=gpt-4o-mini npm start
```

Web 端：选场景/难度 → 和难缠客户对话（问对问题 TA 才透露真话）→ 结束看复盘报告
（提问率/痛点命中/剧情完成度 + 逐句标注 + 间隔重复复训计划）。

**语音模式**：点 🎤 开启（Chrome）——语音识别 + 合成 + 延迟掩蔽（回复迟到 300ms 先应"嗯——"），
复盘报告附带 p50/p95 应答延迟与预算判定（p50≤1500ms / p95≤2500ms）。零密钥。
