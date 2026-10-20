export interface KnowledgeSource {
  chunk_id: string;
  content: string;
  score: number;
  domain: string;
  section: string;
  source: string;
  title: string;
  evidence_level: string;
  document_id: string;
  url?: string;
}

/** AI 主动跟进（回访）信息：随 assistant 消息落库，用于到期提醒与反馈闭环 */
export interface FollowUpInfo {
  /** 跟进问题原文（一句话） */
  content: string;
  /** 到期日期，本地时区 "YYYY-MM-DD" */
  dueDate: string;
  /** 跟进状态（字符串枚举，IndexedDB 索引不用 boolean） */
  status: "pending" | "done" | "partial" | "missed";
  feedbackNote?: string;
  feedbackAt?: string;
}

export interface Message {
  id?: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at?: string;
  sources?: KnowledgeSource[];
  followUp?: FollowUpInfo;
}

export interface Conversation {
  id: string;
  title: string;
  pinned?: boolean;
  messages: Message[];
  created_at?: string;
  updated_at?: string;
}

export interface UserProfile {
  age: number;
  sex: string;
  height: number;
  weight: number;
  goal: string;
  activity_level: string;
  work_schedule: string;
  diet_preference: string;
  food_preferences: string;
  allergies: string;
}
