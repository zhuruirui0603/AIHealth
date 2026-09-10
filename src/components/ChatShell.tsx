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

  // ---------- 桌面侧栏展开/收起 ----------
  // md 断点 = 768px。窗口 ≥ md 时默认展开侧栏；< md 时收起（由移动端抽屉接管）。
  // 用户也可手动切换（汉堡按钮 / 侧栏内折叠按钮）。
  const DESKTOP_BREAKPOINT = 768;
  const [sidebarExpanded, setSidebarExpanded] = useState(true);

  useEffect(() => {
    const sync = () => {
      setSidebarExpanded(window.innerWidth >= DESKTOP_BREAKPOINT);
    };
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

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

  // ---------- 流式输出跟随滚动 ----------
  // Bubble.List 的 autoScroll 仅在新消息进入时跳到底部，
  // 流式内容增长时不会持续跟随。这里监听最后一条消息的内容变化，
  // 在 streaming / loading 状态下显式调用 scrollTo 将视窗贴底。
  // 注意：Bubble.List 的 ref 是 BubbleListRef 对象（含 nativeElement 等方法），
  // 不是直接的 HTMLDivElement，所以用 callback ref 拿到根 DOM 节点。
  const listRootRef = useRef<HTMLDivElement | null>(null);
  const lastContentRef = useRef<string>("");
  const lastMsgIdRef = useRef<string>("");

  // 切换会话时重置记录，使新会话的首批消息也能触发滚动
  useEffect(() => {
    lastContentRef.current = "";
    lastMsgIdRef.current = "";
  }, [activeKey]);

  useEffect(() => {
    if (!messages.length) return;
    const last = messages[messages.length - 1];
    const content = String(last.message.content ?? "");
    const msgId = String(last.id);
    // 同一条消息且内容未变化时跳过
    if (msgId === lastMsgIdRef.current && content === lastContentRef.current)
      return;
    lastMsgIdRef.current = msgId;
    lastContentRef.current = content;

    const node = listRootRef.current;
    if (!node) return;
    const scrollBox = node.querySelector<HTMLElement>(
      ".ant-bubble-list-scroll-box",
    );
    if (!scrollBox) return;
    // column-reverse（autoScroll）模式下贴底 = scrollTop 0；
    // 普通模式下贴底 = scrollHeight
    // 用 window.getComputedStyle 显式绑定，避免 Illegal invocation
    const isReverse =
      window.getComputedStyle(scrollBox).flexDirection === "column-reverse";
    // 直接赋值 scrollTop，避免 scrollTo 的 Illegal invocation 问题
    scrollBox.scrollTop = isReverse ? 0 : scrollBox.scrollHeight;
  }, [messages]);

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
      {/* 桌面侧栏：宽度过渡动画（motion animate） */}
      <motion.div
        className="h-full flex-shrink-0 overflow-hidden"
        initial={{ width: 256 }}
        animate={{ width: sidebarExpanded ? 256 : 0 }}
        transition={{ type: "tween", duration: 0.28, ease: "easeInOut" }}
        style={{ borderRight: "1px solid var(--color-border)" }}
      >
        {sidebar}
      </motion.div>

      {/* 移动端侧栏（抽屉）：仅在侧栏收起时可用 */}
      <AnimatePresence>
        {sidebarOpen && !sidebarExpanded && (
          <>
            <motion.div
              className="fixed inset-0 z-30 bg-black/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              className="fixed left-0 top-0 z-40 h-full w-64 shadow-xl"
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

      {/* 主区域：内容占满全屏，left 随侧栏宽度过渡 */}
      <motion.div
        className="absolute inset-0 flex flex-col"
        initial={{ left: 256 }}
        animate={{ left: sidebarExpanded ? 256 : 0 }}
        transition={{ type: "tween", duration: 0.28, ease: "easeInOut" }}
      >
        <ChatHeader
          onOpenSidebar={() => {
            if (sidebarExpanded) {
              // 已展开时点击无操作（按钮本身已隐藏）
            } else if (window.innerWidth >= DESKTOP_BREAKPOINT) {
              // 桌面端：展开桌面侧栏
              setSidebarExpanded(true);
            } else {
              // 移动端：打开抽屉
              setSidebarOpen(true);
            }
          }}
          sidebarExpanded={sidebarExpanded}
        />

        {/* 消息内容区（发送框在此区域内绝对定位） */}
        <main
          className="relative flex-1 overflow-hidden"
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
                ref={(el: any) => {
                  // Bubble.List ref 是 BubbleListRef 对象，取 nativeElement 作为根 DOM
                  listRootRef.current = el?.nativeElement ?? null;
                }}
                style={{
                  flex: 1,
                  minHeight: 0,
                  maxWidth: "var(--sender-max-width)",
                  margin: "0 auto",
                }}
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

          {/* 发送框：绝对定位在 main 内部底部 */}
          <div
            className="absolute bottom-0 left-0 right-0 z-20 mx-auto"
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
        </main>
      </motion.div>

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
