# NutriHealth AI
## AI 营养健康决策助手｜完整产品需求文档（PRD）

> **版本**：v1.0  
> **状态**：MVP 开发基线  
> **产品类型**：Conversational AI / Health & Nutrition Decision Support  
> **核心用户**：22–45 岁城市上班族  
> **核心定位**：面向日常生活场景的、基于专业知识与证据的 AI 营养健康决策助手  
> **重要边界**：提供营养、生活方式、食品卫生与基础健康知识的决策支持，不替代医生、营养师或其他专业人员，不进行疾病诊断、处方或急救替代。

---

# 1. 产品概述

## 1.1 产品愿景

帮助忙碌上班族在真实生活中，用更少的时间获得更可靠、更容易执行的饮食与健康决策。

## 1.2 核心问题

用户并不缺健康信息，而是缺少：

- 将知识转化为具体行动的方法
- 将饮食、运动、睡眠、工作节奏放在一起考虑的方法
- 判断健康信息可信度的方法
- 在时间、预算、口味、工作等现实约束下做选择的方法
- 判断何时可以自我管理、何时应寻求专业帮助的方法

## 1.3 产品定位

NutriHealth AI 不是：

- AI 医生
- AI 营养师替代品
- 单纯 Chatbot
- 单纯卡路里记录器
- 单纯食谱生成器
- 单纯健康知识库

而是：

> **围绕用户真实生活场景，将专业健康知识、个人上下文、食品与营养数据、运动信息及可靠证据结合，为用户提供可解释、安全且可执行的日常健康决策支持。**

---

# 2. 目标与非目标

## 2.1 产品目标

### G1：降低日常健康决策成本

用户可以通过自然语言、语音或简单结构化输入快速获得建议。

### G2：提高建议的专业可信度

重要健康结论能够追溯到可靠来源，并区分证据与推断。

### G3：建立个人化决策能力

系统能结合用户画像、近期行为和当前场景，而不是只回答泛化问题。

### G4：建立健康安全边界

系统能够对高风险问题进行识别、限制和升级。

### G5：验证一个可扩展的 AI Health Product Architecture

证明 Knowledge + RAG + Context + Tools + Agent + Safety + Evaluation 可以形成稳定的产品闭环。

## 2.2 非目标

MVP 不做：

- 疾病诊断
- 医疗处方
- 自动改变药物方案
- 紧急医疗替代
- 复杂医学影像诊断
- 自动判断用户患有某种疾病
- 宣称治疗或预防疾病

---

# 3. 目标用户

## 3.1 Primary User

### 城市上班族

典型特征：

- 22–45 岁
- 每周工作 5 天
- 久坐
- 工作时间固定或有加班
- 经常外卖、食堂或外食
- 有一定健康意识
- 关注减脂、保持健康、增肌、体能或改善日常状态
- 没有系统的营养学知识
- 时间和精力有限
- 不愿进行高成本、复杂的健康记录

## 3.2 用户细分

### Persona A：忙碌型

加班多、三餐不规律、外卖频繁、运动少。

**核心 JTBD：** 在现实条件下做出“更好的可执行选择”。

### Persona B：运动型

规律健身、跑步或其他运动，希望饮食与运动配合。

**核心 JTBD：** 理解运动前后饮食、恢复和日常营养的关系。

### Persona C：健康关注型

会主动搜索健康信息，但经常遇到信息冲突。

**核心 JTBD：** 理解问题、判断可信度、获得下一步行动。

### Persona D：家庭照护型

关注父母或其他家庭成员的饮食健康。

**核心 JTBD：** 获取适合中老年等特殊人群的可靠、易懂建议。

---

# 4. Jobs To Be Done

1. **工作日吃什么**：忙碌时快速获得符合目标和现实条件的饮食建议。
2. **外卖怎么选**：从实际菜单中选出更适合当天情况的选项。
3. **运动怎么吃**：结合运动时间、类型和当天饮食安排训练前后营养。
4. **身体状态怎么理解**：了解疲劳、饥饿、消化不适等现象可能与生活方式相关的因素，同时识别风险边界。
5. **食品是否安全**：针对储存、加工和食用条件获得食品卫生建议。
6. **帮助家人**：为中老年父母等特殊人群获得更合适的饮食建议。

---

# 5. 产品价值主张

> **让健康决策从“搜索信息”变成“结合我的情况，知道下一步做什么”。**

