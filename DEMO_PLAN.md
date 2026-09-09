# NutriHealth AI 纯前端 Demo 改造方案（v2 · Ant Design X 版）

> 日期：2026-09-08 ｜ 状态：待评审
> v2 变更：UI 层从 `@assistant-ui/react` + 手写组件切换为 **Ant Design X 官方全家桶**（`@ant-design/x` + `@ant-design/x-sdk` + `@ant-design/x-markdown`），聊天 UI、消息状态、会话管理、流式请求、Markdown 渲染全部改用官方实现，删除全部自研 UI 代码。

## 1. 背景与目标

### 1.1 现状

当前为前后端分离架构，演示与维护成本高：

- 需同时启动 FastAPI 后端（8000）和 Next.js 前端（3000）
- 后端依赖 Python 环境 + sentence-transformers（首次运行需下载 ~100MB 本地 embedding 模型）
- 前端 UI 为 `@assistant-ui/react` 的 external store 桥接 + 8 个手写组件（MyThread/ChatMessage/ChatWindow/ChatInput/ConversationList/CitationCard/MarkdownRenderer/QuickActions），SSE 解析器也是手写的

### 1.2 目标

1. **纯前端运行**：`npm run dev` 或纯静态托管即可完成全部演示，数据存浏览器本地
2. **UI 维护成本最小化**：聊天界面全面采用 Ant Design X 官方组件与 hooks，删除自研 UI 与 `@assistant-ui/react`
3. **演示效果对齐**：
   - 流式对话（六大结构化回答格式）
   - RAG 知识检索 + 引用来源卡片
   - 会话管理（自动标题、置顶、重命名、删除、切换恢复）
   - 快捷提问、欢迎页

### 1.3 非目标（明确不做）

- 不做多用户 / 登录
- 不做知识库在线更新（更新知识库 = 重新跑一次导出脚本）
- 不迁移后端 SQLite 中的历史会话数据
- **不改动任何后端代码**（正式版继续按 README 路线演进到 Supabase + pgvector）

## 2. 架构对比

```
【现状】
浏览器 (Next.js :3000)                          手写部分（维护成本所在）
  ├─ @assistant-ui/react external store 桥接     ← useNutriHealthRuntime.ts
  ├─ ThreadPrimitive/Composer 自定义线程 UI       ← MyThread.tsx 等 8 个组件
  ├─ react-markdown + remark-gfm 渲染            ← MarkdownRenderer.tsx
  └─ 手写 SSE 解析器                              ← lib/api.ts
   │ fetch + SSE
   ▼
FastAPI (:8000) ──► SQLite（会话/消息/知识库）
   │                    │ 本地 sentence-transformers (bge-small-zh-v1.5)
   │ openai SDK         ▼
   ▼                向量+BM25 混合检索 (RRF)
DeepSeek API

【改造后：Ant Design X 三层架构 + 本地数据】
浏览器 (Next.js，可静态导出)
  ├─ UI 层    @ant-design/x          Bubble.List / Sender / Conversations / Welcome / Prompts / Sources / XProvider
  ├─ 逻辑层   @ant-design/x-sdk      useXChat + useXConversations + Provider + XRequest（SSE解析/重试/中止）
  ├─ 渲染层   @ant-design/x-markdown XMarkdown（流式 Markdown、不完整语法恢复）
  └─ 本地数据
      ├─ Dexie (IndexedDB)：会话 / 消息
      ├─ knowledge-bundle.json（构建时预计算）：BM25 检索
      └─ DeepSeek API 浏览器直连（key 由演示者提供）
```

官方技能库已确认的版本与兼容性（2026-09 实测）：

| 包 | 版本 | 说明 |
|---|---|---|
| `@ant-design/x` | 2.9.0 | UI 组件；peer 依赖 antd ^6.1.1 |
| `@ant-design/x-sdk` | 2.9.0 | useXChat / useXConversations / DeepSeekChatProvider / XRequest |
| `@ant-design/x-markdown` | 2.9.0 | XMarkdown 渲染器 |
| `antd` | 6.6.3 | peer 要求 React >= 18（本项目 18.3.1 ✓） |

