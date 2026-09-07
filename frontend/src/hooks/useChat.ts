"use client";

import { useState, useCallback } from "react";
import { streamChat, getConversation } from "@/lib/api";
import type { Message, KnowledgeSource } from "@/types/chat";

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const refreshSidebar = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const startNewConversation = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setError(null);
    localStorage.removeItem("conversation_id");
    setSidebarOpen(false);
  }, []);

  const selectConversation = useCallback(async (id: string) => {
    setError(null);
    try {
      const conv = await getConversation(id);
      if (conv && conv.messages) {
        setMessages(conv.messages);
        setConversationId(conv.id);
        localStorage.setItem("conversation_id", conv.id);
      }
      setSidebarOpen(false);
    } catch {
      localStorage.removeItem("conversation_id");
    }
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      setError(null);

      const userMsg: Message = { role: "user", content: text };
      const assistantMsg: Message = { role: "assistant", content: "" };
      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsStreaming(true);

      const isNewConversation = conversationId === null;

      await streamChat(text, conversationId, {
        onSources: (sources: KnowledgeSource[]) => {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last && last.role === "assistant") {
              updated[updated.length - 1] = {
                ...last,
                sources,
              };
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
          if (fullResponse) {
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
          }
          if (isNewConversation) {
            refreshSidebar();
          }
          setIsStreaming(false);
        },
        onError: (err: string) => {
          setError(`出错了：${err}`);
          setIsStreaming(false);
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.role === "assistant" && !last.content) {
              return prev.slice(0, -1);
            }
            return prev;
          });
        },
      });
    },
    [conversationId, refreshSidebar]
  );

  const loadConversation = useCallback(async (id: string) => {
    try {
      const conv = await getConversation(id);
      if (conv && conv.messages && conv.messages.length > 0) {
        setMessages(conv.messages);
        setConversationId(conv.id);
      }
    } catch {
      localStorage.removeItem("conversation_id");
    }
  }, []);

  return {
    messages,
    isStreaming,
    conversationId,
    error,
    sendMessage,
    loadConversation,
    startNewConversation,
    selectConversation,
    refreshKey,
    sidebarOpen,
    setSidebarOpen,
    refreshSidebar,
  };
}
