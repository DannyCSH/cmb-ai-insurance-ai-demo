import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = Number(process.env.PORT || 3000);
const baseUrl = (process.env.ANTHROPIC_BASE_URL || "https://token-plan-sgp.xiaomimimo.com/anthropic").replace(/\/+$/, "");
const model = process.env.ANTHROPIC_MODEL || "mimo-v2-pro";
const authToken = process.env.ANTHROPIC_AUTH_TOKEN;
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && (allowedOrigins.length === 0 || allowedOrigins.includes(origin))) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "cmb-ai-insurance-ai-demo",
    model,
    aiConfigured: Boolean(authToken),
    time: new Date().toISOString()
  });
});

app.post("/api/insurance/analyze", async (req, res) => {
  try {
    const input = normalizeInput(req.body?.input);
    const corrections = normalizeOptionalText(req.body?.corrections);
    const result = await runInsuranceAnalysis(input, corrections);
    res.json({ ok: true, result });
  } catch (error) {
    console.error("analysis_failed", sanitizeError(error));
    res.status(error.statusCode || 500).json({
      ok: false,
      error: error.publicMessage || "AI分析失败，请稍后重试。"
    });
  }
});

app.post("/api/insurance/manager-report", async (req, res) => {
  try {
    const profile = req.body?.profile;
    const analysis = req.body?.analysis;
    const result = await runManagerReport(profile, analysis);
    res.json({ ok: true, result });
  } catch (error) {
    console.error("manager_report_failed", sanitizeError(error));
    res.status(error.statusCode || 500).json({
      ok: false,
      error: error.publicMessage || "经理报告生成失败，请稍后重试。"
    });
  }
});

app.get("/ai", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "ai.html"));
});

app.use((req, res) => {
  res.status(404).json({ ok: false, error: "Not found" });
});

app.listen(port, () => {
  console.log(`CMB AI insurance demo listening on ${port}`);
});

function normalizeInput(value) {
  const input = String(value || "").trim();
  if (input.length < 8) {
    const error = new Error("Input too short");
    error.statusCode = 400;
    error.publicMessage = "请先输入一段客户原话，至少包含家庭、保障或预算信息。";
    throw error;
  }
  if (input.length > 1800) {
    const error = new Error("Input too long");
    error.statusCode = 400;
    error.publicMessage = "输入过长，请控制在1800字以内。";
    throw error;
  }
  return input;
}

function normalizeOptionalText(value) {
  const text = String(value || "").trim();
  return text.slice(0, 800);
}

async function runInsuranceAnalysis(input, corrections) {
  const system = [
    "你是招商银行App内嵌产品“AI保障管家”的保险需求挖掘与推荐分流引擎。",
    "你的任务不是直接销售保险，而是把客户自然语言转成可确认的保障档案、保障需求和分流建议。",
    "必须符合金融保险合规表达：不承诺收益，不替代人工适当性确认；复杂保险产品只建议转客户经理复核。",
    "必须区分收入、预算、负债、保额等金额字段；房贷余额不能写成收入，保险预算不能写成收入。",
    "客户未明确说出的事实不能编造；不确定的信息必须放入missing_info或说明需补充确认。",
    "只输出JSON，不输出Markdown，不输出额外解释。"
  ].join("\n");

  const user = [
    "请基于以下客户原话，完成保险需求挖掘、保障缺口推理和推荐分流。",
    corrections ? `用户修正信息：${corrections}` : "",
    `客户原话：${input}`,
    "",
    "返回JSON结构必须完全符合：",
    JSON.stringify({
      confirmed_summary: ["编号式客户事实，5-7条，使用中文短句"],
      extracted_profile: {
        family_stage: "家庭阶段",
        income_role: "收入责任",
        liabilities: "负债/房贷信息",
        existing_coverage: "已有保障",
        health_concern: "健康担忧",
        budget: "预算偏好",
        missing_info: ["仍需补充的信息"]
      },
      ai_tags: ["8-12个AI标签"],
      insurance_needs: [
        {
          need: "保障需求名称",
          priority: "高/中/低",
          rationale: "为什么需要",
          product_direction: "对应险种方向",
          service_route: "standard_self_service/manager_review/ask_more/no_recommend"
        }
      ],
      routing_decision: {
        path: "standard_self_service/manager_review/ask_more/no_recommend",
        reason: "分流原因",
        next_action: "下一步动作"
      },
      user_facing_explanation: "给客户看的自然语言说明，120字以内",
      compliance_notes: ["关键风险提示，3-5条"]
    })
  ].filter(Boolean).join("\n");

  const text = await callAnthropicMessages({ system, user, maxTokens: 6000, temperature: 0 });
  return parseJsonPayload(text);
}

