# NutriHealth AI｜AI 营养健康决策助手
## 产品探索、架构设计与 AI PM Portfolio 总结文档

> **项目目标：** 将医学基础、公共营养、食品营养、食品卫生、运动营养及特殊人群知识，转化为面向上班族日常生活的 AI 健康决策支持产品。
>
> **当前定位：** Agentic AI Health Product / Evidence-Grounded AI Health Copilot

---

# 1. 为什么要做这个项目？

最初的设想是做一个“AI 营养健康智能客服”，帮助用户回答：

- 今天吃什么？
- 外卖怎么选？
- 运动前后怎么吃？
- 食品是否安全？
- 最近身体状态需要关注什么？
- 父母应该怎么吃？

但随着产品探索发现：

> **“AI + 营养问答”本身已经不是足够强的产品价值。**

当前通用 AI 和垂直健康产品已经能够做到健康问答、个性化建议、长期记忆、用户上下文、饮食记录、AI Nutrition Coach、运动建议和健康数据分析。

因此，产品不能仅仅依靠“我也有一个 AI 聊天框”来形成差异化。

真正的问题变成：

> **当 ChatGPT 等通用 AI 已经可以回答健康问题、记住用户并使用健康上下文时，为什么还需要一个专业的营养健康 AI 产品？**

由此将产品方向从“AI 客服”逐步升级为：

> **AI Nutrition & Health Decision Support System**

---

# 2. 最终产品定位

## NutriHealth AI

### Everyday Nutrition & Health Copilot

面向城市上班族的：

> **日常营养与健康 AI 决策助手**

核心不是替代医生、营养师，而是帮助用户把专业知识转化为日常生活中的具体决策。

---

## 2.1 产品核心价值

不是：

> AI 告诉用户“应该吃什么”。

而是：

> **在具体的生活场景中，结合个人上下文、专业知识、可靠证据和现实约束，帮助用户做出更合理、更安全、更可执行的选择。**

价值链：

```text
Professional Knowledge
+
Personal Context
+
Real-world Constraints
+
Evidence
+
Reasoning
+
Risk Assessment
+
Action
```

---

# 3. 目标用户

## Primary User

城市上班族 / 知识工作者。

典型特征：

- 22–45 岁左右
- 工作日久坐
- 工作时间固定或经常加班
- 外卖 / 食堂 / 外食比例较高
- 有一定健康意识
- 想改善饮食、运动或身体状态
- 没有系统营养学知识
- 时间和精力有限
- 不愿意进行复杂、长期的健康记录

## 3.1 用户细分

### A. 忙碌型上班族

经常加班、饮食不规律、外卖多、运动少。

### B. 健康管理型上班族

经常运动，关注饮食和恢复。

### C. 轻度健康焦虑型

经常搜索健康信息，但面对信息冲突不知道相信什么。

### D. 家庭健康关注者

关注父母健康，尤其是中老年营养。

---

# 4. JTBD

## JTBD 1：工作日吃什么

> 当我工作很忙、没有时间研究饮食时，我希望快速得到符合我的情况、目标和现实条件的饮食建议。

## JTBD 2：外卖怎么选

> 当我只能选择外卖时，我希望有人结合我今天的饮食和目标帮我做选择。

## JTBD 3：运动怎么和饮食配合

> 当我安排运动时，我希望知道训练前后怎样安排饮食和恢复。

## JTBD 4：身体状态怎么理解

> 当我出现疲劳、饥饿、消化不适等问题时，我希望理解可能相关的生活方式因素，并知道什么时候应该进一步寻求专业帮助。

## JTBD 5：食品是否安全

> 当我不确定某个食品还能不能吃、如何储存时，我希望获得基于食品卫生知识的风险判断。

## JTBD 6：帮助家人

> 当我需要帮助中老年父母改善饮食时，我希望获得适合特殊人群的、易理解的建议。

---

# 5. 用户真实生活场景

产品前台应该围绕“生活”组织，而不是围绕“知识学科”组织。

