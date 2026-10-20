# 向量混合检索实现计划

## 方案概述

在现有 BM25 本地检索基础上，增加向量语义检索路径，通过 RRF（Reciprocal Rank Fusion）算法融合两路结果，提升检索质量。

### 架构选型

| 决策点 | 选择 | 原因 |
|--------|------|------|
| Embedding 生成时机 | 构建时预计算 chunk 向量 | 137 个 chunk 一次性生成，运行时无需重复计算 |
| Query 向量化 | 运行时调用 OpenAI API | 保证 query 与 chunk 使用同一模型 |
| Embedding 模型 | OpenAI text-embedding-3-small | 768 维（通过 dimensions 参数缩短），性价比高 |
| CORS 问题 | Next.js API Route 代理 | OpenAI API 不支持 CORS，浏览器无法直调 |
| 融合策略 | RRF（Reciprocal Rank Fusion） | 业界标准，无需分数归一化，参数少 |

### 数据流

```
用户输入
  │
  ├─① BM25 检索（现有）→ top-10 候选
  │
  ├─② 向量检索：
  │    浏览器 → /api/embeddings（API Route）→ OpenAI API
  │    → query 向量（768 维）
  │    → 与 137 个 chunk 向量做余弦相似度
  │    → top-10 候选
  │
  └─③ RRF 融合：
       合并两路候选，按 RRF 公式重排
       RRF(d) = Σ 1/(k + rank_i(d))，k=60
       → 取最终 top-5
```

## 实现步骤

### 步骤 1：修改构建脚本，预计算 chunk embeddings

**文件**：`scripts/build-knowledge-bundle.js`

- 读取 `OPENAI_API_KEY` 环境变量（服务端，不暴露）
- 对每个 chunk 的 `content` 调用 OpenAI Embedding API
  - 模型：`text-embedding-3-small`
  - 维度：768（通过 `dimensions: 768` 参数缩短，减少 bundle 体积）
  - 批量请求：每次最多 100 个 chunk（API 限制 2048 个）
- 将 embedding 写入 chunk 的 `embedding` 字段
- 失败时（如无 API Key）跳过，输出无 embedding 的 bundle（降级为纯 BM25）

**bundle 体积影响**：
- 当前：~100KB（137 chunks，无 embedding）
- 预计：~850KB（137 chunks × 768 维 × 4 字节/float ≈ 420KB + JSON 开销）
- 可接受：Vercel 静态资源压缩后约 300KB

### 步骤 2：新增向量检索模块

**新文件**：`src/lib/local/vectorSearch.ts`

- `cosineSimilarity(a: number[], b: number[]): number` — 纯数学计算
- `VectorSearcher` 类：
  - 构造时接收 `BundleChunk[]`，提取有 embedding 的 chunks
  - `search(queryEmbedding: number[], topK: number): KnowledgeSource[]` — 余弦相似度排序，返回 top-K
- 降级：如果 bundle 中无 embedding 数据，`search` 返回空数组

### 步骤 3：新增 RRF 融合模块

**新文件**：`src/lib/local/rrf.ts`

- `rrfFuse(bm25Results: KnowledgeSource[], vectorResults: KnowledgeSource[], opts: { k?: number; topK: number }): KnowledgeSource[]`
- RRF 公式：`score(d) = Σ 1/(k + rank_i(d))`，默认 k=60
- 按 chunk_id 去重合并两路结果
- 按 RRF 分数降序排列，取 top-K
- 每条结果附加 `score`（RRF 分数）和保留原始 `score` 用于调试

### 步骤 4：新增 Next.js API Route 代理

**新文件**：`src/app/api/embeddings/route.ts`

```typescript
export async function POST(req: Request) {
  const { text } = await req.json();
  const apiKey = process.env.OPENAI_API_KEY;  // 服务端环境变量，不暴露
  if (!apiKey) return Response.json({ error: "OPENAI_API_KEY not configured" }, { status: 500 });

  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text,
      dimensions: 768,
    }),
  });
  const data = await res.json();
  return Response.json({ embedding: data.data[0].embedding });
}
```

