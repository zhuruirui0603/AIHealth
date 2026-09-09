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
  Actions,
  Bubble,
  Conversations,
  Prompts,
  Sender,
  Sources,
  Welcome,
  XProvider,
} from "@ant-design/x";
import { useXChat } from "@ant-design/x-sdk";
import { XMarkdown } from "@ant-design/x-markdown";
import { App, Button, Input, Modal, Typography } from "antd";
import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  MenuOutlined,
  PlusOutlined,
  PushpinFilled,
  PushpinOutlined,
  SearchOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { AnimatePresence, motion } from "motion/react";
import type { Conversation, KnowledgeSource } from "@/types/chat";

import bundle from "@/data/knowledge-bundle.json";
import {
  createNutriProvider,
  createSearcher,
  type NutriLocalMessage,
} from "@/lib/providers/NutriHealthProvider";
import * as localStore from "@/lib/local/conversationStore";
import { getProfile, type UserProfileData } from "@/lib/local/profile";
import ProfileModal from "@/components/ProfileModal";

/** 临时会话 key 前缀（新对话在首次回复完成前没有真实会话 id） */
const TEMP_PREFIX = "local-new-";
const newTempKey = () => `${TEMP_PREFIX}${Date.now()}`;

const QUICK_PROMPTS = [
  "我今天不知道吃什么，帮我推荐一下适合我的早餐和午餐？",
  "黄焖鸡米饭、麻辣烫、轻食沙拉，这三个外卖哪个比较适合我？",
  "晚上8点去健身，现在5点半应该吃什么？",
  "昨天炒的鸡肉一直放冰箱，今天还能吃吗？",
  "最近每天下午三四点都特别饿，是不是跟饮食有关？",
  "我妈妈68岁，最近吃饭比较少，怎么帮她调整饮食？",
];