> ⚠️ 注意：X 2.x 相比 1.x 有架构变化（useXAgent/useXChat 曾内置在组件包，2.x 拆分到独立的 `@ant-design/x-sdk`）。实施时以 2.9.0 的官方技能文档为准。

## 3. 改造原则

1. **后端零改动**：现有 `backend/` 代码、数据库、启动脚本全部保留
2. **UI 全面官方化**：能用官方组件/hooks 的地方不手写，删除 `@assistant-ui/react` 与全部自研聊天 UI
3. **双模式切换**：`NEXT_PUBLIC_DEMO_MODE` 切换 Provider 与数据服务层；未设置时保持对接现有后端（remote 模式），行为不回退
4. **移植逻辑 1:1**：system prompt、检索算法、标题生成从 Python 原样移植，不重新设计

## 4. 关键技术决策

### 4.1 UI 框架：Ant Design X 三件套

选择理由与组件映射（现有 8 个手写组件全部删除）：

| 现有自研 | Ant Design X 替代 | 收益 |
|---|---|---|
| `MyThread.tsx`（ThreadPrimitive） | `Bubble.List`（`items` + `role` 配置） | 滚动锚定/自动滚动/角色布局内置 |
| `ChatMessage.tsx` | `Bubble` role `contentRender` | |
| `MarkdownRenderer.tsx`（react-markdown） | `XMarkdown`（`@ant-design/x-markdown`） | 流式渲染、不完整语法恢复内置 |
| `CitationCard.tsx` | `Sources` 组件（`items: {title, url, description, icon}`） | 与 `KnowledgeSource` 结构几乎一一对应 |
| `ChatInput.tsx` / Composer | `Sender`（`loading`/`onCancel`=abort） | 发送/停止按钮状态内置 |
| `ConversationList.tsx` | `Conversations` + `useXConversations` | 会话列表状态管理内置 |
| `QuickActions.tsx` | `Prompts` + `Welcome` | 快捷提问、空状态欢迎页 |
| `useNutriHealthRuntime.ts`（external store 桥接） | `useXChat` + `useXConversations` | 整个桥接层删除 |
| `lib/api.ts` 手写 SSE 解析器 | `XRequest`（SSE 解析/重试/中止内置） | |
| 根组件 `AssistantRuntimeProvider` | `XProvider`（替代 antd ConfigProvider） | |

可选增强（官方组件，零成本启用）：`Actions.Copy`（复制按钮）、`Think`（DeepSeek reasoner 的思考过程展示，DeepSeekChatProvider 已内置 `<think>` 解析）。

### 4.2 本地存储：IndexedDB（Dexie.js）

- 不用 localStorage：5MB 配额、同步阻塞、无索引查询；会话消息会持续增长
- Dexie.js 体积小（~25KB gzip）
- 单用户 demo，无需 users 表，用户画像作为内置常量（与后端种子数据一致）

### 4.3 LLM 链路：DeepSeekChatProvider + XRequest（浏览器直连）

`@ant-design/x-sdk` **内置 DeepSeek 支持**，无需手写 fetch/SSE 解析：

```ts
import { DeepSeekChatProvider, XRequest } from '@ant-design/x-sdk';

const provider = new DeepSeekChatProvider({
  request: XRequest('https://api.deepseek.com/v1/chat/completions', {
    manual: true,
    headers: { Authorization: `Bearer ${apiKey}` },  // 演示者自填，见 4.5
    params: { model: 'deepseek-chat', stream: true, temperature: 0.7 },
  }),
});
```

源码级确认的关键机制（x-sdk 2.9.0）：

- `AbstractChatProvider.injectGetMessages()`：`useXChat` 会把**当前会话完整历史**注入 Provider，`transformParams` 内 `this.getMessages()` 即历史消息（自动携带上下文，无需手动拼历史）
- `transformLocalMessage`：`onRequest({ messages: [...] })` 传入的内容渲染为本地气泡
- `transformMessage`：已处理 DeepSeek 的 `delta.content`、`[DONE]`、`reasoning_content`（think 标签）

