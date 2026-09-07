import MarkdownRenderer from "./MarkdownRenderer";
import CitationCard from "./CitationCard";
import type { Message } from "@/types/chat";

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
}

export default function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-primary-600 text-white"
            : "bg-gray-100 text-gray-800"
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
                  <CitationCard key={source.chunk_id} source={source} index={idx + 1} />
                ))}
              </div>
            )}
          </>
        )}
        {isStreaming && (
          <span className="streaming-cursor" />
        )}
      </div>
    </div>
  );
}
