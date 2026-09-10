"use client";

/**
 * ChatShell：基于 Ant Design X 的完整对话界面
 *
 * 纯前端模式：浏览器直连 DeepSeek，会话存 IndexedDB，知识库 BM25 检索
 *
 * - Conversations：会话侧栏（搜索 / 置顶 / 重命名 / 删除）
 * - Bubble.List + XMarkdown：流式消息渲染，Sources 展示 RAG 引用
 * - Sender：输入框；Welcome + Prompts：空态快捷提问
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bubble,
  Prompts,
  Welcome,
  XProvider,
} from "@ant-design/x";
import { useXChat } from "@ant-design/x-sdk";
import { App, Button, Input, Modal } from "antd";
import { AnimatePresence, motion } from "motion/react";
import { AudioOutlined, SendOutlined } from "@ant-design/icons";

import bundle from "@/data/knowledge-bundle.json";
import {
  createNutriProvider,
  createSearcher,
  isHealthRelated,
  type NutriLocalMessage,
} from "@/lib/providers/NutriHealthProvider";
import * as localStore from "@/lib/local/conversationStore";
import { getProfile, type UserProfileData } from "@/lib/local/profile";
import { searchWebIfNeeded } from "@/lib/search/webSearch";
import ProfileModal from "@/components/ProfileModal";
import type { Conversation, KnowledgeSource } from "@/types/chat";

// --- 拆分模块 ---
import { TEMP_PREFIX, QUICK_PROMPTS, newTempKey } from "./chat/constants";
import type { BubbleExtra } from "./chat/types";
import { bubbleRole } from "./chat/BubbleRole";
import { useSpeechInput } from "./chat/useSpeechInput";
import { generateTitle } from "./chat/titleGenerator";
import Sidebar from "./chat/Sidebar";
import ChatHeader from "./chat/ChatHeader";

function ChatShellInner() {
  const { modal } = App.useApp();

  // ---------- 会话列表 ----------
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchText, setSearchText] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ---------- 用户画像 ----------
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    setUserProfile(getProfile());
  }, []);

  const refreshConversations = useCallback(() => {
    localStore
      .listConversations()
      .then(setConversations)
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshConversations();
  }, [refreshConversations]);

  // ---------- 当前会话 key ----------
  const [activeKey, setActiveKey] = useState<string>(newTempKey());
  const [realIdMap, setRealIdMap] = useState<Record<string, string>>({});
  const currentRealId = activeKey.startsWith(TEMP_PREFIX)
    ? realIdMap[activeKey]
    : activeKey;

  // 恢复上次会话（校验存在性）
  useEffect(() => {
    const savedId = localStorage.getItem("conversation_id");
    if (!savedId) return;
    localStore
      .getConversation(savedId)
      .then((conv) => {
        if (conv && Array.isArray(conv.messages)) {
          setActiveKey(conv.id);
        } else {
          localStorage.removeItem("conversation_id");
        }
      })
      .catch(() => localStorage.removeItem("conversation_id"));
  }, []);

  // ---------- Provider ----------
  const apiKey = process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY || "";

  const searcher = useMemo(
    () => createSearcher(bundle.chunks as any),
    [],
  );

  const provider = useMemo(() => {
    if (!apiKey || !userProfile) return null;
    return createNutriProvider({
      apiKey,
      profile: userProfile,
      searcher: searcher || undefined,
    });
  }, [userProfile, searcher]);

  const { messages, onRequest, isRequesting, onReload } = useXChat({
    provider: (provider as any) || undefined,
    conversationKey: activeKey,
    defaultMessages: async (info: { conversationKey?: string }) => {
      const key = typeof info.conversationKey === "string" ? info.conversationKey : "";
      if (!key || key.startsWith(TEMP_PREFIX)) return [];
      try {
        const conv = await localStore.getConversation(key);
        if (!conv || !Array.isArray(conv.messages)) return [];
        return conv.messages
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m, i) => ({
            id: m.id ?? `${key}-${i}`,
            message: {
              content: m.content,
              role: m.role,
              sources: m.sources,
            } as NutriLocalMessage,
            status: "success" as const,
          }));
      } catch {
        return [];
      }
    },
    requestPlaceholder: { content: "正在思考中…", role: "assistant" },
    requestFallback: (_, { error, messageInfo }) => ({
      content:
        error?.name === "AbortError"
          ? messageInfo?.message?.content || "已停止生成"
          : `连接服务失败：${error?.message ?? "未知错误"}`,
      role: "assistant" as const,
    }),
  });

  // ---------- 消息落库 + 标题生成 ----------
  const handledMsgIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const convId = currentRealId;
    if (!convId) return;
    for (let i = messages.length - 1; i >= 0; i--) {
      const { message, status, id } = messages[i];
      if (message.role !== "assistant") continue;
      const msgId = String(id);
      const isFinal = status === "success" || status === "abort" || status === "error";
      if (isFinal && message.content) {
        if (!handledMsgIdsRef.current.has(msgId)) {
          handledMsgIdsRef.current.add(msgId);
          localStore
            .addMessage(convId, "assistant", message.content, (message as any).sources)
            .then(() => {
              refreshConversations();
              if (status === "success") {
                const conv = conversations.find((c) => c.id === convId);
                if (conv && conv.title === "新对话") {
                  generateTitle(convId, (text) => {
                    localStore.renameConversation(convId, text).catch(() => {});
                    refreshConversations();
                  });
                }
              }
            })
            .catch(() => {});
        }
      }
      break;
    }
  }, [messages, currentRealId, conversations, refreshConversations]);

  // ---------- 会话操作 ----------
  const handleNew = useCallback(() => {
    setActiveKey(newTempKey());
    localStorage.removeItem("conversation_id");
    setSidebarOpen(false);
  }, []);

  const handleClearAll = useCallback(() => {
    modal.confirm({
      title: "清空全部历史对话",
      content: "将删除所有本地会话记录，此操作无法恢复。确定继续吗？",
      okText: "清空",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: async () => {
        const list = await localStore.listConversations().catch(() => []);
        await Promise.all(
          list.map((c) => localStore.deleteConversation(c.id).catch(() => {})),
        );
        handleNew();
        refreshConversations();
      },
    });
  }, [modal, handleNew, refreshConversations]);

  const handleSelect = useCallback((key: string) => {
    setActiveKey(key);
    localStorage.setItem("conversation_id", key);
    setSidebarOpen(false);
  }, []);

  const handleSubmit = useCallback(
    (content: string) => {
      const text = content.trim();
      if (!text || isRequesting) return;

      // 联网搜索兜底：本地知识库命中不足时预取网络来源，
      // 经 requestParams.webSources 透传给 Provider 合并注入
      const localSources =
        isHealthRelated(text) && searcher
          ? searcher.search(text, 5)
          : ([] as KnowledgeSource[]);
      searchWebIfNeeded(text, localSources)
        .catch(() => [] as KnowledgeSource[])
        .then((webSources) => {
          const request = { message: text, webSources } as any;

          const convId = currentRealId;
          if (convId) {
            localStore
              .addMessage(convId, "user", text)
              .then(() => refreshConversations())
              .catch(() => {});
            onRequest(request);
          } else {
            localStore.createConversation().then((conv) => {
              const tempKey = activeKey;
              setRealIdMap((prev) => ({ ...prev, [tempKey]: conv.id }));
              localStorage.setItem("conversation_id", conv.id);
              localStore
                .addMessage(conv.id, "user", text)
                .then(() => refreshConversations())
                .catch(() => {});
              onRequest(request);
            });
          }
        });
      setInputValue("");
    },
    [currentRealId, isRequesting, onRequest, activeKey, refreshConversations, searcher],
  );

  // ---------- 重命名 ----------
  const [renameState, setRenameState] = useState<{ id: string; title: string } | null>(null);
  const handleRenameOk = async () => {
    if (!renameState) return;
    const title = renameState.title.trim();
    if (!title) return;
    try {
      await localStore.renameConversation(renameState.id, title);
      setRenameState(null);
      refreshConversations();
    } catch {
      // ignore
    }
  };

  // ---------- 输入框 + 语音输入 ----------
  const [inputValue, setInputValue] = useState("");
  const { recording, toggleRecording } = useSpeechInput(modal);

  // ---------- 会话菜单操作 ----------
  const handleExport = async (id: string) => {
    try {
      const conv = await localStore.getConversation(id);
      if (!conv) return;
      const data = {
        id: conv.id,
        title: conv.title,
        messages: conv.messages.map((m) => ({
          role: m.role,
          content: m.content,
          sources: m.sources?.map((s) => ({
            title: s.title,
            source: s.source,
            url: s.url,
            domain: s.domain,
            evidence_level: s.evidence_level,
          })),
          created_at: m.created_at,
        })),
        exported_at: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${conv.title || "conversation"}-${id.slice(0, 8)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  };

  const handleMenuAction = (action: string, id: string) => {
    const conv = conversations.find((c) => c.id === id);
    if (action === "pin") {
      localStore
        .togglePinConversation(id)
        .catch(() => {})
        .finally(refreshConversations);
    } else if (action === "rename") {
      setRenameState({ id, title: conv?.title ?? "" });
    } else if (action === "export") {
      handleExport(id);
    } else if (action === "delete") {
      modal.confirm({
        title: "删除对话",
        content: `确定删除「${conv?.title ?? id}」吗？删除后无法恢复。`,
        okText: "删除",
        okButtonProps: { danger: true },
        cancelText: "取消",
        onOk: async () => {
          await localStore.deleteConversation(id).catch(() => {});
          refreshConversations();
          if (currentRealId === id) handleNew();
        },
      });
    }
  };

  // ---------- 侧栏节点（桌面 + 移动端共用） ----------
  const sidebar = (
    <Sidebar
      conversations={conversations}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      activeKey={currentRealId}
      onSelect={handleSelect}
      onNew={handleNew}
      onMenuAction={handleMenuAction}
      onOpenProfile={() => setProfileOpen(true)}
    />
  );

  return (
    <div className="relative h-dvh w-full overflow-hidden chat-canvas">
      {/* 桌面侧栏 */}
      <div
        className="hidden h-full w-64 flex-shrink-0 md:block"
        style={{ borderRight: "1px solid var(--color-border)" }}
      >
        {sidebar}
      </div>

      {/* 移动端侧栏（抽屉） */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-30 bg-black/40 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              className="fixed left-0 top-0 z-40 h-full w-64 shadow-xl md:hidden"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.25, ease: "easeInOut" }}
            >
              {sidebar}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 主区域：内容占满全屏，导航栏与发送框 fixed 悬浮 */}
      <div className="absolute inset-0 flex flex-col md:left-64">
        <ChatHeader onOpenSidebar={() => setSidebarOpen(true)} />

        {/* 消息内容区 */}
        <main
          className="flex-1 overflow-hidden"
        >
          <div
            className="mx-auto flex h-full w-full flex-col"
            style={{
              paddingTop: "var(--navbar-height)",
            }}
          >
            {messages.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-6 overflow-y-auto py-8">
                <Welcome
                  variant="borderless"
                  title="你好，我是健康助手"
                  description="营养健康助手，您的专属智能营养顾问。"
                />
                <Prompts
                  title="试试这样问"
                  wrap
                  style={{ width: "100%", maxWidth: 640 }}
                  items={QUICK_PROMPTS.map((p, i) => ({ key: String(i), label: p }))}
                  onItemClick={(info) => handleSubmit(String(info.data.label))}
                />
              </div>
            ) : (
              <Bubble.List
                style={{ flex: 1, minHeight: 0, padding: '0 16px' }}
                role={bubbleRole}
                autoScroll
                items={messages.map(({ id, message, status }, idx) => {
                  const isFinal =
                    status === "success" ||
                    status === "error" ||
                    status === "abort";
                  // 找当前 assistant 消息前最近一条 user 消息：
                  // 免责声明仅对营养健康相关提问显示
                  let prevUserQuery = "";
                  for (let j = idx - 1; j >= 0; j--) {
                    if (messages[j].message.role === "user") {
                      prevUserQuery = String(messages[j].message.content ?? "");
                      break;
                    }
                  }
                  return {
                    key: id,
                    role: message.role,
                    content: String(message.content ?? ""),
                    loading: status === "loading",
                    streaming: status === "updating",
                    extraInfo: {
                      sources: (message as any).sources,
                      error: (message as any).error,
                      messageId: id,
                      onReload: onReload as
                        | ((id: string | number) => void)
                        | undefined,
                      isRequesting,
                      showDisclaimer:
                        message.role === "assistant" &&
                        isFinal &&
                        isHealthRelated(prevUserQuery),
                    } satisfies BubbleExtra,
                  };
                })}
              />
            )}
          </div>
        </main>

        {/* 悬浮发送框（DIY：胶囊输入框 + 独立发送按钮） */}
        <div
          className="fixed inset-x-0 z-20 mx-auto"
          style={{
            bottom: "16px",
            maxWidth: "var(--sender-max-width)",
            padding: "0 16px",
          }}
        >
          <div className="flex items-end gap-2">
            {/* 胶囊容器：输入框 + 语音按钮，左右半圆 */}
            <div
              className="glass-panel flex items-end gap-2 flex-1"
              style={{
                borderRadius: "999px",
                padding: "8px 8px 8px 20px",
                boxShadow: "var(--shadow-float)",
              }}
            >
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (inputValue.trim() && !isRequesting) {
                      handleSubmit(inputValue);
                    }
                  }
                }}
                placeholder="输入你的健康问题…"
                rows={1}
                style={{
                  flex: 1,
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  resize: "none",
                  maxHeight: 140,
                  minHeight: 28,
                  lineHeight: "1.5",
                  fontSize: 14,
                  fontFamily: "inherit",
                  color: "var(--color-foreground)",
                  padding: "4px 0",
                }}
              />
              {recording && (
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--color-primary)",
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                    alignSelf: "center",
                  }}
                >
                  正在聆听…
                </span>
              )}
              <Button
                type="text"
                shape="circle"
                size="small"
                icon={<AudioOutlined />}
                onClick={() => toggleRecording(setInputValue)}
                title={recording ? "停止语音输入" : "语音输入"}
                className={recording ? "mic-recording" : "mic-idle"}
                style={{ flexShrink: 0 }}
              />
            </div>

            {/* 独立发送按钮 */}
            <Button
              type="primary"
              shape="circle"
              size="large"
              icon={<SendOutlined />}
              onClick={() => {
                if (inputValue.trim() && !isRequesting) {
                  handleSubmit(inputValue);
                }
              }}
              disabled={!inputValue.trim() || isRequesting}
              loading={isRequesting}
              title="发送"
              style={{
                flexShrink: 0,
                width: 44,
                height: 44,
                background:
                  "linear-gradient(135deg, var(--color-primary), var(--color-accent))",
                border: "none",
                boxShadow: "0 4px 12px rgba(8,145,178,0.35)",
              }}
            />
          </div>
        </div>
      </div>

      {/* 重命名弹窗 */}
      <Modal
        title="重命名对话"
        open={!!renameState}
        onOk={handleRenameOk}
        onCancel={() => setRenameState(null)}
        okText="确定"
        cancelText="取消"
      >
        <Input
          autoFocus
          placeholder="输入新的对话标题"
          value={renameState?.title ?? ""}
          onChange={(e) =>
            setRenameState((s) => (s ? { ...s, title: e.target.value } : s))
          }
          onPressEnter={handleRenameOk}
        />
      </Modal>

      {/* 个人信息弹窗 */}
      <ProfileModal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        onSaved={(profile) => setUserProfile(profile)}
      />
    </div>
  );
}

export default function ChatShell() {
  return (
    <XProvider
      theme={{
        token: {
          colorPrimary: "#0891B2",
          colorPrimaryHover: "#0E7490",
          colorPrimaryActive: "#155E75",
          colorLink: "#0891B2",
          colorLinkHover: "#0E7490",
          borderRadius: 8,
          colorBgContainer: "#FFFFFF",
          colorText: "#0F172A",
          colorTextSecondary: "#475569",
          controlHeight: 36,
        },
        components: {
          Button: {
            primaryShadow: "0 2px 8px rgba(8,145,178,0.25)",
            defaultBorderColor: "#E1F2ED",
            defaultColor: "#475569",
          },
        },
      }}
    >
      <App>
        <ChatShellInner />
      </App>
    </XProvider>
  );
}
