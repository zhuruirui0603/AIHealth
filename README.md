# 健康助手（AIHealth）

> AI 营养健康决策助手 — 纯前端架构，浏览器直连 DeepSeek，会话存 IndexedDB，本地 BM25 知识检索 + Tavily 联网搜索兜底。

## 核心特性

- **纯前端运行** — 无后端服务器，静态托管管到 Vercel 即可
- **本地知识库** — 24 篇营养学文献内置打包，BM25 查完全离线
- **联网搜索兜底** — 本地知识库命中不足时，Tavily 联网搜索补充来源
- **用户画像驱动** — 回答结合用户个人情况（年龄/体重/目标等）
- **引用可溯源** — 回答附可折叠参考来源卡片，点击跳转原文
- **领域门控** — 非健康问题不触发检索、不展示参考来源和免责声明

## 技术栈

| 层级 | 技术 | 用途 |
|------|------|------|
| 框架 | Next.js 14 | App Router |
| UI | @ant-design/x 2.9 + antd 6 | Bubble.List / Welcome / Prompts / Conversations |
| 逻辑 | @ant-design/x-sdk | useXChat / DeepSeekChatProvider / XRequest |
| 存储 | Dexie (IndexedDB) + localStorage | 会话 / 消息 / 画像 |
| 检索 | BM25Okapi | 本地知识库关键词检索（中文按字切分） |
| 联网 | Tavily API | 知识库不足时兜底搜索 |
| LLM | DeepSeek API | SSE 流式对话 |
| 字体 | HarmonyOS Sans SC | 全站默认中文字体 |
| 部署 | Vercel | 自动部署 |

## 快速启动

### 1. 配置环境变量

复制 `.env.example` 为 `.env.local`，填入 API Key：

```bash
cp .env.example .env.local
```

```env
# DeepSeek API Key（必填，https://platform.deepseek.com 注册）
NEXT_PUBLIC_DEEPSEEK_API_KEY=sk-your-key

# Tavily 联网搜索 API Key（可选，https://tavily.com 注册，免费 1000 次/月）
NEXT_PUBLIC_TAVILY_API_KEY=tvly-your-key
```

> **安全提示**：`NEXT_PUBLIC_` 前缀变量会在构建时打进客户端 bundle，网站访客可在 DevTools 中查看。这是纯前端架构的固有取舍。

### 2. 安装依赖

```bash
npm install
```

### 3. 启动开发服务器

```bash
npm run dev
```

或双击 `start-frontend.bat`，访问 http://localhost:3000

### 4. 使用

- 点击快捷按钮发送预设问题，或直接输入健康问题
- 多轮对话，上下文自动保持
- 页面刷新后会话恢复（IndexedDB 持久化）
- 侧栏可新建/搜索/置顶/重命名/删除/导出会话
- 底部"个人信息"可编辑用户画像，个性化回答

## 核心场景

1. **膳食推荐** — "我今天不知道吃什么，帮我推荐一下适合我的早餐和午餐？"
2. **运动营养** — "晚上 8 点去健身，现在 5 点半应该吃什么？"
3. **食品安全** — "昨天炒的鸡肉一直放冰箱，今天还能吃吗？"
4. **症状自查** — "最近每天下午三四点都特别饿，是不是跟饮食有关？"

## 回答格式

AI 回答遵循六段式结构化格式：

```
## 结论      — 直接给出核心结论或建议
## 原因      — 解释原因和逻辑
## 根据你的情况 — 结合用户画像的具体分析
## 可以怎么做  — 可执行的行动建议，分点列出
## 依据      — 支持结论的依据，标注 [1] [2] 引用
## 注意      — 风险提示或建议咨询专业人士的情况
```

回答末尾附"参考来源"卡片（可折叠），按文档去重，点击跳转原文。

## 项目结构