核心价值模型：

```text
专业知识
+ 个人上下文
+ 实时场景
+ 结构化数据
+ Evidence
+ Reasoning
+ Safety
→ Actionable Decision
```

---

# 6. 产品信息架构

## 6.1 一级入口

### 今天

- 今日饮食
- 今日活动
- 今日状态
- 今日建议
- 今日总结

### 吃什么

- 早餐
- 午餐
- 晚餐
- 外卖
- 加餐
- 食物比较
- 食品安全
- 食谱

### 身体

- 身体状态
- 健康知识
- 生活方式建议
- 趋势变化
- 风险提醒

### 我的

- 个人画像
- 饮食偏好
- 健康目标
- 运动习惯
- 历史记录
- AI 记忆
- 数据授权
- 隐私设置

---

# 7. 专业知识体系

## 7.1 Medical Foundation

- 解剖学基础
- 生理学
- 生物化学
- 消化与吸收
- 能量代谢
- 内分泌
- 免疫
- 心血管基础
- 肝胆基础
- 肾脏基础
- 胃肠基础
- 骨骼肌与运动生理

## 7.2 Public Nutrition

- 能量
- 蛋白质
- 脂类
- 碳水化合物
- 膳食纤维
- 水
- 维生素
- 矿物质
- 平衡膳食
- 食物多样性
- 营养素参考摄入
- 公共营养
- 营养调查
- 营养教育
- 营养干预

## 7.3 Food Nutrition

- 食品营养组成
- 营养密度
- 食物比较
- 食物加工
- 烹饪方式
- 配料表
- 食品标签
- 常见食品营养信息

## 7.4 Food Hygiene & Safety

- 生物性污染
- 化学性污染
- 物理性污染
- 食源性疾病
- 食品储存
- 冷藏与冷冻
- 加热
- 交叉污染
- 食品添加剂
- 农药/兽药残留
- 重金属
- 过敏原
- 食品安全风险

## 7.5 Exercise & Sports Nutrition

- 身体活动
- 有氧运动
- 抗阻训练
- HIIT
- 能量消耗
- 训练前营养
- 训练后营养
- 恢复
- 水分与电解质

## 7.6 Special Population

MVP 优先中老年：

- 老年营养基础
- 饮食多样性
- 蛋白质相关问题
- 水分
- 食物质地
- 咀嚼
- 吞咽
- 食品安全
- 运动与活动
- 家庭照护

后续扩展：儿童、青少年、孕产妇、素食者、耐力运动人群等。

## 7.7 Evidence

优先：

- 政府/公共卫生机构资料
- 膳食指南
- 专业组织资料
- 系统综述
- Meta-analysis
- 高质量研究

每条 Evidence 保存：

```text
source
title
organization
publication_date
domain
population
evidence_level
url
```

---

# 8. 核心使用场景

## 8.1 早餐

用户：

> “我只有 10 分钟，今天早餐吃什么？”

系统综合目标、工作安排、饮食偏好与近期饮食给出方案。

## 8.2 午餐/外卖

用户：

> “这三个外卖选哪个？”

系统分析菜单、用户目标、当天摄入和现实约束，给出排序与理由。

## 8.3 下午疲劳/饥饿

用户：

> “我最近每天三四点都特别饿。”

系统观察早餐、午餐、睡眠、咖啡、久坐、活动等因素，给出生活方式层面的建议，并在必要时提示专业评估。

## 8.4 加班

用户：

> “今天要加班到 10 点，怎么安排晚餐？”

系统调整进餐时间、加餐、晚餐和恢复建议。

## 8.5 运动

用户：

> “晚上 8 点去健身，现在 5 点半应该吃什么？”

系统结合运动与当天饮食进行建议。

## 8.6 食品安全

用户：

> “昨天做的鸡肉一直放冰箱，今天还能吃吗？”

系统依据食品类型、储存时间和条件给出风险提示，不在不确定时做过度保证。

## 8.7 身体健康

用户：

> “最近总觉得累，是不是缺铁？”

系统解释相关营养与生理机制，不直接诊断。

## 8.8 中老年

用户：

> “我妈妈 68 岁，最近吃饭比较少，我想帮她调整饮食。”

系统切换 Senior Nutrition Mode，结合年龄、饮食、活动、食品安全和证据给出建议；对持续、明显或高风险情况建议进一步专业评估。

