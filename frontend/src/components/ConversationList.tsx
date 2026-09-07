"use client";

import { useEffect, useState, useRef } from "react";
import {
  getConversations,
  deleteConversation,
  renameConversation,
  togglePinConversation,
} from "@/lib/api";
import type { Conversation } from "@/types/chat";

interface ConversationListProps {
  currentId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  refreshKey: number;
}

export default function ConversationList({
  currentId,
  onSelect,
  onNew,
  refreshKey,
}: ConversationListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const refresh = () => {
    setLoading(true);
    getConversations()
      .then((data) => {
        setConversations(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    refresh();
  }, [refreshKey]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatTime = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const min = Math.floor(diff / 60000);
    const hour = Math.floor(diff / 3600000);
    const day = Math.floor(diff / 86400000);

    if (min < 1) return "刚刚";
    if (min < 60) return `${min}分钟前`;
    if (hour < 24) return `${hour}小时前`;
    if (day < 7) return `${day}天前`;
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteConversation(id);
      setConfirmDeleteId(null);
      setMenuOpenId(null);
      refresh();
      if (id === currentId) {
        onNew();
      }
    } catch {
      // ignore
    }
  };

  const handleRename = async (id: string) => {
    const title = renameValue.trim();
    if (!title) {
      setRenamingId(null);
      return;
    }
    try {
      await renameConversation(id, title);
      setRenamingId(null);
      setMenuOpenId(null);
      refresh();
    } catch {
      // ignore
    }
  };

  const handleTogglePin = async (id: string) => {
    try {
      await togglePinConversation(id);
      setMenuOpenId(null);
      refresh();
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex h-full flex-col bg-gray-900 text-gray-200">
      {/* New conversation button */}
      <div className="p-3 pb-2">
        <button
          onClick={onNew}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-700"
        >
          <span className="text-base">+</span>
          新建对话
        </button>
      </div>

      {/* Search box */}
      <div className="px-3 pb-2">
        <div className="relative">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索对话..."
            className="w-full rounded-lg border border-gray-700 bg-gray-800 py-1.5 pl-8 pr-8 text-sm text-white placeholder-gray-500 focus:border-primary-500 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-500 transition-colors hover:text-white"
              aria-label="清除搜索"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Conversation list */}
      <div className="chat-scroll flex-1 overflow-y-auto px-2 pb-2">
        {loading ? (
          <div className="px-3 py-4 text-center text-xs text-gray-500">加载中...</div>
        ) : (() => {
          const filtered = searchQuery.trim()
            ? conversations.filter((c) =>
                c.title.toLowerCase().includes(searchQuery.trim().toLowerCase())
              )
            : conversations;

          if (filtered.length === 0) {
            return (
              <div className="px-3 py-4 text-center text-xs text-gray-500">
                {searchQuery.trim() ? "未找到匹配的对话" : "暂无历史对话"}
              </div>
            );
          }

          return filtered.map((conv) => (
            <div
              key={conv.id}
              className={`group relative mb-1 rounded-lg transition-colors ${
                currentId === conv.id ? "bg-gray-700" : "hover:bg-gray-800"
              }`}
            >
              {renamingId === conv.id ? (
                /* Rename input */
                <div className="px-3 py-2">
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRename(conv.id);
                      if (e.key === "Escape") setRenamingId(null);
                    }}
                    onBlur={() => handleRename(conv.id)}
                    className="w-full rounded border border-gray-600 bg-gray-900 px-2 py-1 text-sm text-white focus:border-primary-500 focus:outline-none"
                  />
                </div>
              ) : (
                <>
                  <button
                    onClick={() => onSelect(conv.id)}
                    className="block w-full px-3 py-2.5 text-left"
                  >
                    <div className="flex items-center gap-1.5">
                      {conv.pinned && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="flex-shrink-0 text-yellow-500">
                          <path d="M16 9V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z" />
                        </svg>
                      )}
                      <div className="truncate text-sm font-medium text-white">{conv.title}</div>
                    </div>
                    <div className="mt-0.5 text-xs text-gray-500">
                      {formatTime(conv.updated_at || conv.created_at)}
                    </div>
                  </button>

                  {/* More actions button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpenId(menuOpenId === conv.id ? null : conv.id);
                    }}
                    className={`absolute right-2 top-2.5 rounded p-1 text-gray-400 transition-all hover:bg-gray-600 hover:text-white ${
                      menuOpenId === conv.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    }`}
                    aria-label="更多操作"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="5" r="2" />
                      <circle cx="12" cy="12" r="2" />
                      <circle cx="12" cy="19" r="2" />
                    </svg>
                  </button>

                  {/* Dropdown menu */}
                  {menuOpenId === conv.id && (
                    <div
                      ref={menuRef}
                      className="absolute right-2 top-9 z-50 w-32 overflow-hidden rounded-lg border border-gray-700 bg-gray-800 py-1 shadow-xl"
                    >
                      <button
                        onClick={() => {
                          handleTogglePin(conv.id);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-gray-200 hover:bg-gray-700"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M16 9V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z" />
                        </svg>
                        {conv.pinned ? "取消置顶" : "置顶"}
                      </button>
                      <button
                        onClick={() => {
                          setRenamingId(conv.id);
                          setRenameValue(conv.title);
                          setMenuOpenId(null);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-gray-200 hover:bg-gray-700"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        重命名
                      </button>
                      <button
                        onClick={() => {
                          setConfirmDeleteId(conv.id);
                          setMenuOpenId(null);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-red-400 hover:bg-gray-700"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                        删除
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ));
        })()}
      </div>

      {/* Delete confirmation dialog */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setConfirmDeleteId(null)}>
          <div
            className="mx-4 w-72 rounded-xl bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-1 text-sm font-medium text-gray-800">确认删除？</p>
            <p className="mb-4 text-xs text-gray-500">删除后无法恢复此对话记录</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100"
              >
                取消
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-gray-800 px-3 py-2.5 text-center text-xs text-gray-600">
        NutriHealth AI v0.1
      </div>
    </div>
  );
}
