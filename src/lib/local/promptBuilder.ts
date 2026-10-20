/**
 * System prompt 构建器 —— 1:1 移植自 backend/app/services/prompt_builder.py
 *
 * 后端原文件头注释提醒：本文件是 Python 版的同步副本，修改任一方需同步另一方。
 * demo 版在此基础上扩展了「健康小目标」「主动跟进」「跟进情况」三个前端独有段。
 */

import type { KnowledgeSource } from "@/types/chat";
import { type UserProfileData } from "./profile";
import type { GoalWithStats } from "./goalStore";
import type { LocalFollowUp } from "./db";

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

## 主动跟进
如果本次回答给出了具体、可执行的健康行动建议（如饮水目标、运动安排、饮食调整、作息改变），请在回答最末尾、「注意」部分之后另起一行，单独输出一行跟进问题，格式严格为：
【跟进】<一句话跟进问题>
- 跟进问题要具体、温和、一句话以内，并约定一个可检验的时间点（如"明晚""这周末"）。
  示例：【跟进】明天晚饭后按建议散步 20 分钟，做到了回来告诉我一声？
- 如果本次回答只是概念解释、没有可执行建议，则不要输出【跟进】这一行。
- 【跟进】行必须单独成行，是全文最后一行。

## 回答原则
- 温和、清晰、不过度绝对化
- 不制造健康焦虑
- 不进行疾病诊断或开具处方
- 如遇高风险问题（紧急症状、疾病诊断请求、药物高风险问题等），不诊断、不处方，建议用户寻求专业医疗帮助
- 如果信息不足以下结论，请坦诚说明并告知需要补充什么信息
- 结合「健康小目标」「跟进情况」的上下文，让建议与用户当前的执行进度衔接
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

/** 1:1 移植 build_system_prompt_with_rag（demo 扩展：extras 附加目标/跟进上下文段） */
export function buildSystemPromptWithRag(
  profile: UserProfileData,
  retrievedChunks: KnowledgeSource[],
  extras?: { goalContext?: string; followUpContext?: string },
): string {
  const basePrompt = buildSystemPrompt(profile);
  if (!retrievedChunks.length) {
    const extrasText = (extras?.goalContext || "") + (extras?.followUpContext || "");
    return extrasText ? basePrompt + extrasText : basePrompt;
  }

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

  const extrasText = (extras?.goalContext || "") + (extras?.followUpContext || "");
  return basePrompt + knowledgeSection + extrasText;
}

/** 构建「## 健康小目标」上下文段（goalStore.buildGoalContext 调用） */
export function formatGoalSection(goals: GoalWithStats[], today: string): string {
  if (!goals.length) return "";
  const lines = goals.map((g, i) => {
    const parts: string[] = [];
    if (g.frequency === "weekly") {
      const target = g.targetPerWeek ?? 3;
      parts.push(`本周 ${g.weekCount}/${target} 次`);
    } else if (g.doneToday) {
      parts.push(`今日已打卡 ✓，已连续坚持 ${g.streak} 天`);
    } else if (g.streak > 0) {
      parts.push(`今日未打卡（上一轮连续 ${g.streak} 天）`);
    } else {
      parts.push("尚未开始打卡");
    }
    const label = g.frequency === "weekly" ? "每周" : "每日";
    return `${i + 1}. [${label}] ${g.title} —— ${parts.join("，")}`;
  });
  return `\n\n## 健康小目标
以下是用户设置的结构化健康目标及截至 ${today} 的执行进度，请结合进度给出建议（已达标可肯定并适度进阶，未达标可温和提醒，不施加焦虑）：

${lines.join("\n")}`;
}

/** 构建「## 跟进情况」上下文段（followUpStore.getFollowUpContext 调用） */
export function formatFollowUpSection(
  pending: LocalFollowUp[],
  feedbacked: LocalFollowUp[],
  today: string,
): string {
  if (!pending.length && !feedbacked.length) return "";
  const lines: string[] = [];
  for (const f of pending) {
    const dueLabel = f.dueDate <= today ? "已到期" : `到期日 ${f.dueDate}`;
    lines.push(`- 待跟进（${dueLabel}，用户尚未反馈）：「${f.content}」`);
  }
  const statusLabel: Record<string, string> = {
    done: "已做到",
    partial: "部分做到",
    missed: "还没做到",
  };
  for (const f of feedbacked) {
    lines.push(
      `- 问：「${f.content}」→ 用户反馈：${statusLabel[f.status] || f.status}${f.feedbackNote ? `（${f.feedbackNote}）` : ""}`,
    );
  }
  return `\n\n## 跟进情况
以下是之前你给用户留下的跟进问题及其反馈，请在本回答中衔接这些信息：
${lines.join("\n")}
请根据反馈调整建议力度：已做到给予肯定并适度进阶；未做到则降低门槛、分析障碍，不施加焦虑。`;
}
