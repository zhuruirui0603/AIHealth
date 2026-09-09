# NutriHealth AI — 产品需求文档（PRD）

## 1. 产品概述

### 1.1 产品定位

NutriHealth AI 是一个**纯前端运行**的 AI 营养健康决策助手。用户在浏览器中直接与 DeepSeek 大模型对话，获取基于本地知识库的营养健康建议，所有数据存储在浏览器本地（IndexedDB + localStorage），无需后端服务器。

### 1.2 核心价值

- **零部署成本**：静态托管即可，无需服务器、数据库、后端代码
- **知识库内置**：23 篇营养学文献预打包进前端，BM25 检索，完全离线
- **用户画像驱动**：回答结合用户个人情况（年龄/体重/目标等），个性化推荐
- **引用可溯源**：每个回答附参考来源卡片，点击跳转到原始文献

### 1.3 非目标

- 不做多用户 / 登录系统
- 不做知识库在线更新（更新需重新构建）
- 不做疾病诊断或处方
- 不做后端部署（纯前端 Demo 定位）

---

## 2.技术栈

| 层级 | 技术 | 版本 | 用途 |
| --- | --- | --- | --- |
| 框架 | Next.js | 14.2.15 | App Router + 静态导出（`output: "export"`） |
| UI 组件 | Ant Design X | 2.9.0 | Bubble.List / Sender / Conversations / Welcome / Prompts / Sources |
| UI 基础 | antd | 6.6.3 | Modal / Button / Input / Select / Typography |
| 逻辑层 | @ant-design/x-sdk | 2.9.0 | useXChat / DeepSeekChatProvider / XRequest |
| Markdown | @ant-design/x-markdown | 2.9.0 | 流式 Markdown 渲染 |
| 图标 | @ant-design/icons | 6.3.4 | |
| 本地存储 | Dexie (IndexedDB) | 4.0.10 | 会话 / 消息持久化 |
| CSS | Tailwind CSS | 3.4.13 | 布局骨架 |
| 语言 | TypeScript | 5.x | 全量类型 |
| LLM | DeepSeek API | deepseek-chat | 浏览器直连，SSE 流式 |

---

## 3. 功能需求

### 3.1 对话功能

| 编号 | 功能 | 描述 | 优先级 |
| --- | --- | --- | --- |
| F1.1 | 流式对话 | 浏览器直连 DeepSeek API，SSE 流式输出，实时渲染 Markdown | P0 |
| F1.2 | 结构化回答 | AI 回答强制使用六段式结构：先说结论 / 为什么 / 根据你的情况 / 可以怎么做 / 依据 / 注意 | P0 |
| F1.3 | RAG 知识检索 | 用户消息发送前，本地 BM25 检索 Top 5 知识切片，注入 system prompt | P0 |
| F1.4 | 引用来源卡片 | 回答下方展示参考来源（标题/来源机构/证据等级/领域），按文档去重，点击跳转原文 | P0 |
| F1.5 | Markdown 渲染 | 支持列表/表格/代码块/加粗，流式过程中无渲染抖动 | P0 |
| F1.6 | 停止生成 | 流式输出中途可点击停止按钮中止请求 | P0 |
| F1.7 | 错误处理 | 连接失败显示错误信息，中断时保留已生成内容 | P0 |
| F1.8 | 输入框清空 | 发送消息后输入框自动清空 | P1 |
| F1.9 | 消息复制 | AI 回答下方显示复制按钮，一键复制到剪贴板 | P1 |

### 3.2 会话管理

| 编号 | 功能 | 描述 | 优先级 |
| --- | --- | --- | --- |
| F2.1 | 新建对话 | 点击按钮创建空对话，进入空态欢迎页 | P0 |
| F2.2 | 会话列表 | 侧栏展示历史会话，按置顶优先 + 更新时间倒序排列 | P0 |
| F2.3 | 会话搜索 | 侧栏搜索框，按标题模糊匹配 | P1 |
| F2.4 | 置顶/取消置顶 | 会话右键菜单切换置顶状态 | P1 |
| F2.5 | 重命名 | 会话右键菜单重命名标题 | P1 |
| F2.6 | 删除 | 会话右键菜单删除（含确认弹窗，级联删除消息） | P0 |
| F2.7 | 自动标题 | 首轮对话完成后，自动调用 DeepSeek 生成 ≤10 字标题 | P1 |
| F2.8 | 会话恢复 | 刷新页面后恢复上次对话，历史消息和引用卡片完整加载 | P0 |
| F2.9 | 会话切换 | 点击侧栏会话项切换，加载该会话历史消息 | P0 |
| F2.10 | 导出 JSON | 会话右键菜单导出会话数据为 JSON 文件下载 | P2 |