**RAG 注入方式**（继承重写，不改官方类）：

```ts
class NutriHealthProvider extends DeepSeekChatProvider {
  transformParams(requestParams, options) {
    const base = super.transformParams(requestParams, options);
    return {
      ...base,
      // 在官方历史消息前插入 system prompt（角色设定 + 用户画像 + BM25 检索到的知识块）
      messages: [buildSystemMessage(this.ragContext), ...base.messages],
    };
  }
}
```

检索时机：`Sender.onSubmit` 时先跑 BM25（同步、毫秒级）拿到 `ragContext` 存入 Provider 实例，再 `onRequest`。

### 4.4 RAG 检索（核心决策，维持 v1 结论）

**问题**：后端向量检索依赖本地 sentence-transformers 为 query 实时计算 embedding，浏览器中没有该模型。

**语料现状**（实测）：19 个文档 / 104 个切片 / 全文约 10,766 字 / 每片 512 维向量。

| 方案 | 检索质量 | 额外依赖 | 复杂度 | 结论 |
|---|---|---|---|---|
| A. 纯 BM25 | 中文按字切分，小语料下可用，Sources 引用卡片照常输出 | 零（完全离线） | 低：移植 rank_bm25 的 BM25Okapi 约 60 行 TS | ✅ **Phase 1 采用** |
| B. 第三方 embedding API（如 SiliconFlow 托管的 `BAAI/bge-small-zh-v1.5`，OpenAI 兼容） | 与后端完全一致（向量+BM25+RRF） | 第二个 API key | 中 | ✅ 可选增强 |
| C. transformers.js 浏览器跑 ONNX 量化模型 | 向量检索、离线 | 首次加载 ~25MB 模型 | 高（WASM/WebGPU 兼容性） | ❌ 不采用 |

bundle 同时导出预计算向量，为方案 B 预留。

### 4.5 API Key 管理（含官方安全红线说明）

> ⚠️ **x-request 官方技能明确：浏览器环境禁止配置 Authorization（密钥会直接暴露给用户），生产环境必须走代理**。本方案是 demo 定位下的有意取舍，需向所有使用者明示。

- Key 存 `localStorage`（key: `nutrihealth_api_key`），由设置弹窗输入
- 支持构建时通过 `NEXT_PUBLIC_DEEPSEEK_API_KEY` 提供默认值（会明文打进静态产物，仅限内部 demo，用低额度专用 key）
- 未配置 key 时发送消息 → 弹出设置引导，不发起请求

## 5. 详细设计

### 5.1 整体数据流

```
Sender.onSubmit(query)
  │ ① BM25 检索 top5 → ragContext（含 KnowledgeSource[]）
  │ ② onRequest({ messages: [{role:'user', content:query}] }, { extraInfo:{ sources } })
  ▼
useXChat（消息状态机：local → loading → updating → success / error / abort）
  │ ③ transformLocalMessage → 用户气泡
  │ ④ NutriHealthProvider.transformParams → [system(RAG+画像), ...历史] → XRequest 直连 DeepSeek
  │ ⑤ transformMessage 逐 chunk 累加 → updating 状态 → Bubble.List 流式渲染（XMarkdown）
  ▼
Bubble.List + Sources（引用卡片，读 extraInfo.sources）
  │ ⑥ onSuccess → Dexie 落库（assistant 消息 + sources）→ 首轮对话触发标题生成
```

- **会话维度**：`useXConversations` 管理会话列表；`useXChat({ conversationKey })` 切换历史；`defaultMessages: async ({conversationKey}) => Dexie 加载`
- **Provider 工厂**：每个会话独立 Provider 实例（官方多会话模式，`providerCache: Map<key, Provider>`），闭包持有 conversationKey，天然携带落库上下文

### 5.2 双模式 Provider 切换

