import type { KnowledgeSource } from "@/types/chat";

/** Bubble 消息的 extraInfo（由 BubbleItemType.extraInfo 透传到 footer 的 info） */
export interface BubbleExtra {
  sources?: KnowledgeSource[];
  error?: string;
  /** 当前消息 id（用于 Retry 重新生成） */
  messageId?: string | number;
  /** Retry 回调（重新生成此条 AI 回复） */
  onReload?: (id: string | number) => void;
  /** 是否正在请求中（请求中禁用 Retry） */
  isRequesting?: boolean;
}
