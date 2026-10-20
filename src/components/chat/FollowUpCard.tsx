"use client";

/**
 * 小回访卡片：展示在 AI 回答下方，收集用户对上次建议的执行反馈
 *
 * 自包含组件（数据与回调全部走 props）——bubbleRole 是模块级常量，
 * 禁止闭包 ChatShell 的组件状态，否则会重置流式动画。
 */

import React, { useState } from "react";
import { Button, Input, Tag, Typography } from "antd";
import { BellOutlined } from "@ant-design/icons";
import type { FollowUpInfo } from "@/types/chat";

export interface FollowUpCardProps {
  followUp: FollowUpInfo;
  /** pending 且提供回调时显示反馈按钮；点击后由父组件持久化并刷新数据 */
  onFeedback?: (status: "done" | "partial" | "missed", note?: string) => void;
}

const STATUS_META: Record<
  FollowUpInfo["status"],
  { label: string; color: string }
> = {
  pending: { label: "待跟进", color: "cyan" },
  done: { label: "已做到", color: "success" },
  partial: { label: "部分做到", color: "warning" },
  missed: { label: "还没做到", color: "default" },
};

/** "2026-10-19" → "10/19" */
function formatDue(dueDate: string): string {
  const [, m, d] = dueDate.split("-");
  return m && d ? `${Number(m)}/${Number(d)}` : dueDate;
}

export default function FollowUpCard({ followUp, onFeedback }: FollowUpCardProps) {
  const [note, setNote] = useState("");
  const meta = STATUS_META[followUp.status] ?? STATUS_META.pending;
  const showButtons = followUp.status === "pending" && !!onFeedback;

  const feedback = (status: "done" | "partial" | "missed") => {
    const trimmed = note.trim();
    onFeedback?.(status, trimmed || undefined);
  };

  return (
    <div
      style={{
        borderRadius: 10,
        border: "1px solid var(--color-border)",
        background: "rgba(240,253,250,0.45)",
        padding: "8px 12px",
      }}
    >
      {/* 头部：标签 + 到期日 + 状态 */}
      <div className="flex items-center gap-2">
        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: "var(--color-muted-foreground)",
          }}
        >
          <BellOutlined style={{ marginRight: 4 }} />
          小回访
        </span>
        <span style={{ fontSize: 11, color: "var(--color-muted-foreground)" }}>
          {formatDue(followUp.dueDate)} 到期
        </span>
        <Tag color={meta.color} style={{ marginRight: 0, fontSize: 11, lineHeight: "18px" }}>
          {meta.label}
        </Tag>
      </div>

      {/* 跟进问题正文 */}
      <div style={{ fontSize: 13, lineHeight: 1.6, marginTop: 4 }}>
        {followUp.content}
      </div>

      {/* 反馈区 */}
      {showButtons ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button size="small" type="primary" onClick={() => feedback("done")}>
            做到了
          </Button>
          <Button size="small" onClick={() => feedback("partial")}>
            部分做到
          </Button>
          <Button size="small" onClick={() => feedback("missed")}>
            还没有
          </Button>
          <Input
            size="small"
            placeholder="补充说明（可选）"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            style={{ width: 160, fontSize: 12 }}
          />
        </div>
      ) : followUp.status !== "pending" ? (
        <Typography.Text
          type="secondary"
          style={{ fontSize: 12, display: "block", marginTop: 4 }}
        >
          反馈：{meta.label}
          {followUp.feedbackNote ? ` · ${followUp.feedbackNote}` : ""}
        </Typography.Text>
      ) : null}
    </div>
  );
}
