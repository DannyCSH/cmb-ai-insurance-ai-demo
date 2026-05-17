# AI保障管家真实AI Demo

这是 `cmb-ai-insurance-demo` 的独立镜像增强版，包含：

- 静态手机App Demo：`/`
- 真实AI体验页：`/ai`
- AI需求挖掘接口：`POST /api/insurance/analyze`
- 经理报告接口：`POST /api/insurance/manager-report`

## Railway 部署

在 Railway 中选择 **New Project → Deploy from GitHub repo**，选择本仓库：

```text
https://github.com/DannyCSH/cmb-ai-insurance-ai-demo
```

Railway 会自动识别 Node.js 项目，启动命令来自 `railway.json`：

```text
npm start
```

## 必填环境变量

在 Railway Service 的 Variables 中配置：

```text
ANTHROPIC_BASE_URL=https://token-plan-sgp.xiaomimimo.com/anthropic
ANTHROPIC_MODEL=mimo-v2-pro
ANTHROPIC_AUTH_TOKEN=你的Mimo API Token
```

可选：

```text
ALLOWED_ORIGINS=
```

如果只通过 Railway 域名访问，可以留空。

## 体验入口

部署完成后，在 Railway 的 service 设置中点击 **Networking → Generate Domain**。

假设生成域名为：

```text
https://xxx.up.railway.app
```

则访问：

```text
https://xxx.up.railway.app/ai
```

即可体验真实AI保险需求挖掘。
