/**
 * Dexie 本地数据库 schema（demo 模式）
 *
 * 会话/消息存储在 IndexedDB，刷新页面后完整恢复。
 * 知识库 chunks 不进 Dexie（构建时静态导入 knowledge-bundle.json）。
 */

import Dexie, { type Table } from "dexie";

/** 会话表记录（字段对齐后端 conversations 表） */
export interface LocalConversation {
  id: string;
  title: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

/** 消息表记录（增加 sources / followUp 字段：后端不存，demo 版随消息落库） */
export interface LocalMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  sources?: import("@/types/chat").KnowledgeSource[];
  followUp?: import("@/types/chat").FollowUpInfo;
  createdAt: string;
}

/** 健康小目标（结构化目标，独立于画像中的自由文本 goal） */
export interface LocalHealthGoal {
  id: string;
  title: string;
  emoji?: string;
  frequency: "daily" | "weekly";
  /** 每周目标次数（仅 weekly，默认 3） */
  targetPerWeek?: number;
  /** 提醒时间 "HH:mm"，undefined = 关闭提醒 */
  reminderTime?: string;
  /** 是否同时发浏览器通知（boolean，不建索引） */
  wantBrowserNotification?: boolean;
  /** 是否归档（boolean，绝不能进索引——见 v2 教训） */
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

/** 目标打卡记录：id 为确定性 `${goalId}::${date}`，put() 幂等 */
export interface LocalGoalCheckIn {
  id: string;
  goalId: string;
  /** 本地时区 "YYYY-MM-DD" */
  date: string;
  createdAt: string;
}

/** AI 主动跟进记录（从回答末尾【跟进】行提取） */
export interface LocalFollowUp {
  id: string;
  /** 关联的 assistant 消息 id */
  messageId: string;
  conversationId: string;
  content: string;
  /** 到期日期 "YYYY-MM-DD"（字典序即时间序） */
  dueDate: string;
  status: "pending" | "done" | "partial" | "missed";
  feedbackNote?: string;
  feedbackAt?: string;
  createdAt: string;
}

class NutriHealthDB extends Dexie {
  conversations!: Table<LocalConversation, string>;
  messages!: Table<LocalMessage, string>;
  healthGoals!: Table<LocalHealthGoal, string>;
  goalCheckIns!: Table<LocalGoalCheckIn, string>;
  followUps!: Table<LocalFollowUp, string>;

  constructor() {
    super("nutrihealth-demo");
    this.version(1).stores({
      conversations: "id, pinned, updatedAt, [pinned+updatedAt]",
      messages: "id, conversationId, createdAt, [conversationId+createdAt]",
    });
    // v2：移除含 boolean 的索引（IndexedDB 不支持 boolean 索引键，
    // pinned 为 boolean 的记录会被排除出索引，导致 orderBy 查不到）
    this.version(2).stores({
      conversations: "id, updatedAt",
      messages: "id, conversationId, createdAt",
    });
    // v3：健康小目标 + 打卡记录 + AI 主动跟进
    // goalCheckIns 用 [goalId+date] 复合索引支持近 7 天 / 连续天数区间查询；
    // followUps 用 [status+dueDate] 支持到期待跟进查询（status 为字符串可索引）
    this.version(3).stores({
      conversations: "id, updatedAt",
      messages: "id, conversationId, createdAt",
      healthGoals: "id, createdAt",
      goalCheckIns: "id, goalId, date, [goalId+date]",
      followUps: "id, messageId, dueDate, status, [status+dueDate]",
    });
  }
}

export const db = new NutriHealthDB();

/** 生成 UUID（优先用原生 crypto.randomUUID） */
export function genId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback（旧浏览器）
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