---

# 9. Conversational UX

## 9.1 首页

```text
NutriHealth AI

今天有什么健康问题？

[🥗 今天吃什么]
[🍱 外卖怎么选]
[🏃 运动怎么吃]
[🧊 食品安全吗]
[🩺 最近身体有什么变化]
[👴 帮父母看看]

输入你的问题……
```

## 9.2 回答结构

```text
## 先说结论

## 为什么

## 根据你的情况

## 可以怎么做

## 依据

## 注意
```

回答原则：温和、清晰、不过度绝对化、不制造健康焦虑。

---

# 10. Personal Context & Memory

用户数据分为四层：

### Immediate Context

当前对话、当前任务和最近几轮消息。

### Episodic Memory

近期饮食、运动、睡眠、健康事件。

### Semantic Memory

长期稳定偏好，例如饮食偏好、工作习惯、长期目标。

### Structured Data

Food Logs、Exercise Logs、Sleep Logs、User Profile。

## Context 原则

```text
Current Question
+ Relevant Profile
+ Relevant Memory
+ Structured Data
+ Relevant Knowledge
→ Context Builder
→ LLM
```

不将用户全部历史记录直接发送给模型。

---

# 11. RAG 需求

## 11.1 Knowledge Ingestion

```text
Authoritative Sources
→ Parser
→ Cleaning
→ Chunking
→ Metadata
→ Embedding
→ Postgres + pgvector
```

## 11.2 Retrieval

```text
Question
→ Intent Detection
→ Domain Routing
→ Query Rewrite
→ Hybrid Search
→ Metadata Filter
→ Top-K
→ Reranking
→ Context Assembly
```

## 11.3 Domain Routing

示例：

| 问题 | Domain |
|---|---|
| 健身前吃什么 | Nutrition + Exercise + Evidence |
| 隔夜菜安全吗 | Food Safety + Evidence |
| 68 岁老人怎么增加蛋白质 | Public Nutrition + Special Population + Food Nutrition + Evidence |
| 为什么总疲劳 | Medical Foundation + Nutrition + Lifestyle + Evidence |

---

# 12. Personal RAG

系统同时具备两类 RAG：

### Global Knowledge RAG

负责专业事实、指南、证据。

### Personal Memory RAG

负责用户自己的历史与行为上下文。

```text
Personal RAG
+ Domain RAG
+ Structured Data
→ Reasoning Context
```

---

# 13. Tools

LLM 不承担所有任务，工具负责确定性工作。

## 13.1 用户数据工具

```text
get_user_profile()
get_recent_food_logs()
get_exercise_logs()
get_sleep_summary()
```

## 13.2 知识工具

```text
search_nutrition_knowledge()
search_food_safety()
search_medical_knowledge()
search_exercise_knowledge()
```

## 13.3 计算工具

```text
calculate_nutrition()
get_food_nutrient_data()
get_daily_summary()
```

## 原则

数据库负责查询；程序负责计算；LLM 负责理解、调度、解释和综合。

---

# 14. Agent Architecture

## MVP

```text
User
 ↓
Orchestrator
 ├─ Nutrition Agent
 ├─ Food Agent
 └─ Lifestyle / Exercise Agent
 ↓
RAG
 ↓
Safety Checker
 ↓
Response
```

## V1/V2

增加：

- Special Population Agent
- Evidence Agent
- Meal Planning Agent
- Family Care Agent

MVP 不要求大量 Agent，重点是证明路由与工具调用的产品价值。

---

# 15. Safety Architecture

## 15.1 风险等级

### Level 1：Low Risk

普通饮食、食品比较、运动前后营养等。

→ 正常回答。

### Level 2：Potential Concern

持续疲劳、明显食欲变化、长期消化不适等。

→ 一般信息 + 限制说明 + 关注建议。

### Level 3：High Risk

紧急症状、疾病诊断请求、药物高风险问题等。

→ 不诊断、不处方，使用安全响应并建议寻求专业医疗帮助。

## 15.2 必须阻止

- 虚构疾病
- 虚构检查结果
- 虚构用户经历
- 无依据的剂量建议
- 伪造证据
- 不支持结论的引用
- 过度确定性医疗表述

---

# 16. Multi-user Architecture

```text
Application
→ Auth
→ user_id / tenant_id
→ User Data
→ Personal Context
```

所有用户数据必须具备用户级隔离。

