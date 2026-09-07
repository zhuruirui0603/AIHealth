"use client";

import { useState, useCallback, useEffect } from "react";
import { useExternalStoreRuntime, ThreadMessageLike } from "@assistant-ui/react";
import { streamChat, getConversation, getConversations } from "@/lib/api";
import type { Message, KnowledgeSource, Conversation } from "@/types/chat";

const QUICK_PROMPTS = [
  "我今天不知道吃什么，帮我推荐一下适合我的早餐和午餐？",
  "黄焖鸡米饭、麻辣烫、轻食沙拉，这三个外卖哪个比较适合我？",
  "晚上8点去健身，现在5点半应该吃什么？",
  "昨天炒的鸡肉一直放冰箱，今天还能吃吗？",
  "最近每天下午三四点都特别饿，是不是跟饮食有关？",
  "我妈妈68岁，最近吃饭比较少，怎么帮她调整饮食？",
];

function toThreadMessages(messages: Message[]): ThreadMessageLike[] {
  return messages.map((m) => {
    if (m.role === "user") {
      return {
        role: "user",
        id: m.id,
        content: [{ type: "text", text: m.content }],
      };
    }
    const content: any[] = [{ type: "text", text: m.content }];
    if (m.sources && m.sources.length > 0) {
      content.push({ type: "data", name: "sources", data: m.sources });
    }
    return {
      role: "assistant",
      id: m.id,
      content,
    };
  });
}

export function useNutriHealthRuntime() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const refreshSidebar = useCallback(() => {
    getConversations()
      .then(setConversations)
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshSidebar();
  }, [refreshKey, refreshSidebar]);

  // Restore conversation on mount
  useEffect(() => {
    const savedId = localStorage.getItem("conversation_id");
    if (savedId) {
      getConversation(savedId)
        .then((conv) => {
          if (conv?.messages?.length) {
            setMessages(conv.messages);
            setConversationId(conv.id);
          }
        })
        .catch(() => {
          localStorage.removeItem("conversation_id");
        });
    }
  }, []);

  const startNewConversation = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    localStorage.removeItem("conversation_id");
    setSidebarOpen(false);
  }, []);

  const selectConversation = useCallback(async (id: string) => {
    try {
      const conv = await getConversation(id);
      if (conv?.messages) {
        setMessages(conv.messages);
        setConversationId(conv.id);
        localStorage.setItem("conversation_id", conv.id);
      }
      setSidebarOpen(false);
    } catch {
      localStorage.removeItem("conversation_id");
    }
  }, []);

  const onNew = useCallback(
    async (message: any) => {
      // Extract user text from the AppendMessage
      const content = message.content;
      let userText = "";

      if (typeof content === "string") {
        userText = content;
      } else if (Array.isArray(content)) {
        const textPart = content.find((c: any) => c.type === "text");
        userText = textPart ? textPart.text : "";
      }

      if (!userText.trim()) return;

      // Add user message to local state
      const userMsg: Message = { role: "user", content: userText };
      // Add empty assistant message for streaming
      const assistantMsg: Message = { role: "assistant", content: "", sources: [] };
      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsRunning(true);

      const isNewConv = conversationId === null;

      await streamChat(userText, conversationId, {
        onSources: (sources: KnowledgeSource[]) => {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last && last.role === "assistant") {
              updated[updated.length - 1] = { ...last, sources };
            }
            return updated;
          });
        },
        onToken: (token: string) => {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last && last.role === "assistant") {
              updated[updated.length - 1] = {
                ...last,
                content: last.content + token,
              };
            }
            return updated;
          });
        },
        onDone: (convId: string, fullResponse: string, sources?: KnowledgeSource[]) => {
          setConversationId(convId);
          localStorage.setItem("conversation_id", convId);
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last && last.role === "assistant") {
              updated[updated.length - 1] = {
                ...last,
                content: fullResponse,
                sources: sources || last.sources,
              };
            }
            return updated;
          });
          if (isNewConv) {
            setRefreshKey((k) => k + 1);
          }
          setIsRunning(false);
        },
        onError: (err: string) => {
          setIsRunning(false);
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.role === "assistant" && !last.content) {
              return prev.slice(0, -1);
            }
            return prev;
          });
          console.error("Chat error:", err);
        },
      });
    },
    [conversationId]
  );

  const runtime = useExternalStoreRuntime<Message>({
    messages,
    setMessages: (updater) => {
      setMessages((prev) => {
        const next =
          typeof updater === "function"
            ? (updater as (msgs: Message[]) => Message[])(prev)
            : (updater as Message[]);
        return next;
      });
    },
    isRunning,
    onNew,
    convertMessage: (message: Message) => {
      return toThreadMessages([message])[0];
    },
  });

  return {
    runtime,
    messages,
    isRunning,
    conversationId,
    conversations,
    sidebarOpen,
    setSidebarOpen,
    startNewConversation,
    selectConversation,
    refreshKey,
    quickPrompts: QUICK_PROMPTS,
  };
}
