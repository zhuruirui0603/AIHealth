"use client";

/**
 * 侧栏：品牌区 + 新建按钮 + 搜索 + 会话列表 + 底部用户区
 */

import React from "react";
import { Conversations } from "@ant-design/x";
import { Button, Input } from "antd";
import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  PlusOutlined,
  PushpinFilled,
  PushpinOutlined,
  SearchOutlined,
  UserOutlined,
} from "@ant-design/icons";
import type { Conversation } from "@/types/chat";
import { formatTime } from "./constants";

export interface SidebarProps {
  conversations: Conversation[];
  searchText: string;
  onSearchTextChange: (v: string) => void;
  activeKey: string;
  onSelect: (key: string) => void;
  onNew: () => void;
  onMenuAction: (action: string, id: string) => void;
  onOpenProfile: () => void;
}

export default function Sidebar({
  conversations,
  searchText,
  onSearchTextChange,
  activeKey,
  onSelect,
  onNew,
  onMenuAction,
  onOpenProfile,
}: SidebarProps) {
  const q = searchText.trim().toLowerCase();
  const list = q
    ? conversations.filter((c) => c.title.toLowerCase().includes(q))
    : conversations;

  const convItems = list.map((c) => ({
    key: c.id,
    pinned: c.pinned,
    icon: c.pinned ? (
      <PushpinFilled style={{ color: "#f59e0b", fontSize: 12 }} />
    ) : undefined,
    label: (
      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
        <div
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontWeight: 500,
            fontSize: 14,
            color: "var(--color-foreground)",
          }}
        >
          {c.title}
        </div>
        <div
          style={{
            fontSize: 11,
            color: "var(--color-muted-foreground)",
            letterSpacing: 0.2,
          }}
        >
          {formatTime(c.updated_at || c.created_at)}
        </div>
      </div>
    ),
  }));

  return (
    <div
      className="flex h-full flex-col"
      style={{
        background: "linear-gradient(180deg, #F0FDFA 0%, #FFFFFF 30%, #FFFFFF 100%)",
      }}
    >
      {/* 品牌区 + 新建按钮 */}
      <div className="px-4 pt-4 pb-3">
        <div className="mb-3 flex items-center gap-2">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg text-white"
            style={{
              background:
                "linear-gradient(135deg, var(--color-primary), var(--color-accent))",
              boxShadow: "0 2px 6px rgba(8,145,178,0.25)",
            }}
            aria-hidden="true"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 21s-7-4.5-7-11a4 4 0 0 1 7-2.65A4 4 0 0 1 19 10c0 6.5-7 11-7 11z" />
            </svg>
          </div>
          <span
            style={{
              fontWeight: 600,
              fontSize: 15,
              color: "var(--color-foreground)",
            }}
          >
            健康助手
          </span>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          block
          onClick={onNew}
          className="btn-new-chat"
        >
          新建对话
        </Button>
      </div>

      {/* 搜索框 */}
      <div className="px-4 pb-3">
        <Input
          allowClear
          prefix={<SearchOutlined style={{ color: "var(--color-muted-foreground)" }} />}
          placeholder="搜索对话"
          value={searchText}
          onChange={(e) => onSearchTextChange(e.target.value)}
          style={{
            height: 36,
            borderRadius: 10,
            background: "rgba(255,255,255,0.7)",
            borderColor: "var(--color-border)",
          }}
        />
      </div>

      {/* 会话列表 */}
      <div
        className="flex-1 overflow-y-auto pb-2 conversations-list"
        style={{ minHeight: 0 }}
      >
        {convItems.length === 0 ? (
          <div
            className="px-3 py-8 text-center"
            style={{ color: "var(--color-muted-foreground)", fontSize: 13 }}
          >
            {searchText.trim() ? "未找到匹配的对话" : "暂无历史对话"}
          </div>
        ) : (
          <Conversations
            items={convItems}
            activeKey={activeKey}
            onActiveChange={onSelect}
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
              onClick: ({ key }) => onMenuAction(String(key), conv.key),
            })}
          />
        )}
      </div>

      {/* 底部用户区 */}
      <div
        className="flex items-center gap-2 px-4 py-3"
        style={{
          borderTop: "1px solid var(--color-border)",
          background: "rgba(240,253,250,0.5)",
        }}
      >
        <Button
          type="text"
          size="small"
          icon={<UserOutlined />}
          onClick={onOpenProfile}
          style={{ color: "var(--color-muted-foreground)", fontSize: 13 }}
        >
          个人信息
        </Button>
        <span
          className="ml-auto"
          style={{ fontSize: 11, color: "var(--color-muted-foreground)" }}
        >
          v0.1
        </span>
      </div>
    </div>
  );
}