典型一天：

```text
起床
 ↓
早餐
 ↓
通勤
 ↓
工作 / 久坐
 ↓
上午咖啡 / 加餐
 ↓
午餐 / 外卖
 ↓
下午疲劳 / 零食
 ↓
加班
 ↓
运动 / 不运动
 ↓
晚餐
 ↓
社交 / 出差
 ↓
睡眠
```

核心场景：

- 早餐
- 午餐 / 外卖
- 下午疲劳
- 加班
- 运动
- 食品安全
- 日常健康
- 家庭 / 特殊人群

---

# 6. 为什么产品不是普通 Chatbot？

普通 Chatbot：

```text
User Question
 ↓
LLM
 ↓
Answer
```

NutriHealth AI：

```text
User Question
 ↓
Intent Detection
 ↓
Risk Classification
 ↓
Personal Context
 ↓
Relevant Memory
 ↓
Structured Data
 ↓
Domain Knowledge Retrieval
 ↓
Evidence
 ↓
Tool Calling
 ↓
Agent Reasoning
 ↓
Safety Check
 ↓
Response + Evidence + Action
```

核心区别：

> **产品不是“回答问题”，而是“完成健康决策任务”。**

---

# 7. 为什么长期记忆不是核心差异化？

探索过程中发现：

- 通用 AI 已支持长期记忆
- 健康类产品已支持长期用户数据
- AI Coach 已能结合历史饮食和目标
- Wearable 产品可以结合长期健康数据

因此不能再把以下能力单独作为核心卖点：

- Memory
- Personal Context
- Personalized Recommendation

这些应该成为：

> **产品基础能力。**

真正需要形成差异化的是：

```text
Domain Knowledge
+
Evidence
+
Cross-domain Reasoning
+
Safety
+
Real-world Decision Support
```

---

# 8. 真正值得探索的“健康决策断点”

不是：

> “我想学习营养学。”

而是：

> “12:15，我坐在公司楼下，不知道今天午饭吃什么。”

不是：

> “我想改善健康。”

而是：

> “今天加班、没运动、中午吃得很油，今晚该怎么安排？”

不是：

> “我想关注父母。”

而是：

> “妈妈最近胃口不好，我不知道应该先调整饮食还是需要进一步专业评估。”

这类问题：

> **真实发生、需要上下文、需要综合信息、需要下一步行动。**

---

# 9. 专业知识体系

## 9.1 Medical Foundation

- 解剖
- 生理
- 生物化学
- 消化与吸收
- 能量代谢
- 内分泌
- 免疫
- 心血管基础
- 肝胆
- 肾脏
- 胃肠
- 骨骼肌
- 运动生理

## 9.2 Public Nutrition

- 能量
- 蛋白质
- 脂类
- 碳水化合物
- 膳食纤维
- 水
- 维生素
- 矿物质
- 膳食模式
- 平衡膳食
- 食物多样性
- 营养素参考摄入
- 公共营养
- 营养调查
- 营养教育
- 营养干预

## 9.3 Food Nutrition

- 食品营养组成
- 营养密度
- 食物比较
- 烹饪方式
- 食品加工
- 配料表
- 食品标签
- 食物成分数据

## 9.4 Food Hygiene & Safety

- 生物性污染
- 化学性污染
- 物理性污染
- 食源性疾病
- 冷藏
- 冷冻
- 食品加热
- 交叉污染
- 食品添加剂
- 农药 / 兽药残留
- 重金属
- 过敏原
- 食品安全风险

## 9.5 Exercise & Sports Nutrition

- 身体活动
- 有氧运动
- 抗阻训练
- HIIT
- 能量消耗
- 训练前营养
- 训练后营养
- 水分
- 电解质
- 恢复
- 运动表现

## 9.6 Special Population

第一阶段重点：

### Older Adults

- 老年营养
- 饮食多样性
- 蛋白质相关问题
- 饮水
- 食物质地
- 咀嚼
- 吞咽
- 食品安全
- 活动与运动
- 家庭照护

