"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useNutriHealthRuntime } from "@/hooks/useNutriHealthRuntime";
import ConversationList from "@/components/ConversationList";
import MyThread from "@/components/assistant/MyThread";

export default function Home() {
  const {
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
    quickPrompts,
  } = useNutriHealthRuntime();

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="flex h-screen overflow-hidden bg-gray-50">
        {/* Sidebar - desktop */}
        <div className="hidden w-64 flex-shrink-0 md:block">
          <ConversationList
            currentId={conversationId}
            onSelect={selectConversation}
            onNew={startNewConversation}
            refreshKey={refreshKey}
          />
        </div>

        {/* Sidebar - mobile overlay */}
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

          {/* Thread */}
          <div className="flex-1 overflow-hidden">
            <MyThread
              quickPrompts={quickPrompts}
              onQuickAction={(msg) => {
                runtime.thread.append(msg);
              }}
              messages={messages}
              isStreaming={isRunning}
            />
          </div>
        </div>
      </div>
    </AssistantRuntimeProvider>
  );
}
