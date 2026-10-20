/**
 * AI 主动跟进（回访）存储（demo 模式）
 *
 * 跟进记录存 Dexie v3 followUps 表；反馈时事务内同步更新
 * followUps 记录与对应消息的 followUp 字段，保证刷新恢复的卡片不脱节。
 */

import { db, genId, type LocalFollowUp } from "./db";
import { todayKey } from "./dateUtils";
import { formatFollowUpSection } from "./promptBuilder";

const nowISO = () => new Date().toISOString();

export type FollowUpStatus = LocalFollowUp["status"];
export type FollowUpFeedbackStatus = Exclude<FollowUpStatus, "pending">;

export interface SaveFollowUpInput {
  messageId: string;
  conversationId: string;
  content: string;
  dueDate: string;
}

/** 保存跟进记录（回答落库时由【跟进】行提取触发） */
export async function saveFollowUp(input: SaveFollowUpInput): Promise<LocalFollowUp> {
  const record: LocalFollowUp = {
    id: genId(),
    messageId: input.messageId,
    conversationId: input.conversationId,
    content: input.content,
    dueDate: input.dueDate,
    status: "pending",
    createdAt: nowISO(),
  };
  await db.followUps.add(record);
  return record;
}

/** 按 messageId 查找跟进记录 */
export async function getFollowUpByMessageId(
  messageId: string,
): Promise<LocalFollowUp | undefined> {
  return db.followUps.where("messageId").equals(messageId).first();
}

/** 记录跟进反馈：事务内同步更新 followUps 与消息的 followUp 字段 */
export async function recordFollowUpFeedback(
  followUpId: string,
  status: FollowUpFeedbackStatus,
  note?: string,
): Promise<void> {
  await db.transaction("rw", db.followUps, db.messages, async () => {
    const record = await db.followUps.get(followUpId);
    if (!record) return;
    const feedbackAt = nowISO();
    const followUpInfo = {
      content: record.content,
      dueDate: record.dueDate,
      status,
      feedbackNote: note,
      feedbackAt,
    };
    await db.followUps.update(followUpId, { status, feedbackNote: note, feedbackAt });
    await db.messages.update(record.messageId, { followUp: followUpInfo });
  });
}

/** 已到期但仍为 pending 的跟进（dueDate 升序） */
export async function listDuePending(today: string = todayKey()): Promise<LocalFollowUp[]> {
  const pending = await db.followUps.where("status").equals("pending").toArray();
  return pending
    .filter((f) => f.dueDate <= today)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

/** 构建注入 system prompt 的「## 跟进情况」上下文段；无相关记录返回 "" */
export async function getFollowUpContext(): Promise<string> {
  const today = todayKey();
  const all = await db.followUps.toArray();
  // 待跟进（含未到期，上限 5 条，近到期优先）
  const pending = all
    .filter((f) => f.status === "pending")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 5);
  // 近 7 天已反馈（上限 3 条，最新优先）
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const feedbacked = all
    .filter((f) => f.status !== "pending" && f.feedbackAt)
    .filter((f) => new Date(f.feedbackAt as string).getTime() >= sevenDaysAgo)
    .sort((a, b) => (b.feedbackAt as string).localeCompare(a.feedbackAt as string))
    .slice(0, 3);
  if (pending.length === 0 && feedbacked.length === 0) return "";
  return formatFollowUpSection(pending, feedbacked, today);
}
