/**
 * System prompt 构建器 —— 1:1 移植自 backend/app/services/prompt_builder.py
 *
 * 后端原文件头注释提醒：本文件是 Python 版的同步副本，修改任一方需同步另一方。
 */

import type { KnowledgeSource } from "@/types/chat";
import { type UserProfileData } from "./profile";

/**
 * SEED_USER 画像，取自 backend/app/seed/seed_data.py
 * demo 模式下作为内置常量（无后端 users / user_profiles 表）。
 */
export const SYSTEM_PROMPT_TEMPLATE = `你是 NutriHealth AI，一个专业的 AI 营养健康决策助手。

你的定位是：围绕用户真实生活场景，将专业健康知识、个人上下文、食品与营养数据及可靠证据结合，为用户提供可解释、安全且可执行的日常健康决策支持。

## 用户画像
{user_profile_section}

## 回答格式
你必须使用以下结构化格式回答用户的问题：

## 结论
[直接给出核心结论或建议]

## 原因
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
- 如遇高风险问题（紧急症状、疾病诊断请求、药物高风险问题等），不诊断、不处方，建议用户寻求专业医疗帮助
- 如果信息不足以下结论，请坦诚说明并告知需要补充什么信息
- 回答使用中文
`;

function buildProfileSection(profile: UserProfileData): string {
  // foodPreferences / allergies 现在是逗号分隔文本
  const foodPrefsText = (profile.foodPreferences || "").trim() || "无特殊偏好";
  const allergiesText = (profile.allergies || "").trim() || "无";

  return `- 年龄: ${profile.age}
- 性别: ${profile.sex}
- 身高: ${profile.height}cm
- 体重: ${profile.weight}kg
- 健康目标: ${profile.goal}
- 活动水平: ${profile.activityLevel}
- 工作时间: ${profile.workSchedule}
- 饮食偏好: ${profile.dietPreference}
- 食物喜好: ${foodPrefsText}
- 过敏: ${allergiesText}`;
}

export function buildSystemPrompt(profile: UserProfileData): string {
  return SYSTEM_PROMPT_TEMPLATE.replace(
    "{user_profile_section}",
    buildProfileSection(profile),
  );
}

/** 1:1 移植 build_system_prompt_with_rag */
export function buildSystemPromptWithRag(
  profile: UserProfileData,
  retrievedChunks: KnowledgeSource[],
): string {
  const basePrompt = buildSystemPrompt(profile);
  if (!retrievedChunks.length) return basePrompt;

  const knowledgeSections = retrievedChunks.map((chunk, i) => {
    return `[${i + 1}] 来源: ${chunk.source || "未知"}
    标题: ${chunk.title || "未知"}
    章节: ${chunk.section || ""}
    证据等级: ${chunk.evidence_level || "C"}
    内容: ${chunk.content}`;
  });

  const knowledgeText = knowledgeSections.join("\n\n");

  const knowledgeSection = `\n\n## 知识库参考
以下是从知识库中检索到的相关专业知识。请基于这些知识回答用户问题，并在「依据」部分标注引用了哪些知识来源（用 [1] [2] 等序号标注）。
如果知识库内容与用户问题不完全相关，请自行判断是否采用。
不要编造未在知识库中出现的来源。

${knowledgeText}`;

  return basePrompt + knowledgeSection;
}
