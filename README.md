# 潜能挖掘师 · Talent Discovery Coach (talent-discovery-coach-byCRQS)

通过 8–15 个深度提问，帮你发现那些"你以为很普通、其实别人很难做到、且能跨界迁移"的隐藏天赋。

- **Author**: CRQS
- **Stack**: Next.js 14 (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Recharts
- **Theme**: 浅粉 / 白粉 / 白 主基调，移动端友好
- **核心交互**: SSE 流式聊天 + 一键生成可视化潜能报告（雷达图）

---

## ✨ 功能

- 💬 聊天界面：SSE 流式输出，逐字渲染助手回复
- 🌸 系统提示词：内置 Talent Discovery Coach v4.1（含价值取向四象限内部假设、反巴纳姆溯源装置等完整工作流）
- 📊 潜能报告：一键基于完整对话生成 JSON 总结 + Recharts 雷达图（粉色渐变）
- 📱 响应式：桌面 / 移动端均可
- 🔐 OpenAI 兼容：通过环境变量切换任何 OpenAI 兼容 API（OpenAI / DeepSeek / 通义 / GLM …）

---

## 🚀 本地运行

### 1. 安装依赖

```bash
cd talent-discovery-coach-byCRQS
npm install
```

### 2. 配置环境变量

复制示例文件并填入你的 API 凭据：

```bash
# Windows PowerShell
Copy-Item .env.local.example .env.local

# macOS / Linux
cp .env.local.example .env.local
```

编辑 `.env.local`：

```env
API_KEY=sk-your-api-key-here
API_BASE_URL=https://api.openai.com/v1
MODEL_NAME=gpt-4o-mini
```

`API_BASE_URL` 常见取值：

| 服务商 | API_BASE_URL |
|---|---|
| OpenAI | `https://api.openai.com/v1` |
| DeepSeek | `https://api.deepseek.com/v1` |
| 通义千问（DashScope 兼容） | `https://dashscope.aliyuncs.com/compatible-mode/v1` |
| 智谱 GLM | `https://open.bigmodel.cn/api/paas/v4` |
| Moonshot Kimi | `https://api.moonshot.cn/v1` |

### 3. 启动开发服务器

```bash
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000) 即可使用。

### 4. 生产构建

```bash
npm run build
npm run start
```

---

## ☁️ 部署到 Vercel

1. 把项目推到 GitHub / GitLab / Bitbucket
2. 在 [vercel.com](https://vercel.com/new) 导入仓库
3. 在 Project Settings → Environment Variables 中添加：
   - `API_KEY`
   - `API_BASE_URL`
   - `MODEL_NAME`
4. 点击 **Deploy** —— 完成

> ⚠️ 不要把 `.env.local` 提交到仓库；Vercel 通过控制台注入环境变量。

---

## 📁 项目结构

```
talent-discovery-coach-byCRQS/
├─ app/
│  ├─ api/
│  │  ├─ chat/route.ts         # SSE 流式聊天接口
│  │  └─ summary/route.ts      # 报告生成接口（返回 JSON）
│  ├─ globals.css              # Tailwind + 粉色主题变量
│  ├─ layout.tsx               # 根布局
│  └─ page.tsx                 # 首页（chat / report 视图切换）
├─ components/
│  ├─ ui/                      # shadcn 基础组件
│  │  ├─ button.tsx
│  │  ├─ card.tsx
│  │  ├─ input.tsx
│  │  ├─ scroll-area.tsx
│  │  └─ textarea.tsx
│  ├─ chat-interface.tsx       # 聊天主界面（流式 + 结束按钮）
│  └─ report-view.tsx          # 报告视图（雷达图 + 总结）
├─ lib/
│  ├─ system-prompt.ts         # Talent Discovery Coach v4.1 系统提示词 + 报告 prompt
│  ├─ types.ts                 # ChatMessage / SummaryResult 类型
│  └─ utils.ts                 # cn() 工具
├─ .env.local.example
├─ components.json             # shadcn 配置
├─ next.config.mjs
├─ package.json
├─ postcss.config.mjs
├─ tailwind.config.ts
└─ tsconfig.json
```

---

## 🧠 系统提示词要点

完整提示词在 `lib/system-prompt.ts`，关键设计：

- **8–15 题弹性节奏**：3 题校准 + 5–12 题深挖
- **价值取向四象限内部假设**（① 理想 / ② 金钱 / ③ 两手抓 / ④a 摆烂 / ④b 反内卷 / ④c 资产托底）—— 永不向用户披露分类标签
- **④c 高阈值原则**：没有用户主动、明确的家庭经济信号，一律默认归入 ④b
- **反巴纳姆溯源装置**：每条判断必须能回到对话原文里指出依据
- **跨界迁移硬要求**：每个候选方向至少 2 个跨域应用（伊戈达拉原则）

---

## 🛠 关键技术细节

- **流式输出**：`/api/chat` 使用 ReadableStream + SSE (`data: {...}\n\n`)，前端用 `getReader().read()` 逐字渲染
- **JSON 报告**：`/api/summary` 调用模型时附加 `response_format: { type: "json_object" }`，并兜底解析 markdown 围栏 / 大括号截取
- **状态**：所有对话历史保存在前端 React state，刷新即清空（无后端持久化，符合需求）
- **样式**：浅粉/白粉主基调，玻璃态 Card + 粉色渐变按钮，雷达图使用 `linearGradient` 粉色填充

---

## 📜 License

MIT © CRQS