推荐：

- PostgreSQL
- Row Level Security
- 用户级权限
- 用户上传文件独立归属

身份隔离不能只依赖 Prompt。

---

# 17. Database Schema

## users

```text
id
email
created_at
```

## user_profiles

```text
id
user_id
age
sex
height
weight
goal
activity_level
work_schedule
diet_preference
food_preferences
allergies
created_at
updated_at
```

## conversations

```text
id
user_id
title
created_at
updated_at
```

## messages

```text
id
conversation_id
role
content
created_at
```

## user_memories

```text
id
user_id
memory_type
content
importance
confidence
created_at
updated_at
```

## food_logs

```text
id
user_id
date
meal_type
food_name
quantity
calories
protein
carbs
fat
source
confidence
```

## exercise_logs

```text
id
user_id
date
exercise_type
duration
intensity
```

## sleep_logs

```text
id
user_id
date
duration
quality
```

## knowledge_documents

```text
id
title
source
organization
publication_date
domain
population
evidence_level
url
```

## knowledge_chunks

```text
id
document_id
content
embedding
domain
population
section
evidence_level
```

---

# 18. 技术架构

## Frontend

- Next.js
- TypeScript
- Tailwind CSS

## Backend

- Python
- FastAPI

## Data

- PostgreSQL
- pgvector
- Supabase Auth
- Supabase Storage

## LLM

选择支持：

- Tool Calling
- Structured Output
- Long Context
- Embeddings / Retrieval integration

的主流模型 API。

## Agent

MVP：轻量自建 Orchestrator。  
V1：LangGraph。

## Deployment

```text
Frontend → Vercel
Backend → Railway / Render
Database → Supabase
```

---

# 19. MVP 功能范围

## P0

### 用户

- 注册/登录
- 用户画像
- 用户数据隔离

### 对话

- 多轮聊天
- 流式响应
- 会话历史
- Context 管理

### 营养

- 日常饮食咨询
- 外卖选择
- 基础营养建议

### 运动

- 运动前后营养
- 久坐与活动建议

### 食品安全

- 基础食品卫生咨询

### AI

- Intent Router
- Tool Calling
- RAG
- Context Retrieval
- Safety Check

### Evidence

- 来源展示
- 关键结论证据引用

## P1

- Food Log
- Exercise Log
- Daily Summary
- Long-term Memory
- Personal RAG
- Meal Planning
- Senior Nutrition Mode
- 语音输入

## P2

- 食物照片识别
- 冰箱识别
- Wearable integration
- 睡眠数据
- 家庭成员管理
- 主动提醒
- 个性化周计划

---

# 20. 核心用户流程

## Flow A：普通咨询

```text
Open App
→ Input Question
→ Intent Classification
→ Risk Classification
→ Context Retrieval
→ Knowledge Retrieval
→ Tool Calling (optional)
→ LLM Reasoning
→ Safety Check
→ Answer + Evidence
```

## Flow B：食品安全

```text
Food Question
→ Food Safety Intent
→ Context
→ Food Safety RAG
→ Risk Assessment
→ Response
```

## Flow C：健康问题

```text
Health Concern
→ Risk Classifier
→ Medical / Nutrition Evidence
→ Safe Response
→ Escalation when required
```

---

# 21. 核心指标

## North Star Metric

### Weekly Useful Health Decisions

定义：

> 用户在一周内通过产品获得建议，并据此完成一次具体健康决策的次数。

## 产品指标

- Activation Rate
- D7 / D30 Retention
- WAU / MAU
- Weekly Useful Decisions
- Food Decision Usage
- Exercise Decision Usage
- Food Safety Usage

## AI 指标

- Intent Accuracy
- Retrieval Recall
- Groundedness
- Citation Accuracy
- Factual Accuracy
- Safety Pass Rate
- Human Satisfaction

---

# 22. Evaluation Dataset

第一阶段建立 **100–200 条测试问题**。

建议分类：

```text
Nutrition             30%
Food                  20%
Food Safety           20%
Exercise              15%
Health                10%
Special Population     5%
```

每条包含：

```text
question
intent
risk_level
expected_domains
must_include
must_not_include
reference_sources
```

---

# 23. Human Evaluation

邀请 10–20 人进行盲评，1–5 分评价：

- 准确性
- 相关性
- 易理解度
- 可执行性
- 可信度
- 安全感