### 3.3 用户画像

| 编号 | 功能 | 描述 | 优先级 |
| --- | --- | --- | --- |
| F3.1 | 画像设置弹窗 | 侧栏底部「个人信息」按钮打开 | P0 |
| F3.2 | 可编辑字段 | 年龄/性别/身高/体重/健康目标/活动水平/工作时间/饮食偏好/食物喜好/过敏 | P0 |
| F3.3 | 持久化存储 | 保存到 localStorage，刷新不丢失 | P0 |
| F3.4 | 恢复默认 | 一键重置为内置默认画像 | P1 |
| F3.5 | 画像注入 | 画像数据作为上下文注入每次对话的 system prompt | P0 |

### 3.4 API Key 管理

| 编号 | 功能 | 描述 | 优先级 |
| --- | --- | --- | --- |
| F4.1 | Key 设置弹窗 | 侧栏底部「API Key」按钮打开 | P0 |
| F4.2 | 未配置引导 | 未配置 key 时发送消息自动弹出设置弹窗 | P0 |
| F4.3 | Key 持久化 | 存储到 localStorage，刷新不丢失 | P0 |
| F4.4 | 构建时默认值 | 支持 `NEXT_PUBLIC_DEEPSEEK_API_KEY` 环境变量提供默认值 | P1 |
| F4.5 | 安全提示 | 弹窗中提示浏览器携带 key 的风险 | P1 |

### 3.5 空状态与快捷提问

| 编号 | 功能 | 描述 | 优先级 |
| --- | --- | --- | --- |
| F5.1 | 欢迎页 | 无消息时显示 Welcome 组件 | P0 |
| F5.2 | 快捷提问 | 6 个预设健康问题按钮，点击直接发送 | P0 |

**快捷提问列表**：
1. 我今天不知道吃什么，帮我推荐一下适合我的早餐和午餐？
2. 黄焖鸡米饭、麻辣烫、轻食沙拉，这三个外卖哪个比较适合我？
3. 晚上8点去健身，现在5点半应该吃什么？
4. 昨天炒的鸡肉一直放冰箱，今天还能吃吗？
5. 最近每天下午三四点都特别饿，是不是跟饮食有关？
6. 我妈妈68岁，最近吃饭比较少，怎么帮她调整饮食？

### 3.6 响应式布局

| 编号 | 功能 | 描述 | 优先级 |
| --- | --- | --- | --- |
| F6.1 | 桌面端布局 | 左侧固定 264px 侧栏 + 右侧主区域 | P0 |
| F6.2 | 移动端布局 | 抽屉式侧栏，汉堡菜单按钮打开 | P0 |
| F6.3 | 最大宽度限制 | 主聊天区域最大宽度 768px（max-w-3xl）居中 | P1 |

---

## 4. 数据设计

### 4.1 IndexedDB 表结构

**数据库名**：`nutrihealth-demo`（Dexie v2）

**conversations 表**：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | UUID（crypto.randomUUID） |
| title | string | 默认"新对话"，后自动生成 |
| pinned | boolean | 是否置顶 |
| createdAt | string | ISO 时间戳 |
| updatedAt | string | ISO 时间戳 |

**索引**：`id, updatedAt`

**messages 表**：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | UUID |
| conversationId | string | 关联会话 ID |
| role | "user" \| "assistant" | 消息角色 |
| content | string | 消息内容 |
| sources | KnowledgeSource[]? | RAG 引用来源（仅 assistant） |
| createdAt | string | ISO 时间戳 |

**索引**：`id, conversationId, createdAt`

### 4.2 localStorage

| Key | 用途 | 格式 |
| --- | --- | --- |
| `nutrihealth_api_key` | DeepSeek API Key | 明文字符串 |
| `nutrihealth_user_profile` | 用户画像 | JSON |
| `conversation_id` | 上次对话 ID | UUID 字符串 |

### 4.3 知识库 Bundle