function formatTime(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  const hour = Math.floor(diff / 3600000);
  const day = Math.floor(diff / 86400000);
  if (min < 1) return "刚刚";
  if (min < 60) return `${min}分钟前`;
  if (hour < 24) return `${hour}小时前`;
  if (day < 7) return `${day}天前`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/** Bubble 消息的 extraInfo（由 BubbleItemType.extraInfo 透传到 footer 的 info） */
interface BubbleExtra {
  sources?: KnowledgeSource[];
  error?: string;
}

/** role 配置必须保持模块级稳定引用（内联对象会导致重渲染、重置流式动画） */
const bubbleRole = {
  assistant: {
    placement: "start" as const,
    contentRender: (content: string, info: { extraInfo?: BubbleExtra }) => (
      <div>
        <XMarkdown content={String(content ?? "")} />
        {info.extraInfo?.error ? (
          <Typography.Text
            type="danger"
            style={{ display: "block", marginTop: 8 }}
          >
            ⚠ {info.extraInfo.error}
          </Typography.Text>
        ) : null}
      </div>
    ),
    footer: (content: string, info: { extraInfo?: BubbleExtra }) => {
      const sources = info.extraInfo?.sources;
      const hasSources = !!sources?.length;

      // 按 document_id 去重：同一文档只展示一条引用来源
      const seen = new Set<string>();
      const deduped = (sources || []).filter((s) => {
        const id = s.document_id || s.title;
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });

      if (!content && !hasSources) return null;

      return (
        <div className="flex flex-col gap-2">
          <Actions
            items={[
              {
                key: "copy",
                actionRender: () => (
                  <Actions.Copy text={content} />
                ),
              },
            ]}
            variant="borderless"
          />
          {hasSources ? (
            <Sources
              title="参考来源"
              defaultExpanded
              items={deduped.map((s, i) => ({
                key: s.chunk_id ?? String(i),
                title: s.title,
                url: s.url,
                description: [s.source, s.domain, s.evidence_level]
                  .filter(Boolean)
                  .join(" · "),
              }))}
              onClick={(item) => {
                if (item.url) window.open(item.url, "_blank");
              }}
            />
          ) : null}
        </div>
      );
    },
  },
  user: { placement: "end" as const },
};

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
  const [activeKey, setActiveKey] = useState<string>(newTempKey);
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
  // API key 从环境变量读取（构建时内置，无需用户手动输入）
  const apiKey = process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY || "";

  // BM25 searcher（从 bundle 构建，模块级单例）
  const searcher = useMemo(
    () => createSearcher(bundle.chunks as any),
    [],
  );

  // Provider 依赖 userProfile（画像变化时重建）
  const provider = useMemo(() => {
    if (!apiKey || !userProfile) return null;
    return createNutriProvider({
      apiKey,
      profile: userProfile,
      searcher: searcher || undefined,
    });
  }, [userProfile, searcher]);

  const { messages, onRequest, isRequesting, abort } = useXChat({
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
    // 找最后一条 assistant 消息
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

  const handleSelect = useCallback((key: string) => {
    setActiveKey(key);
    localStorage.setItem("conversation_id", key);
    setSidebarOpen(false);
  }, []);

  const handleSubmit = useCallback(
    (content: string) => {
      const text = content.trim();
      if (!text || isRequesting) return;

      const convId = currentRealId;
      if (convId) {
        localStore
          .addMessage(convId, "user", text)
          .then(() => refreshConversations())
          .catch(() => {});
        onRequest({ message: text } as any);
      } else {
        // 新对话：先创建会话，再用真实 id 发请求
        localStore.createConversation().then((conv) => {
          const tempKey = activeKey;
          setRealIdMap((prev) => ({ ...prev, [tempKey]: conv.id }));
          localStorage.setItem("conversation_id", conv.id);
          localStore
            .addMessage(conv.id, "user", text)
            .then(() => refreshConversations())
            .catch(() => {});
          onRequest({ message: text } as any);
        });
      }
      setInputValue("");
    },
    [currentRealId, isRequesting, onRequest, activeKey, refreshConversations],
  );

  // 重命名
  const [renameState, setRenameState] = useState<{ id: string; title: string } | null>(null);
  // 输入框受控值
  const [inputValue, setInputValue] = useState("");

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

  /** 导出会话为 JSON 文件下载 */
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

  // ---------- 侧栏数据 ----------
  const convItems = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    const list = q
      ? conversations.filter((c) => c.title.toLowerCase().includes(q))
      : conversations;
    return list.map((c) => ({
      key: c.id,
      pinned: c.pinned,
      icon: c.pinned ? (
        <PushpinFilled style={{ color: "#faad14" }} />
      ) : undefined,
      label: (
        <div>
          <div
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {c.title}
          </div>
          <div style={{ fontSize: 12, color: "rgba(0,0,0,0.45)" }}>
            {formatTime(c.updated_at || c.created_at)}
          </div>
        </div>
      ),
    }));
  }, [conversations, searchText]);

  const sidebar = (
    <div className="flex h-full flex-col bg-white">
      <div className="p-3 pb-2">
        <Button type="primary" icon={<PlusOutlined />} block onClick={handleNew}>
          新建对话
        </Button>
      </div>
      <div className="px-3 pb-2">
        <Input
          allowClear
          prefix={<SearchOutlined style={{ color: "rgba(0,0,0,0.25)" }} />}
          placeholder="搜索对话"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {convItems.length === 0 ? (
          <div className="px-3 py-4 text-center text-xs text-gray-400">
            {searchText.trim() ? "未找到匹配的对话" : "暂无历史对话"}
          </div>
        ) : (
          <Conversations
            items={convItems}
            activeKey={currentRealId}
            onActiveChange={handleSelect}
            menu={(conv) => ({
              items: [
                {
                  key: "pin",
                  label: conv.pinned ? "取消置顶" : "置顶",
                  icon: <PushpinOutlined />,
                },
                { key: "rename", label: "重命名", icon: <EditOutlined /> },
                { key: "export", label: "导出 JSON", icon: <DownloadOutlined /> },
                { type: "divider" as const },
                {
                  key: "delete",
                  label: "删除",
                  icon: <DeleteOutlined />,
                  danger: true,
                },
              ],
              onClick: ({ key }) => handleMenuAction(String(key), conv.key),
            })}
          />
        )}
      </div>
      <div className="flex items-center gap-1 border-t border-gray-100 px-4 py-3">
        <Button
          type="text"
          size="small"
          icon={<UserOutlined />}
          onClick={() => setProfileOpen(true)}
        >
          个人信息
        </Button>
        <span className="ml-auto text-xs text-gray-400">v0.1</span>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* 桌面侧栏 */}
      <div className="hidden w-64 flex-shrink-0 border-r border-gray-200 md:block">
        {sidebar}
      </div>

      {/* 移动端侧栏（抽屉，带滑入滑出动画） */}
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

      {/* 主区域 */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              type="text"
              className="md:hidden"
              icon={<MenuOutlined />}
              onClick={() => setSidebarOpen(true)}
              aria-label="打开历史对话"
            />
            <div>
              <div className="text-lg font-bold text-gray-800">NutriHealth AI</div>
              <div className="text-xs text-gray-500">今天有什么健康问题？</div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <div className="mx-auto flex h-full w-full max-w-3xl flex-col">
            {messages.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-6 overflow-y-auto px-4 py-8">
                <Welcome
                  variant="borderless"
                  title="你好，我是 NutriHealth AI"
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
                style={{ flex: 1, minHeight: 0, padding: "16px 4px" }}
                role={bubbleRole}
                autoScroll
                items={messages.map(({ id, message, status }) => ({
                  key: id,
                  role: message.role,
                  content: String(message.content ?? ""),
                  loading: status === "loading",
                  streaming: status === "updating",
                  extraInfo: {
                    sources: (message as any).sources,
                    error: (message as any).error,
                  } satisfies BubbleExtra,
                }))}
              />
            )}

            <div className="px-4 pb-4">
              <Sender
                placeholder="输入你的健康问题…"
                value={inputValue}
                onChange={setInputValue}
                loading={isRequesting}
                onCancel={abort}
                onSubmit={handleSubmit}
              />
            </div>
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

/** 标题生成（移植自后端 summarize_conversation） */
async function generateTitle(
  conversationId: string,
  callback: (title: string) => void,
) {
  try {
    const conv = await localStore.getConversation(conversationId);
    if (!conv) return;
    const history = conv.messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        content: (m.content || "").slice(0, 200),
        role: m.role,
      }));
    if (history.length === 0) return;

    const key = process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY || "";
    if (!key) return;

    const summaryPrompt = [
      {
        role: "system",
        content:
          "你是对话标题生成器。请根据以下对话内容，生成一个简短的标题。\n" +
          "要求：\n- 10个汉字以内\n- 概括对话的核心话题\n" +
          "- 不要加引号、标点符号\n- 直接输出标题文字，不要加任何前缀",
      },
      {
        role: "user",
        content: `对话内容：\n${JSON.stringify(history, null, 2)}`,
      },
    ];

    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: summaryPrompt,
        temperature: 0.3,
        max_tokens: 20,
      }),
    });
    if (!res.ok) return;
    const data = await res.json();
    let title = data?.choices?.[0]?.message?.content?.trim() || "";
    title = title
      .replace(/["'""「」]/g, "")
      .replace(/\n/g, " ")
      .trim();
    if (title.length > 20) title = title.slice(0, 20);
    if (title) callback(title);
  } catch {
    // 标题生成失败不影响主流程
  }
}

export default function ChatShell() {
  return (
    <XProvider>
      <App>
        <ChatShellInner />
      </App>
    </XProvider>
  );
}