所有展示给面试官的指标必须来自真实测试，不人为编造。

---

# 24. Observability

记录：

```text
request_id
user_id
intent
risk_level
retrieval_query
retrieved_document_ids
tool_calls
model
latency
token_usage
safety_result
```

健康数据遵循最小化收集原则，不记录不必要的敏感信息。

---

# 25. Privacy

用户可以：

- 查看数据
- 删除数据
- 删除记忆
- 关闭长期记忆
- 管理授权
- 删除上传文件

设计原则：

> 最小化收集、用途限定、权限隔离、可删除、可控授权。

---

# 26. MVP 验收标准

## 产品

- 用户能理解产品价值
- 用户能完成核心任务
- 用户愿意重复使用

## AI

- 正确识别意图
- 找到正确知识
- 正确使用个人上下文
- 正确调用工具

## Evidence

- 重要结论有来源
- 引用能够支持对应结论

## Safety

- 能识别高风险问题
- 不进行诊断
- 不产生明显危险建议

## Engineering

- 多用户数据隔离
- 对话可持久化
- 系统有错误处理
- 系统可观察

---

# 27. 开发路线

## Phase 0：Prototype

- Chat UI
- Seed User Profile
- 基础 LLM
- 3 个核心场景

目标：证明用户愿意使用。

## Phase 1：RAG MVP

- Knowledge ingestion
- Embedding
- pgvector
- Hybrid Search
- Citation
- Nutrition / Food Safety / Exercise / Medical Foundation

目标：证明专业检索有效。

## Phase 2：Personal Context

- Food Logs
- Exercise Logs
- User Profile
- Memory
- Personal RAG

目标：证明上下文提高决策质量。

## Phase 3：Agent

- Intent Router
- Orchestrator
- Tool Calling
- 多领域工具

目标：证明系统可完成多步骤任务。

## Phase 4：Safety & Evaluation

- Risk Classifier
- Output Checker
- Evaluation Dataset
- Human Evaluation

目标：证明系统可控、可靠。

## Phase 5：Multimodal

- Image
- Voice
- Food Recognition
- Wearable

目标：降低输入成本。

---

# 28. 第一版 Demo

## Demo 1：外卖

> “这三个外卖哪个比较适合我？”

展示：Context + Nutrition + Food。

## Demo 2：运动

> “晚上 8 点健身，现在该吃什么？”

展示：Exercise + Nutrition + RAG。

## Demo 3：食品安全

> “这个食物放冰箱一天了还能吃吗？”

展示：Food Safety + Evidence + Safety。

## Demo 4：身体状态

> “最近下午总是很困。”

展示：Health Reasoning + Context + Safety。

## Demo 5：中老年

> “我妈妈 68 岁，最近吃得比较少。”

展示：Special Population + Risk + Evidence。

---

# 29. Portfolio Case Study

最终 Portfolio 建议结构：

1. Problem
2. User Research
3. Market & Competitor Analysis
4. Opportunity
5. Product Strategy
6. Conversational UX
7. Knowledge Architecture
8. AI Architecture
9. RAG
10. Agent
11. Context & Memory
12. Safety
13. Evaluation
14. Product Analytics
15. Iteration
16. Live Demo

核心问题：

> **If general-purpose AI can already answer health questions and remember users, what should a domain-specific AI health product actually do?**

产品需要通过研究证明的答案是：

> **不是再做一个聊天机器人，而是构建一个专业知识、证据、上下文、现实约束、风险控制和行动建议的决策层。**

---

# 30. 最终产品定义

> **NutriHealth AI 是一个面向上班族日常生活的 Evidence-Grounded AI Health Copilot。它通过医学基础、公共营养、食品营养、食品卫生、运动和特殊人群知识，结合用户上下文与结构化数据，利用 RAG、Tools、Agent 和 Safety Layer，将健康信息转换为更可靠、更可解释、更可执行的日常健康决策。**

---

# 31. 下一阶段技术设计文档

PRD 完成后，下一份文档应进入 **Technical Design v1.0**，具体定义：

- System Architecture
- Database ER Diagram
- API Endpoints
- Authentication & RLS
- RAG Ingestion Pipeline
- Retrieval Strategy
- Agent State Machine
- Tool Schemas
- Prompt Architecture
- Safety Policy
- Evaluation Dataset Schema
- Observability
- Deployment
- Cost Model