```
AIHealth/
├── .env.example                    # 环境变量示例
├── .env.local                      # 本地环境变量（不入版本控制）
├── next.config.mjs                  # Next.js 配置
├── vercel.json                      # Vercel 部署配置
├── start-frontend.bat               # 一键启动开发服务器
├── package.json
│
├── data/
│   └── knowledge/                    # 知识库源文件（24 个 Markdown）
│       ├── exercise/      (3 个)
│       ├── food_safety/   (4 个)
│       ├── medical/        (3 个)
│       └── nutrition/      (14 个, 含 china-dris-2023.md)
│
├── scripts/
│   └── build-knowledge-bundle.js    # 知识库构建脚本
│
├── public/
│   └── fonts/                        # HarmonyOS Sans SC 字体
│       ├── HarmonyOS_Sans_SC_Regular.woff2
│       ├── HarmonyOS_Sans_SC_Medium.woff2
│       └── HarmonyOS_Sans_SC_Bold.woff2
│
├── docs/                             # 项目文档
│   ├── PRD.md                       # 产品需求文档
│   ├── DEMO_PLAN.md
│   ├── NutriHealth_AI.md
│   └── NutriHealth_AI_Project_Notes.md
│
└── src/
    ├── app/
    │   ├── layout.tsx               # 根布局（metadata: 健康助手）
    │   ├── page.tsx                 # 首页（挂载 ChatShell）
    │   └── globals.css              # 全局样式 + 字体 + 主题变量
    │
    ├── components/
    │   ├── ChatShell.tsx            # 主界面（对话+侧栏+空态+输入框）
    │   ├── ProfileModal.tsx          # 用户画像设置弹窗
    │   └── chat/
    │       ├── Sidebar.tsx             # 侧栏（会话列表+搜索+品牌）
    │       ├── ChatHeader.tsx          # 顶部导航栏（悬浮，毛玻璃）
    │       ├── BubbleRole.tsx        # Bubble 角色配置（渲染+footer）
    │       ├── SourcesList.tsx       # 参考来源列表（可折叠）
    │       ├── constants.ts          # 常量（QUICK_PROMPTS, TEMP_PREFIX）
    │       ├── types.ts                # BubbleExtra 类型
    │       ├── useSpeechInput.ts      # 语音输入 Hook
    │       └── titleGenerator.ts       # 自动标题生成
    │
    ├── data/
    │   └── knowledge-bundle.json     # 知识库构建产物
    │
    ├── lib/
    │   ├── local/
    │   │   ├── bm25.ts               # BM25 检索算法
    │   │   ├── conversationStore.ts  # 会话存储 CRUD (IndexedDB)
    │   │   ├── db.ts                 # Dexie 数据库 schema
    │   │   ├── profile.ts            # 用户画像管理 (localStorage)
    │   │   └── promptBuilder.ts     # System prompt 构建器
    │   ├── search/
    │   │   └── webSearch.ts          # Tavily 联网搜索兜底
    │   └── providers/
    │       └── NutriHealthProvider.ts  # DeepSeek Provider + RAG 集成
    │
    └── types/
        └── chat.ts                    # 全局类型定义
```

## 知识库更新

编辑 `data/knowledge/` 下的 Markdown 文件（需含 YAML frontmatter），然后：

```bash
npm run build:knowledge   # 重新生成 src/data/knowledge-bundle.json
```

Markdown 文件按 `##` / `###` 标题分块，过短切片（<50 字符）合并到前一区块。

## 部署

### Vercel（推荐）

1. Fork GitHub 仓库
2. 在 Vercel 导入仓库，选择项目根目录（无子目录）
3. 配置环境变量 `NEXT_PUBLIC_DEEPSEEK_API_KEY` 和 `NEXT_PUBLIC_TAVILY_API_KEY`
4. 生产分支设为 `master-纯前端存储`
5. 自动部署

### 其他平台

构建后 `npm run build` 可托管到任意静态服务器（Netlify / Cloudflare Pages / GitHub Pages / Nginx）。

## 数据存储

| 存储层 | 技术 | 用途 |
|--------|------|------|
| 持久化 | IndexedDB (Dexie, `nutrihealth-demo`) | 会话 + 消息（含 RAG 来源） |
| 用户画像 | localStorage (`nutrihealth_user_profile`) | 年龄/体重/目标等 |
| 会话恢复 | localStorage (`conversation_id`) | 上次会话 ID |
| 知识库 | 静态 JSON (`knowledge-bundle.json`) | 24 篇文献，构建时打入 |

## 文档

- [`docs/PRD.md`](docs/PRD.md) — 产品需求文档（完整功能与架构说明）
- [`docs/DEMO_PLAN.md`](docs/DEMO_PLAN.md) — Demo 阶段规划
- [`docs/NutriHealth_AI.md`](docs/NutriHealth_AI.md) — 产品原始设想
- [`docs/NutriHealth_AI_Project_Notes.md`](docs/NutriHealth_AI_Project_Notes.md) — 项目开发笔记

## 后续规划

| 功能 | 说明 | 优先级 |
|------|------|--------|
| 跨路精排 | 本地 BM25 与 Tavily 分数归一化，统一重排 | P2 |
| 停止生成 | 流式输出中途可中止请求 | P1 |
| 向量混合检索 | Embedding API + RRF 融合 | P2 |
| Next.js 升级 | 从 14.2.15 升级到最新版（修复 CVE） | P2 |

---

**免责声明**：本应用回答由 AI 生成，内容仅供参考，请仔细甄别，持续不适请及时就医。本应用不进行疾病诊断或开具处方。
