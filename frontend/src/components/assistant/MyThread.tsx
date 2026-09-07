"use client";

import {
  ThreadPrimitive,
  ComposerPrimitive,
} from "@assistant-ui/react";
import CitationCard from "../CitationCard";
import MarkdownRenderer from "../MarkdownRenderer";
import type { KnowledgeSource, Message } from "@/types/chat";

const QUICK_ACTIONS = [
  { icon: "🥗", label: "今天吃什么" },
  { icon: "🍱", label: "外卖怎么选" },
  { icon: "🏃", label: "运动怎么吃" },
  { icon: "🧊", label: "食品安全吗" },
  { icon: "🩺", label: "最近身体有什么变化" },
  { icon: "👴", label: "帮父母看看" },
];

const QUICK_MESSAGES: Record<string, string> = {
  "今天吃什么": "我今天不知道吃什么，帮我推荐一下适合我的早餐和午餐？",
  "外卖怎么选": "黄焖鸡米饭、麻辣烫、轻食沙拉，这三个外卖哪个比较适合我？",
  "运动怎么吃": "晚上8点去健身，现在5点半应该吃什么？",
  "食品安全吗": "昨天炒的鸡肉一直放冰箱，今天还能吃吗？",
  "最近身体有什么变化": "最近每天下午三四点都特别饿，是不是跟饮食有关？",
  "帮父母看看": "我妈妈68岁，最近吃饭比较少，怎么帮她调整饮食？",
};

function MyComposer() {
  return (
    <ComposerPrimitive.Root className="mx-auto flex w-full max-w-3xl items-end gap-2 border-t border-gray-200 bg-white p-4">
      <ComposerPrimitive.Input
        placeholder="输入你的健康问题……"
        className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
      />
      <ComposerPrimitive.Send className="rounded-xl bg-primary-600 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-40">
        发送
      </ComposerPrimitive.Send>
    </ComposerPrimitive.Root>
  );
}

function ChatMessage({ message, isStreaming }: { message: Message; isStreaming?: boolean }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-800"
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <>
            <MarkdownRenderer content={message.content} />
            {message.sources && message.sources.length > 0 && (
              <div className="mt-3 space-y-2 border-t border-gray-200 pt-3">
                <p className="text-xs font-medium text-gray-500">参考来源</p>
                {message.sources.map((source, idx) => (
                  <CitationCard key={source.chunk_id || idx} source={source} index={idx + 1} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

interface MyThreadProps {
  quickPrompts: string[];
  onQuickAction: (msg: string) => void;
  messages: Message[];
  isStreaming: boolean;
}

function MyThread({ quickPrompts, onQuickAction, messages, isStreaming }: MyThreadProps) {
  return (
    <ThreadPrimitive.Root
      className="flex h-full flex-col bg-gray-50"
      style={{ height: "100%" }}
    >
      <ThreadPrimitive.Viewport
        autoScroll
        className="chat-scroll flex-1 overflow-y-auto px-4 py-6"
      >
        <div className="mx-auto max-w-3xl">
          {messages.length === 0 ? (
            <div className="mb-6">
              <p className="mb-3 text-center text-sm text-gray-400">
                选择一个快捷问题，或直接输入你的健康问题
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => {
                      const msg = QUICK_MESSAGES[action.label];
                      onQuickAction(msg);
                    }}
                    className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 transition-colors hover:border-primary-400 hover:bg-primary-50"
                  >
                    <span className="text-lg">{action.icon}</span>
                    <span className="font-medium">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <ChatMessage
                key={msg.id || idx}
                message={msg}
                isStreaming={
                  isStreaming &&
                  idx === messages.length - 1 &&
                  msg.role === "assistant"
                }
              />
            ))
          )}
        </div>
      </ThreadPrimitive.Viewport>
      <MyComposer />
    </ThreadPrimitive.Root>
  );
}

export { MyThread, ChatMessage, MyComposer };
export default MyThread;