| | Demo 模式（`NEXT_PUBLIC_DEMO_MODE=local`） | Remote 模式（默认，对接现有后端） |
|---|---|---|
| Provider | `NutriHealthProvider extends DeepSeekChatProvider` + XRequest 直连 | `NutriHealthRemoteProvider extends AbstractChatProvider` + XRequest 指向 `/api/chat` |
| RAG | 浏览器 BM25 + promptBuilder.ts | 后端完成（现有逻辑） |
| 会话存储 | Dexie（IndexedDB） | 后端 REST（现有 `/api/conversations/*`） |
| 历史注入 | `this.getMessages()` + system 拼装 | 后端自行读取数据库历史 |
| 消息解析 | 官方 DeepSeek 格式解析 | 自定义解析后端 SSE（`event: sources/token/done`，XRequest 已解析为 `{data, event}`，transformMessage 按 `chunk.event` 分支） |
| UI 层 | **完全共用**（useXChat/useXConversations/组件不变） | 同左 |

### 5.3 数据模型映射

后端 6 张表 → 浏览器 2 张表 + 内置常量 + 构建产物：

| 后端 | Demo | 说明 |
|---|---|---|
| `users` / `user_profiles` | 内置常量 `SEED_PROFILE` | 取自 `backend/app/seed/seed_data.py`，可选做成设置可编辑 |
| `conversations` | Dexie 表 `conversations` | id 用 `crypto.randomUUID()` |
| `messages` | Dexie 表 `messages` | **增加 `sources` 字段**：后端不存 sources（恢复会话时引用卡片会丢失），demo 版随消息落库，刷新后引用卡片仍可见（小增强） |
| `knowledge_documents` / `knowledge_chunks` | 构建产物 `knowledge-bundle.json` | 预计算静态导入，不进 IndexedDB |

Dexie schema：

```ts
// v1
conversations: "id, pinned, updatedAt, [pinned+updatedAt]"
messages: "id, conversationId, createdAt, [conversationId+createdAt]"
```

会话列表排序与后端一致：`pinned DESC, updatedAt DESC`（`conversation_service.py:111-119`）。

**持久化时机**（demo 模式）：

- 用户消息：`onRequest` 前落库
- assistant 消息 + sources：XRequest `callbacks.onSuccess`（Provider 工厂闭包持有 conversationKey）
- 会话标题：首轮对话完成后，非流式调用 DeepSeek 生成 ≤10 字（prompt 对齐 `llm_service.py:55-71`，temperature 0.3 / max_tokens 20）
- abort/error：按 `requestFallback` 结果落库，状态标记

### 5.4 知识库 bundle 导出脚本（后端新增脚本，不改动现有代码）

`backend/scripts/export_knowledge_bundle.py`：从现有 `nutrihealth.db` 读取全部 chunks 及其 document 元数据，输出到 `frontend/src/data/knowledge-bundle.json`。

```json
{
  "version": "2026-09-08",
  "embedding": { "model": "BAAI/bge-small-zh-v1.5", "dim": 512 },
  "chunks": [
    {
      "chunkId": "uuid", "content": "切片正文…", "domain": "nutrition",
      "section": "…", "source": "中国居民膳食指南(2022)", "title": "…",
      "evidenceLevel": "A", "documentId": "uuid", "url": "",
      "embedding": "<base64 编码的 Float32Array>"
    }
  ]
}
```

体积估算（104 片 × 512 维）：含 base64 向量约 300KB（gzip 后约 1/3）；去掉向量仅约 20KB。用法：`python backend/scripts/export_knowledge_bundle.py`（需已跑过一次知识库导入）。

### 5.5 浏览器端检索模块（`local/retrieval.ts`）