**文件**：`src/data/knowledge-bundle.json`（构建时静态导入，约 88KB）

**结构**：

```json
{
  "version": 1,
  "exportedAt": "ISO timestamp",
  "profile": { /* 默认用户画像 */ },
  "documents": [ /* 23 个文档元数据 */ ],
  "chunks": [ /* 124 个知识切片 */ ]
}
```

**chunk 字段**：`id, documentId, content, domain, section, evidenceLevel, title, source, url`

---

## 5. 知识库设计

### 5.1 来源文献

| 领域 | 文档数 | 来源 |
| --- | --- | --- |
| 运动 (exercise) | 3 | WHO 身体活动指南、ACSM 运动营养指南 |
| 食品安全 (food_safety) | 4 | 食品安全国家标准（国标检索平台） |
| 医学 (medical) | 3 | 生物化学、临床营养学 |
| 营养 (nutrition) | 13 | 中国居民膳食指南2022、现代营养学、中国营养科学全书、营养与健康、营养与食品卫生学等 |

**总计**：23 个文档 / 124 个知识切片

### 5.2 参考来源 URL

| 来源 | URL |
| --- | --- |
| WHO 身体活动指南 | https://www.who.int/publications/i/item/9789240015128 |
| ACSM 运动营养立场声明 | https://doi.org/10.1249/MSS.0000000000000852 |
| 食品安全国家标准 | https://sppt.cfsa.net.cn:8086/db |
| 中国居民膳食指南2022 | http://dg.cnsoc.org/article/2021b.html |
| 教科书类（生物化学/临床营养学等） | 无（空字符串，不触发跳转） |

### 5.3 检索算法

- **算法**：BM25Okapi（移植自 Python `rank_bm25`）
- **参数**：k1=1.5, b=0.75, epsilon=0.25
- **分词**：中文按字切分（`Array.from(text)`）
- **Top K**：5
- **完全离线**：无外部 API 调用

### 5.4 知识库更新

更新 `frontend/data/knowledge/` 下的 Markdown 文件后，运行：

```bash
cd frontend
npm run build:knowledge
```

重新生成 `src/data/knowledge-bundle.json`。

---

## 6. Prompt 设计

### 6.1 System Prompt 模板

```
你是 NutriHealth AI，一个专业的 AI 营养健康决策助手。

你的定位是：围绕用户真实生活场景，将专业健康知识、个人上下文、食品与营养数据及可靠证据结合，为用户提供可解释、安全且可执行的日常健康决策支持。

## 用户画像
{user_profile_section}

## 回答格式
你必须使用以下结构化格式回答用户的问题：

## 先说结论
[直接给出核心结论或建议]

## 为什么
[解释原因和逻辑]

## 根据你的情况
[结合用户个人画像和当前场景的具体分析]

## 可以怎么做
[具体可执行的行动建议，分点列出]

## 依据
[支持结论的依据，如膳食指南、营养学原理等]

## 注意
[需要用户注意的事项、风险提示或建议咨询专业人士的情况]

## 回答原则
- 温和、清晰、不过度绝对化
- 不制造健康焦虑
- 不进行疾病诊断或开具处方
- 如遇高风险问题，不诊断、不处方，建议用户寻求专业医疗帮助
- 如果信息不足以下结论，请坦诚说明并告知需要补充什么信息
- 回答使用中文
```

### 6.2 用户画像注入格式

```
- 年龄: 28
- 性别: male
- 身高: 175cm
- 体重: 78kg
- 健康目标: 减脂 + 增肌
- 活动水平: moderate
- 工作时间: 9-18, 偶尔加班到21
- 饮食偏好: 杂食
- 食物喜好: 喜欢吃辣, 不喜欢香菜, 偏好米饭
- 过敏: 无
```

### 6.3 RAG 知识注入格式

```
## 知识库参考
以下是从知识库中检索到的相关专业知识。请基于这些知识回答用户问题，并在「依据」部分标注引用了哪些知识来源（用 [1] [2] 等序号标注）。
如果知识库内容与用户问题不完全相关，请自行判断是否采用。
不要编造未在知识库中出现的来源。

[1] 来源: 中国居民膳食指南2022
    标题: 水平衡与水分摄入
    章节: 饮水时机
    证据等级: guideline
    内容: 不要等口渴了才喝水...
```

