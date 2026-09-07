import type { Message, Conversation, KnowledgeSource } from "@/types/chat";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export { API_URL };

export async function getConversations(): Promise<Conversation[]> {
  const res = await fetch(`${API_URL}/api/conversations`);
  if (!res.ok) throw new Error("Failed to fetch conversations");
  return res.json();
}

export async function getConversation(id: string): Promise<Conversation> {
  const res = await fetch(`${API_URL}/api/conversations/${id}`);
  if (!res.ok) throw new Error("Failed to fetch conversation");
  return res.json();
}

export async function deleteConversation(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/conversations/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete conversation");
}

export async function renameConversation(id: string, title: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/conversations/${id}/rename`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error("Failed to rename conversation");
}

export async function togglePinConversation(id: string): Promise<boolean> {
  const res = await fetch(`${API_URL}/api/conversations/${id}/pin`, { method: "PATCH" });
  if (!res.ok) throw new Error("Failed to toggle pin");
  const data = await res.json();
  return data.pinned;
}

interface StreamCallbacks {
  onToken: (token: string) => void;
  onDone: (conversationId: string, fullResponse: string, sources?: KnowledgeSource[]) => void;
  onError: (error: string) => void;
  onSources?: (sources: KnowledgeSource[]) => void;
}

export async function streamChat(
  message: string,
  conversationId: string | null,
  callbacks: StreamCallbacks
): Promise<void> {
  try {
    const response = await fetch(`${API_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversation_id: conversationId,
        message,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("event:")) {
          const eventType = line.slice(6).trim();
          continue;
        }
        if (line.startsWith("data:")) {
          const raw = line.slice(5).trim();
          if (!raw) continue;

          try {
            const data = JSON.parse(raw);

            if (data.sources) {
              callbacks.onSources?.(data.sources);
            } else if (data.content !== undefined) {
              callbacks.onToken(data.content);
            } else if (data.conversation_id) {
              callbacks.onDone(data.conversation_id, data.full_response || "", data.sources);
            } else if (data.message) {
              callbacks.onError(data.message);
            }
          } catch {
            // Non-JSON data, skip
          }
        }
      }
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    callbacks.onError(msg);
  }
}
