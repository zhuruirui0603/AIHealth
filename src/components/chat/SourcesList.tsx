"use client";

/**
 * 参考来源列表：可折叠的引用来源展示
 *
 * - 默认收起为一行「参考来源 (N)」，点击展开/收起（节省屏幕空间）
 * - 每条含：序号、标题、来源名、证据等级、内容摘要
 * - 有 url 时整条可点击，新窗口跳转原文
 * - 序号 [1] [2] 与 AI 回答「依据」部分的引用标注对应
 */

import React, { useState } from "react";
import { DownOutlined, ExportOutlined } from "@ant-design/icons";
import type { KnowledgeSource } from "@/types/chat";

/** 摘要长度（字符） */
const SNIPPET_LENGTH = 90;

/** 清洗 markdown 标记并截取摘要 */
function toSnippet(content: string): string {
  const plain = content
    .replace(/#{1,6}\s*/g, "") // 标题 #
    .replace(/\*\*?/g, "") // 加粗/斜体 *
    .replace(/^\s*[-*]\s+/gm, "") // 列表 -
    .replace(/\|/g, " ") // 表格 |
    .replace(/\n+/g, " ") // 换行
    .trim();
  return plain.length > SNIPPET_LENGTH
    ? plain.slice(0, SNIPPET_LENGTH) + "…"
    : plain;
}

export default function SourcesList({ items }: { items: KnowledgeSource[] }) {
  const [expanded, setExpanded] = useState(false);
  if (!items.length) return null;

  return (
    <div
      style={{
        borderRadius: 10,
        border: "1px solid var(--color-border)",
        background: "rgba(240,253,250,0.45)",
        overflow: "hidden",
      }}
    >
      {/* 标题行：点击展开/收起 */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          width: "100%",
          padding: "6px 10px",
          border: "none",
          background: "transparent",
          cursor: "pointer",
          fontSize: 12,
          fontWeight: 500,
          color: "var(--color-muted-foreground)",
          transition: "color 0.15s ease",
        }}
        aria-expanded={expanded}
      >
        参考来源（{items.length}）
        <DownOutlined
          style={{ fontSize: 10, transition: "transform 0.2s ease" }}
          rotate={expanded ? 180 : 0}
        />
      </button>

      {expanded ? (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {items.map((s, i) => {
            const clickable = !!s.url;
            return (
              <div
                key={s.chunk_id ?? String(i)}
                role={clickable ? "link" : undefined}
                onClick={() => {
                  if (clickable) window.open(s.url, "_blank", "noopener");
                }}
                style={{
                  display: "flex",
                  gap: 10,
                  padding: "8px 10px",
                  borderTop: "1px solid var(--color-border)",
                  cursor: clickable ? "pointer" : "default",
                  background: "rgba(255,255,255,0.6)",
                  transition: "background 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  if (clickable)
                    e.currentTarget.style.background = "rgba(8,145,178,0.06)";
                }}
                onMouseLeave={(e) => {
                  if (clickable)
                    e.currentTarget.style.background = "rgba(255,255,255,0.6)";
                }}
              >
                {/* 序号徽标：对应 AI 回答中的 [1] [2] */}
                <span
                  style={{
                    flexShrink: 0,
                    width: 18,
                    height: 18,
                    borderRadius: 5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#ffffff",
                    background:
                      "linear-gradient(135deg, var(--color-primary), var(--color-accent))",
                    marginTop: 1,
                  }}
                >
                  {i + 1}
                </span>

                <div style={{ minWidth: 0, flex: 1 }}>
                  {/* 标题 + 跳转图标 */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 13,
                      fontWeight: 500,
                      color: "var(--color-foreground)",
                      lineHeight: 1.4,
                    }}
                  >
                    <span
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {s.title}
                    </span>
                    {clickable ? (
                      <ExportOutlined
                        style={{
                          fontSize: 11,
                          color: "var(--color-primary)",
                          flexShrink: 0,
                        }}
                      />
                    ) : null}
                  </div>

                  {/* 来源名 · 域名 · 证据等级 */}
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--color-muted-foreground)",
                      marginTop: 2,
                    }}
                  >
                    {[s.source, s.domain, s.evidence_level ? `证据等级 ${s.evidence_level}` : ""]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>

                  {/* 内容摘要 */}
                  {s.content ? (
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--color-muted-foreground)",
                        lineHeight: 1.5,
                        marginTop: 4,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {toSnippet(s.content)}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