### 6.4 消息组装流程

```
用户输入文本
  → NutriHealthProvider.transformParams
    → BM25 检索 Top 5 知识块
    → buildSystemPromptWithRag(画像, 检索结果) 生成 system prompt
    → 发给 DeepSeek 的消息数组：
       [{role: "system", content: system prompt},
        {role: "user",   content: 用户输入文本},
        ...历史消息]
```

---

## 7. 用户画像字段

| 字段 | 类型 | 输入方式 | 选项/范围 | 默认值 |
| --- | --- | --- | --- | --- |
| 年龄 | number | InputNumber | 1-120 | 28 |
| 性别 | string | Select | male(男) / female(女) | male |
| 身高 | number | InputNumber | 80-250 cm | 175 |
| 体重 | number | InputNumber | 20-300 kg | 78 |
| 健康目标 | string | Input | 自由文本 | 减脂 + 增肌 |
| 活动水平 | string | Select | 久坐不动/轻度活动/中度活动/高度活动/运动员级别 | 中度活动 |
| 工作时间 | string | Input | 自由文本 | 9-18, 偶尔加班到21 |
| 饮食偏好 | string | Select | 杂食/素食/纯素/低碳水/低脂/高蛋白 | 杂食 |
| 食物喜好 | string | Input | 逗号分隔文本 | 喜欢吃辣, 不喜欢香菜, 偏好米饭 |
| 过敏 | string | Input | 逗号分隔文本 | 无 |

---

## 8. UI 设计

### 8.1 页面布局

```
┌──────────────────────────────────────────────────┐
│ ┌──────────┐  ┌────────────────────────────────┐│
│ │ 侧栏 264px│  │ Header (NutriHealth AI)        ││
│ │          │  ├────────────────────────────────┤│
│ │ [+新建对话]│  │                                ││
│ │ [搜索框]  │  │   Bubble.List (消息列表)       ││
│ │          │  │   - 用户消息 (placement: end)   ││
│ │ 会话1     │  │   - AI消息 (placement: start)  ││
│ │ 会话2     │  │     - XMarkdown 渲染            ││
│ │ 会话3     │  │     - Sources 引用卡片          ││
│ │          │  │                                ││
│ │          │  ├────────────────────────────────┤│
│ │[个人信息] │  │ Sender 输入框                   ││
│ │[API Key] │  │                                ││
│ └──────────┘  └────────────────────────────────┘│
└──────────────────────────────────────────────────┘
```

### 8.2 空态（无消息）

```
┌────────────────────────────────────────┐
│                                        │
│       Welcome to NutriHealth AI        │
│     营养健康助手，回答基于本地知识库     │
│                                        │
│         试试这样问                      │
│  ┌──────────────────────────────────┐  │
│  │ 我今天不知道吃什么，帮我推荐...  │  │
│  ├──────────────────────────────────┤  │
│  │ 黄焖鸡米饭、麻辣烫、轻食沙拉... │  │
│  ├──────────────────────────────────┤  │
│  │ 晚上8点去健身，现在5点半应该吃? │  │
│  └──────────────────────────────────┘  │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │ Sender: 输入你的健康问题…        │  │
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘
```

### 8.3 引用来源卡片

```
┌──────────────────────────────────────────┐
│ 参考来源                          [展开▾] │
│ ┌──────────────────────────────────────┐ │
│ │ 📄 水平衡与水分摄入                   │ │
│ │ 中国居民膳食指南2022 · nutrition · guideline │
│ └──────────────────────────────────────┘ │
│ ┌──────────────────────────────────────┐ │
│ │ 📄 WHO身体活动指南                    │ │
│ │ 世界卫生组织身体活动指南 · exercise · A │ │
│ └──────────────────────────────────────┘ │
└──────────────────────────────────────────┘
```

---

## 9. 部署方式

### 9.1 本地开发

```bash
cd frontend
npm install
npm run dev          # http://localhost:3000
```

### 9.2 静态导出

```bash
cd frontend
npm run build        # 产物输出到 out/
npx serve out        # 本地预览静态产物
```

### 9.3 知识库更新

```bash
cd frontend
# 编辑 data/knowledge/ 下的 Markdown 文件
npm run build:knowledge   # 重新生成 knowledge-bundle.json
```

### 9.4 线上部署