后续：

- 儿童
- 青少年
- 孕产妇
- 素食者
- 耐力运动人群

## 9.7 Evidence

- 政府机构资料
- 正式膳食指南
- 专业组织
- 系统综述
- Meta-analysis
- 高质量研究
- 研究摘要

---

# 10. Knowledge Graph

单纯 Vector RAG 不足以表达复杂的营养与人体关系。

建议逐步建立：

## Food → Nutrient → Body → Outcome

```text
Food
 ↓
Nutrient
 ↓
Digestion / Absorption
 ↓
Metabolism
 ↓
Physiological Function
 ↓
Health Outcome
```

运动场景：

```text
Exercise
 ↓
Energy Expenditure
 ↓
Fuel Utilization
 ↓
Nutrition Demand
 ↓
Recovery
 ↓
Adaptation
```

---

# 11. RAG 架构

知识库分为：

```text
01 Medical Foundation
02 Public Nutrition
03 Food Nutrition
04 Food Safety
05 Exercise
06 Special Population
07 Evidence
```

Document Ingestion：

```text
Trusted Sources
 ↓
Document Parser
 ↓
Cleaning
 ↓
Chunking
 ↓
Metadata
 ↓
Embedding
 ↓
PostgreSQL + pgvector
```

Retrieval：

```text
User Question
 ↓
Intent Detection
 ↓
Domain Routing
 ↓
Query Rewrite
 ↓
Hybrid Search
 ↓
Metadata Filter
 ↓
Top-K
 ↓
Re-ranking
 ↓
Evidence Context
```

---

# 12. 两套 RAG

## Global Knowledge RAG

解决：

> “专业知识是什么？”

包括营养、医学基础、食品安全、运动、特殊人群等。

## Personal Memory RAG

解决：

> “这个用户过去发生了什么？”

包括：

- 历史饮食
- 历史运动
- 长期偏好
- 用户目标
- 行为模式

最终：

```text
Domain RAG
+
Personal RAG
+
Structured Data
 ↓
LLM Reasoning
```

---

# 13. Structured Data 与 RAG 的分工

## 数据库 / Tools

适合：

- 卡路里统计
- 蛋白质统计
- 历史运动次数
- 历史睡眠
- 趋势计算
- 食物营养查询

## LLM

适合：

- 理解自然语言
- 跨领域综合
- 解释
- 对话
- 个性化表达
- 任务编排

原则：

> **能精确计算的，不让 LLM 猜。**

---

# 14. Agent 设计

本项目可以定义为：

> **Agentic AI Health Product**

不是只有一个 Agent，而是：

> **以 Orchestrator 为核心的 Controlled Agentic Workflow**

```text
User
 ↓
Intent / Risk
 ↓
Orchestrator
 ↓
Context
 ↓
RAG
 ↓
Tools
 ↓
Reasoning
 ↓
Safety
 ↓
Answer
```

MVP：

```text
                 Orchestrator
                      │
          ┌───────────┼───────────┐
          ▼           ▼           ▼
      Nutrition      Food      Lifestyle
        Agent        Agent        Agent
          │           │           │
          └───────────┼───────────┘
                      ↓
                    RAG
                      ↓
                   Safety
```

后续：

- Special Population Agent
- Evidence Agent
- Meal Planning Agent
- Family Care Agent

---

# 15. 为什么采用 Controlled Agentic System？

健康领域风险较高。

因此：

> **Agent 负责决策和编排，系统负责边界。**

架构：

```text
Agent
 ↓
Allowed Tools
 ↓
Trusted Knowledge
 ↓
Policy
 ↓
Safety Check
```

Agent 不拥有无限权限，不自由生成医学诊断。

---

# 16. Context Engineering

不能把所有历史数据塞入模型：

```text
全部历史聊天
+
全部健康数据
+
全部知识库
 ↓
LLM
```

而应该：