- OpenAI Key 存在服务端 `OPENAI_API_KEY` 环境变量（无 `NEXT_PUBLIC_` 前缀，不暴露给客户端）
- Vercel 部署时自动支持 API Route（Serverless Functions）

### 步骤 5：新增 HybridSearcher 组合检索器

**新文件**：`src/lib/local/hybridSearch.ts`

- `HybridSearcher` 类：
  - 构造时接收 `BundleChunk[]`，内部创建 `BM25Searcher` + `VectorSearcher`
  - `async search(query: string, topK: number): Promise<KnowledgeSource[]>`：
    1. BM25 检索 top-10
    2. 调用 `/api/embeddings` 获取 query 向量（失败时降级为纯 BM25）
    3. 向量检索 top-10
    4. RRF 融合，返回 top-K
  - 降级策略：embedding API 超时/失败 → 返回纯 BM25 结果

### 步骤 6：修改 ChatShell 和 Provider 接入 HybridSearcher

**文件**：`src/components/ChatShell.tsx` + `src/lib/providers/NutriHealthProvider.ts`

- `ChatShell.tsx`：
  - `createSearcher` → `createHybridSearcher`
  - `handleSubmit` 中 `searcher.search` 改为 `await searcher.search`（变异步）
  - 传 `hybridSources` 替代 `localSources` 给 `searchWebIfNeeded`

- `NutriHealthProvider.ts`：
  - `NutriProviderOptions.searcher` 类型从 `BM25Searcher` 改为 `HybridSearcher`
  - `transformParams` 中 `searcher.search` 改为同步快速路径（BM25 only）+ 异步预取路径（hybrid）
  - 由于 `transformParams` 是同步的，hybrid 检索结果需在 UI 层预取，通过 `requestParams.hybridSources` 透传（类似现有 `webSources` 模式）

### 步骤 7：更新环境变量和文档

**文件**：`.env.example` + `.env.local` + `docs/PRD.md` + `README.md`

- 新增 `OPENAI_API_KEY`（服务端，无 `NEXT_PUBLIC_` 前缀）
- 更新 PRD 第 5 章检索架构，描述三路召回（BM25 + 向量 + Tavily）+ RRF 融合
- 更新 README 技术栈和环境变量说明

## 降级策略

| 场景 | 降级行为 |
|------|----------|
| 构建时无 `OPENAI_API_KEY` | bundle 不含 embedding，运行时纯 BM25 |
| 运行时 `/api/embeddings` 超时（>3s） | 跳过向量检索，返回纯 BM25 |
| 运行时 `/api/embeddings` 返回错误 | 跳过向量检索，返回纯 BM25 |
| bundle 中无 embedding 数据 | VectorSearcher 返回空，RRF 退化为纯 BM25 排序 |
| Vercel 函数未部署（本地 `next dev`） | API Route 在 dev 模式下自动可用 |

## 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `scripts/build-knowledge-bundle.js` | 修改 | 添加 embedding 预计算逻辑 |
| `src/lib/local/vectorSearch.ts` | 新增 | 余弦相似度 + VectorSearcher |
| `src/lib/local/rrf.ts` | 新增 | RRF 融合算法 |
| `src/lib/local/hybridSearch.ts` | 新增 | HybridSearcher 组合检索器 |
| `src/app/api/embeddings/route.ts` | 新增 | OpenAI Embedding API 代理 |
| `src/components/ChatShell.tsx` | 修改 | 接入 HybridSearcher |
| `src/lib/providers/NutriHealthProvider.ts` | 修改 | 接收 HybridSearcher |
| `.env.example` | 修改 | 新增 `OPENAI_API_KEY` |
| `docs/PRD.md` | 修改 | 更新检索架构章节 |
| `README.md` | 修改 | 更新技术栈和环境变量 |

## 验证方式

1. `npm run build:knowledge` — 确认 bundle.json 中 chunk 含 embedding 字段
2. `npx tsc --noEmit` — 类型检查通过
3. `npm run dev` — 本地启动，发送健康问题，确认参考来源含向量检索结果
4. 对比测试：同一问题，BM25-only vs Hybrid 的 top-5 结果差异
5. 降级测试：删除 `OPENAI_API_KEY`，确认降级为纯 BM25 正常工作