`out/` 目录可托管到任意静态服务器：

- Vercel（推荐）：导入 GitHub 仓库，Root Directory 设为 `frontend`
- Netlify：拖拽 `out/` 目录
- Cloudflare Pages
- GitHub Pages
- 任意 Nginx / Apache 服务器

### 9.5 环境变量

| 变量 | 说明 | 必填 |
| --- | --- | --- |
| `NEXT_PUBLIC_DEEPSEEK_API_KEY` | DeepSeek API Key 默认值（可选，构建时打进产物） | 否 |

---

## 10. 项目结构

```
AIHealth/
├── .env.example                    # 环境变量示例
├── README.md
├── start-frontend.bat              # 一键启动
└── frontend/
    ├── data/knowledge/             # 知识库源文件（23 个 Markdown）
    │   ├── exercise/  (3 个)
    │   ├── food_safety/  (4 个)
    │   ├── medical/  (3 个)
    │   └── nutrition/  (13 个)
    ├── scripts/
    │   └── build-knowledge-bundle.js   # 知识库构建脚本
    └── src/
        ├── app/                     # Next.js 页面
        │   ├── layout.tsx           # 根布局
        │   ├── page.tsx            # 首页（挂载 ChatShell）
        │   └── globals.css         # 全局样式
        ├── components/
        │   ├── ChatShell.tsx       # 主界面（对话+侧栏+空态）
        │   ├── SettingsModal.tsx    # API Key 设置弹窗
        │   └── ProfileModal.tsx     # 用户画像设置弹窗
        ├── data/
        │   └── knowledge-bundle.json   # 知识库构建产物
        ├── lib/
        │   ├── local/
        │   │   ├── bm25.ts          # BM25 检索算法
        │   │   ├── conversationStore.ts  # 会话存储 CRUD
        │   │   ├── db.ts            # Dexie 数据库 schema
        │   │   ├── profile.ts      # 用户画像管理
        │   │   ├── promptBuilder.ts # System prompt 构建器
        │   │   └── settings.ts     # API Key 管理
        │   └── providers/
        │       └── NutriHealthProvider.ts  # DeepSeek Provider
        └── types/
            └── chat.ts             # 类型定义
```

---

## 11. 验收清单

### 11.1 功能验收

- [x] 新对话 → 流式回答，含六段式结构
- [x] 引用卡片展示来源（标题/来源机构/证据等级/领域），点击跳转原文
- [x] 会话列表：自动标题、置顶、重命名、删除、切换加载历史
- [x] 刷新页面后会话与消息完整恢复（含引用卡片）
- [x] 快捷提问按钮可用，空状态显示欢迎页
- [x] 流式输出中途可停止
- [x] Markdown 正常渲染（列表/表格/代码块/加粗）
- [x] 发送消息后输入框自动清空
- [x] 参考来源按文档去重
- [x] 用户画像可编辑并持久化
- [x] API Key 可设置并持久化
- [x] 未配置 Key 时有引导弹窗
- [x] AI 回答下方显示复制按钮，一键复制
- [x] 会话可导出为 JSON 文件下载

### 11.2 部署验收

- [x] 后端进程关闭时全部功能可用
- [x] `npm run build` 静态导出成功，`out/` 目录完整
- [x] `tsc --noEmit` 类型检查通过
- [x] 会话数据在 DevTools → Application → IndexedDB 中可见
- [x] 知识库更新可通过 `npm run build:knowledge` 一键重新生成

---

## 12. 后续规划（Phase 4 可选增强）

| 功能 | 说明 | 优先级 | 状态 |
| --- | --- | --- | --- |
| 消息复制按钮 | Actions.Copy 组件，一键复制 AI 回答 | P1 | ✅ 已完成 |
| 会话导出 JSON | 支持导出会话数据为 JSON 文件 | P2 | ✅ 已完成 |
| 向量混合检索 | 接入 embedding API + RRF 融合，检索质量对齐后端版本 | P2 | 待开发 |
| 思考过程展示 | Think 组件，展示 DeepSeek reasoner 模型的推理过程 | P3 | 待开发 |
| 用户画像更多字段 | 添加 BMI 自动计算、运动习惯、睡眠时长等 | P3 | 待开发 |
| 多语言支持 | 英文界面 + 英文 system prompt | P3 | 待开发 |