1. **BM25**：移植 rank_bm25 的 `BM25Okapi`（k1=1.5, b=0.75, epsilon=0.25），中文按字切分（`list(content)`），与后端行为一致；应用启动时对 104 片建索引（毫秒级），内存常驻
2. **向量模式（可选）**：若设置中配置了 embedding API（如 SiliconFlow），query 实时 embed → base64 解码 bundle 向量做点积（已归一化）→ 与 BM25 用 RRF（k=60）融合，对齐后端 `retrieval_service.py`
3. 输出 `KnowledgeSource[]`（复用 `frontend/src/types/chat.ts` 现有类型）
4. `top_k = 5`（对齐 `config.py` 的 `rag_top_k`），检索 query 为用户本轮消息（对齐 `chat.py:39`）

### 5.6 Prompt 与标题生成移植

- `local/promptBuilder.ts`：`prompt_builder.py` 模板 1:1 移植（角色设定 + 六段结构化回答模板 + 用户画像 + 知识块引用段落与 [1][2] 标注要求），供 `NutriHealthProvider` 使用
- `local/titleGenerator.ts`：移植 `summarize_conversation`（非流式 DeepSeek 调用）

### 5.7 UI 组件与布局

```
XProvider（zh-CN locale + 主题，替代 ConfigProvider）
└─ 布局（保留 Tailwind 做页面骨架）
   ├─ 侧栏：Conversations（activeKey/creation 新建/菜单：置顶、重命名、删除）+ 设置入口
   └─ 主区
      ├─ 空状态：Welcome + Prompts（快捷提问，对齐现有 QuickActions 文案）
      ├─ Bubble.List（role 配置：user 右侧 / assistant 左侧 + loading）
      │    └─ assistant contentRender = XMarkdown（流式）+ Sources（extraInfo.sources）
      └─ Sender（loading=isRequesting / onCancel=abort）
设置弹窗：antd Modal + Form（API Key、检索模式、数据清空/导出）
```

UI 开发规则（来自官方技能，实施时遵守）：

- `Bubble.List` 用 `role` 属性（不是 `roles`）；循环渲染必须用 `Bubble.List` 而非手动 map `Bubble`
- `contentRender` / `components` 映射保持引用稳定（内联对象会导致重渲染、重置打字动画）
- 流式期间 `streaming={true}`，最终 chunk 时置 `false`
- XMarkdown 流式必须正确设置 `hasNextChunk`

### 5.8 静态导出

`next.config.mjs`：

```js
const nextConfig = {
  output: "export",           // 产物 out/，可托管任意静态服务
  images: { unoptimized: true },
};
```

- 当前前端为纯客户端应用（无 server actions / API routes），静态导出无障碍
- **验证项**：antd v6（cssinjs v2）与 `@ant-design/x` 2.x 在 Next.js 14 构建期预渲染是否报错；若有 SSR 兼容问题，对聊天主组件用 `next/dynamic`（`ssr: false`）兜底
- 部署形式：`npx serve out` / GitHub Pages / Vercel 静态托管 / 内网静态服务器

## 6. 文件变更清单

### 删除（前端，自研 UI 全部移除）

| 文件 | 替代 |
|---|---|
| `src/components/assistant/MyThread.tsx` | Bubble.List + Sender |
| `src/components/ChatMessage.tsx` | Bubble role contentRender |
| `src/components/ChatWindow.tsx` | Bubble.List |
| `src/components/ChatInput.tsx` | Sender |
| `src/components/ConversationList.tsx` | Conversations |
| `src/components/CitationCard.tsx` | Sources |
| `src/components/MarkdownRenderer.tsx` | XMarkdown |
| `src/components/QuickActions.tsx` | Welcome + Prompts |
| `src/hooks/useNutriHealthRuntime.ts` | useXChat + useXConversations |
| `src/hooks/useChat.ts`（旧代码，确认无引用后删除） | — |
| `src/lib/api.ts` | Provider + 数据服务层（见下） |

依赖移除：`@assistant-ui/react`、`react-markdown`、`remark-gfm` 及仅被旧 UI 使用的 radix 依赖。

### 新增（前端）