```text
Current Query
 ↓
Context Planner
 ├── Recent Conversation
 ├── User Profile
 ├── Relevant Memory
 ├── Structured Data
 └── Relevant Knowledge
 ↓
Context Assembly
 ↓
LLM
```

Memory 分层：

### L1 Immediate Context

当前对话。

### L2 Episodic Memory

近期发生的行为和事件。

### L3 Semantic Memory

长期稳定的信息。

### Structured Data

- Food Logs
- Exercise Logs
- Sleep Logs

---

# 17. 多用户架构

多个用户不会共用一个 Context。

```text
                 Application
                      │
                  Auth Layer
                      │
             user_id / tenant
                      │
       ┌──────────────┼──────────────┐
       ▼              ▼              ▼
    User A          User B          User C
       │              │              │
    Profile         Profile        Profile
    Logs            Logs           Logs
    Memory          Memory         Memory
```

要求：

- 用户逻辑隔离
- 数据库权限隔离
- 最小权限
- 可删除

建议：

> PostgreSQL + Row Level Security

---

# 18. 核心数据库

```text
users
user_profiles
conversations
messages
user_memories
food_logs
exercise_logs
sleep_logs
knowledge_documents
knowledge_chunks
```

---

# 19. 推荐技术栈

## Frontend

- Next.js
- TypeScript
- Tailwind CSS

## Backend

- Python
- FastAPI

## Database

- PostgreSQL
- pgvector

## Auth / Storage

- Supabase Auth
- Supabase Storage

## LLM

选择支持：

- Tool Calling
- Structured Output
- Long Context

的主流模型 API。

## Agent

MVP：

> 轻量自建 Orchestrator

V1：

> LangGraph

## Deployment

```text
Frontend → Vercel
Backend → Railway / Render
Database → Supabase
```

---

# 20. 工程目录

```text
nutrihealth-ai/
│
├── frontend/
│
├── backend/
│   ├── api/
│   ├── agents/
│   ├── rag/
│   ├── memory/
│   ├── safety/
│   ├── tools/
│   └── eval/
│
├── data/
│   ├── medical/
│   ├── nutrition/
│   ├── food/
│   ├── food_safety/
│   ├── exercise/
│   └── special_population/
│
└── docs/
    ├── PRD/
    ├── architecture/
    ├── eval/
    └── portfolio/
```

---

# 21. MVP

第一版只做：

## 用户

- 注册
- 登录
- Profile

## 对话

- Chat
- Multi-turn
- History
- Context

## 核心场景

- 日常饮食
- 外卖
- 运动与营养
- 食品安全
- 日常身体健康
- 中老年家庭营养

## AI

- Intent Router
- Context Retrieval
- Domain RAG
- Tool Calling
- Safety Check
- Evidence Citation

---

# 22. P1 / P2

## P1

- Food Log
- Exercise Log
- Daily Summary
- Long-term Memory
- Personal RAG
- Meal Planning
- Senior Nutrition Mode
- Voice Input

## P2

- 图片识别
- 食物照片分析
- 冰箱识别
- Wearable
- 睡眠数据
- 家庭成员管理
- 主动健康提醒

---

# 23. Safety Architecture

## Level 1：Low Risk

早餐、食物比较、普通运动营养等。

→ 正常回答。

## Level 2：Potential Concern

持续疲劳、明显食欲变化、长期消化不适等。

→ 一般健康信息 + 风险提示 + 建议进一步关注。

## Level 3：High Risk

紧急症状、疾病诊断请求、高风险医疗问题等。

→ 不进行诊断，不提供处方，建议寻求专业医疗帮助。

Safety 不仅依靠 Prompt，还需要：

```text
Input
 ↓
Risk Classifier
 ↓
LLM
 ↓
Output Checker
 ↓
Response
```

---

# 24. Evaluation

建立：

**100–200 条 Evaluation Dataset**

分类：

```text
Nutrition        30
Food             20
Food Safety      20
Exercise         15
Health           15
Special Population 10
```

