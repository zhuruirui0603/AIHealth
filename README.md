# NutriHealth AI

AI 营养健康决策助手 — Phase 0 原型

## 技术栈

- **前端**：Next.js 14 + TypeScript + Tailwind CSS
- **后端**：Python FastAPI + SQLAlchemy
- **数据库**：SQLite（Phase 0，后续迁移 Supabase + pgvector）
- **LLM**：DeepSeek API（deepseek-chat，OpenAI 兼容格式）

## 快速启动

### 1. 配置 API Key

编辑 `backend/.env`，填入你的 DeepSeek API Key：

```
DEEPSEEK_API_KEY=sk-your-actual-api-key
```

### 2. 启动后端

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

或双击 `start-backend.bat`

后端启动后访问 http://localhost:8000/docs 查看 API 文档。

### 3. 启动前端

```bash
cd frontend
npm install
npm run dev
```

或双击 `start-frontend.bat`

前端启动后访问 http://localhost:3000

### 4. 使用

打开 http://localhost:3000，可以：
- 点击快捷按钮发送预设问题
- 直接输入健康问题
- 多轮对话，上下文自动保持
- 页面刷新后会话恢复

## 核心场景

1. **外卖选择** — "黄焖鸡米饭、麻辣烫、轻食沙拉，这三个外卖哪个比较适合我？"
2. **运动营养** — "晚上8点去健身，现在5点半应该吃什么？"
3. **食品安全** — "昨天炒的鸡肉一直放冰箱，今天还能吃吗？"

## 项目结构

```
AIHealth/
├── backend/                 # FastAPI 后端
│   ├── app/
│   │   ├── config.py        # 配置管理
│   │   ├── database.py      # 数据库引擎
│   │   ├── models/          # SQLAlchemy 模型
│   │   ├── schemas/         # Pydantic 请求/响应模型
│   │   ├── routers/         # API 路由
│   │   ├── services/        # LLM 服务、Prompt 构建、对话服务
│   │   └── seed/            # 种子用户数据
│   ├── main.py              # FastAPI 入口
│   └── requirements.txt
├── frontend/                # Next.js 前端
│   └── src/
│       ├── app/             # 页面布局
│       ├── components/      # 聊天 UI 组件
│       ├── hooks/          # useChat 状态管理
│       ├── lib/             # API 客户端
│       └── types/           # TypeScript 类型
└── NutriHealth_AI.md        # 产品需求文档
```

## API 端点

| Method | Path | 说明 |
|--------|------|------|
| GET | `/api/health` | 健康检查 |
| POST | `/api/chat` | 发送消息，SSE 流式返回 |
| GET | `/api/conversations` | 会话列表 |
| GET | `/api/conversations/{id}` | 单个会话及消息 |
| GET | `/api/user/profile` | 种子用户画像 |

## 回答格式

AI 回答遵循以下结构化格式（PRD 9.2）：

```
## 先说结论
## 为什么
## 根据你的情况
## 可以怎么做
## 依据
## 注意
```

## 种子用户画像

- 28岁，男性，175cm/78kg
- 目标：减脂 + 增肌
- 活动水平：中等
- 工作时间：9-18，偶尔加班到21
- 饮食偏好：杂食，喜欢吃辣，不喜欢香菜，偏好米饭

## 下一阶段

Phase 0 完成后，进入 Phase 1：RAG MVP
- 知识库导入（膳食指南、营养数据）
- Embedding + pgvector
- Hybrid Search + Reranking
- 引用展示
