const routes = document.querySelectorAll("[data-route]");
const views = document.querySelectorAll(".app-view");
const screen = document.getElementById("screen");

function showView(id) {
  views.forEach((view) => view.classList.toggle("active", view.id === id));
  screen.scrollTo({ top: 0, behavior: "smooth" });
  document.querySelectorAll(".bottom-tab button").forEach((button) => {
    button.classList.toggle("active", button.dataset.route === id || (id !== "cmbHome" && button.dataset.route === "guardianHome"));
  });
  if (id === "voiceConsult") {
    bootChat();
  }
}

routes.forEach((element) => {
  element.addEventListener("click", () => showView(element.dataset.route));
});

const chatList = document.getElementById("chatList");
const analysisCard = document.getElementById("analysisCard");
const recordBtn = document.getElementById("recordBtn");
const resetDemo = document.getElementById("resetDemo");
let chatBooted = false;

function addBubble(text, type = "ai") {
  const bubble = document.createElement("div");
  bubble.className = `bubble ${type}`;
  bubble.textContent = text;
  chatList.appendChild(bubble);
}

function bootChat(force = false) {
  if (chatBooted && !force) return;
  chatBooted = true;
  chatList.innerHTML = "";
  analysisCard.classList.remove("show");
  addBubble("你好，我是AI保障管家。你可以直接说一段话，包括家庭情况、房贷、已有保单和预算。", "ai");
}

function simulateVoice() {
  recordBtn.textContent = "识别中...";
  setTimeout(() => {
    addBubble("我35岁，已婚，有一个5岁孩子，房贷还剩180万，公司有五险一金，买过医疗险但不知道够不够，每月预算1000多。", "user");
    recordBtn.textContent = "AI分析中...";
  }, 500);

  setTimeout(() => {
    addBubble("我已经把你的语音拆解成保障档案草稿，请确认下面信息是否准确。", "ai");
    analysisCard.classList.add("show");
    recordBtn.textContent = "继续补充";
  }, 1400);
}

recordBtn.addEventListener("click", simulateVoice);
resetDemo.addEventListener("click", () => {
  chatBooted = false;
  bootChat(true);
  recordBtn.textContent = "按住说话";
});

document.querySelectorAll("[data-confirm]").forEach((button) => {
  button.addEventListener("click", () => {
    addBubble("全部正确。", "user");
    addBubble("已生成保障档案：家庭责任较高，已有医疗保障，但寿险和重疾缺口需要重点分析。", "ai");
    setTimeout(() => showView("reportView"), 800);
  });
});

document.querySelectorAll("[data-edit]").forEach((button) => {
  button.addEventListener("click", () => {
    addBubble("第2点需要修改：房贷不是180万，是220万。", "user");
    addBubble("已更新：房贷剩余约220万。寿险缺口会同步调高，后续方案将以新信息计算。", "ai");
  });
});

document.getElementById("scanPolicy").addEventListener("click", () => {
  const policyList = document.getElementById("policyList");
  const newCard = document.createElement("article");
  newCard.className = "policy-card pending";
  newCard.innerHTML = `
    <div class="policy-icon">寿</div>
    <div>
      <strong>新识别：定期寿险草稿</strong>
      <p>被保人：本人｜保额20万｜字段待确认</p>
      <span>AI提示：保额明显不足，建议经理复核家庭责任缺口</span>
    </div>
  `;
  policyList.prepend(newCard);
});

showView("cmbHome");
