/**
 * 本地会话存储（demo 模式）
 *
 * 对标 remote 模式的 conversationApi.ts，提供对等接口。
 * 数据存储在 IndexedDB（Dexie），刷新后完整恢复。
 */

import { db, genId, type LocalConversation, type LocalMessage } from "./db";
import type { Conversation, KnowledgeSource, Message } from "@/types/chat";

const nowISO = () => new Date().toISOString();

/** 将 LocalConversation 转为前端 Conversation 类型（不含 messages，列表用） */
function toConversation(c: LocalConversation): Conversation {
  return {
    id: c.id,
    title: c.title,
    pinned: c.pinned,
    messages: [],
    created_at: c.createdAt,
    updated_at: c.updatedAt,
  };
}

/** 会话列表（排序与后端一致：pinned DESC, updatedAt DESC）
 *  注意：IndexedDB 不支持 boolean 索引键，pinned 为 boolean 的记录会被排除出
 *  复合索引，因此不能用 orderBy("[pinned+updatedAt]")——改用 JS 排序。
 */
export async function listConversations(): Promise<Conversation[]> {
  const list = await db.conversations.toArray();
  list.sort((a, b) => {
    if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
    return (b.updatedAt || "").localeCompare(a.updatedAt || "");
  });
  return list.map(toConversation);
}

/** 获取单个会话（含消息） */
export async function getConversation(id: string): Promise<Conversation | null> {
  const conv = await db.conversations.get(id);
  if (!conv) return null;
  const messages = await db.messages
    .where("conversationId")
    .equals(id)
    .sortBy("createdAt");
  const result: Conversation = {
    id: conv.id,
    title: conv.title,
    pinned: conv.pinned,
    messages: messages.map((m: LocalMessage) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      sources: m.sources,
      created_at: m.createdAt,
    })),
    created_at: conv.createdAt,
    updated_at: conv.updatedAt,
  };
  return result;
}

/** 创建新会话，返回完整 Conversation（含空 messages 数组） */
export async function createConversation(): Promise<Conversation> {
  const ts = nowISO();
  const conv: LocalConversation = {
    id: genId(),
    title: "新对话",
    pinned: false,
    createdAt: ts,
    updatedAt: ts,
  };
  await db.conversations.add(conv);
  return toConversation(conv);
}

/** 删除会话及其全部消息 */
export async function deleteConversation(id: string): Promise<void> {
  await db.transaction("rw", db.conversations, db.messages, async () => {
    await db.messages.where("conversationId").equals(id).delete();
    await db.conversations.delete(id);
  });
}

/** 重命名会话 */
export async function renameConversation(id: string, title: string): Promise<void> {
  await db.conversations.update(id, { title, updatedAt: nowISO() });
}

/** 切换置顶状态，返回新状态 */
export async function togglePinConversation(id: string): Promise<boolean> {
  const conv = await db.conversations.get(id);
  if (!conv) throw new Error("Conversation not found");
  const pinned = !conv.pinned;
  await db.conversations.update(id, { pinned, updatedAt: nowISO() });
  return pinned;
}

/** 添加消息（用户或 assistant），同时更新会话的 updatedAt */
export async function addMessage(
  conversationId: string,
  role: "user" | "assistant",
  content: string,
  sources?: KnowledgeSource[],
): Promise<Message> {
  const ts = nowISO();
  const localMsg: LocalMessage = {
    id: genId(),
    conversationId,
    role,
    content,
    sources,
    createdAt: ts,
  };
  await db.transaction("rw", db.messages, db.conversations, async () => {
    await db.messages.add(localMsg);
    await db.conversations.update(conversationId, { updatedAt: ts });
  });
  return {
    id: localMsg.id,
    role,
    content,
    sources,
    created_at: ts,
  };
}

/** 更新 assistant 消息内容（流式完成后落库） */
export async function updateMessage(
  id: string,
  patch: { content?: string; sources?: KnowledgeSource[] },
): Promise<void> {
  const update: Partial<LocalMessage> = {};
  if (patch.content !== undefined) update.content = patch.content;
  if (patch.sources !== undefined) update.sources = patch.sources;
  await db.messages.update(id, update);
}
