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

export interface Message {
  id?: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at?: string;
  sources?: KnowledgeSource[];
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
