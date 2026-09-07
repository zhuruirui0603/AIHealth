# NutriHealth AI — Phase 1 RAG 知识库与检索实现计划

## 技术选型

| 组件 | 方案 | 说明 |
|------|------|------|
| Embedding 模型 | `BAAI/bge-small-zh-v1.5`（512 维） | sentence-transformers 本地运行，无需额外 API |
| 向量存储 | SQLite + JSON TEXT 列 | 内存中用 numpy 做余弦相似度，MVP 足够 |
| 关键词搜索 | BM25（rank-bm25 库） | 中文字符级分词，精确匹配 |
| 融合策略 | Reciprocal Rank Fusion (RRF) | k=60，合并向量+BM25 排名 |
| 知识数据 | Markdown 文件 + YAML frontmatter | 手工编写 20-30 篇，4 个领域 |

## 新增依赖

```
sentence-transformers==3.1.1
numpy==1.26.4
rank-bm25==0.2.2
PyYAML==6.0.2
```

---

## 实现步骤（按依赖顺序）

### Step 1: 依赖与配置
- 更新 `backend/requirements.txt` 添加 4 个新依赖
- 更新 `backend/app/config.py` 添加 RAG 配置项：
  - `embedding_model_name` / `embedding_dimension`
  - `rag_top_k` / `rag_similarity_threshold`

### Step 2: 知识库数据模型
- 新建 `backend/app/models/knowledge.py`
- 两张表（对齐 PRD Section 17）：
  - `knowledge_documents`：id, title, source, organization, domain, population, evidence_level, url, content_raw
  - `knowledge_chunks`：id, document_id, content, embedding(JSON), domain, section, evidence_level, chunk_index
- 更新 `backend/app/models/__init__.py` 注册新模型

### Step 3: Embedding 服务
- 新建 `backend/app/services/embedding_service.py`
- 单例加载 bge-small-zh 模型
- 方法：`embed(text)` / `embed_batch(texts)` / `cosine_similarity` / `serialize` / `deserialize`

### Step 4: 知识导入 Pipeline
- 新建 `backend/data/knowledge/` 目录，按领域分子目录：
  - `nutrition/` — 蛋白质、碳水、脂肪、维生素、膳食纤维等 8-10 篇
  - `food_safety/` — 储存、剩菜、交叉污染、食源性疾病等 5-6 篇
  - `exercise/` — 训练前营养、训练后恢复、有氧指南等 4-5 篇
  - `medical/` — 能量代谢、消化吸收、血糖调节等 3-4 篇
- 每篇 Markdown 文件格式：YAML frontmatter（元数据）+ 正文（按 `##` 标题分块）
- 新建 `backend/app/services/ingestion_service.py`
  - 解析 frontmatter → 创建 document 记录
  - 按 `##` / `###` 标题分块 → 逐块 embedding → 存入 knowledge_chunks
  - 支持重新导入（先删旧再建新）
- 新建 `backend/app/seed/seed_knowledge.py`
  - 启动时检查 chunks 数量，为 0 则自动导入
  - 在 `main.py` 中调用

### Step 5: 检索服务（Hybrid Search）
- 新建 `backend/app/services/retrieval_service.py`
- 懒加载索引：首次搜索时加载所有 chunks → 构建 numpy 矩阵 + BM25 索引
- 搜索流程：
  1. query embedding → 与所有 chunk embedding 做余弦相似度
  2. BM25 关键词搜索 → 得分排名
  3. RRF 融合：`score = 1/(60+rank_vector) + 1/(60+rank_bm25)`
  4. 返回 top_k 结果，包含 content/source/title/domain/evidence_level
- 支持可选 domain_filter

### Step 6: Prompt 集成
- 更新 `backend/app/services/prompt_builder.py`
- 新增 `build_system_prompt_with_rag(profile, retrieved_chunks)` 函数
- 在系统 Prompt 中注入知识库参考段：
  - 格式：`[1] 来源: xxx | 标题: xxx | 内容: xxx`
  - 指令：要求 LLM 在「依据」部分用 [1] [2] 标注引用来源
  - 空结果时不注入知识段，保持原有行为

