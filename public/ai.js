const form = document.getElementById("analysisForm");
const customerInput = document.getElementById("customerInput");
const correctionInput = document.getElementById("correctionInput");
const sampleBtn = document.getElementById("sampleBtn");
const analyzeBtn = document.getElementById("analyzeBtn");
const managerBtn = document.getElementById("managerBtn");
const statusText = document.getElementById("statusText");
const statusDot = document.getElementById("statusDot");
const emptyState = document.getElementById("emptyState");
const resultGrid = document.getElementById("resultGrid");
const summaryList = document.getElementById("summaryList");
const tagList = document.getElementById("tagList");
const needsList = document.getElementById("needsList");
const routeCard = document.getElementById("routeCard");
const userExplanation = document.getElementById("userExplanation");
const complianceList = document.getElementById("complianceList");
const managerCard = document.getElementById("managerCard");
const managerBrief = document.getElementById("managerBrief");
const managerSignals = document.getElementById("managerSignals");
const managerBasis = document.getElementById("managerBasis");
const managerTalk = document.getElementById("managerTalk");

let latestAnalysis = null;

sampleBtn.addEventListener("click", () => {
  customerInput.value = "我35岁，已婚，有一个3岁的孩子，家里房贷还剩120万。我是家里主要收入来源，公司有五险一金，之前买过一份百万医疗，但不知道够不够。每年保险预算大概五六千，主要担心自己突然出事，或者大病住院后影响家里还贷和孩子教育。";
  correctionInput.value = "";
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  await analyze();
});

managerBtn.addEventListener("click", async () => {
  if (!latestAnalysis) return;
  setStatus("正在生成经理版报告...", "loading");
  managerBtn.disabled = true;
  try {
    const response = await fetch("/api/insurance/manager-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profile: latestAnalysis.extracted_profile,
        analysis: latestAnalysis
      })
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) throw new Error(payload.error || "经理报告生成失败");
    renderManager(payload.result);
    setStatus("经理版报告已生成。", "ready");
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    managerBtn.disabled = false;
  }
});

async function analyze() {
  setStatus("正在调用真实AI分析...", "loading");
  analyzeBtn.disabled = true;
  managerBtn.disabled = true;
  try {
    const response = await fetch("/api/insurance/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: customerInput.value,
        corrections: correctionInput.value
      })
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) throw new Error(payload.error || "AI分析失败");
    latestAnalysis = payload.result;
    renderAnalysis(latestAnalysis);
    setStatus("真实AI分析完成，可继续生成经理报告。", "ready");
    managerBtn.disabled = false;
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    analyzeBtn.disabled = false;
  }
}

function renderAnalysis(result) {
  emptyState.classList.add("hidden");
  resultGrid.classList.remove("hidden");
  managerCard.classList.add("hidden");

  renderList(summaryList, result.confirmed_summary || [], "ol");
  tagList.innerHTML = "";
  (result.ai_tags || []).forEach((tag) => {
    const item = document.createElement("span");
    item.className = "tag";
    item.textContent = tag;
    tagList.appendChild(item);
  });

  needsList.innerHTML = "";
  (result.insurance_needs || []).forEach((need) => {
    const item = document.createElement("div");
    item.className = "need-item";
    item.innerHTML = `
      <strong>${escapeHtml(need.need || "保障需求")}<span class="priority">${escapeHtml(need.priority || "")}</span></strong>
      <div>${escapeHtml(need.rationale || "")}</div>
      <small>${escapeHtml(need.product_direction || "")} / ${escapeHtml(need.service_route || "")}</small>
    `;
    needsList.appendChild(item);
  });

  const route = result.routing_decision || {};
  routeCard.innerHTML = `
    <strong>${escapeHtml(route.path || "待判断")}</strong>
    <p>${escapeHtml(route.reason || "")}</p>
    <span>${escapeHtml(route.next_action || "")}</span>
  `;

  userExplanation.textContent = result.user_facing_explanation || "";
  renderList(complianceList, result.compliance_notes || [], "ul");
}

function renderManager(result) {
  managerCard.classList.remove("hidden");
  managerBrief.textContent = result.manager_brief || "";
  renderList(managerSignals, result.priority_customer_signals || [], "ul");
  renderList(managerBasis, result.recommendation_basis || [], "ul");
  const talk = result.client_talk_track || {};
  managerTalk.textContent = [talk.opening, talk.gap_explanation, talk.risk_disclosure].filter(Boolean).join(" ");
}

function renderList(element, items) {
  element.innerHTML = "";
  items.forEach((text) => {
    const li = document.createElement("li");
    li.textContent = text;
    element.appendChild(li);
  });
}

function setStatus(text, state) {
  statusText.textContent = text;
  statusDot.className = `status-dot ${state || ""}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