async function runManagerReport(profile, analysis) {
  const system = [
    "你是招商银行客户经理工作台的AI保障推荐小助。",
    "你根据AI保障档案生成经理可复核报告，帮助经理沟通复杂保险需求。",
    "不得直接促成复杂保险成交；必须保留人工复核、适当性确认和风险提示。",
    "只输出JSON，不输出Markdown，不输出额外解释。"
  ].join("\n");

  const user = [
    "请生成经理版保障报告。",
    `客户画像：${JSON.stringify(profile || {}, null, 2)}`,
    `AI分析：${JSON.stringify(analysis || {}, null, 2)}`,
    "",
    "返回JSON结构必须完全符合：",
    JSON.stringify({
      manager_brief: "客户经理30秒摘要",
      priority_customer_signals: ["高优先级信号，3-5条"],
      recommendation_basis: ["推荐依据，4-6条"],
      plan_adjustment_points: ["经理需要复核/调优的点，4-6条"],
      client_talk_track: {
        opening: "开场话术",
        gap_explanation: "保障缺口解释",
        objection_handling: ["常见异议处理，3条"],
        risk_disclosure: "风险提示话术"
      },
      feedback_options: ["采纳AI建议", "调整保额/期限", "补充健康告知", "暂缓跟进", "不适配不推荐"]
    })
  ].join("\n");

  const text = await callAnthropicMessages({ system, user, maxTokens: 5000, temperature: 0 });
  return parseJsonPayload(text);
}

async function callAnthropicMessages({ system, user, maxTokens, temperature }) {
  if (!authToken) {
    const error = new Error("Missing ANTHROPIC_AUTH_TOKEN");
    error.statusCode = 500;
    error.publicMessage = "后端未配置AI密钥。";
    throw error;
  }

  const response = await fetch(`${baseUrl}/v1/messages`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "anthropic-version": "2023-06-01",
      "x-api-key": authToken,
      "authorization": `Bearer ${authToken}`
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature,
      system,
      messages: [
        {
          role: "user",
          content: user
        }
      ]
    })
  });

  const raw = await response.text();
  if (!response.ok) {
    const error = new Error(`AI provider error ${response.status}: ${raw.slice(0, 500)}`);
    error.statusCode = response.status >= 500 ? 502 : 500;
    error.publicMessage = "AI供应商接口调用失败，请检查模型、地址或密钥配置。";
    throw error;
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    const error = new Error(`Invalid provider JSON: ${raw.slice(0, 500)}`);
    error.statusCode = 502;
    error.publicMessage = "AI供应商返回格式异常。";
    throw error;
  }

  const contentItems = Array.isArray(data?.content) ? data.content : [];
  const text = contentItems
    .map((item) => item?.text || item?.input_json || item?.json || "")
    .filter((value) => typeof value === "string")
    .join("\n")
    .trim();

  const thinking = contentItems
    .map((item) => item?.thinking || "")
    .filter((value) => typeof value === "string")
    .join("\n")
    .trim();

  if (!text) {
    const error = new Error(`Empty provider text. stop_reason=${data?.stop_reason || "unknown"} thinking_length=${thinking.length}`);
    error.statusCode = 502;
    error.publicMessage = data?.stop_reason === "max_tokens"
      ? "AI推理内容过长，请缩短输入后重试。"
      : "AI没有返回有效内容。";
    throw error;
  }
  return text;
}

function parseJsonPayload(text) {
  const trimmed = text.trim();
  const direct = tryParseJson(trimmed);
  if (direct) return direct;

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    const parsed = tryParseJson(fenced[1].trim());
    if (parsed) return parsed;
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    const parsed = tryParseJson(trimmed.slice(start, end + 1));
    if (parsed) return parsed;
  }

  const error = new Error(`Could not parse AI JSON: ${trimmed.slice(0, 500)}`);
  error.statusCode = 502;
  error.publicMessage = "AI返回内容无法解析为结构化结果。";
  throw error;
}

function tryParseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function sanitizeError(error) {
  return {
    message: error.message?.replace(authToken || "__never__", "[redacted]"),
    statusCode: error.statusCode
  };
}