### Step 7: Chat 路由集成
- 更新 `backend/app/routers/chat.py`
- 新流程：
  1. 持久化用户消息
  2. **RAG 检索**：`retrieval_service.search(message)` → 获取相关 chunks
  3. 构建 system prompt（含知识库参考）
  4. 流式调用 LLM
  5. SSE 事件新增 `sources` 事件（在 token 之前发送引用来源）
- `done` 事件中也包含 sources 数组

### Step 8: 知识管理 API
- 新建 `backend/app/routers/knowledge.py`
  - `GET /api/knowledge/documents` — 文档列表
  - `GET /api/knowledge/stats` — 统计（文档数/chunk数/领域）
- 在 `main.py` 注册路由

### Step 9: 前端类型更新
- 更新 `frontend/src/types/chat.ts`
  - 新增 `KnowledgeSource` 接口
  - `Message` 新增 `sources?: KnowledgeSource[]` 字段

### Step 10: 前端 API 客户端更新
- 更新 `frontend/src/lib/api.ts`
  - `StreamCallbacks` 新增 `onSources` 回调
  - SSE 解析处理 `event: sources` 事件
  - `onDone` 回调增加 `sources` 参数

### Step 11: 前端引用展示组件
- 新建 `frontend/src/components/CitationCard.tsx`
  - 展示来源标题、领域标签、内容摘要、来源/证据等级
- 更新 `frontend/src/components/ChatMessage.tsx`
  - assistant 消息下方渲染 CitationCard 列表

### Step 12: 前端 useChat Hook 更新
- 更新 `frontend/src/hooks/useChat.ts`
  - 处理 `onSources` 回调，将 sources 附加到对应 assistant 消息

### Step 13: 知识数据编写
- 编写 20-30 篇 Markdown 知识文件
- 覆盖 4 个领域：nutrition / food_safety / exercise / medical
- 每篇包含 YAML frontmatter（title/source/domain/evidence_level 等）

### Step 14: 集成测试
1. 启动后端 → 自动导入知识库
2. `GET /api/knowledge/stats` 验证导入结果
3. 测试检索：食品安全问题 → 返回相关 chunks
4. 测试完整对话：回答中包含引用标注，前端展示来源卡片
5. 测试空知识库降级：无知识时仍正常对话

---

## 数据流（RAG 集成后）

```
用户输入 "昨天炒的鸡肉放冰箱今天还能吃吗?"
  ↓
1. 持久化用户消息
  ↓
2. RetrievalService.search(query)
   a. query → embedding (512 维)
   b. 与所有 chunk embedding 做余弦相似度
   c. BM25 关键词搜索
   d. RRF 融合 → top 5 chunks
  ↓
3. build_system_prompt_with_rag(profile, chunks)
   - 用户画像 + 6 段回答格式 + 知识库参考 [1][2]...
  ↓
4. LLM 流式生成（DeepSeek）
  ↓
5. SSE 事件流
   event: sources  → 引用来源列表
   event: token    → 流式 token
   event: done     → 完整回复 + sources
  ↓
6. 前端渲染
   - Markdown 回答（含 [1][2] 标注）
   - 下方来源卡片列表
```

## 验收标准
- [ ] 知识库 4 个领域 20+ 篇文档导入成功
- [ ] `GET /api/knowledge/stats` 返回正确统计
- [ ] 检索服务对相关问题返回正确 chunks
- [ ] SSE 流中 `sources` 事件在 `token` 之前到达
- [ ] AI 回答在「依据」部分包含 [1][2] 引用标注
- [ ] 前端正确渲染引用来源卡片
- [ ] 无知识库时降级正常（无 sources，不影响对话）
- [ ] 3 个核心场景回答质量比 Phase 0 有明显提升
