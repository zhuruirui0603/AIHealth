"use client";

import { useEffect, useRef } from "react";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import QuickActions from "./QuickActions";
import ConversationList from "./ConversationList";
import { useChat } from "@/hooks/useChat";

export default function ChatWindow() {
  const {
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
  } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const savedId = localStorage.getItem("conversation_id");
    if (savedId) {
      loadConversation(savedId);
    }
  }, []);

  const handleSend = (message: string) => {
    sendMessage(message);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar - desktop (fixed) */}
      <div className="hidden w-64 flex-shrink-0 md:block">
        <ConversationList
          currentId={conversationId}
          onSelect={selectConversation}
          onNew={startNewConversation}
          refreshKey={refreshKey}
        />
      </div>

      {/* Sidebar - mobile (overlay) */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed left-0 top-0 z-40 h-full w-64 md:hidden">
            <ConversationList
              currentId={conversationId}
              onSelect={selectConversation}
              onNew={startNewConversation}
              refreshKey={refreshKey}
            />
          </div>
        </>
      )}

      {/* Main chat area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 md:hidden"
              aria-label="打开历史对话"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-800">NutriHealth AI</h1>
              <p className="text-xs text-gray-500">今天有什么健康问题？</p>
            </div>
          </div>
        </div>

        {/* Messages area */}
        <div ref={scrollRef} className="chat-scroll flex-1 overflow-y-auto px-4 py-6">
          <div className="mx-auto max-w-3xl">
            {messages.length === 0 && (
              <div className="mb-6">
                <p className="mb-3 text-center text-sm text-gray-400">
                  选择一个快捷问题，或直接输入你的健康问题
                </p>
                <QuickActions onAction={handleSend} disabled={isStreaming} />
              </div>
            )}

            {messages.map((msg, idx) => (
              <ChatMessage
                key={msg.id || idx}
                message={msg}
                isStreaming={
                  isStreaming &&
                  idx === messages.length - 1 &&
                  msg.role === "assistant"
                }
              />
            ))}

            {error && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Input area */}
        <div className="mx-auto w-full max-w-3xl">
          <ChatInput onSend={handleSend} disabled={isStreaming} />
        </div>
      </div>
    </div>
  );
}