| 文件 | 说明 |
|---|---|
| `src/app/providers.tsx` | XProvider + zh-CN + 主题 |
| `src/components/ChatShell.tsx` | 主布局：Conversations + Bubble.List + Sender + Welcome/Prompts |
| `src/components/SettingsDialog.tsx` | 设置弹窗（antd Modal + Form） |
| `src/lib/providers/NutriHealthProvider.ts` | Demo 模式：继承 DeepSeekChatProvider 注入 RAG system prompt |
| `src/lib/providers/NutriHealthRemoteProvider.ts` | Remote 模式：解析后端 sources/token/done SSE |
| `src/lib/providers/providerFactory.ts` | 按模式 + conversationKey 创建/缓存 Provider 实例 |
| `src/lib/local/db.ts` | Dexie 库定义 |
| `src/lib/local/conversationStore.ts` | 会话/消息读写（Dexie） |
| `src/lib/local/retrieval.ts` | BM25（+可选向量）检索 |
| `src/lib/local/promptBuilder.ts` | system prompt 移植 |
| `src/lib/local/titleGenerator.ts` | 标题生成移植 |
| `src/lib/local/settings.ts` | apiKey / 检索模式存取 |
| `src/lib/remote/conversationApi.ts` | Remote 模式会话 REST 调用（原 api.ts 对应部分平移） |
| `src/data/knowledge-bundle.json` | 脚本生成的知识库产物 |

### 新增（后端，仅脚本）

| 文件 | 说明 |
|---|---|
| `backend/scripts/export_knowledge_bundle.py` | 知识库导出脚本 |

### 修改

| 文件 | 改动 |
|---|---|
| `src/app/page.tsx` | 重写为 ChatShell 挂载（AssistantRuntimeProvider 移除） |
| `src/app/layout.tsx` | 引入 providers |
| `next.config.mjs` | 静态导出配置 |
| `package.json` | +`antd`、`@ant-design/x`、`@ant-design/x-sdk`、`@ant-design/x-markdown`、`dexie`；−旧 UI 依赖 |
| `.env.example` | 补充 `NEXT_PUBLIC_DEMO_MODE` / `NEXT_PUBLIC_DEEPSEEK_API_KEY` 说明 |

## 7. 实施步骤

| 阶段 | 内容 | 验证标准 |
|---|---|---|
| **Phase 0：可行性验证** | ① 手写单 HTML fetch 直连 DeepSeek 验证 CORS；② 最小 Next.js 页面验证 antd 6 + X 2.9 + XProvider + Bubble 渲染与 `next build` 静态导出兼容性；③ DeepSeekChatProvider + useXChat 最小对话跑通（含 transformParams 注入 system 消息的行为确认） | ① 浏览器流式输出可见；② 构建无 SSR 报错；③ 带固定 system prompt 的对话正常 |
| **Phase 1：UI 重写（remote 模式）** | Provider 工厂 + NutriHealthRemoteProvider（对接现有 `/api/chat` SSE）+ ChatShell（Conversations/Bubble.List/Sender/Welcome/Prompts/Sources）+ XMarkdown | 对接现有后端，功能与旧版逐项对齐（流式、引用、会话管理、快捷提问） |
| **Phase 2：本地数据层（demo 模式）** | bundle 导出脚本 → Dexie + conversationStore → BM25 + promptBuilder → NutriHealthProvider（直连）→ 设置弹窗 + key 引导 | 后端进程关闭，端到端纯前端跑通 |
| **Phase 3：完善与部署** | 标题自动生成 → abort/error 处理与落库 → 静态导出 + 部署验证 | 第 9 节验收清单全项通过 |
| **Phase 4：可选增强** | 向量混合检索（embedding API + RRF）→ 画像可编辑 → 会话导出 JSON → Actions.Copy / Think（reasoner 思考过程展示） | 检索质量对齐后端版本 |

> 分阶段意图：Phase 1 先在现有后端上完成 UI 重写（与数据层解耦、单独可验证），Phase 2 再切入本地链路，两步风险隔离。

## 8. 风险与限制