指标：

- Intent Accuracy
- Retrieval Accuracy
- Groundedness
- Citation Accuracy
- Factual Accuracy
- Safety Pass Rate

重要原则：

> 所有量化结果必须来自真实测试，不编造。

---

# 25. Product Metrics

## North Star Metric

### Weekly Useful Health Decisions

定义：

> 用户在一周内通过产品获得建议，并完成一次具体健康决策的次数。

其他指标：

- Activation
- DAU / WAU / MAU
- D7 / D30 Retention
- 每周有效咨询次数
- Food Decision 使用次数
- Exercise Decision 使用次数
- Food Safety 使用次数

---

# 26. Portfolio 如何讲

不应该讲：

> “我做了一个 AI 营养 Chatbot。”

应该讲：

> **我研究了一个成熟的 AI 健康市场，发现通用 AI 已经解决了健康问答、记忆和基础个性化，因此没有重复构建一个 Chatbot，而是将机会定义为“真实生活中的健康决策支持”，并设计了一个由专业知识、个人上下文、RAG、Agent、Tools、Evidence 和 Safety 组成的 Agentic AI Health Product。**

---

# 27. 简历定位

### NutriHealth AI｜AI 营养健康决策助手

副标题：

> **AI Product Strategy · RAG · Agent · Context Engineering · Evaluation · Responsible AI**

简历核心能力：

- 0→1 AI Product
- User Research
- Product Strategy
- RAG
- Agent Orchestration
- Context Engineering
- Tool Calling
- AI Evaluation
- Responsible AI

---

# 28. 项目成果应该怎么写？

如果尚未开发完成：

使用：

- 设计
- 构建方案
- 完成产品定义
- 设计架构
- 规划评测
- 搭建原型

不要写虚假的：

- 上线
- 用户增长
- 准确率
- ROI
- 提升 xx%

当 Demo 和 Evaluation 真正完成后，加入真实数据：

```text
Knowledge Documents = XX+
Evaluation Cases = XX
Intent Accuracy = XX%
Groundedness = XX%
Citation Accuracy = XX%
Safety Pass Rate = XX%
```

---

# 29. 最终产品架构

```text
                         USER
                           │
                           ▼
                Conversational UI
                  Chat / Voice / Image
                           │
                           ▼
                    Context Layer
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        Personal Memory  Structured   Profile
              │            Data
              └────────────┼────────────┘
                           ▼
                     Orchestrator
                           │
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
      Nutrition          Food          Lifestyle
        Agent            Agent           Agent
           │               │               │
           └───────────────┼───────────────┘
                           ▼
                      RAG Layer
                           │
       ┌───────────────────┼──────────────────┐
       ▼                   ▼                  ▼
    Medical             Nutrition          Food Safety
       KB                   KB                 KB
       │                   │                  │
       └───────────────────┼──────────────────┘
                           ▼
                     Evidence Layer
                           │
                           ▼
                      LLM Reasoning
                           │
                           ▼
                     Safety Checker
                           │
                           ▼
                  Response + Evidence
```

---

# 30. 最终产品定义

> **NutriHealth AI 是一个面向上班族日常生活的 Evidence-Grounded Agentic AI Health Copilot，通过专业健康知识、多领域 RAG、个人上下文、结构化数据、工具调用及安全机制，将复杂的营养与健康信息转化为更可靠、可解释、可执行的日常决策支持。**

---

# 31. 项目最终展示的 AI PM 能力

```text
Product Discovery
        ↓
User Research
        ↓
Product Strategy
        ↓
Domain Modeling
        ↓
Knowledge Architecture
        ↓
RAG
        ↓
Agent
        ↓
Context Engineering
        ↓
Tool Calling
        ↓
Safety
        ↓
Evaluation
        ↓
Product Analytics
        ↓
Iteration
```

这个项目最终应该被理解为：

> **一个完整的 0→1 Agentic AI Product Case Study，而不仅仅是一个营养类 Chatbot。**
