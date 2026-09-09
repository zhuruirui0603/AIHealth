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

/** 消息表记录（增加 sources 字段：后端不存 sources，demo 版随消息落库） */
export interface LocalMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  sources?: import("@/types/chat").KnowledgeSource[];
  createdAt: string;
}

class NutriHealthDB extends Dexie {
  conversations!: Table<LocalConversation, string>;
  messages!: Table<LocalMessage, string>;

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