| # | 风险/限制 | 等级 | 缓解措施 |
|---|---|---|---|
| 1 | DeepSeek API 不允许浏览器 CORS 直连 | **P0，Phase 0 必须先验证** | Fallback：~10 行静态托管反代（Cloudflare Workers 等），仅改 baseURL（恰好符合 x-request 官方安全建议） |
| 2 | 浏览器携带 API key（官方技能明确生产禁止，需代理） | 中（demo 定位可接受） | 演示者自填 key 存 localStorage，不打包进产物；对外演示后立即换 key；文档明示取舍 |
| 3 | antd 6 / X 2.9 与 Next.js 14 构建期预渲染的兼容性 | **P0，Phase 0 验证** | Fallback：`next/dynamic`（ssr: false）包裹聊天主组件 |
| 4 | X 2.x 版本迭代快（1.x→2.x 曾移除/拆分 hooks，API 变动大） | 中 | 锁定 2.9.0（package.json 精确版本）；升级前 diff 官方技能文档 |
| 5 | BM25-only 检索质量低于混合检索 | 低（104 片小语料） | Phase 0 抽查快捷提问命中率；必要时启用向量模式 |
| 6 | antd v6（cssinjs）与 Tailwind 共存样式冲突 | 低 | Tailwind 仅做布局骨架；冲突时用 XProvider 主题 token 调整 |
| 7 | 清除浏览器数据 = 会话丢失 | 低（demo 定位） | 可选加"导出 JSON" |
| 8 | 知识库更新需重跑导出脚本 | 低 | 脚本一键化 + bundle `version` 字段 |
| 9 | Demo 与正式版行为漂移（prompt/检索逻辑双份维护） | 中 | 移植时严格 1:1；后端模板文件头加注释提示"前端 `local/promptBuilder.ts` 有同步副本" |

## 9. 验收清单

### 功能对齐（与现有版本逐项对比）

- [ ] 新对话 → 流式回答，含"先说结论/为什么/根据你的情况/可以怎么做/依据/注意"六段结构
- [ ] 引用卡片展示 top 5 来源（标题 / 来源机构 / 证据等级 / 领域），[1][2] 序号与卡片对应
- [ ] 会话列表：自动标题（≤10 字）、置顶、重命名、删除、切换加载历史
- [ ] 刷新页面后当前会话与消息完整恢复（含引用卡片）
- [ ] 快捷提问按钮可用；空状态显示欢迎页
- [ ] 流式输出中途可停止（Sender 停止按钮 → abort）
- [ ] Markdown 正常渲染（列表/表格/代码块/加粗），流式过程中无渲染抖动

### Demo 特有要求

- [ ] **后端进程完全关闭**（8000 端口无服务）时，上述全部功能可用
- [ ] `NEXT_PUBLIC_DEMO_MODE=local npm run build` 静态导出成功，`npx serve out` 可完整演示
- [ ] 未配置 API key 时有明确引导弹窗，无静默失败
- [ ] 会话数据在 DevTools → Application → IndexedDB 中可见
- [ ] `NEXT_PUBLIC_DEMO_MODE` 未设置时，对接现有后端功能正常（remote 模式不回退）

## 10. 开发辅助：官方技能已就位

已安装 `@ant-design/x-skill`（v2.9.0，官方）到 `C:\Users\Mr.Cheng\.claude\skills\`，包含 6 个技能，实施时按需参考：

| 技能 | 覆盖内容 |
|---|---|
| `x-components` | 全部 17 个 UI 组件（Bubble/Sender/Conversations/Sources/Prompts/Welcome/Actions/Think...） |
| `use-x-chat` | useXChat 配置项/返回值/多会话管理/provider 工厂模式 |
| `x-chat-provider` | 自定义 Provider 四步法（remote 模式对接后端 SSE 必读） |
| `x-request` | XRequest 认证/重试/transformStream 配置与安全规范 |
| `x-markdown` | XMarkdown 流式渲染/组件映射/主题 |
| `x-card` | AI 动态渲染卡片（本项目暂不用） |
